import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import Markdown from 'react-native-markdown-display';
import { LinearGradient } from 'expo-linear-gradient'; // If not using expo, use a View with a gradient background

interface PlantChatViewProps {
  plantId: Id<"plants">;
  sightingId?: Id<"sightings">;
  plantName: string;
  onClose: () => void;
}

interface ChatMessage {
  _id: Id<"chat_messages">;
  role: string; // Changed from 'user' | 'assistant' to string to match Convex types
  content: string;
  timestamp: number;
  messageId: string;
  isEdited?: boolean;
  editedAt?: number;
}

export default function PlantChatView({ plantId, sightingId, plantName, onClose }: PlantChatViewProps) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [streamedResponse, setStreamedResponse] = useState<string | null>(null); // For streaming
  const [lastMessageId, setLastMessageId] = useState<string | null>(null); // Track the last AI message for polling

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Convex actions and queries
  const sendMessage = useAction(api.chatSystem.sendMessage);
  const editMessage = useAction(api.chatSystem.editMessage);
  const deleteMessage = useAction(api.chatSystem.deleteMessage);
  
  const messages = useQuery(api.chatSystem.getChatMessages, { 
    plantId, 
    sightingId 
  });

  // Polling for streaming updates
  useEffect(() => {
    if (isLoading && lastMessageId) {
      // Start polling every 500ms
      pollingIntervalRef.current = setInterval(async () => {
        if (messages) {
          const lastMessage = messages.find(msg => msg.messageId === lastMessageId);
          if (lastMessage && lastMessage.content !== "Taita is thinking...") {
            // Streaming is complete
            setIsLoading(false);
            setLastMessageId(null);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        }
      }, 500);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isLoading, lastMessageId, messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, streamedResponse]);

  const generateMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    const messageId = generateMessageId();
    const content = inputText.trim();
    setIsLoading(true);
    setInputText('');
    setStreamedResponse(null);
    setLastMessageId(null);
    
    try {
      const result = await sendMessage({
        plantId,
        sightingId,
        content,
        messageId,
      });
      
      // Set the AI message ID for polling
      if (result?.aiMessageId) {
        setLastMessageId(result.aiMessageId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setInputText(content); // Restore the text
      setIsLoading(false);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessageId || !editingText.trim()) return;
    setIsLoading(true);
    setShowEditModal(false);
    setStreamedResponse(null);
    setLastMessageId(null);
    
    try {
      const result = await editMessage({
        plantId,
        messageId: editingMessageId,
        newContent: editingText.trim(),
      });
      
      // Set the AI message ID for polling if there's a new AI response
      if (result?.aiMessageId) {
        setLastMessageId(result.aiMessageId);
      }
    } catch (error) {
      console.error('Error editing message:', error);
      Alert.alert('Error', 'Failed to edit message. Please try again.');
      setIsLoading(false);
    } finally {
      setEditingMessageId(null);
      setEditingText('');
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;
    setIsLoading(true);
    setShowDeleteConfirm(false);
    try {
      await deleteMessage({
        plantId,
        messageId: messageToDelete,
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message. Please try again.');
    } finally {
      setIsLoading(false);
      setMessageToDelete(null);
    }
  };

  const openEditModal = (message: ChatMessage) => {
    setEditingMessageId(message.messageId);
    setEditingText(message.content);
    setShowEditModal(true);
  };

  const openDeleteConfirm = (messageId: string) => {
    setMessageToDelete(messageId);
    setShowDeleteConfirm(true);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: ChatMessage, idx: number) => {
    const isUser = message.role === 'user';
    const isEdited = message.isEdited;

    // Skip rendering placeholder thinking message
    if (!isUser && message.content.startsWith('Taita is thinking')) {
      return null;
    }

    return (
      <View key={message.messageId} style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble
        ]}>
          <Markdown style={isUser ? (markdownUserStyles as any) : (markdownAIStyles as any)}>
            {message.content}
          </Markdown>
        </View>
        <View style={styles.messageMetaRow}>
          <Text style={styles.messageMeta}>
            {isUser ? 'You' : 'Taita'} · {formatTimestamp(message.timestamp)}{isEdited && ' (edited)'}
          </Text>
          {isUser && (
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => openEditModal(message)} style={styles.iconButton}>
                <Text style={styles.actionIcon}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openDeleteConfirm(message.messageId)} style={styles.iconButton}>
                <Text style={styles.actionIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <LinearGradient
          colors={["#059669", "#047857"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView style={styles.headerSafeArea}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>🌿 Chat with Taita</Text>
                <Text style={styles.headerSubtitle}>About {plantName}</Text>
              </View>
              {/* Spacer for symmetry */}
              <View style={{ width: 36 }} />
            </View>
          </SafeAreaView>
        </LinearGradient>
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages?.map(renderMessage)}
          {/* Streaming placeholder */}
          {isLoading && (
            <View style={[styles.messageRow, styles.aiRow]}>
              <View style={[styles.messageBubble, styles.aiBubble]}>
                <Text style={styles.typingText}>Taita is thinking...</Text>
                {streamedResponse && (
                  <Markdown style={markdownAIStyles as any}>{streamedResponse}</Markdown>
                )}
              </View>
            </View>
          )}
        </ScrollView>
        {/* Input */}
        <View style={styles.inputBarWrap}>
          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask Taita about this plant..."
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={1000}
              editable={!isLoading}
              onSubmitEditing={handleSendMessage}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Edit Modal */}
        <Modal
          visible={showEditModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Message</Text>
              <TextInput
                style={styles.modalInput}
                value={editingText}
                onChangeText={setEditingText}
                multiline
                maxLength={1000}
                placeholder="Edit your message..."
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleEditMessage}
                  disabled={!editingText.trim()}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
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
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Delete Message</Text>
              <Text style={styles.modalText}>
                Are you sure you want to delete this message? This will also delete all subsequent messages in the conversation.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowDeleteConfirm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={handleDeleteMessage}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  flex: { flex: 1 },
  headerGradient: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerSafeArea: {
    paddingTop: Platform.OS === 'ios' ? 0 : 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    minHeight: 56,
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
    width: 36,
    alignItems: 'flex-start',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerTextWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 32,
  },
  messageRow: {
    marginBottom: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  userRow: {
    alignItems: 'flex-end',
  },
  aiRow: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#059669',
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignSelf: 'flex-start',
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  messageMeta: {
    fontSize: 11,
    color: '#6b7280',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    padding: 2,
    marginLeft: 2,
  },
  actionIcon: {
    fontSize: 15,
    color: '#6b7280',
  },
  typingText: {
    fontSize: 14,
    color: '#059669',
    fontStyle: 'italic',
  },
  inputBarWrap: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    backgroundColor: '#f9fafb',
  },
  sendButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 32,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
  },
  modalText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 24,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  saveButton: {
    backgroundColor: '#059669',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

const markdownAIStyles = {
  body: {
    color: '#1f2937',
    fontSize: 15,
    lineHeight: 21,
  },
  strong: {
    fontWeight: 'bold',
    color: '#059669',
  },
  em: {
    fontStyle: 'italic',
  },
};
const markdownUserStyles = {
  body: {
    color: 'white',
    fontSize: 15,
    lineHeight: 21,
  },
  strong: {
    fontWeight: 'bold',
    color: '#bbf7d0',
  },
  em: {
    fontStyle: 'italic',
  },
}; 