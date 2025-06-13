import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Clipboard, Alert } from "react-native";
import { api } from "../convex/_generated/api";
import { useAction, useQuery } from "convex/react";

// Import our new components
import PlantIdentificationView from './components/PlantIdentificationView';
import PlantCollectionView from './components/PlantCollectionView';
import PlantDetailView from './components/PlantDetailView';
import ZoomModal from './components/ZoomModal';
import PlantSuggestionsView from './components/PlantSuggestionsView';

// Import custom hooks
import { useImageHandler } from './hooks/useImageHandler';

export default function MainScreen() {
    // State management - moved selectedPlantId before plantDetail query
    const [loading, setLoading] = useState(false);
    const [plant, setPlant] = useState<any>(null);
    const [currentView, setCurrentView] = useState<'identify' | 'collection' | 'detail'>('identify');
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [adminMode, setAdminMode] = useState(false);
    const [adminTapCount, setAdminTapCount] = useState(0);
    const [showRecentPlants, setShowRecentPlants] = useState(false);
    const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
    const [multiPhotoMode, setMultiPhotoMode] = useState(false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    
    // Editing states
    const [isEditingTraditionalUsage, setIsEditingTraditionalUsage] = useState(false);
    const [editedTraditionalUsage, setEditedTraditionalUsage] = useState('');
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [editedTags, setEditedTags] = useState<string[]>([]);
    const [editPreviewMode, setEditPreviewMode] = useState(false);
    const [textSelection, setTextSelection] = useState({ start: 0, end: 0 });
    const [showSafetyInfo, setShowSafetyInfo] = useState(false);

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
    const updateTraditionalUsage = useAction(api.identifyPlant.updateTraditionalUsage);
    const updatePlantTags = useAction(api.identifyPlant.updatePlantTags);
    const plants = useQuery(api.identifyPlant.getAllPlants);
    const recentPlants = useQuery(api.identifyPlant.getRecentlyIdentified, { limit: 5 });
    
    // Get detailed plant data when viewing detail
    const plantDetail = useQuery(api.identifyPlant.getPlantById, selectedPlantId ? { plantId: selectedPlantId as any } : "skip");
    const plantFeedback = useQuery(api.identifyPlant.getPlantFeedback, selectedPlantId ? { plantId: selectedPlantId as any } : "skip");
    const addPlantFeedback = useAction(api.identifyPlant.addPlantFeedback);
    const editPlantFeedback = useAction(api.identifyPlant.editPlantFeedback);
    const extractAdvancedFields = useAction(api.identifyPlant.extractAndUpdateAdvancedPlantProfile);

    // Custom hooks
    const { compressImage, requestPermissions, launchCamera, launchImageLibrary, showImageSourceAlert } = useImageHandler();

    // Helper functions
    const getAllUniqueTags = () => {
        if (!plants) return [];
        const allTags = plants.flatMap(plant => plant.medicinalTags);
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
            
            let result = null;
            
            if (permissions.camera) {
                result = await launchCamera();
            }
            
            if (!result || result.canceled) {
                showImageSourceAlert(async () => {
                    const libraryResult = await launchImageLibrary();
                    if (libraryResult && !libraryResult.canceled) {
                        await processPhoto(libraryResult.assets[0]);
                    }
                });
                return;
            }
            
            if (result && !result.canceled) {
                await processPhoto(result.assets[0]);
            }
        } catch (error) {
            console.error("Error with photo picker:", error);
            Alert.alert("Error", "Unable to access photo picker.");
        }
    };

    const processPhoto = async (photo: any) => {
        setLoading(true);
        try {
            if (!photo.uri) throw new Error("Failed to get image");
            
            const { base64, compressedUri } = await compressImage(photo.uri);
            setCurrentPhotoBase64(base64); // Store for later use
            setCurrentCapturedPhotos([]); // Clear multi-photo state for single photo mode
            
            const res = await identify({ base64 });
            
            console.log("🌿 Identified plants:", res.suggestions.length);
            
            // Always show suggestions view if we have any results
            if (res.suggestions && res.suggestions.length > 0) {
                setPlantSuggestions(res.suggestions);
                setShowSuggestions(true);
                setPlant(null); // Clear single plant result
            } else {
                throw new Error("No plant match found");
            }
        } catch (err) {
            console.error("Error identifying plant:", err);
            Alert.alert("Error", "Failed to identify plant. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const addPhotoToCapture = async () => {
        try {
            const permissions = await requestPermissions();
            if (!permissions.camera && !permissions.media) return;
            
            let result = null;
            
            if (permissions.camera) {
                result = await launchCamera();
            }
            
            if (!result || result.canceled) {
                showImageSourceAlert(async () => {
                    const libraryResult = await launchImageLibrary();
                    if (libraryResult && !libraryResult.canceled) {
                        await processPhotoForCapture(libraryResult.assets[0]);
                    }
                });
                return;
            }
            
            if (result && !result.canceled) {
                await processPhotoForCapture(result.assets[0]);
            }
        } catch (error) {
            console.error("Error with photo picker:", error);
            Alert.alert("Error", "Unable to access photo picker.");
        }
    };

    const processPhotoForCapture = async (photo: any) => {
        try {
            if (!photo.uri) throw new Error("Failed to get image");
            
            const { base64 } = await compressImage(photo.uri);
            setCapturedPhotos(prev => [...prev, base64]);
            
            Alert.alert(
                "Photo Added!", 
                `Photo ${capturedPhotos.length + 1} captured successfully!\n\nYou can add more photos of different angles, leaves, flowers, etc. for better identification accuracy.`,
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
            
            let result = null;
            
            if (permissions.camera) {
                result = await launchCamera();
            }
            
            if (!result || result.canceled) {
                showImageSourceAlert(async () => {
                    const libraryResult = await launchImageLibrary();
                    if (libraryResult && !libraryResult.canceled) {
                        await processAddPhoto(libraryResult.assets[0]);
                    }
                });
                return;
            }
            
            if (result && !result.canceled) {
                await processAddPhoto(result.assets[0]);
            }
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
            
            const { base64 } = await compressImage(photo.uri);
            
            await addPhotoDirectly({ 
                plantId: plantDetail._id, 
                userPhotoBase64: base64 
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
                        setLoading(true);
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
                            setLoading(false);
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
                        setLoading(true);
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
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSetDefaultPhoto = async (sightingId: any) => {
        setLoading(true);
        try {
            if (!plantDetail || 'error' in plantDetail) {
                throw new Error("No plant selected or plant error");
            }
            
            await setDefaultPhotoAction({ 
                plantId: plantDetail._id, 
                sightingId 
            });
            
            // Refresh the plant detail view to show new order
            const currentPlantId = plantDetail._id;
            setSelectedPlantId(null);
            setTimeout(() => {
                setSelectedPlantId(currentPlantId);
            }, 100);
            
            Alert.alert("✅ Success", "Photo set as default reference!");
            
        } catch (error) {
            Alert.alert('❌ Error', 'Failed to set default photo');
            console.error('Set default error:', error);
        } finally {
            setLoading(false);
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
            Alert.alert(
                adminMode ? "🔒 Admin Mode Disabled" : "🔧 Admin Mode Enabled", 
                adminMode 
                    ? "Delete buttons are now hidden for safety." 
                    : "⚠️ DANGER ZONE ACTIVE!\n\nDelete buttons are now visible. You can permanently remove plant species from your collection.\n\nThis feature is intended for database management.",
                [{ text: "OK" }]
            );
        } else {
            if (newCount === 1) {
                setTimeout(() => {
                    if (adminTapCount > 0) {
                        Alert.alert(
                            "🔧 Admin Mode", 
                            "Triple-tap the ⚙️ button to access admin features.\n\nThis prevents accidental activation of delete functions.",
                            [{ text: "Got it!" }]
                        );
                    }
                }, 1500);
            }
            setTimeout(() => setAdminTapCount(0), 2000);
        }
    };

    // Handler for when user selects a plant from suggestions
    const handlePlantSelection = async (selectedSuggestion: any, feedback?: string) => {
        setLoading(true);
        try {
            // Determine if this was from multi-photo mode and pass all photos
            const isFromMultiPhoto = currentCapturedPhotos.length > 0;
            
            const result = await confirmPlantSelection({
                selectedSuggestion: {
                    scientificName: selectedSuggestion.scientificName,
                    commonNames: selectedSuggestion.commonNames,
                    description: selectedSuggestion.description,
                    wikiUrl: selectedSuggestion.wikiUrl,
                    imageUrl: selectedSuggestion.imageUrl,
                    similar_images: selectedSuggestion.similar_images, // Pass preview images to save them
                },
                userPhotoBase64: isFromMultiPhoto ? undefined : currentPhotoBase64, // Use single photo for single-photo mode
                userPhotos: isFromMultiPhoto ? currentCapturedPhotos : undefined, // Use all photos for multi-photo mode
                userFeedback: feedback,
            });

            console.log("✅ Plant confirmed and added:", result.scientificName);
            console.log(`📸 Saved ${isFromMultiPhoto ? currentCapturedPhotos.length : 1} user photos`);
            console.log(`🗂️ Saved ${selectedSuggestion.similar_images?.length || 0} preview images to database for future reference`);
            
            // Clean up suggestions state
            setShowSuggestions(false);
            setPlantSuggestions([]);
            setCurrentPhotoBase64('');
            setCurrentCapturedPhotos([]); // Clear multi-photo state
            
            // Navigate directly to the new plant's profile (no alert)
            setSelectedPlantId(result.plantId);
            setCurrentView('detail');
            
        } catch (err) {
            console.error("Error confirming plant selection:", err);
            Alert.alert("Error", "Failed to add plant to collection. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Handler for requesting better AI identification
    const handleRequestBetterIdentification = async (userDescription: string, rejectedSuggestions: string[]) => {
        setLoading(true);
        try {
            const result = await requestBetterIdentification({
                base64: currentPhotoBase64,
                userDescription,
                rejectedSuggestions,
            });

            console.log("🤖 AI provided alternative suggestions:", result.suggestions.length);
            
            if (result.suggestions && result.suggestions.length > 0) {
                // Add AI suggestions to the existing list
                setPlantSuggestions(prev => [...prev, ...result.suggestions]);
                // Don't show alert during loading - just update the UI
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
            setLoading(false);
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

    return (
        <ScrollView contentContainerStyle={{ 
            flexGrow: 1, 
            backgroundColor: '#f0fdf4', 
            paddingHorizontal: 24, 
            paddingTop: 60,
            paddingBottom: 40, 
            alignItems: 'center' 
        }}>
            {/* Navigation Tabs */}
            <View style={{ flexDirection: 'row', marginBottom: 32, backgroundColor: 'white', borderRadius: 12, padding: 4 }}>
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
                    loading={loading}
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
                />
            )}

            {currentView === 'detail' && selectedPlantId && (
                <PlantDetailView
                    selectedPlantId={selectedPlantId}
                    plantDetail={plantDetail}
                    plantFeedback={plantFeedback}
                    loading={loading}
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
                    updatePlantFeedback={editPlantFeedback}
                    addPlantFeedback={addPlantFeedback}
                    refreshPlantData={refreshPlantData}
                />
            )}

            {/* Zoom Modal */}
            <ZoomModal
                visible={!!zoomedImage}
                imageUri={zoomedImage}
                onClose={() => setZoomedImage(null)}
            />
        </ScrollView>
    );
}
