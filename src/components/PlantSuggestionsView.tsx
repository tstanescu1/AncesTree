import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ScrollView, TextInput, Modal, Dimensions, Animated, ActivityIndicator } from 'react-native';
import { PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import { LocationData } from '../hooks/useLocationHandler';
import { useLocationHandler } from '../hooks/useLocationHandler';
import PlantMedicinalDetailsModal from './PlantMedicinalDetailsModal';
import PlantConfirmationModal from './PlantConfirmationModal';

interface PlantSuggestion {
  plantId?: any;
  scientificName: string;
  commonNames: string[];
  probability: number;
  description: string;
  wikiUrl: string;
  imageUrl?: string;
  similar_images: string[];
}

interface PlantSuggestionsViewProps {
  suggestions: PlantSuggestion[];
  userPhotoBase64: string;
  onPlantSelected: (suggestion: PlantSuggestion, feedback?: string, location?: LocationData | null, medicinalDetails?: any) => void;
  onRequestBetterIdentification: (userDescription: string, rejectedSuggestions: string[]) => void;
  onBackToCamera: () => void;
  onRejectionFeedback: (rejectedPlantName: string, allSuggestions: PlantSuggestion[]) => void;
  loading: boolean;
  // Location props
  selectedLocation?: LocationData | null;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PlantSuggestionsView({
  suggestions,
  userPhotoBase64,
  onPlantSelected,
  onRequestBetterIdentification,
  onBackToCamera,
  onRejectionFeedback,
  loading,
  // Location props
  selectedLocation,
}: PlantSuggestionsViewProps) {
  // Get location directly from hook - this is the clever fix!
  const { currentLocation } = useLocationHandler();
  
  const [selectedSuggestion, setSelectedSuggestion] = useState<PlantSuggestion | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showRequestBetterModal, setShowRequestBetterModal] = useState(false);
  const [userFeedback, setUserFeedback] = useState('');
  const [userDescription, setUserDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false); // For better identification
  const [isAddingToCollection, setIsAddingToCollection] = useState(false); // For adding to collection
  const [rejectedSuggestions, setRejectedSuggestions] = useState<string[]>([]);
  const [visibleSuggestions, setVisibleSuggestions] = useState<PlantSuggestion[]>(suggestions);
  const [fadingOutSuggestions, setFadingOutSuggestions] = useState<Set<string>>(new Set());

  // Add local loading states for immediate feedback
  const [localLoading, setLocalLoading] = useState(false);
  const [processingSelection, setProcessingSelection] = useState(false);

  // Combine parent loading with local loading states
  const isLoadingCombined = loading || localLoading || processingSelection;

  // Create refs for suggestion animations
  const suggestionAnimations = useRef<{ [key: string]: { opacity: Animated.Value; scale: Animated.Value } }>({});

  // Image zoom modal states - proper gesture-based zoom
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [modalTitle, setModalTitle] = useState('');
  
  // Medicinal details modal state
  const [showMedicinalDetailsModal, setShowMedicinalDetailsModal] = useState(false);
  const [medicinalDetails, setMedicinalDetails] = useState<any>(null);

  // Confirmation modal state
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationSuggestion, setConfirmationSuggestion] = useState<PlantSuggestion | null>(null);

  // Gesture animation values
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const baseScale = useRef(1);
  const pinchScale = useRef(new Animated.Value(1)).current;
  const lastPanX = useRef(0);
  const lastPanY = useRef(0);

  // Initialize animation values for suggestions
  React.useEffect(() => {
    suggestions.forEach(suggestion => {
      let animations = suggestionAnimations.current[suggestion.scientificName];
      if (!animations) {
        animations = {
          opacity: new Animated.Value(1),
          scale: new Animated.Value(1),
        };
        suggestionAnimations.current[suggestion.scientificName] = animations;
      }
    });
  }, [suggestions]);

  // Filter out rejected suggestions for display
  const visibleSuggestionsFiltered = suggestions.filter(
    suggestion => !rejectedSuggestions.includes(suggestion.scientificName)
  );

  const handleSelectPlant = (suggestion: PlantSuggestion) => {
    // Set loading immediately for user feedback
    setLocalLoading(true);
    
    // Small delay to show the loading state, then open confirmation modal
    setTimeout(() => {
      setConfirmationSuggestion(suggestion);
      setShowConfirmationModal(true);
      setLocalLoading(false); // Reset after modal opens
    }, 100);
  };

  const handleConfirmPlant = (confirmedPlant: PlantSuggestion) => {
    setSelectedSuggestion(confirmedPlant);
    setShowFeedbackModal(true);
    setUserFeedback('');
    setShowConfirmationModal(false);
    setConfirmationSuggestion(null);
  };

  const handleRequestBetterFromConfirmation = (userDescription: string, rejectedSuggestions: string[]) => {
    onRequestBetterIdentification(userDescription, rejectedSuggestions);
    setShowConfirmationModal(false);
    setConfirmationSuggestion(null);
  };

  const confirmSelection = async (withFeedback: boolean = false) => {
    if (!selectedSuggestion) return;
    
    setIsAddingToCollection(true);
    try {
      // Clever fix: Use currentLocation from hook (which gets updated when GPS button is clicked)
      // or fall back to selectedLocation prop (for map-selected locations)
      const locationToUse = currentLocation || selectedLocation;
      
      console.log('🔍 CLEVER FIX - Using location:', locationToUse);
      console.log('  currentLocation from hook:', currentLocation);
      console.log('  selectedLocation from prop:', selectedLocation);
      
      await onPlantSelected(selectedSuggestion, withFeedback ? userFeedback : undefined, locationToUse, medicinalDetails);
      setShowFeedbackModal(false);
      setUserFeedback('');
      setSelectedSuggestion(null);
      setMedicinalDetails(null);
    } catch (error) {
      console.error('Error adding plant to collection:', error);
    } finally {
      setIsAddingToCollection(false);
    }
  };

  const rejectSuggestion = (scientificName: string, commonName: string) => {
    // Get animation values for this suggestion
    const animations = suggestionAnimations.current[scientificName];
    if (!animations) return;
    
    // Start fade-out animation
    setFadingOutSuggestions(prev => new Set(prev).add(scientificName));
    
    // Send feedback to backend for AI learning (non-blocking)
    onRejectionFeedback(scientificName, suggestions);
    
    // Animate out
    Animated.parallel([
      Animated.timing(animations.opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(animations.scale, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      // After animation completes, add to rejected list
      setRejectedSuggestions(prev => [...prev, scientificName]);
      setFadingOutSuggestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(scientificName);
        return newSet;
      });
    });
  };

  const requestBetterIdentification = () => {
    if (!userDescription.trim()) return;
    
    setIsLoading(true);
    setShowRequestBetterModal(false);
    
    // Call the parent function to request better identification
    onRequestBetterIdentification(userDescription, rejectedSuggestions);
    
    // Reset the description
    setUserDescription('');
    
    // Reset loading state after a timeout (assuming parent handles the actual request)
    setTimeout(() => {
      setIsLoading(false);
    }, 5000);
  };

  // Enhanced reset that completely clears all gesture state
  const resetImageTransform = () => {
    // Reset all scale values
    scale.setValue(1);
    baseScale.current = 1;
    pinchScale.setValue(1);
    
    // Completely reset translation with both value and offset
    translateX.setValue(0);
    translateY.setValue(0);
    translateX.setOffset(0);
    translateY.setOffset(0);
    translateX.extractOffset(); // This flattens offset into value then resets offset to 0
    translateY.extractOffset();
    
    // Reset tracking variables
    lastPanX.current = 0;
    lastPanY.current = 0;
  };

  // Open image modal with clean state
  const openImageModal = (images: string[], startIndex: number = 0, title: string = '') => {
    setModalImages(images);
    setCurrentImageIndex(startIndex);
    setModalTitle(title);
    resetImageTransform();
    setShowImageModal(true);
  };

  // Handle user photo click
  const handleUserPhotoClick = () => {
    if (userPhotoBase64) {
      openImageModal([`data:image/jpeg;base64,${userPhotoBase64}`], 0, '📸 Your Photo');
    }
  };

  // Handle suggestion image click
  const handleSuggestionImageClick = (suggestion: PlantSuggestion) => {
    const images: string[] = [];
    
    // Add main image if available
    if (suggestion.imageUrl) {
      images.push(suggestion.imageUrl);
    }
    
    // Add similar images
    if (suggestion.similar_images && suggestion.similar_images.length > 0) {
      images.push(...suggestion.similar_images);
    }
    
    if (images.length > 0) {
      const title = `🌿 ${suggestion.commonNames[0] || suggestion.scientificName}`;
      openImageModal(images, 0, title);
    }
  };

  // Change image with reset
  const changeImage = (newIndex: number) => {
    setCurrentImageIndex(newIndex);
    // Use a small delay to ensure the UI updates before resetting gesture state
    setTimeout(() => {
      resetImageTransform();
    }, 50);
  };

  // Simple close
  const closeImageModal = () => {
    setShowImageModal(false);
    resetImageTransform();
  };

  // Handle pinch gesture
  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: false }
  );

  const onPinchHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const newScale = Math.min(Math.max(baseScale.current * event.nativeEvent.scale, 0.5), 4);
      baseScale.current = newScale;
      scale.setValue(newScale);
      pinchScale.setValue(1);
    }
  };

  // Handle pan gesture
  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: false }
  );

  const onPanHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastPanX.current += event.nativeEvent.translationX;
      lastPanY.current += event.nativeEvent.translationY;
      translateX.setOffset(lastPanX.current);
      translateY.setOffset(lastPanY.current);
      translateX.setValue(0);
      translateY.setValue(0);
    }
  };

  const getConfidenceColor = (probability: number) => {
    if (probability >= 80) return '#059669'; // High confidence - green
    if (probability >= 60) return '#d97706'; // Medium confidence - orange
    return '#dc2626'; // Low confidence - red
  };

  const getConfidenceText = (probability: number) => {
    if (probability >= 80) return 'High Confidence';
    if (probability >= 60) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ 
        backgroundColor: '#e0f2fe', 
        padding: 16, 
        borderRadius: 12, 
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#0284c7'
      }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0284c7', textAlign: 'center', marginBottom: 8 }}>
          🌿 Plant Identification Results
        </Text>
        <Text style={{ fontSize: 14, color: '#075985', textAlign: 'center', marginBottom: 12 }}>
          Top {suggestions.length} matches found. Select the closest match to add to your collection.
        </Text>

        <Text style={{ fontSize: 12, color: '#075985', textAlign: 'center', marginBottom: 16, fontStyle: 'italic' }}>
          💡 Many plants show multiple photos - tap any image to browse and zoom for detailed comparison
        </Text>

        {/* User's Original Photo */}
        {userPhotoBase64 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0284c7', marginBottom: 8, textAlign: 'center' }}>
              📸 Your Photo
            </Text>
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity onPress={handleUserPhotoClick}>
                <Image 
                  source={{ uri: `data:image/jpeg;base64,${userPhotoBase64}` }} 
                  style={{ 
                    width: 200, 
                    height: 150, 
                    borderRadius: 12, 
                    borderWidth: 2,
                    borderColor: '#0284c7'
                  }}
                  resizeMode="cover"
                />
                {/* Zoom hint overlay */}
                <View style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  paddingHorizontal: 4,
                  paddingVertical: 2,
                  borderRadius: 4
                }}>
                  <Text style={{ color: 'white', fontSize: 8, fontWeight: '600' }}>
                    🔍 Tap to zoom
                  </Text>
                </View>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: '#075985', marginTop: 4, textAlign: 'center' }}>
                Compare this with the suggestions below
              </Text>
            </View>
          </View>
        )}

        {/* Back to Camera Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#0284c7',
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 8,
            alignSelf: 'center'
          }}
          onPress={onBackToCamera}
        >
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
            📷 Take New Photo
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {visibleSuggestionsFiltered.length === 0 ? (
          <View style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 20
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#6b7280', marginBottom: 8, textAlign: 'center' }}>
              🤔 All suggestions removed
            </Text>
            <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 16 }}>
              You've marked all suggestions as incorrect. Try describing your plant to get AI-powered alternatives.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#f59e0b',
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 8,
                marginBottom: 8
              }}
              onPress={() => setShowRequestBetterModal(true)}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>
                🤖 Get AI Suggestions
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          suggestions.map((suggestion, index) => {
            // Skip suggestions that are already fully rejected
            if (rejectedSuggestions.includes(suggestion.scientificName)) {
              return null;
            }
            
            // Get animation values for this suggestion
            let animations = suggestionAnimations.current[suggestion.scientificName];
            if (!animations) {
              animations = {
                opacity: new Animated.Value(1),
                scale: new Animated.Value(1),
              };
              suggestionAnimations.current[suggestion.scientificName] = animations;
            }
            
            // Count total available images for this suggestion
            const totalImages = (suggestion.imageUrl ? 1 : 0) + (suggestion.similar_images?.length || 0);
            
            return (
              <Animated.View 
                key={`${suggestion.scientificName}-${index}`} 
                style={{
                backgroundColor: 'white',
                marginBottom: 16,
                borderRadius: 12,
                padding: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                borderWidth: 1,
                  borderColor: '#f3f4f6',
                  opacity: animations.opacity,
                  transform: [{ scale: animations.scale }]
                }}
              >
                {/* Probability Badge */}
                <View style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  backgroundColor: getConfidenceColor(suggestion.probability),
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  zIndex: 1
                }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                    {suggestion.probability}%
                  </Text>
                </View>

                {/* Plant Image */}
                {suggestion.imageUrl && (
                  <TouchableOpacity onPress={() => handleSuggestionImageClick(suggestion)}>
                    <View style={{ position: 'relative' }}>
                      <Image 
                        source={{ uri: suggestion.imageUrl }} 
                        style={{ 
                          width: '100%', 
                          height: 160, 
                          borderRadius: 8, 
                          marginBottom: 12,
                          backgroundColor: '#f9fafb'
                        }}
                        resizeMode="cover"
                        loadingIndicatorSource={{ 
                          uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB4PSIxNCIgeT0iMTQiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj4KPHBhdGggZD0ibTE5IDcgNCA0IDQtNE03IDNhMSAxIDAgMCAxIDEtMWg5YTEgMSAwIDAgMSAxIDFWOGExIDEgMCAwIDEtMSAxSDhhMSAxIDAgMCAxLTEtMVoiLz4KPHN2ZyB4PSI0IiB5PSI0IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+CjxtIDEyIDZhNiA2IDAgMCAwIDYgNiIvPgo8L3N2Zz4KPC9zdmc+' 
                        }}
                        onLoad={() => {
                          console.log(`✅ Successfully loaded image: ${suggestion.imageUrl}`);
                        }}
                        onError={() => {
                          console.log(`❌ Failed to load image: ${suggestion.imageUrl}`);
                        }}
                        onLoadStart={() => {
                          console.log(`🔄 Starting to load image: ${suggestion.imageUrl}`);
                        }}
                        onLoadEnd={() => {
                          console.log(`🏁 Finished loading image: ${suggestion.imageUrl}`);
                        }}
                      />
                      {/* Visual comparison hint */}
                      <View style={{
                        position: 'absolute',
                        bottom: 16,
                        left: 8,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4
                      }}>
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                          📸 Compare with your photo above
                        </Text>
                      </View>
                      
                      {/* Zoom and browse hint */}
                      <View style={{
                        position: 'absolute',
                        bottom: 16,
                        right: 8,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4
                      }}>
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                          🔍 Tap to zoom {totalImages > 1 && `(${totalImages} photos)`}
                        </Text>
                      </View>

                      {/* Multiple images indicator - make it more prominent */}
                      {totalImages > 1 && (
                        <View style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          backgroundColor: '#059669',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: 'white'
                        }}>
                          <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>
                            📸 {totalImages} Photos
                          </Text>
                        </View>
                      )}

                      {/* Loading overlay for slow images */}
                      <View style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 12,
                        backgroundColor: 'rgba(243, 244, 246, 0.8)',
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: 0 // Will be controlled by onLoadStart/onLoadEnd if needed
                      }}>
                        <Text style={{ color: '#6b7280', fontSize: 12, fontWeight: '600' }}>
                          🌿 Loading plant image...
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Plant Info */}
                <View style={{ paddingRight: 80 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#15803d', marginBottom: 4 }}>
                    {suggestion.commonNames[0] || suggestion.scientificName}
                  </Text>
                  
                  {suggestion.commonNames[0] && (
                    <Text style={{ fontSize: 14, fontStyle: 'italic', color: '#6b7280', marginBottom: 8 }}>
                      {suggestion.scientificName}
                    </Text>
                  )}

                  <View style={{
                    backgroundColor: getConfidenceColor(suggestion.probability) + '20',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    alignSelf: 'flex-start',
                    marginBottom: 8
                  }}>
                    <Text style={{ 
                      fontSize: 12, 
                      fontWeight: '600',
                      color: getConfidenceColor(suggestion.probability)
                    }}>
                      {getConfidenceText(suggestion.probability)}
                    </Text>
                  </View>

                  {suggestion.commonNames.length > 1 && (
                    <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                      Also known as: {suggestion.commonNames.slice(1, 3).join(', ')}
                      {suggestion.commonNames.length > 3 && ` +${suggestion.commonNames.length - 3} more`}
                    </Text>
                  )}

                  <Text style={{ fontSize: 13, color: '#374151', lineHeight: 18 }}>
                    {suggestion.description}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: isLoadingCombined ? '#9ca3af' : '#059669',
                      paddingVertical: 12,
                      borderRadius: 8,
                      alignItems: 'center',
                      opacity: isLoadingCombined ? 0.6 : 1,
                    }}
                    onPress={() => handleSelectPlant(suggestion)}
                    disabled={isLoadingCombined}
                  >
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                      {isLoadingCombined ? '⏳ Processing...' : '✓ Select This Plant'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 8,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      backgroundColor: '#fafafa'
                    }}
                    onPress={() => {
                      rejectSuggestion(suggestion.scientificName, suggestion.commonNames[0]);
                    }}
                  >
                    <Text style={{ color: '#6b7280', fontWeight: '600', fontSize: 14 }}>
                      ✗ Not This
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* AI Confirmation Button */}
                <TouchableOpacity
                  style={{
                    marginTop: 8,
                    backgroundColor: '#0ea5e9',
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#0284c7'
                  }}
                  onPress={() => {
                    setConfirmationSuggestion(suggestion);
                    setShowConfirmationModal(true);
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                    🤖 Confirm with AI Questions
                  </Text>
                  <Text style={{ color: '#bae6fd', fontSize: 11, marginTop: 2 }}>
                    Answer specific questions to verify this is the right plant
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}

        {/* Request Better Identification Button - Only show if there are visible suggestions */}
        {visibleSuggestionsFiltered.length > 0 && (
          <TouchableOpacity
            style={{
              backgroundColor: isLoadingCombined ? '#9ca3af' : '#f59e0b',
              paddingVertical: 16,
              paddingHorizontal: 20,
              borderRadius: 12,
              alignItems: 'center',
              marginVertical: 20,
              borderWidth: 2,
              borderColor: isLoadingCombined ? '#6b7280' : '#fbbf24',
              opacity: isLoadingCombined ? 0.6 : 1,
            }}
            onPress={() => setShowRequestBetterModal(true)}
            disabled={isLoadingCombined}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
              {isLoadingCombined ? '🤖 Processing AI...' : '🤖 None of these look right?'}
            </Text>
            <Text style={{ color: '#fef3c7', fontSize: 12, textAlign: 'center' }}>
              {isLoadingCombined ? 'Please wait...' : 'Get 5 AI-powered alternatives using GPT-4o vision analysis'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Image Zoom Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {/* Header */}
          <View style={{
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            zIndex: 1
          }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', flex: 1 }}>
              {modalTitle}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20
              }}
              onPress={closeImageModal}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {/* Image Counter */}
          {modalImages.length > 1 && (
            <View style={{
              position: 'absolute',
              top: 100,
              alignSelf: 'center',
              backgroundColor: 'rgba(0,0,0,0.7)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              zIndex: 1
            }}>
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                {currentImageIndex + 1} of {modalImages.length}
              </Text>
            </View>
          )}

          {/* Main Image with Gesture Handlers */}
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: 140, // Account for header
            paddingBottom: modalImages.length > 1 ? 120 : 60 // Account for thumbnails
          }}>
            <PanGestureHandler
              onGestureEvent={onPanGestureEvent}
              onHandlerStateChange={onPanHandlerStateChange}
              minPointers={1}
              maxPointers={1}
            >
              <Animated.View>
                <PinchGestureHandler
                  onGestureEvent={onPinchGestureEvent}
                  onHandlerStateChange={onPinchHandlerStateChange}
                >
                  <Animated.View
                    style={{
                      transform: [
                        { scale: Animated.multiply(scale, pinchScale) },
                        { translateX: translateX },
                        { translateY: translateY }
                      ]
                    }}
                  >
                    <Image
                      source={{ uri: modalImages[currentImageIndex] }}
                      style={{
                        width: Math.min(screenWidth * 0.8, 350),
                        height: Math.min(screenWidth * 0.8, 350),
                        borderRadius: 12
                      }}
                      resizeMode="contain"
                      loadingIndicatorSource={{ 
                        uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB4PSIxNCIgeT0iMTQiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj4KPHBhdGggZD0ibTE5IDcgNCA0IDQtNE03IDNhMSAxIDAgMCAxIDEtMWg5YTEgMSAwIDAgMSAxIDFWOGExIDEgMCAwIDEtMSAxSDhhMSAxIDAgMCAxLTEtMVoiLz4KPHN2ZyB4PSI0IiB5PSI0IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+CjxtIDEyIDZhNiA2IDAgMCAwIDYgNiIvPgo8L3N2Zz4KPC9zdmc+' 
                      }}
                      onLoad={() => {
                        console.log(`✅ Modal image loaded: ${modalImages[currentImageIndex]}`);
                      }}
                      onError={() => {
                        console.log(`❌ Failed to load modal image: ${modalImages[currentImageIndex]}`);
                      }}
                      onLoadStart={() => {
                        console.log(`🔄 Loading modal image: ${modalImages[currentImageIndex]}`);
                      }}
                    />
                  </Animated.View>
                </PinchGestureHandler>
              </Animated.View>
            </PanGestureHandler>
            
            {/* Zoom instruction */}
            <View style={{
              position: 'absolute',
              bottom: 20,
              alignSelf: 'center',
              backgroundColor: 'rgba(0,0,0,0.7)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20
            }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                🔍 Pinch to zoom • Drag to pan
              </Text>
            </View>
          </View>

          {/* Navigation Buttons */}
          {modalImages.length > 1 && (
            <>
              {/* Previous Button */}
              {currentImageIndex > 0 && (
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    left: 20,
                    top: '50%',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 25
                  }}
                  onPress={() => changeImage(currentImageIndex - 1)}
                >
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>‹</Text>
                </TouchableOpacity>
              )}

              {/* Next Button */}
              {currentImageIndex < modalImages.length - 1 && (
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    right: 20,
                    top: '50%',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 25
                  }}
                  onPress={() => changeImage(currentImageIndex + 1)}
                >
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>›</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Bottom Image Thumbnails */}
          {modalImages.length > 1 && (
            <View style={{
              position: 'absolute',
              bottom: 40,
              left: 0,
              right: 0,
              paddingHorizontal: 20
            }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {modalImages.map((imageUri, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => changeImage(index)}
                      style={{
                        borderWidth: currentImageIndex === index ? 2 : 1,
                        borderColor: currentImageIndex === index ? '#0284c7' : 'rgba(255,255,255,0.5)',
                        borderRadius: 8,
                        overflow: 'hidden'
                      }}
                    >
                      <Image
                        source={{ uri: imageUri }}
                        style={{
                          width: 60,
                          height: 60,
                          opacity: currentImageIndex === index ? 1 : 0.7
                        }}
                        resizeMode="cover"
                        loadingIndicatorSource={{ 
                          uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgZmlsbD0iI0Y5RkFGQiIvPgo8L3N2Zz4K' 
                        }}
                        onError={() => {
                          console.log(`❌ Failed to load thumbnail: ${imageUri}`);
                        }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* Plant Selection Confirmation Modal */}
      <Modal
        visible={showFeedbackModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 420,
            maxHeight: '90%'
          }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#15803d', marginBottom: 16, textAlign: 'center' }}>
                Confirm Plant Selection
              </Text>
              
              {selectedSuggestion && (
                <>
                  <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                    {selectedSuggestion.commonNames[0] || selectedSuggestion.scientificName}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                    Confidence: {selectedSuggestion.probability}%
                  </Text>
                </>
              )}

              {/* Notes Section */}
              <Text style={{ fontSize: 14, color: '#374151', marginBottom: 12 }}>
                Optional: Add any notes or corrections about this identification:
              </Text>
              
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  height: 80,
                  textAlignVertical: 'top',
                  marginBottom: 16
                }}
                placeholder="e.g., 'Flowers were actually purple, not white' or 'Found in urban area'"
                multiline
                value={userFeedback}
                onChangeText={setUserFeedback}
              />

              {/* Medicinal Details Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#f0fdf4',
                  borderWidth: 1,
                  borderColor: '#bbf7d0',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginBottom: 20
                }}
                onPress={() => {
                  setShowFeedbackModal(false);
                  setShowMedicinalDetailsModal(true);
                }}
              >
                <Text style={{ color: '#166534', fontWeight: '600' }}>
                  🌿 Add Medicinal Details
                </Text>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#6b7280',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    setShowFeedbackModal(false);
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: isAddingToCollection ? '#9ca3af' : '#059669',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    opacity: isAddingToCollection ? 0.6 : 1,
                  }}
                  onPress={() => confirmSelection(true)}
                  disabled={isAddingToCollection}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    {isAddingToCollection ? '⏳ Adding...' : 'Add to Collection'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Request Better Identification Modal */}
      <Modal
        visible={showRequestBetterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRequestBetterModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 420,
            maxHeight: '90%'
          }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 24, marginBottom: 8 }}>🤖✨</Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#f59e0b', textAlign: 'center' }}>
                  GPT-4o Plant Analysis
                </Text>
                <Text style={{ fontSize: 12, color: '#78350f', textAlign: 'center', marginTop: 4 }}>
                  Advanced vision analysis with altitude & habitat understanding
                </Text>
              </View>
              
              <View style={{ 
                backgroundColor: '#fef3c7', 
                padding: 12, 
                borderRadius: 8, 
                marginBottom: 16,
                borderLeftWidth: 4,
                borderLeftColor: '#f59e0b'
              }}>
                <Text style={{ fontSize: 13, color: '#92400e', fontWeight: '600', marginBottom: 4 }}>
                  💡 How it works:
                </Text>
                <Text style={{ fontSize: 12, color: '#78350f', lineHeight: 16 }}>
                  GPT-4o analyzes your photo AND description to find 5 alternative species, with special attention to altitude, habitat, and environmental factors that standard databases often miss.
                </Text>
              </View>

              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                📝 Describe your plant in detail:
              </Text>

              {/* Helpful examples */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                  ✨ Include details like:
                </Text>
                <View style={{ paddingLeft: 8 }}>
                  <Text style={{ fontSize: 11, color: '#78350f', marginBottom: 2 }}>
                    🌸 <Text style={{ fontWeight: '600' }}>Flowers:</Text> "Small white/pink clusters, 5 petals"
                  </Text>
                  <Text style={{ fontSize: 11, color: '#78350f', marginBottom: 2 }}>
                    🍃 <Text style={{ fontWeight: '600' }}>Leaves:</Text> "Heart-shaped, serrated edges, fuzzy texture"
                  </Text>
                  <Text style={{ fontSize: 11, color: '#78350f', marginBottom: 2 }}>
                    📏 <Text style={{ fontWeight: '600' }}>Size:</Text> "About 3 feet tall, spreading ground cover"
                  </Text>
                  <Text style={{ fontSize: 11, color: '#78350f', marginBottom: 2 }}>
                    🌍 <Text style={{ fontWeight: '600' }}>Location:</Text> "Forest edge, shady area, eastern US"
                  </Text>
                  <Text style={{ fontSize: 11, color: '#78350f', marginBottom: 2 }}>
                    ⛰️ <Text style={{ fontWeight: '600' }}>Altitude:</Text> "Mountain meadow, 6000ft elevation"
                  </Text>
                  <Text style={{ fontSize: 11, color: '#78350f', marginBottom: 2 }}>
                    🕐 <Text style={{ fontWeight: '600' }}>Timing:</Text> "Blooming in spring, growing near oak trees"
                  </Text>
                  <Text style={{ fontSize: 11, color: '#78350f', marginBottom: 2 }}>
                    🌱 <Text style={{ fontWeight: '600' }}>Habitat:</Text> "Rocky soil, full sun, dry conditions"
                  </Text>
                </View>
              </View>
              
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  height: 120,
                  textAlignVertical: 'top',
                  marginBottom: 16,
                  fontSize: 13,
                  lineHeight: 18
                }}
                placeholder="e.g., 'Small alpine shrub with tiny white 4-petaled flowers in dense clusters. Needle-like evergreen leaves. About 1-2 feet tall, very compact growth. Found at 8500ft elevation in Rocky Mountains, Colorado. Growing on exposed rocky slopes with full sun. Blooming in late spring/early summer.'"
                multiline
                value={userDescription}
                onChangeText={setUserDescription}
              />

              {/* Show rejected suggestions reminder */}
              {visibleSuggestionsFiltered.length < suggestions.length && (
                <View style={{ 
                  backgroundColor: '#fef2f2', 
                  padding: 10, 
                  borderRadius: 6, 
                  marginBottom: 16,
                  borderLeftWidth: 3,
                  borderLeftColor: '#ef4444'
                }}>
                  <Text style={{ fontSize: 12, color: '#991b1b', fontWeight: '600' }}>
                    🚫 AI will avoid suggesting these rejected species:
                  </Text>
                  <Text style={{ fontSize: 11, color: '#7f1d1d', marginTop: 2 }}>
                    {suggestions
                      .filter(s => !visibleSuggestionsFiltered.includes(s))
                      .map(s => s.commonNames[0] || s.scientificName)
                      .join(', ')}
                  </Text>
                </View>
              )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#6b7280',
                    paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
                  onPress={() => {
                    setShowRequestBetterModal(false);
                    setUserDescription('');
                  }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                    flex: 2,
                    backgroundColor: isLoading ? '#9ca3af' : (userDescription.trim() ? '#f59e0b' : '#d1d5db'),
                    paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: isLoading ? 0.6 : 1,
                }}
                onPress={requestBetterIdentification}
                disabled={!userDescription.trim() || isLoading}
              >
                  <Text style={{ 
                    color: userDescription.trim() ? 'white' : '#9ca3af', 
                    fontWeight: '600',
                    fontSize: 13
                  }}>
                    {isLoading ? '🔍 Finding better species matches...' : '🔍 Get 5 Alternative Suggestions'}
                </Text>
              </TouchableOpacity>
            </View>

              {userDescription.trim() === '' && (
                <Text style={{ fontSize: 11, color: '#ef4444', textAlign: 'center', marginTop: 8 }}>
                  Please provide a description to get the best AI results
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Loading overlay for GPT-4o analysis */}
      {isLoading && !showRequestBetterModal && (
        <View style={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: screenWidth + 200,
          height: screenHeight + 200,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: 'white',
            paddingVertical: 20,
            paddingHorizontal: 24,
            borderRadius: 12,
            alignItems: 'center',
            width: '80%',
            maxWidth: 300,
          }}>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '600', color: '#92400e', textAlign: 'center' }}>
              🔍 Finding alternative species matches...
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: '#78350f', textAlign: 'center' }}>
              Analyzing photo & description for better results
            </Text>
          </View>
        </View>
      )}

      {/* Medicinal Details Modal */}
      <PlantMedicinalDetailsModal
        visible={showMedicinalDetailsModal}
        onClose={() => setShowMedicinalDetailsModal(false)}
        onSave={(details) => {
          setMedicinalDetails(details);
          setShowMedicinalDetailsModal(false);
          setShowFeedbackModal(true);
        }}
        plantName={selectedSuggestion?.commonNames[0] || selectedSuggestion?.scientificName || ''}
      />

      {/* AI Confirmation Modal */}
      {confirmationSuggestion && (
        <PlantConfirmationModal
          visible={showConfirmationModal}
          onClose={() => {
            setShowConfirmationModal(false);
            setConfirmationSuggestion(null);
          }}
          plantSuggestion={confirmationSuggestion}
          userPhotoBase64={userPhotoBase64}
          onConfirm={handleConfirmPlant}
          onRequestBetterIdentification={handleRequestBetterFromConfirmation}
        />
      )}
    </View>
  );
} 