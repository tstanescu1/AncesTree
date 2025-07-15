import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Clipboard, Modal, ActivityIndicator } from "react-native";
import { api } from "../convex/_generated/api";
import { useAction, useQuery } from "convex/react";

// Import our new components
import PlantIdentificationView from './components/PlantIdentificationView';
import PlantCollectionView from './components/PlantCollectionView';
import PlantDetailView from './components/PlantDetailView';
import ZoomModal from './components/ZoomModal';
import PlantSuggestionsView from './components/PlantSuggestionsView';
import FullscreenMapModal from './components/FullscreenMapModal';

// Import custom hooks
import { useImageHandler } from './hooks/useImageHandler';
import { useLocationHandler, LocationData } from './hooks/useLocationHandler';

export default function MainScreen() {
    // State management - moved selectedPlantId before plantDetail query
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [currentView, setCurrentView] = useState<'identify' | 'collection' | 'detail'>('identify');
    const [loading, setLoading] = useState(false);
    const [deletingPlant, setDeletingPlant] = useState(false);
    const [deletingSighting, setDeletingSighting] = useState(false);
    const [settingDefaultPhoto, setSettingDefaultPhoto] = useState(false);
    const [aiLoading, setAiLoading] = useState(false); // Separate loading state for AI requests
    const [plant, setPlant] = useState<any>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [adminMode, setAdminMode] = useState(false);
    const [adminTapCount, setAdminTapCount] = useState(0);
    const [showRecentPlants, setShowRecentPlants] = useState(false);
    const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
    const [multiPhotoMode, setMultiPhotoMode] = useState(false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    
    // Location state
    const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
    const [useCurrentLocation, setUseCurrentLocation] = useState<boolean>(true); // Auto-enable GPS
    
    // Editing states
    const [isEditingTraditionalUsage, setIsEditingTraditionalUsage] = useState(false);
    const [editedTraditionalUsage, setEditedTraditionalUsage] = useState('');
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [editedTags, setEditedTags] = useState<string[]>([]);
    const [editPreviewMode, setEditPreviewMode] = useState(false);
    const [textSelection, setTextSelection] = useState({ start: 0, end: 0 });
    const [showSafetyInfo, setShowSafetyInfo] = useState(false);
    const [collectionRefreshTrigger, setCollectionRefreshTrigger] = useState(0);

    // State for multiple plant suggestions
    const [plantSuggestions, setPlantSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [currentPhotoBase64, setCurrentPhotoBase64] = useState<string>('');
    const [currentCapturedPhotos, setCurrentCapturedPhotos] = useState<string[]>([]); // Track photos from multi-photo mode

    // Convex actions and queries
    const identify = useAction(api.identifyPlant.identifyPlant);
    const identifyMultiple = useAction(api.identifyPlant.identifyPlantWithMultiplePhotos);
    const confirmPlantSelection = useAction(api.identifyPlant.confirmPlantSelection);
    const requestBetterIdentification = useAction(api.identifyPlant.requestBetterIdentification);
    const storeRejectionFeedback = useAction(api.identifyPlant.storeRejectionFeedback);
    const addPhotoDirectly = useAction(api.identifyPlant.addPhotoToExistingPlant);
    const deletePlantAction = useAction(api.identifyPlant.adminDeletePlant);
    const deleteSightingAction = useAction(api.identifyPlant.adminDeleteSighting);
    const setDefaultPhotoAction = useAction(api.identifyPlant.setDefaultPhoto);
    const setDefaultDatabaseImageAction = useAction(api.identifyPlant.setDefaultDatabaseImage);
    const updateTraditionalUsage = useAction(api.identifyPlant.updateTraditionalUsage);
    const updatePlantTags = useAction(api.identifyPlant.updatePlantTags);
    const plants = useQuery(api.identifyPlant.getAllPlants);
    const recentPlants = useQuery(api.identifyPlant.getRecentlyIdentified, { limit: 5 });

    // Add the re-extract action
    

    // Location handler
    const { currentLocation, getCurrentLocation, requestLocationPermission } = useLocationHandler();

    // Auto-enable GPS on app start
    React.useEffect(() => {
        const initializeLocation = async () => {
            try {
                console.log('🌍 Auto-requesting GPS permissions on app start...');
                const hasPermission = await requestLocationPermission();
                if (hasPermission) {
                    console.log('✅ GPS permissions granted, attempting to get current location...');
                    const location = await getCurrentLocation();
                    if (location) {
                        console.log('📍 Auto-enabled GPS location:', location.latitude, location.longitude);
                        setSelectedLocation(location);
                        setUseCurrentLocation(true);
                    }
                } else {
                    console.log('❌ GPS permissions not granted');
                    setUseCurrentLocation(false);
                }
            } catch (error) {
                console.error('Failed to auto-enable GPS:', error);
                setUseCurrentLocation(false);
            }
        };
        
        initializeLocation();
    }, []);

    // Get detailed plant data when viewing detail
    const plantDetail = useQuery(api.identifyPlant.getPlantById, selectedPlantId ? { plantId: selectedPlantId as any } : "skip");
    const plantFeedback = useQuery(api.identifyPlant.getPlantFeedback, selectedPlantId ? { plantId: selectedPlantId as any } : "skip");
    const addPlantFeedback = useAction(api.identifyPlant.addPlantFeedback);
    const editPlantFeedback = useAction(api.identifyPlant.editPlantFeedback);
    const extractAdvancedFields = useAction(api.identifyPlant.extractAndUpdateAdvancedPlantProfile);
    const addLocationToPlant = useAction(api.identifyPlant.addLocationToPlant);

    // Custom hooks
    const { compressImage, requestPermissions, launchCamera, launchImageLibrary, showImageSourceAlert } = useImageHandler();

    // Helper function to get current location data
    const getCurrentLocationData = (): LocationData | null => {
        // If useCurrentLocation is true, use the current GPS location
        // Otherwise, use the selected location from the map
        if (useCurrentLocation && currentLocation) {
            return currentLocation;
        }
        return selectedLocation;
    };

    // Helper functions
    const getAllUniqueTags = () => {
        if (!plants) return [];
        const allTags = plants.flatMap(plant => plant.medicinalTags || []);
        return [...new Set(allTags)];
    };

    const copyPlantInfo = async (plant: any) => {
        const info = `🌿 ${plant.commonNames?.[0] || plant.scientificName}
📝 Scientific name: ${plant.scientificName}
🔬 Genus: ${plant.scientificName.split(' ')[0]}
🏥 Medicinal properties: ${plant.medicinalTags?.length > 0 ? plant.medicinalTags.join(", ") : "None recorded"}
🔍 Spotted: ${plant.sightingsCount} time${plant.sightingsCount !== 1 ? 's' : ''}
📸 Photos taken: ${plant.userPhotos?.length || 0}
📅 First spotted: ${plant.createdAt ? new Date(plant.createdAt).toLocaleDateString() : 'Unknown'}
📅 Last seen: ${plant.lastSeen ? new Date(plant.lastSeen).toLocaleDateString() : 'Unknown'}

📚 Traditional Usage:
${plant.traditionalUsage || "No traditional usage information available"}

⚠️ Safety: Always consult healthcare professionals before using plants medicinally. This information is for educational purposes only.

Collected with AncesTree 🌿📱`;
        
        try {
            await Clipboard.setString(info);
            alert('📋 Plant information copied to clipboard!');
        } catch (error) {
            alert('❌ Failed to copy to clipboard');
        }
    };

    // Photo handling functions
    const takePhoto = async () => {
        try {
            const permissions = await requestPermissions();
            if (!permissions.camera && !permissions.media) return;
            
            // Show choice dialog upfront
            showImageSourceAlert(
                // Camera option
                async () => {
                    if (!permissions.camera) {
                        Alert.alert("Camera Not Available", "Camera permission is required to take photos.");
                        return;
                    }
                    const result = await launchCamera();
                    if (result && !result.canceled) {
                        await processPhoto(result.assets[0]);
                    }
                },
                // Library option  
                async () => {
                    if (!permissions.media) {
                        Alert.alert("Library Not Available", "Photo library permission is required to select photos.");
                        return;
                    }
                    const result = await launchImageLibrary();
                    if (result && !result.canceled) {
                        await processPhoto(result.assets[0]);
                    }
                }
            );
        } catch (error) {
            console.error("Error with photo picker:", error);
            Alert.alert("Error", "Unable to access photo picker.");
        }
    };

    const processPhoto = async (photo: any) => {
        setLoading(true);
        try {
            if (!photo.uri) throw new Error("Failed to get image");
            
            const imageResult = await compressImage(photo.uri);
            const { base64, location } = imageResult;
            
            setCurrentPhotoBase64(base64); // Store for later use
            setCurrentCapturedPhotos([]); // Clear multi-photo state for single photo mode
            
            // Store location from image if found
            if (location) {
                console.log('📍 GPS location found in image:', location);
                setSelectedLocation({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    timestamp: location.timestamp,
                });
            }
            
            // Identify the plant
            const result = await identify({ base64 });
            
            console.log('🌿 Identified plants:', result.suggestions.length);
            
            if (result.suggestions && result.suggestions.length > 0) {
                setPlantSuggestions(result.suggestions);
                setShowSuggestions(true);
            } else {
                Alert.alert('Plant Not Found', 'I could not identify this plant. Try taking another photo with better lighting and focus.');
            }
        } catch (error) {
            console.error('Error processing photo:', error);
            Alert.alert('Error', 'Failed to identify plant');
        } finally {
            setLoading(false);
        }
    };

    const addPhotoToCapture = async () => {
        try {
            const permissions = await requestPermissions();
            if (!permissions.camera && !permissions.media) return;
            
            // Show choice dialog upfront
            showImageSourceAlert(
                // Camera option
                async () => {
                    if (!permissions.camera) {
                        Alert.alert("Camera Not Available", "Camera permission is required to take photos.");
                        return;
                    }
                    const result = await launchCamera();
                    if (result && !result.canceled) {
                        await processPhotoForCapture(result.assets[0]);
                    }
                },
                // Library option
                async () => {
                    if (!permissions.media) {
                        Alert.alert("Library Not Available", "Photo library permission is required to select photos.");
                        return;
                    }
                    const result = await launchImageLibrary();
                    if (result && !result.canceled) {
                        await processPhotoForCapture(result.assets[0]);
                    }
                }
            );
        } catch (error) {
            console.error("Error with photo picker:", error);
            Alert.alert("Error", "Unable to access photo picker.");
        }
    };

    const processPhotoForCapture = async (photo: any) => {
        try {
            if (!photo.uri) throw new Error("Failed to get image");
            
            const imageResult = await compressImage(photo.uri);
            const { base64, location } = imageResult;
            
            setCapturedPhotos(prev => [...prev, base64]);
            
            // Show location info if found in any photo
            const locationMessage = location 
                ? `\n\n📍 GPS coordinates found in this photo: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                : '';
            
            Alert.alert(
                "Photo Added!", 
                `Photo ${capturedPhotos.length + 1} captured successfully!\n\nYou can add more photos of different angles, leaves, flowers, etc. for better identification accuracy.${locationMessage}`,
                [{ text: "OK" }]
            );
        } catch (err) {
            console.error("Error processing photo:", err);
            Alert.alert("Error", "Failed to process photo");
        }
    };

    const processMultiplePhotos = async () => {
        if (capturedPhotos.length === 0) {
            Alert.alert("No Photos", "Please capture at least one photo first.");
            return;
        }

        setLoading(true);
        try {
            const res = await identifyMultiple({ photos: capturedPhotos });
            
            console.log("🌿 Multi-photo identified plants:", res.suggestions.length);
            
            // Always show suggestions view if we have any results
            if (res.suggestions && res.suggestions.length > 0) {
                setPlantSuggestions(res.suggestions);
                setShowSuggestions(true);
                setPlant(null); // Clear single plant result
                setCurrentPhotoBase64(capturedPhotos[0]); // Use first photo as representative
                setCurrentCapturedPhotos([...capturedPhotos]); // Store all photos for later use
                
                // Note: For multi-photo mode, we don't automatically set location
                // as different photos might have different GPS data
                // User can manually set location if needed
            } else {
                throw new Error("No plant match found");
            }
            
            setCapturedPhotos([]);
            setMultiPhotoMode(false);
        } catch (err) {
            console.error("Error identifying plant:", err);
            Alert.alert("Error", "Failed to identify plant with multiple photos. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const clearCapturedPhotos = () => {
        Alert.alert(
            "Clear Photos",
            "Are you sure you want to clear all captured photos?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Clear", 
                    style: "destructive",
                    onPress: () => {
                        setCapturedPhotos([]);
                        setMultiPhotoMode(false);
                    }
                }
            ]
        );
    };

    const addPhotoToPlant = async () => {
        if (!plantDetail) return;
        
        try {
            const permissions = await requestPermissions();
            if (!permissions.camera && !permissions.media) return;
            
            // Show choice dialog upfront
            showImageSourceAlert(
                // Camera option
                async () => {
                    if (!permissions.camera) {
                        Alert.alert("Camera Not Available", "Camera permission is required to take photos.");
                        return;
                    }
                    const result = await launchCamera();
                    if (result && !result.canceled) {
                        await processAddPhoto(result.assets[0]);
                    }
                },
                // Library option
                async () => {
                    if (!permissions.media) {
                        Alert.alert("Library Not Available", "Photo library permission is required to select photos.");
                        return;
                    }
                    const result = await launchImageLibrary();
                    if (result && !result.canceled) {
                        await processAddPhoto(result.assets[0]);
                    }
                }
            );
        } catch (err) {
            console.error("Error with photo picker:", err);
            Alert.alert("Error", "Unable to access photo picker.");
        }
    };

    const processAddPhoto = async (photo: any) => {
        setLoading(true);
        try {
            if (!photo.uri) throw new Error("Failed to get image");
            if (!plantDetail || 'error' in plantDetail) throw new Error("No plant selected or plant error");
            
            const imageResult = await compressImage(photo.uri);
            const { base64, location } = imageResult;
            
            // Show location info if found
            if (location) {
                console.log(`📍 GPS coordinates found in added photo: ${location.latitude}, ${location.longitude}`);
            }
            
            await addPhotoDirectly({ 
                plantId: plantDetail._id, 
                userPhotoBase64: base64,
                location: location ? {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    timestamp: location.timestamp,
                } : undefined
            });
            
            // Refresh the plant detail view automatically
            const currentPlantId = plantDetail._id;
            setSelectedPlantId(null);
            setTimeout(() => {
                setSelectedPlantId(currentPlantId);
            }, 100);
            
        } catch (err) {
            console.error("Error adding photo:", err);
            Alert.alert("Error", "Failed to add photo to this plant");
        } finally {
            setLoading(false);
        }
    };

    // Admin functions with improved loading states
    const handleDeletePlant = async (plantId: string, plantName: string) => {
        Alert.alert(
            "⚠️ Delete Plant Species",
            `Are you sure you want to delete "${plantName}" and ALL its sightings?\n\nThis action cannot be undone!`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setDeletingPlant(true);
                        try {
                            await deletePlantAction({ plantId });
                            setSelectedPlantId(null);
                            setCurrentView('collection');
                            // Success feedback without blocking alert
                            console.log('✅ Plant deleted successfully');
                        } catch (error) {
                            Alert.alert('❌ Error', 'Failed to delete plant');
                            console.error('Delete error:', error);
                        } finally {
                            setDeletingPlant(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteSighting = async (sightingId: any, photoIndex: number) => {
        Alert.alert(
            "⚠️ Delete Photo",
            `Are you sure you want to delete photo #${photoIndex + 1}?\n\nThis action cannot be undone!`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setDeletingSighting(true);
                        try {
                            await deleteSightingAction({ sightingId });
                            
                            if (plantDetail && !('error' in plantDetail)) {
                                const currentPlantId = plantDetail._id;
                                setSelectedPlantId(null);
                                // Small delay to allow for data refresh
                                setTimeout(() => {
                                    setSelectedPlantId(currentPlantId);
                                }, 100);
                            }
                        } catch (error) {
                            Alert.alert('❌ Error', 'Failed to delete photo');
                            console.error('Delete error:', error);
                        } finally {
                            setDeletingSighting(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSetDefaultPhoto = async (sightingId: any) => {
        if (!selectedPlantId) return;
        
        try {
            setSettingDefaultPhoto(true);
            console.log(`🖼️ Starting set default photo process for sighting: ${sightingId}`);
            console.log(`🌿 Plant ID: ${selectedPlantId}`);
            
            const result = await setDefaultPhotoAction({
                plantId: selectedPlantId as any,
                sightingId: sightingId,
            });
            
            if (result.success) {
                console.log('✅ Default photo set successfully, starting refresh...');
                
                // Force refresh plant data for detail view
                const currentId = selectedPlantId;
                console.log(`🔄 Refreshing plant data: clearing selectedPlantId`);
                setSelectedPlantId(null);
                await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay
                console.log(`🔄 Refreshing plant data: setting selectedPlantId back to ${currentId}`);
                setSelectedPlantId(currentId);
                console.log(`✅ Plant data refresh complete`);
                
                // Force refresh collection view data by triggering a re-render
                console.log(`🔄 Forcing collection view refresh...`);
                setCollectionRefreshTrigger(prev => prev + 1);
                console.log(`✅ Collection view refresh triggered`);
            } else {
                console.error('❌ Failed to set default photo:', result);
                Alert.alert('Error', 'Failed to set default photo');
            }
        } catch (error) {
            console.error('❌ Error setting default photo:', error);
            Alert.alert('Error', 'Failed to set default photo');
        } finally {
            setSettingDefaultPhoto(false);
        }
    };

    // Handle setting database image as default photo
    const handleSetDefaultDatabaseImage = async (imageUrl: string, plantId: string) => {
        try {
            setSettingDefaultPhoto(true);
            console.log('🖼️ Starting set database image as default process');
            console.log('📸 Image URL:', imageUrl);
            console.log('🌿 Plant ID:', plantId);
            
            const result = await setDefaultDatabaseImageAction({
                plantId: plantId as any,
                imageUrl: imageUrl,
            });
            
            if (result.success) {
                console.log('✅ Database image set as default successfully, starting refresh...');
                
                // Force refresh plant data
                const currentId = selectedPlantId;
                console.log(`🔄 Refreshing plant data: clearing selectedPlantId`);
                setSelectedPlantId(null);
                await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay
                console.log(`🔄 Refreshing plant data: setting selectedPlantId back to ${currentId}`);
                setSelectedPlantId(currentId);
                console.log(`✅ Plant data refresh complete`);
                
                // Force refresh collection view data
                console.log(`🔄 Forcing collection view refresh...`);
                setCollectionRefreshTrigger(prev => prev + 1);
                console.log(`✅ Collection view refresh triggered`);
            } else {
                console.error('❌ Failed to set database image as default:', result);
                Alert.alert('Error', 'Failed to set database image as default photo');
            }
        } catch (error) {
            console.error('❌ Error setting database image as default:', error);
            Alert.alert('Error', 'Failed to set database image as default photo');
        } finally {
            setSettingDefaultPhoto(false);
        }
    };

    // Editing functions with loading states
    const handleSaveTraditionalUsage = async () => {
        if (!plantDetail || 'error' in plantDetail) return;
        setLoading(true);
        try {
            await updateTraditionalUsage({ 
                plantId: plantDetail._id, 
                traditionalUsage: editedTraditionalUsage 
            });
            setIsEditingTraditionalUsage(false);
            setSelectedPlantId(plantDetail._id);
        } catch (error) {
            Alert.alert('Error', 'Failed to update traditional usage');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTags = async () => {
        if (!plantDetail || 'error' in plantDetail) return;
        setLoading(true);
        try {
            await updatePlantTags({ 
                plantId: plantDetail._id, 
                tags: editedTags 
            });
            setIsEditingTags(false);
            setSelectedPlantId(plantDetail._id);
        } catch (error) {
            Alert.alert('Error', 'Failed to update tags');
        } finally {
            setLoading(false);
        }
    };

    const insertOrWrapText = (wrapStart: string, wrapEnd: string = '', placeholder: string = '') => {
        const { start, end } = textSelection;
        const text = editedTraditionalUsage;
        
        if (start === end) {
            const newText = text.slice(0, start) + wrapStart + placeholder + wrapEnd + text.slice(start);
            setEditedTraditionalUsage(newText);
        } else {
            const selectedText = text.slice(start, end);
            const newText = text.slice(0, start) + wrapStart + selectedText + wrapEnd + text.slice(end);
            setEditedTraditionalUsage(newText);
        }
    };

    // Admin mode toggle
    const handleAdminToggle = () => {
        const newCount = adminTapCount + 1;
        setAdminTapCount(newCount);
        
        if (newCount >= 3) {
            setAdminMode(!adminMode);
            setAdminTapCount(0);
        } else {
            setTimeout(() => setAdminTapCount(0), 2000);
        }
    };

    // Handler for when user selects a plant from suggestions
    const handlePlantSelection = async (selectedSuggestion: any, feedback?: string, location?: LocationData | null, medicinalDetails?: any) => {
        setLoading(true);
        try {
            // Use the location passed from PlantSuggestionsView, fallback to getCurrentLocationData() if not provided
            const locationToUse = location || getCurrentLocationData();
            
            // Determine if this was from multi-photo mode and pass all photos
            const isFromMultiPhoto = currentCapturedPhotos.length > 0;
            

            
            // Ensure all fields are present with proper defaults
            const suggestionToSend = {
              scientificName: selectedSuggestion.scientificName,
              commonNames: Array.isArray(selectedSuggestion.commonNames) ? selectedSuggestion.commonNames : [],
              description: selectedSuggestion.description || "",
              wikiUrl: selectedSuggestion.wikiUrl || "",
              imageUrl: selectedSuggestion.imageUrl || "",
              similar_images: Array.isArray(selectedSuggestion.similar_images) ? selectedSuggestion.similar_images : [],
            };
            

            

            
            const result = await confirmPlantSelection({
              selectedSuggestion: suggestionToSend,
              userPhotoBase64: isFromMultiPhoto ? undefined : currentPhotoBase64, // Use single photo for single-photo mode
              userPhotos: isFromMultiPhoto ? currentCapturedPhotos : undefined, // Use all photos for multi-photo mode
              userFeedback: feedback,
              location: locationToUse ? {
                latitude: locationToUse.latitude,
                longitude: locationToUse.longitude,
                address: locationToUse.address || "",
                accuracy: locationToUse.accuracy || 0,
                timestamp: locationToUse.timestamp || Date.now()
              } : undefined, // Pass the location data, converting null to undefined
              medicinalDetails: medicinalDetails || undefined, // Pass medicinal details if provided
            });

            console.log("✅ Plant confirmed and added:", result.scientificName);
            console.log(`📸 Saved ${isFromMultiPhoto ? currentCapturedPhotos.length : 1} user photos`);
            console.log(`📍 Location: ${locationToUse ? `${locationToUse.latitude}, ${locationToUse.longitude}` : 'None'}`);
            console.log(`🗂️ Saved ${selectedSuggestion.similar_images?.length || 0} preview images to database for future reference`);
            
            // Clean up suggestions state first
            setShowSuggestions(false);
            setPlantSuggestions([]);
            setCurrentPhotoBase64('');
            setCurrentCapturedPhotos([]); // Clear multi-photo state
            
            // Complete loading before navigating
            setLoading(false);
            
            // Small delay to ensure state is updated, then navigate
            setTimeout(() => {
                // Debug log to check the value and type of plantId
                console.log("DEBUG plantId", result.plantId, typeof result.plantId);
                // Ensure only the string ID is passed
                let plantIdToSet = result.plantId;
                if (typeof plantIdToSet === 'object' && plantIdToSet !== null) {
                    plantIdToSet = plantIdToSet.plantId || plantIdToSet._id || '';
                }
                setSelectedPlantId(plantIdToSet);
                setCurrentView('detail');
            }, 100);
            
        } catch (err) {
            Alert.alert("Error", "Failed to add plant to collection. Please try again.");
            setLoading(false);
        }
    };

    // Handler for requesting better AI identification
    const handleRequestBetterIdentification = async (userDescription: string, rejectedSuggestions: string[], contextAnswers?: Array<{question: string, answer: string}>) => {
        setAiLoading(true); // Use separate AI loading state
        try {
            const result = await requestBetterIdentification({
                base64: currentPhotoBase64,
                userDescription,
                rejectedSuggestions,
                contextAnswers
            });

            console.log("🤖 AI provided alternative suggestions:", result.suggestions.length);
            
            if (result.suggestions && result.suggestions.length > 0) {
                // Prioritize AI suggestions at the top of the list
                setPlantSuggestions(prev => {
                    // Mark AI suggestions with a special flag
                    const aiSuggestions = result.suggestions.map(suggestion => ({
                        ...suggestion,
                        isAISuggestion: true,
                        aiPriority: true
                    }));
                    
                    // Add AI suggestions at the top, then existing suggestions
                    return [...aiSuggestions, ...prev];
                });
                
                // Show a notification that new suggestions were added
                Alert.alert(
                    "Better Matches Found!", 
                    `AI found ${result.suggestions.length} better match(es) based on your detailed description. Check the top of the suggestions list!`,
                    [{ text: "OK" }]
                );
            } else {
                Alert.alert(
                    "No Additional Matches", 
                    "Our AI couldn't find better matches based on your description. You might have a rare or unusual plant!"
                );
            }
        } catch (err) {
            console.error("Error requesting better identification:", err);
            Alert.alert("Error", "Failed to get AI suggestions. Please try again.");
        } finally {
            setAiLoading(false); // Reset AI loading state
        }
    };

    // Handler for when user rejects a plant suggestion (AI learning)
    const handleRejectionFeedback = async (rejectedPlantName: string, allSuggestions: any[]) => {
        try {
            // Don't set loading for rejection feedback - it's background operation
            await storeRejectionFeedback({
                rejectedPlantName,
                userPhotoBase64: currentPhotoBase64,
                plantIdSuggestions: allSuggestions.map(suggestion => ({
                    scientificName: suggestion.scientificName,
                    probability: suggestion.probability,
                })),
            });
            
            console.log(`🧠 AI Learning: Stored rejection feedback for "${rejectedPlantName}"`);
        } catch (err) {
            console.error("Error storing rejection feedback:", err);
            // Don't show error to user - this is background learning
        }
    };

    // Add location to plant function
    const handleAddLocationToPlant = async (plantId: string, location: LocationData) => {
        try {
            console.log('Adding location to plant:', plantId, location);
            
            // Call the Convex action to add location to plant
            const result = await addLocationToPlant({
                plantId: plantId as any,
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
                accuracy: location.accuracy,
            });
            
            if (result.success) {
                Alert.alert('Location Added', 'Location has been added to this plant sighting.');
                // Force refresh the plant data to show the new location
                const currentPlantId = selectedPlantId;
                setSelectedPlantId(null);
                setTimeout(() => {
                    setSelectedPlantId(currentPlantId);
                }, 200);
            } else {
                Alert.alert('Error', result.error || 'Failed to add location to plant.');
            }
        } catch (error) {
            console.error('Failed to add location to plant:', error);
            Alert.alert('Error', 'Failed to add location to plant.');
        }
    };

    // Add a function to refresh plant data
    const refreshPlantData = async () => {
        if (selectedPlantId && !loading) {
            try {
                setLoading(true);
                const result = await extractAdvancedFields({ plantId: selectedPlantId as any });
                console.log('Advanced fields update result:', result);
                
                if (result.success && result.updated) {
                    // Force a refresh of the plant data by invalidating the query
                    const currentId = selectedPlantId;
                    setSelectedPlantId(null);
                    
                    // Wait for the query to be invalidated
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Set the ID back to trigger a fresh query
                    setSelectedPlantId(currentId);
                    
                    // Wait for the new data to be loaded
                    await new Promise(resolve => setTimeout(resolve, 900));
                    
                    setLoading(false);
                } else {
                    console.error('Failed to update advanced fields:', result);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Failed to refresh plant data:', error);
                setLoading(false);
            }
        }
    };

    // State for fullscreen map modal
    const [showFullscreenMap, setShowFullscreenMap] = useState(false);
    const [fullscreenSelectedLocation, setFullscreenSelectedLocation] = useState<any>(null);
    const [fullscreenMapLocations, setFullscreenMapLocations] = useState<LocationData[]>([]);

    return (
        <View style={{ flex: 1, backgroundColor: '#f0fdf4' }}>
            {/* Sticky Navigation Tabs */}
            <View style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                backgroundColor: '#f0fdf4',
                paddingTop: 60,
                paddingBottom: 16,
                alignItems: 'center' // Center the container
            }}>
                <View style={{ 
                    flexDirection: 'row', 
                    backgroundColor: 'white', 
                    borderRadius: 12, 
                    padding: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                    width: 'auto', // Let it adjust to content
                    minWidth: 280, // Minimum width to ensure buttons don't get too cramped
                    maxWidth: 400 // Maximum width to maintain a good look
                }}>
                    <TouchableOpacity
                        style={{
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            borderRadius: 8,
                            backgroundColor: currentView === 'identify' ? '#059669' : 'transparent'
                        }}
                        onPress={() => setCurrentView('identify')}
                    >
                        <Text style={{ color: currentView === 'identify' ? 'white' : '#059669', fontWeight: '600' }}>
                            📸 Identify
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            borderRadius: 8,
                            backgroundColor: currentView === 'collection' ? '#059669' : 'transparent'
                        }}
                        onPress={() => setCurrentView('collection')}
                    >
                        <Text style={{ color: currentView === 'collection' ? 'white' : '#059669', fontWeight: '600' }}>
                            🌿 Collection ({plants?.length || 0})
                            {plants && plants.some(p => p.latestUserPhoto) && ' 📸'}
                        </Text>
                    </TouchableOpacity>
                    
                    {/* Admin Mode Toggle */}
                    <TouchableOpacity
                        style={{
                            paddingHorizontal: 8,
                            paddingVertical: 12,
                            borderRadius: 8,
                            backgroundColor: adminMode ? '#dc2626' : 'transparent'
                        }}
                        onPress={handleAdminToggle}
                    >
                        <Text style={{ color: adminMode ? 'white' : '#6b7280', fontSize: 12 }}>
                            {adminMode ? '🔧 ADMIN' : adminTapCount > 0 ? `⚙️ ${adminTapCount}/3` : '⚙️'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView 
                contentContainerStyle={{ 
                    flexGrow: 1, 
                    backgroundColor: '#f0fdf4', 
                    paddingHorizontal: 24, 
                    paddingTop: 130, // Increased to account for sticky header
                    paddingBottom: 80, // Increased to ensure last item is visible when scrolling
                    alignItems: 'center' 
                }}
            >
                {/* Render appropriate view */}
                {currentView === 'identify' && showSuggestions && (
                    <PlantSuggestionsView
                        suggestions={plantSuggestions}
                        userPhotoBase64={currentPhotoBase64}
                        onPlantSelected={handlePlantSelection}
                        onRequestBetterIdentification={handleRequestBetterIdentification}
                        onBackToCamera={() => {
                            setShowSuggestions(false);
                            setPlantSuggestions([]);
                            setCurrentPhotoBase64('');
                            setPlant(null);
                        }}
                        onRejectionFeedback={handleRejectionFeedback}
                        loading={aiLoading}
                        selectedLocation={selectedLocation}
                    />
                )}

                {currentView === 'identify' && !showSuggestions && (
                    <PlantIdentificationView
                        loading={loading}
                        plant={plant}
                        multiPhotoMode={multiPhotoMode}
                        capturedPhotos={capturedPhotos}
                        showRecentPlants={showRecentPlants}
                        recentPlants={recentPlants || []}
                        plants={plants}
                        setMultiPhotoMode={setMultiPhotoMode}
                        setCapturedPhotos={setCapturedPhotos}
                        setShowRecentPlants={setShowRecentPlants}
                        setSelectedPlantId={setSelectedPlantId}
                        setCurrentView={setCurrentView}
                        setZoomedImage={setZoomedImage}
                        takePhoto={takePhoto}
                        addPhotoToCapture={addPhotoToCapture}
                        processMultiplePhotos={processMultiplePhotos}
                        clearCapturedPhotos={clearCapturedPhotos}
                        copyPlantInfo={copyPlantInfo}
                        selectedLocation={selectedLocation}
                        setSelectedLocation={setSelectedLocation}
                        useCurrentLocation={useCurrentLocation}
                        setUseCurrentLocation={setUseCurrentLocation}
                    />
                )}

                {currentView === 'collection' && (
                    <PlantCollectionView
                        plants={plants}
                        selectedTags={selectedTags}
                        adminMode={adminMode}
                        setSelectedTags={setSelectedTags}
                        setSelectedPlantId={setSelectedPlantId}
                        setCurrentView={setCurrentView}
                        handleDeletePlant={handleDeletePlant}
                        getAllUniqueTags={getAllUniqueTags}
                        refreshTrigger={collectionRefreshTrigger}
                        // Remove modal state props from here
                        // showFullscreenMap={showFullscreenMap}
                        // setShowFullscreenMap={setShowFullscreenMap}
                        // fullscreenSelectedLocation={fullscreenSelectedLocation}
                        // setFullscreenSelectedLocation={setFullscreenSelectedLocation}
                        // Instead, pass a handler to open the modal with a location
                        onOpenFullscreenMap={(location, filteredLocations) => {
                            setFullscreenSelectedLocation(location);
                            setShowFullscreenMap(true);
                            setFullscreenMapLocations(filteredLocations);
                        }}
                    />
                )}

                {currentView === 'detail' && selectedPlantId && (
                    <PlantDetailView
                        selectedPlantId={selectedPlantId}
                        plantDetail={plantDetail}
                        plantFeedback={plantFeedback}
                        loading={loading}
                        deletingPlant={deletingPlant}
                        deletingSighting={deletingSighting}
                        settingDefaultPhoto={settingDefaultPhoto}
                        isEditingTraditionalUsage={isEditingTraditionalUsage}
                        editedTraditionalUsage={editedTraditionalUsage}
                        isEditingTags={isEditingTags}
                        editedTags={editedTags}
                        editPreviewMode={editPreviewMode}
                        textSelection={textSelection}
                        showSafetyInfo={showSafetyInfo}
                        adminMode={adminMode}
                        setCurrentView={setCurrentView}
                        setIsEditingTraditionalUsage={setIsEditingTraditionalUsage}
                        setEditedTraditionalUsage={setEditedTraditionalUsage}
                        setIsEditingTags={setIsEditingTags}
                        setEditedTags={setEditedTags}
                        setEditPreviewMode={setEditPreviewMode}
                        setTextSelection={setTextSelection}
                        setShowSafetyInfo={setShowSafetyInfo}
                        setZoomedImage={setZoomedImage}
                        handleSaveTraditionalUsage={handleSaveTraditionalUsage}
                        handleSaveTags={handleSaveTags}
                        insertOrWrapText={insertOrWrapText}
                        copyPlantInfo={copyPlantInfo}
                        addPhotoToPlant={addPhotoToPlant}
                        handleDeleteSighting={handleDeleteSighting}
                        handleSetDefaultPhoto={handleSetDefaultPhoto}
                        handleSetDefaultDatabaseImage={handleSetDefaultDatabaseImage}
                        updatePlantFeedback={editPlantFeedback}
                        addPlantFeedback={addPlantFeedback}
                        refreshPlantData={refreshPlantData}
                        handleAddLocationToPlant={handleAddLocationToPlant}
                    />
                )}

                {/* Zoom Modal */}
                <ZoomModal
                    visible={!!zoomedImage}
                    imageUri={zoomedImage}
                    onClose={() => setZoomedImage(null)}
                />
                {/* Fullscreen Map Modal - now fully isolated at root */}
                {showFullscreenMap && (
                    <Modal
                        visible={showFullscreenMap}
                        animationType="slide"
                        onRequestClose={() => setShowFullscreenMap(false)}
                        transparent={false}
                    >
                        <FullscreenMapModal
                            filteredLocations={fullscreenMapLocations}
                            selectedLocation={fullscreenSelectedLocation}
                            setSelectedLocation={setFullscreenSelectedLocation}
                            onClose={() => setShowFullscreenMap(false)}
                            onViewPlant={(plantId: string) => {
                                setSelectedPlantId(plantId);
                                setCurrentView('detail');
                                setShowFullscreenMap(false);
                            }}
                        />
                    </Modal>
                )}
            </ScrollView>

            {/* Global AI Loading Overlay */}
            {aiLoading && (
                <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                }}>
                    <View style={{
                        backgroundColor: 'white',
                        paddingVertical: 24,
                        paddingHorizontal: 32,
                        borderRadius: 16,
                        alignItems: 'center',
                        width: '85%',
                        maxWidth: 320,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 8,
                    }}>
                        <ActivityIndicator size="large" color="#f59e0b" />
                        <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '700', color: '#92400e', textAlign: 'center' }}>
                            🤖 AI Analysis in Progress
                        </Text>
                        <Text style={{ marginTop: 8, fontSize: 14, color: '#78350f', textAlign: 'center', lineHeight: 20 }}>
                            Analyzing your photo and description to find better plant matches...
                        </Text>
                        <Text style={{ marginTop: 12, fontSize: 12, color: '#a16207', textAlign: 'center', fontStyle: 'italic' }}>
                            This may take 10-30 seconds
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}
