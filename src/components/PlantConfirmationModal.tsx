import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, ScrollView, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { api } from "../../convex/_generated/api";
import { useAction } from "convex/react";

interface PlantConfirmationModalProps {
    visible: boolean;
    onClose: () => void;
    plantSuggestion: any;
    userPhotoBase64: string;
    onConfirm: (confirmedPlant: any) => void;
    onRequestBetterIdentification: (userDescription: string, rejectedSuggestions: string[], contextAnswers?: Array<{question: string, answer: string}>) => void;
}

interface ConfirmationQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    reasoning: string;
    tip?: string;
    category?: string;
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
    const [savingInteraction, setSavingInteraction] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);
    const textInputRef = useRef<TextInput>(null);

    const generateConfirmationQuestions = useAction(api.identifyPlant.generateConfirmationQuestions);
    const saveUserConfirmation = useAction(api.identifyPlant.saveUserConfirmation);
    const testOpenAI = useAction(api.identifyPlant.testOpenAI);

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
            
            console.log('📋 Generated questions:', result.questions);
            
            // Use the AI-generated questions instead of hardcoded ones
            if (result.questions && result.questions.length > 0) {
                // Ensure all questions have the required fields
                const processedQuestions: ConfirmationQuestion[] = result.questions.map((q, index) => ({
                    id: q.id || `question_${index + 1}`,
                    question: q.question,
                    options: q.options || [],
                    correctAnswer: q.correctAnswer || '',
                    reasoning: q.reasoning || `This question helps identify ${plantSuggestion.scientificName} based on its characteristics.`,
                    category: 'general',
                    tip: q.reasoning || `This question helps identify ${plantSuggestion.scientificName} based on its characteristics.`
                }));
                
                setQuestions(processedQuestions);
            } else {
                // Fallback to basic questions if AI doesn't generate any
                console.log('⚠️ No AI questions generated, using fallback questions');
                const fallbackQuestions: ConfirmationQuestion[] = [
                    {
                        id: 'question_1',
                        question: 'What does the plant look like?',
                        options: [
                            'I can see it clearly',
                            'It\'s partially visible',
                            'I can\'t see it well',
                            'I haven\'t looked closely'
                        ],
                        correctAnswer: 'I can see it clearly',
                        reasoning: `For ${plantSuggestion.scientificName}: This plant has distinctive features that should be visible in your photo.`,
                        category: 'visual',
                        tip: `For ${plantSuggestion.scientificName}: This plant has distinctive features that should be visible in your photo.`
                    }
                ];
                setQuestions(fallbackQuestions);
            }
            
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            setConfidence(0);
        } catch (error) {
            console.error('Failed to generate confirmation questions:', error);
            Alert.alert('Error', 'Failed to generate identification questions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (questionId: string, answer: string) => {
        console.log('🎯 User answered:', { questionId, answer });
        setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
        
        // Move to next question or calculate confidence
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            console.log('🏁 All questions answered, calculating confidence...');
            // Add a small delay to ensure state is updated before calculating
            setTimeout(() => {
                calculateConfidence();
            }, 100);
        }
    };

    const calculateConfidence = () => {
        let correctAnswers = 0;
        let totalQuestions = 0;
        
        questions.forEach(question => {
            const userAnswer = userAnswers[question.id];
            if (question.correctAnswer && userAnswer) {
                totalQuestions++;
                // For identification questions, we'll use a more flexible scoring system
                // First option is usually the most likely match, but other options can also be correct
                if (userAnswer === question.correctAnswer || 
                    userAnswer.includes("I can't tell") || 
                    userAnswer.includes("I'm not sure") ||
                    userAnswer.includes("I haven't")) {
                    correctAnswers++;
                }
            }
        });
        
        const confidenceScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        console.log('🔍 Confidence calculation:', {
            correctAnswers,
            totalQuestions,
            confidenceScore,
            userAnswers,
            questions: questions.map(q => ({ id: q.id, correctAnswer: q.correctAnswer, userAnswer: userAnswers[q.id] }))
        });
        setConfidence(confidenceScore);
    };

    const handleConfirm = async () => {
        setSavingInteraction(true);
        try {
            // Save the confirmation interaction
            const userAnswersData = questions.map(q => ({
                questionId: q.id,
                question: q.question,
                userAnswer: userAnswers[q.id] || '',
                correctAnswer: q.correctAnswer,
                reasoning: q.reasoning
            }));

            await saveUserConfirmation({
                plantId: plantSuggestion.plantId || undefined, // Use plantId if available (for existing plants)
                scientificName: plantSuggestion.scientificName,
                userAnswers: userAnswersData,
                finalConfidence: confidence,
                userPhotoBase64: userPhotoBase64
            });

            console.log('✅ Confirmation interaction saved');
        } catch (error) {
            console.error('❌ Failed to save confirmation interaction:', error);
            // Continue with confirmation even if saving fails
        } finally {
            setSavingInteraction(false);
        }

        onConfirm(plantSuggestion);
        onClose();
    };

    const handleRequestBetter = () => {
        // Build a comprehensive description using all the collected information
        let comprehensiveDescription = `I'm trying to identify a plant that was initially suggested as ${plantSuggestion?.scientificName}. `;
        
        // Add user's answers to the identification questions
        if (Object.keys(userAnswers).length > 0) {
            comprehensiveDescription += `\n\nBased on my observations:\n`;
            questions.forEach(question => {
                const userAnswer = userAnswers[question.id];
                if (userAnswer) {
                    comprehensiveDescription += `• ${question.question} ${userAnswer}\n`;
                }
            });
        }
        
        // Add custom question if provided
        if (customQuestion && customQuestion.trim()) {
            comprehensiveDescription += `\n\nAdditional details: ${customQuestion}`;
        }
        
        // Add confidence level
        comprehensiveDescription += `\n\nConfidence level from previous questions: ${Math.round(confidence)}%`;
        
        // Add what doesn't match
        if (confidence < 70) {
            comprehensiveDescription += `\n\nThe suggested plant doesn't seem to match well based on my observations.`;
        }
        
        // Add photo context
        comprehensiveDescription += `\n\nI have a photo of the plant that I can share for identification.`;
        
        console.log('🔍 Requesting better match with comprehensive context:', comprehensiveDescription);
        
        // Convert user answers to context format
        const contextAnswers = Object.entries(userAnswers).map(([questionId, answer]) => {
            const question = questions.find(q => q.id === questionId);
            return {
                question: question?.question || questionId,
                answer: answer
            };
        });
        
        onRequestBetterIdentification(comprehensiveDescription, plantSuggestion?.scientificName ? [plantSuggestion.scientificName] : [], contextAnswers);
        onClose();
    };

    const currentQuestion = questions[currentQuestionIndex];

    // Don't render if no plant suggestion
    if (!plantSuggestion) {
        return null;
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={{ flex: 1, backgroundColor: '#f0fdf4' }}>
                    {/* Header */}
                    <View style={{ 
                        flexDirection: 'row', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        paddingTop: 15,
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

                    <ScrollView 
                        ref={scrollViewRef}
                        style={{ flex: 1, padding: 20 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    >

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
                                AI Confidence: {plantSuggestion?.probability ? Math.round(plantSuggestion.probability) : 'Unknown'}%
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
                                elevation: 3,
                                marginBottom: 30
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', flex: 1 }}>
                                        Question {currentQuestionIndex + 1}/{questions.length} for plant ID
                                    </Text>
                                    <View style={{ 
                                        backgroundColor: '#f0fdf4', 
                                        paddingHorizontal: 8, 
                                        paddingVertical: 4, 
                                        borderRadius: 12 
                                    }}>
                                        <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>
                                            🔍 ID Helper
                                        </Text>
                                    </View>
                                </View>

                                <Text style={{ fontSize: 16, color: '#374151', marginBottom: 20, lineHeight: 24 }}>
                                    {currentQuestion.question}
                                </Text>

                                <View style={{ gap: 12, marginBottom: 20 }}>
                                    {currentQuestion.options && currentQuestion.options.length > 0 && currentQuestion.options.map((option, index) => (
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
                                        marginTop: 6, 
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
                                elevation: 3,
                                marginBottom: 30
                            }}>
                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#166534', marginBottom: 8 }}>
                                        Identification Confidence
                                    </Text>
                                    <View style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: 40,
                                        backgroundColor: confidence >= 70 ? '#dcfce7' : confidence >= 40 ? '#fef3c7' : '#fee2e2',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderWidth: 4,
                                        borderColor: confidence >= 70 ? '#16a34a' : confidence >= 40 ? '#f59e0b' : '#dc2626'
                                    }}>
                                        <Text style={{ 
                                            fontSize: 18, 
                                            fontWeight: 'bold',
                                            color: confidence >= 70 ? '#166534' : confidence >= 40 ? '#92400e' : '#991b1b'
                                        }}>
                                            {Math.round(confidence)}%
                                        </Text>
                                    </View>
                                </View>

                                <Text style={{ fontSize: 16, color: '#374151', textAlign: 'center', marginBottom: 20, lineHeight: 24 }}>
                                    {confidence >= 70 
                                        ? `Great! Your answers suggest this is likely ${plantSuggestion?.commonNames?.[0] || plantSuggestion?.scientificName}.`
                                        : confidence >= 40
                                        ? `There's some uncertainty. Let's get more details to be sure about this identification.`
                                        : `The identification doesn't seem to match well. Let's try a different approach.`
                                    }
                                </Text>

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
                                            disabled={savingInteraction}
                                        >
                                            {savingInteraction ? (
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                                                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                                                        💾 Saving...
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                                                    ✅ Confirm This Plant
                                                </Text>
                                            )}
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
                                            🤖 Find a Better Match
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
                                marginTop: 1,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 3
                            }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 12 }}>
                                    🤖 Get Better AI Match
                                </Text>
                                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                                    We'll use all your answers and observations to find a better match. Add any additional details you noticed.
                                </Text>
                                
                                <TextInput
                                    ref={textInputRef}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: '#d1d5db',
                                        borderRadius: 8,
                                        padding: 12,
                                        fontSize: 14,
                                        color: '#374151',
                                        backgroundColor: '#f9fafb',
                                        minHeight: 80,
                                        textAlignVertical: 'top',
                                        maxHeight: 120
                                    }}
                                    placeholder="e.g., The leaves have tiny hairs, the flowers are bright yellow, it grows in clusters, I noticed it has a strong smell..."
                                    value={customQuestion}
                                    onChangeText={setCustomQuestion}
                                    multiline
                                    autoFocus={false}
                                    blurOnSubmit={false}
                                    returnKeyType="default"
                                    onFocus={() => {
                                        // Scroll to the input when it's focused
                                        setTimeout(() => {
                                            scrollViewRef.current?.scrollToEnd({ animated: true });
                                        }, 300);
                                    }}
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
                                            🔍 Find Match
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
            </KeyboardAvoidingView>
        </Modal>
    );
} 