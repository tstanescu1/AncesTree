import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native';
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
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationHistory, setConversationHistory] = useState<Array<{question: string, answer: string}>>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    
    const sendMessage = useAction(api.chatSystem.sendMessage);
    const messages = useQuery(api.chatSystem.getChatMessages, { plantId });
    
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
                    
                    // Add to conversation history
                    const newConversation = { 
                        question: question.trim(), 
                        answer: currentMessage.content 
                    };
                    setConversationHistory(prev => [...prev, newConversation]);
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
    }, [isStreaming, currentMessageId, messages, question]);

    // Update answer when messages change during streaming
    useEffect(() => {
        if (isStreaming && currentMessageId && messages) {
            const currentMessage = messages.find(msg => msg.messageId === currentMessageId);
            if (currentMessage) {
                setAnswer(currentMessage.content);
            }
        }
    }, [messages, isStreaming, currentMessageId]);

    const generateMessageId = (): string => {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    const handleSubmitQuestion = async () => {
        if (!question.trim()) return;
        
        setIsLoading(true);
        setIsStreaming(true);
        setAnswer(''); // Clear previous answer
        
        const messageId = generateMessageId();
        setCurrentMessageId(messageId);
        
        try {
            // Send message
            await sendMessage({
                plantId: plantId,
                messageId: messageId,
                content: question.trim()
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

    // Copy latest answer
    const handleCopy = () => {
        if (conversationHistory.length > 0) {
            Clipboard.setString(conversationHistory[conversationHistory.length - 1].answer);
            Alert.alert('Copied!', 'Answer copied to clipboard.');
        }
    };

    const latestQA = conversationHistory[conversationHistory.length - 1];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
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

                <ScrollView style={{ flex: 1, padding: 16 }}>
                    {/* Plant Context */}
                    <View style={{ 
                        marginBottom: 20, 
                        padding: 12, 
                        backgroundColor: 'white', 
                        borderRadius: 8, 
                        borderWidth: 1, 
                        borderColor: '#bbf7d0' 
                    }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534', marginBottom: 8 }}>
                            🌿 About {plantName}
                        </Text>
                        {plantScientificName && (
                            <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                                Scientific: {plantScientificName}
                            </Text>
                        )}
                        {traditionalUsage && (
                            <Text style={{ fontSize: 12, color: '#374151', lineHeight: 16 }}>
                                {traditionalUsage.substring(0, 200)}...
                            </Text>
                        )}
                        {medicinalTags && medicinalTags.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                                {medicinalTags.slice(0, 5).map((tag, index) => (
                                    <View 
                                        key={index}
                                        style={{ 
                                            backgroundColor: '#dcfce7', 
                                            paddingHorizontal: 6, 
                                            paddingVertical: 2, 
                                            borderRadius: 8 
                                        }}
                                    >
                                        <Text style={{ fontSize: 10, color: '#166534' }}>
                                            {tag}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Current Streaming Answer */}
                    {isStreaming && (
                        <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0', padding: 16, marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#166534' }}>Taita is responding...</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <ActivityIndicator size="small" color="#059669" style={{ marginRight: 8 }} />
                                    <Text style={{ fontSize: 12, color: '#059669' }}>Streaming</Text>
                                </View>
                            </View>
                            <Text style={{ fontSize: 13, color: '#374151', marginTop: 8, marginBottom: 4 }}>Q: {question}</Text>
                            {answer ? (
                                <Markdown style={{ body: { fontSize: 14, color: '#1e3a8a' } }}>{answer}</Markdown>
                            ) : (
                                <Text style={{ fontSize: 14, color: '#6b7280', fontStyle: 'italic' }}>
                                    Taita is gathering wisdom...
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Latest Answer Card */}
                    {latestQA && !isStreaming && (
                        <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0', padding: 16, marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#166534' }}>Latest Answer</Text>
                                <TouchableOpacity onPress={handleCopy} style={{ padding: 6, backgroundColor: '#dcfce7', borderRadius: 6 }}>
                                    <Text style={{ color: '#166534', fontWeight: '600' }}>Copy</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={{ fontSize: 13, color: '#374151', marginTop: 8, marginBottom: 4 }}>Q: {latestQA.question}</Text>
                            <Markdown style={{ body: { fontSize: 14, color: '#1e3a8a' } }}>{latestQA.answer}</Markdown>
                        </View>
                    )}

                    {/* Collapsible Previous Q&A */}
                    {conversationHistory.length > 1 && (
                        <View style={{ marginBottom: 16 }}>
                            <TouchableOpacity onPress={() => setShowHistory(!showHistory)} style={{ marginBottom: 8 }}>
                                <Text style={{ color: '#166534', fontWeight: '600' }}>{showHistory ? 'Hide' : 'Show'} Previous Q&A</Text>
                            </TouchableOpacity>
                            {showHistory && conversationHistory.slice(0, -1).reverse().map((item, idx) => (
                                <View key={idx} style={{ backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 10, marginBottom: 8 }}>
                                    <Text style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}>Q: {item.question}</Text>
                                    <Markdown style={{ body: { fontSize: 13, color: '#1e3a8a' } }}>{item.answer}</Markdown>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
                {/* Sticky input at bottom */}
                <View style={{ padding: 16, backgroundColor: '#f0fdf4', borderTopWidth: 1, borderColor: '#bbf7d0' }}>
                    <TextInput
                        style={{ borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, padding: 12, backgroundColor: 'white', fontSize: 14, minHeight: 40, marginBottom: 8 }}
                        placeholder="Type your question here..."
                        value={question}
                        onChangeText={setQuestion}
                        multiline
                        numberOfLines={2}
                        editable={!isLoading && !isStreaming}
                    />
                    <TouchableOpacity
                        style={{ backgroundColor: '#059669', paddingVertical: 10, borderRadius: 8, alignItems: 'center', opacity: !question.trim() || isLoading || isStreaming ? 0.6 : 1 }}
                        onPress={handleSubmitQuestion}
                        disabled={!question.trim() || isLoading || isStreaming}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : isStreaming ? (
                            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>⏳ Taita is responding...</Text>
                        ) : (
                            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>🔍 Ask Taita</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
} 