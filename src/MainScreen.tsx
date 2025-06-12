import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Clipboard, Alert } from "react-native";
import { api } from "../convex/_generated/api";
import { useAction, useQuery } from "convex/react";

// Import our new components
import PlantIdentificationView from './components/PlantIdentificationView';
import PlantCollectionView from './components/PlantCollectionView';
import PlantDetailView from './components/PlantDetailView';
import ZoomModal from './components/ZoomModal';

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

    // Convex actions and queries
    const identify = useAction(api.identifyPlant.identifyPlant);
    const identifyMultiple = useAction(api.identifyPlant.identifyPlantWithMultiplePhotos);
    const addPhotoDirectly = useAction(api.identifyPlant.addPhotoToExistingPlant);
    const deletePlantAction = useAction(api.identifyPlant.adminDeletePlant);
    const deleteSightingAction = useAction(api.identifyPlant.adminDeleteSighting);
    const updateTraditionalUsage = useAction(api.identifyPlant.updateTraditionalUsage);
    const updatePlantTags = useAction(api.identifyPlant.updatePlantTags);
    const plants = useQuery(api.identifyPlant.getAllPlants);
    const recentPlants = useQuery(api.identifyPlant.getRecentlyIdentified, { limit: 5 });
    
    // Get detailed plant data when viewing detail
    const plantDetail = useQuery(
        api.identifyPlant.getPlantById, 
        selectedPlantId ? { plantId: selectedPlantId as any } : "skip"
    );

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
            const res = await identify({ base64 });
            
            console.log("🌿 Identified plant:", res.scientificName);
            setPlant({ ...res, imageUri: compressedUri });
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
            
            console.log("🌿 Multi-photo identified plant:", res.scientificName);
            setPlant({ 
                ...res, 
                imageUri: null,
                capturedPhotos: capturedPhotos.length,
                confidence: res.confidence 
            });
            
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
            
            Alert.alert(
                "Photo Added!", 
                `New sighting of ${plantDetail.commonNames?.[0] || plantDetail.scientificName} has been recorded!\n\n✨ No API verification needed - you know your plants!`,
                [{ text: "OK", onPress: () => {
                    setSelectedPlantId(plantDetail._id);
                }}]
            );
        } catch (err) {
            console.error("Error adding photo:", err);
            Alert.alert("Error", "Failed to add photo to this plant");
        } finally {
            setLoading(false);
        }
    };

    // Admin functions
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
                        try {
                            await deletePlantAction({ plantId });
                            setSelectedPlantId(null);
                            setCurrentView('collection');
                            Alert.alert('✅ Success', 'Plant deleted successfully');
                        } catch (error) {
                            Alert.alert('❌ Error', 'Failed to delete plant');
                            console.error('Delete error:', error);
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
                        try {
                            await deleteSightingAction({ sightingId });
                            Alert.alert('✅ Success', 'Photo deleted successfully');
                            
                            if (plantDetail && !('error' in plantDetail)) {
                                const currentPlantId = plantDetail._id;
                                setSelectedPlantId(null);
                                setTimeout(() => {
                                    setSelectedPlantId(currentPlantId);
                                }, 100);
                            }
                        } catch (error) {
                            Alert.alert('❌ Error', 'Failed to delete photo');
                            console.error('Delete error:', error);
                        }
                    }
                }
            ]
        );
    };

    // Editing functions
    const handleSaveTraditionalUsage = async () => {
        if (!plantDetail || 'error' in plantDetail) return;
        try {
            await updateTraditionalUsage({ 
                plantId: plantDetail._id, 
                traditionalUsage: editedTraditionalUsage 
            });
            setIsEditingTraditionalUsage(false);
            setSelectedPlantId(plantDetail._id);
        } catch (error) {
            Alert.alert('Error', 'Failed to update traditional usage');
        }
    };

    const handleSaveTags = async () => {
        if (!plantDetail || 'error' in plantDetail) return;
        try {
            await updatePlantTags({ 
                plantId: plantDetail._id, 
                tags: editedTags 
            });
            setIsEditingTags(false);
            setSelectedPlantId(plantDetail._id);
        } catch (error) {
            Alert.alert('Error', 'Failed to update tags');
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
            {currentView === 'identify' && (
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

            {currentView === 'detail' && (
                <PlantDetailView
                    selectedPlantId={selectedPlantId}
                    plantDetail={plantDetail}
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
