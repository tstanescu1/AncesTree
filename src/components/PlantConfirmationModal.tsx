import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { api } from "../../convex/_generated/api";
import { useAction } from "convex/react";

interface PlantConfirmationModalProps {
    visible: boolean;
    onClose: () => void;
    plantSuggestion: any;
    userPhotoBase64: string;
    onConfirm: (confirmedPlant: any) => void;
    onRequestBetterIdentification: (userDescription: string, rejectedSuggestions: string[]) => void;
}

interface ConfirmationQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer?: string;
    reasoning: string;
}

export default function PlantConfirmationModal({
    visible,
    onClose,
    plantSuggestion,
    userPhotoBase64,
    onConfirm,
    onRequestBetterIdentification
}: PlantConfirmationModalProps) {
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState<ConfirmationQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<{[key: string]: string}>({});
    const [confidence, setConfidence] = useState<number>(0);
    const [showCustomQuestion, setShowCustomQuestion] = useState(false);
    const [customQuestion, setCustomQuestion] = useState('');

    const generateConfirmationQuestions = useAction(api.identifyPlant.generateConfirmationQuestions);

    // Generate AI questions when modal opens
    useEffect(() => {
        if (visible && plantSuggestion && userPhotoBase64) {
            generateQuestions();
        }
    }, [visible, plantSuggestion, userPhotoBase64]);

    const generateQuestions = async () => {
        setLoading(true);
        try {
            const result = await generateConfirmationQuestions({
                scientificName: plantSuggestion.scientificName,
                description: plantSuggestion.description,
                userPhotoBase64: userPhotoBase64,
                imageUrl: plantSuggestion.imageUrl
            });
            
            setQuestions(result.questions);
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            setConfidence(0);
        } catch (error) {
            console.error('Failed to generate confirmation questions:', error);
            Alert.alert('Error', 'Failed to generate confirmation questions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (questionId: string, answer: string) => {
        setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
        
        // Move to next question or calculate confidence
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            calculateConfidence();
        }
    };

    const calculateConfidence = () => {
        let correctAnswers = 0;
        questions.forEach(question => {
            const userAnswer = userAnswers[question.id];
            if (userAnswer === question.correctAnswer) {
                correctAnswers++;
            }
        });
        
        const confidenceScore = (correctAnswers / questions.length) * 100;
        setConfidence(confidenceScore);
    };

    const handleConfirm = () => {
        onConfirm(plantSuggestion);
        onClose();
    };

    const handleRequestBetter = () => {
        const userDescription = customQuestion || `I'm not sure this is ${plantSuggestion?.scientificName || 'this plant'}. ${questions.map(q => q.question).join(' ')}`;
        onRequestBetterIdentification(userDescription, plantSuggestion?.scientificName ? [plantSuggestion.scientificName] : []);
        onClose();
    };

    const currentQuestion = questions[currentQuestionIndex];

    // Don't render if no plant suggestion
    if (!plantSuggestion) {
        return null;
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={{ flex: 1, backgroundColor: '#f0fdf4' }}>
                {/* Header */}
                <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    paddingTop: 60,
                    paddingHorizontal: 20,
                    paddingBottom: 20,
                    backgroundColor: 'white',
                    borderBottomWidth: 1,
                    borderBottomColor: '#e5e7eb'
                }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#166534' }}>
                        🔍 Confirm Identification
                    </Text>
                    <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                        <Text style={{ fontSize: 24, color: '#6b7280' }}>✕</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1, padding: 20 }}>
                    {/* Plant Info */}
                    <View style={{ 
                        backgroundColor: 'white', 
                        borderRadius: 12, 
                        padding: 16, 
                        marginBottom: 20,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3
                    }}>
                                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#166534', marginBottom: 8 }}>
                        {plantSuggestion?.commonNames?.[0] || plantSuggestion?.scientificName || 'Unknown Plant'}
                    </Text>
                    <Text style={{ fontSize: 14, fontStyle: 'italic', color: '#6b7280', marginBottom: 12 }}>
                        {plantSuggestion?.scientificName || 'Unknown Species'}
                    </Text>
                        
                        {/* Visual Comparison */}
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Your Photo</Text>
                                <Image 
                                    source={{ uri: `data:image/jpeg;base64,${userPhotoBase64}` }}
                                    style={{ width: '100%', height: 120, borderRadius: 8 }}
                                    resizeMode="cover"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Reference</Text>
                                <Image 
                                    source={{ uri: plantSuggestion?.imageUrl }}
                                    style={{ width: '100%', height: 120, borderRadius: 8 }}
                                    resizeMode="cover"
                                />
                            </View>
                        </View>

                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            AI Confidence: {plantSuggestion?.probability ? Math.round(plantSuggestion.probability * 100) : 'Unknown'}%
                        </Text>
                    </View>

                    {/* Loading State */}
                    {loading && (
                        <View style={{ alignItems: 'center', padding: 40 }}>
                            <ActivityIndicator size="large" color="#059669" />
                            <Text style={{ marginTop: 16, color: '#059669', fontSize: 16 }}>
                                🤖 AI is analyzing your plant...
                            </Text>
                        </View>
                    )}

                    {/* Questions */}
                    {!loading && questions.length > 0 && currentQuestion && confidence === 0 && (
                        <View style={{ 
                            backgroundColor: 'white', 
                            borderRadius: 12, 
                            padding: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', flex: 1 }}>
                                    Question {currentQuestionIndex + 1} of {questions.length}
                                </Text>
                                <View style={{ 
                                    backgroundColor: '#f0fdf4', 
                                    paddingHorizontal: 8, 
                                    paddingVertical: 4, 
                                    borderRadius: 12 
                                }}>
                                    <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>
                                        AI-Powered
                                    </Text>
                                </View>
                            </View>

                            <Text style={{ fontSize: 16, color: '#374151', marginBottom: 20, lineHeight: 24 }}>
                                {currentQuestion.question}
                            </Text>

                            <View style={{ gap: 12 }}>
                                {currentQuestion.options.map((option, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={{
                                            padding: 16,
                                            borderRadius: 8,
                                            borderWidth: 2,
                                            borderColor: userAnswers[currentQuestion.id] === option ? '#059669' : '#e5e7eb',
                                            backgroundColor: userAnswers[currentQuestion.id] === option ? '#f0fdf4' : 'white'
                                        }}
                                        onPress={() => handleAnswer(currentQuestion.id, option)}
                                    >
                                        <Text style={{ 
                                            fontSize: 14, 
                                            color: userAnswers[currentQuestion.id] === option ? '#059669' : '#374151',
                                            fontWeight: userAnswers[currentQuestion.id] === option ? '600' : '400'
                                        }}>
                                            {option}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {currentQuestion.reasoning && (
                                <View style={{ 
                                    marginTop: 16, 
                                    padding: 12, 
                                    backgroundColor: '#fef3c7', 
                                    borderRadius: 8 
                                }}>
                                    <Text style={{ fontSize: 12, color: '#92400e', fontStyle: 'italic' }}>
                                        💡 {currentQuestion.reasoning}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Confidence Result */}
                    {confidence > 0 && (
                        <View style={{ 
                            backgroundColor: 'white', 
                            borderRadius: 12, 
                            padding: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3
                        }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#166534', marginBottom: 16 }}>
                                🎯 Confirmation Result
                            </Text>
                            
                            <View style={{ 
                                backgroundColor: confidence >= 70 ? '#f0fdf4' : confidence >= 40 ? '#fef3c7' : '#fef2f2',
                                padding: 16,
                                borderRadius: 8,
                                marginBottom: 20
                            }}>
                                <Text style={{ 
                                    fontSize: 16, 
                                    fontWeight: '600',
                                    color: confidence >= 70 ? '#059669' : confidence >= 40 ? '#d97706' : '#dc2626',
                                    marginBottom: 8
                                }}>
                                    Confidence: {Math.round(confidence)}%
                                </Text>
                                <Text style={{ fontSize: 14, color: '#6b7280' }}>
                                    {confidence >= 70 ? '✅ High confidence - This appears to be the correct identification' :
                                     confidence >= 40 ? '⚠️ Medium confidence - Some features match but there may be alternatives' :
                                     '❌ Low confidence - This may not be the correct plant'}
                                </Text>
                            </View>

                            {/* Action Buttons */}
                            <View style={{ gap: 12 }}>
                                {confidence >= 70 && (
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: '#059669',
                                            padding: 16,
                                            borderRadius: 8,
                                            alignItems: 'center'
                                        }}
                                        onPress={handleConfirm}
                                    >
                                        <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                                            ✅ Confirm This Plant
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={{
                                        backgroundColor: '#f3f4f6',
                                        padding: 16,
                                        borderRadius: 8,
                                        alignItems: 'center'
                                    }}
                                    onPress={() => setShowCustomQuestion(true)}
                                >
                                    <Text style={{ color: '#374151', fontSize: 16, fontWeight: '600' }}>
                                        🤖 Ask AI for Better Match
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Custom Question Input */}
                    {showCustomQuestion && (
                        <View style={{ 
                            backgroundColor: 'white', 
                            borderRadius: 12, 
                            padding: 20,
                            marginTop: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3
                        }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 12 }}>
                                🤖 Describe What You See
                            </Text>
                            <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                                Tell the AI about specific features you notice that might help identify the plant better.
                            </Text>
                            
                            <TextInput
                                style={{
                                    borderWidth: 1,
                                    borderColor: '#d1d5db',
                                    borderRadius: 8,
                                    padding: 12,
                                    fontSize: 14,
                                    color: '#374151',
                                    backgroundColor: '#f9fafb',
                                    minHeight: 80,
                                    textAlignVertical: 'top'
                                }}
                                placeholder="e.g., The leaves have tiny hairs, the flowers are bright yellow, it grows in clusters..."
                                value={customQuestion}
                                onChangeText={setCustomQuestion}
                                multiline
                            />
                            
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#059669',
                                        padding: 12,
                                        borderRadius: 8,
                                        alignItems: 'center'
                                    }}
                                    onPress={handleRequestBetter}
                                >
                                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                                        🔍 Find Better Match
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#f3f4f6',
                                        padding: 12,
                                        borderRadius: 8,
                                        alignItems: 'center'
                                    }}
                                    onPress={() => setShowCustomQuestion(false)}
                                >
                                    <Text style={{ color: '#374151', fontSize: 14, fontWeight: '600' }}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
} 