import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface PlantMedicinalQAModalProps {
    visible: boolean;
    onClose: () => void;
    plantName: string;
    plantScientificName?: string;
    traditionalUsage?: string;
    medicinalTags?: string[];
    plantId: Id<"plants">;
}

// Helper: Pair user and assistant messages
function getQAPairs(messages: any[]) {
    const pairs = [];
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].role === 'user') {
            // Find the next assistant message
            const nextAssistant = messages.slice(i + 1).find(m => m.role === 'assistant');
            pairs.push({
                question: messages[i].content,
                answer: nextAssistant ? nextAssistant.content : '',
                userMessageId: messages[i].messageId,
                assistantMessageId: nextAssistant ? nextAssistant.messageId : null
            });
        }
    }
    return pairs;
}

export default function PlantMedicinalQAModal({
    visible,
    onClose,
    plantName,
    plantScientificName,
    traditionalUsage,
    medicinalTags,
    plantId
}: PlantMedicinalQAModalProps) {
    const [question, setQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showPreviousQA, setShowPreviousQA] = useState(true);
    const scrollViewRef = useRef<ScrollView>(null);
    
    const sendMessage = useAction(api.chatSystem.sendMessage);
    const editMessage = useAction(api.chatSystem.editMessage);
    const deleteMessage = useAction(api.chatSystem.deleteMessage);
    
    // Get QA-specific messages
    const messages = useQuery(api.chatSystem.getChatMessages, { 
        plantId, 
        chatType: "qa" 
    });
    const qaPairs = messages ? getQAPairs(messages) : [];
    const latestQA = qaPairs.length > 0 ? qaPairs[qaPairs.length - 1] : null;
    
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Poll for message updates when streaming
    useEffect(() => {
        if (isStreaming && currentMessageId && messages) {
            pollingIntervalRef.current = setInterval(() => {
                const currentMessage = messages.find(msg => msg.messageId === currentMessageId);
                if (currentMessage && currentMessage.content !== "Taita is thinking...") {
                    // Streaming is complete
                    setIsStreaming(false);
                    setCurrentMessageId(null);
                    setQuestion('');
                    
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                }
            }, 1000); // Poll every second
        } else {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        }

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [isStreaming, currentMessageId, messages]);

    // When a new Q&A is added or streaming starts, scroll to bottom
    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [qaPairs.length, isStreaming]);

    const generateMessageId = (): string => {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    // Edit handler
    const handleEditQA = (qaPair: any) => {
        setEditingText(qaPair.question);
        setEditingMessageId(qaPair.userMessageId);
        setShowEditModal(true);
    };

    // Delete handler
    const handleDeleteQA = (qaPair: any) => {
        setMessageToDelete(qaPair.userMessageId);
        setShowDeleteConfirm(true);
    };

    // Handle edit submission
    const handleEditSubmit = async () => {
        if (!editingMessageId || !editingText.trim()) return;
        setIsLoading(true);
        setShowEditModal(false);
        
        try {
            await editMessage({
                plantId,
                messageId: editingMessageId,
                newContent: editingText.trim(),
                chatType: "qa"
            });
        } catch (error) {
            console.error('Error editing message:', error);
            Alert.alert('Error', 'Failed to edit message. Please try again.');
        } finally {
            setIsLoading(false);
            setEditingMessageId(null);
            setEditingText('');
        }
    };

    // Handle delete confirmation
    const handleDeleteConfirm = async () => {
        if (!messageToDelete) return;
        setIsLoading(true);
        setShowDeleteConfirm(false);
        
        try {
            await deleteMessage({
                plantId,
                messageId: messageToDelete,
                chatType: "qa"
            });
        } catch (error) {
            console.error('Error deleting message:', error);
            Alert.alert('Error', 'Failed to delete message. Please try again.');
        } finally {
            setIsLoading(false);
            setMessageToDelete(null);
        }
    };

    // On submit, send new question
    const handleSubmitQuestion = async () => {
        if (!question.trim() || isLoading) return;
        
        setIsLoading(true);
        setIsStreaming(true);
        
        const messageId = generateMessageId();
        setCurrentMessageId(messageId);
        
        try {
            await sendMessage({
                plantId: plantId,
                messageId: messageId,
                content: question.trim(),
                chatType: "qa"
            });
            
            setIsLoading(false); // Stop loading indicator, but keep streaming indicator
            
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Error', 'Failed to send message. Please try again.');
            setIsLoading(false);
            setIsStreaming(false);
            setCurrentMessageId(null);
        }
    };

    const handleSuggestedQuestion = (suggestedQ: string) => {
        setQuestion(suggestedQ);
        // Auto-submit after a short delay to show the user their question was selected
        setTimeout(() => {
            handleSubmitQuestion();
        }, 500);
    };

    const suggestedQuestions = [
        "How do I prepare this plant for medicinal use?",
        "What are the traditional preparation methods?",
        "What parts of the plant are used medicinally?",
        "Are there any safety precautions I should know?",
        "What dosage is typically recommended?",
        "How long does it take to see effects?",
        "Can this plant be combined with other herbs?",
        "What are the contraindications?",
        "How should this be stored for medicinal use?",
        "What time of year is best to harvest?"
    ];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 51 : 0}
            >
                <View style={{ flex: 1, backgroundColor: '#f0fdf4' }}>
                    {/* Header */}
                    <View style={{ 
                        flexDirection: 'row', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: 16,
                        backgroundColor: '#059669',
                        borderBottomWidth: 1,
                        borderBottomColor: '#047857'
                    }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
                            💬 Ask About {plantName}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={{ fontSize: 24, color: 'white' }}>×</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        ref={scrollViewRef}
                        style={{ flex: 1, padding: 16 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ flexGrow: 1 }}
                    >
                        {/* Suggested Questions - Always available */}
                        <View style={{ marginBottom: 16 }}>
                            <TouchableOpacity 
                                onPress={() => setShowSuggestions(!showSuggestions)} 
                                style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    paddingVertical: 8,
                                    paddingHorizontal: 12,
                                    backgroundColor: '#e0f2fe',
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: '#0284c7'
                                }}
                            >
                                <Text style={{ color: '#0284c7', fontWeight: '600' }}>
                                    💡 Suggested Questions
                                </Text>
                                <Text style={{ color: '#0284c7', fontSize: 16 }}>
                                    {showSuggestions ? '▼' : '▶'}
                                </Text>
                            </TouchableOpacity>
                            {showSuggestions && (
                                <View style={{ 
                                    backgroundColor: '#f8fafc', 
                                    borderRadius: 8, 
                                    borderWidth: 1, 
                                    borderColor: '#e2e8f0', 
                                    padding: 12, 
                                    marginTop: 8 
                                }}>
                                    {suggestedQuestions.map((suggestedQ, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={{ 
                                                backgroundColor: 'white', 
                                                borderRadius: 6, 
                                                borderWidth: 1, 
                                                borderColor: '#e2e8f0', 
                                                padding: 10, 
                                                marginBottom: 6 
                                            }}
                                            onPress={() => handleSuggestedQuestion(suggestedQ)}
                                        >
                                            <Text style={{ fontSize: 13, color: '#374151' }}>{suggestedQ}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Previous Q&A */}
                        {qaPairs.slice(0, -1).length > 0 && (
                            <View style={{ marginBottom: 16 }}>
                                <TouchableOpacity 
                                    onPress={() => setShowPreviousQA(!showPreviousQA)} 
                                    style={{ 
                                        flexDirection: 'row', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                        backgroundColor: '#e0f2fe',
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#0284c7'
                                    }}
                                >
                                    <Text style={{ color: '#0284c7', fontWeight: '600' }}>
                                        💬 Previous Q&A
                                    </Text>
                                    <Text style={{ color: '#0284c7', fontSize: 16 }}>
                                        {showPreviousQA ? '▼' : '▶'}
                                    </Text>
                                </TouchableOpacity>
                                {showPreviousQA && (
                                    <View style={{ 
                                        backgroundColor: '#f8fafc', 
                                        borderRadius: 8, 
                                        borderWidth: 1, 
                                        borderColor: '#e2e8f0', 
                                        padding: 12, 
                                        marginTop: 8 
                                    }}>
                                        {qaPairs.slice(0, -1).map((item, idx) => (
                                            <View key={idx} style={{ backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 10, marginBottom: 8 }}>
                                                <Text style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}>Q: {item.question}</Text>
                                                <Markdown style={{ body: { fontSize: 13, color: '#1e3a8a' } }}>{item.answer}</Markdown>
                                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                                                    <TouchableOpacity onPress={() => handleEditQA(item)}>
                                                        <Text style={{ color: '#059669', fontWeight: '600' }}>Edit</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => handleDeleteQA(item)}>
                                                        <Text style={{ color: '#dc2626', fontWeight: '600' }}>Delete</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Latest Q&A with edit/delete - Show always, with loading state when streaming */}
                        {latestQA && (
                            <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0', padding: 16, marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#166534' }}>Latest Answer</Text>
                                    {!isStreaming && (
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity onPress={() => handleEditQA(latestQA)}>
                                                <Text style={{ color: '#059669', fontWeight: '600' }}>Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeleteQA(latestQA)}>
                                                <Text style={{ color: '#dc2626', fontWeight: '600' }}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                                <Text style={{ fontSize: 13, color: '#374151', marginTop: 8, marginBottom: 4 }}>Q: {latestQA.question}</Text>
                                {isStreaming ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                        <ActivityIndicator size="small" color="#059669" style={{ marginRight: 8 }} />
                                        <Text style={{ fontSize: 14, color: '#6b7280', fontStyle: 'italic' }}>
                                            Generating response...
                                        </Text>
                                    </View>
                                ) : (
                                    <Markdown style={{ body: { fontSize: 14, color: '#1e3a8a' } }}>{latestQA.answer}</Markdown>
                                )}
                            </View>
                        )}
                    </ScrollView>
                    
                    {/* Sticky input at bottom */}
                    <View style={{ 
                        padding: 16, 
                        backgroundColor: '#f0fdf4', 
                        borderTopWidth: 1, 
                        borderColor: '#bbf7d0',
                        paddingBottom: Platform.OS === 'ios' ? 16 : 20
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                            <TextInput
                                style={{ 
                                    flex: 1,
                                    borderWidth: 1, 
                                    borderColor: '#bbf7d0', 
                                    borderRadius: 8, 
                                    padding: 12, 
                                    backgroundColor: 'white', 
                                    fontSize: 14, 
                                    minHeight: 44,
                                    maxHeight: 100
                                }}
                                placeholder="Type your question here..."
                                value={question}
                                onChangeText={setQuestion}
                                multiline
                                numberOfLines={2}
                                editable={!isLoading && !isStreaming}
                                returnKeyType="send"
                                onSubmitEditing={handleSubmitQuestion}
                            />
                            <TouchableOpacity
                                style={{ 
                                    backgroundColor: '#059669', 
                                    padding: 12, 
                                    borderRadius: 8, 
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: 44,
                                    minHeight: 44,
                                    opacity: !question.trim() || isLoading || isStreaming ? 0.6 : 1 
                                }}
                                onPress={handleSubmitQuestion}
                                disabled={!question.trim() || isLoading || isStreaming}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : isStreaming ? (
                                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>⏳</Text>
                                ) : (
                                    <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>➤</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Edit Modal */}
                <Modal
                    visible={showEditModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowEditModal(false)}
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, margin: 32, width: '90%', maxWidth: 400 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1f2937' }}>Edit Question</Text>
                            <TextInput
                                style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 24, minHeight: 80, textAlignVertical: 'top' }}
                                value={editingText}
                                onChangeText={setEditingText}
                                multiline
                                maxLength={1000}
                                placeholder="Edit your question..."
                            />
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                                <TouchableOpacity
                                    style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, minWidth: 80, alignItems: 'center', backgroundColor: '#f3f4f6' }}
                                    onPress={() => setShowEditModal(false)}
                                >
                                    <Text style={{ color: '#6b7280', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, minWidth: 80, alignItems: 'center', backgroundColor: '#059669' }}
                                    onPress={handleEditSubmit}
                                    disabled={!editingText.trim()}
                                >
                                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    visible={showDeleteConfirm}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowDeleteConfirm(false)}
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, margin: 32, width: '90%', maxWidth: 400 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1f2937' }}>Delete Q&A</Text>
                            <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 }}>
                                Are you sure you want to delete this Q&A? This will also delete all subsequent messages in the conversation.
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                                <TouchableOpacity
                                    style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, minWidth: 80, alignItems: 'center', backgroundColor: '#f3f4f6' }}
                                    onPress={() => setShowDeleteConfirm(false)}
                                >
                                    <Text style={{ color: '#6b7280', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, minWidth: 80, alignItems: 'center', backgroundColor: '#dc2626' }}
                                    onPress={handleDeleteConfirm}
                                >
                                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        </Modal>
    );
} 