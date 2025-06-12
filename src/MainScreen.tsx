import React, { useState } from "react";
import { View, Text, Button, ActivityIndicator, Image, ScrollView, TouchableOpacity, Modal, Dimensions, Clipboard, Linking, Alert, TextInput } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "../convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import * as ImageManipulator from 'expo-image-manipulator';
import Markdown from 'react-native-markdown-display';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function MainScreen() {
    const identify = useAction(api.identifyPlant.identifyPlant);
    const identifyMultiple = useAction(api.identifyPlant.identifyPlantWithMultiplePhotos);
    const addPhotoDirectly = useAction(api.identifyPlant.addPhotoToExistingPlant);
    const deletePlantAction = useAction(api.identifyPlant.adminDeletePlant);
    const deleteSightingAction = useAction(api.identifyPlant.adminDeleteSighting);
    const updateTraditionalUsage = useAction(api.identifyPlant.updateTraditionalUsage);
    const updatePlantTags = useAction(api.identifyPlant.updatePlantTags);
    const plants = useQuery(api.identifyPlant.getAllPlants);
    const recentPlants = useQuery(api.identifyPlant.getRecentlyIdentified, { limit: 5 });
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
    const [showTraditionalUsage, setShowTraditionalUsage] = useState(true);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isEditingTraditionalUsage, setIsEditingTraditionalUsage] = useState(false);
    const [editedTraditionalUsage, setEditedTraditionalUsage] = useState('');
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [editedTags, setEditedTags] = useState<string[]>([]);
    const [editPreviewMode, setEditPreviewMode] = useState(false); // false = edit, true = preview
    const [textSelection, setTextSelection] = useState({ start: 0, end: 0 });
    
    // Get detailed plant data when viewing detail
    const plantDetail = useQuery(
        api.identifyPlant.getPlantById, 
        selectedPlantId ? { plantId: selectedPlantId as any } : "skip"
    );

    // Admin delete function
    const handleDeletePlant = async (plantId: string, plantName: string) => {
        Alert.alert(
            "⚠️ Delete Plant Species",
            `Are you sure you want to delete "${plantName}" and ALL its sightings?\n\nThis action cannot be undone!`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deletePlantAction({ plantId });
                            
                            // Clear selection and navigate back to collection
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

    // Delete specific sighting/photo
    const handleDeleteSighting = async (sightingId: any, photoIndex: number) => {
        Alert.alert(
            "⚠️ Delete Photo",
            `Are you sure you want to delete photo #${photoIndex + 1}?\n\nThis action cannot be undone!`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteSightingAction({ sightingId });
                            Alert.alert('✅ Success', 'Photo deleted successfully');
                            
                            // Refresh the plant detail view by re-setting the selectedPlantId
                            if (plantDetail && !('error' in plantDetail)) {
                                const currentPlantId = plantDetail._id;
                                setSelectedPlantId(null);
                                // Use setTimeout to ensure the query resets before setting it again
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

    // Copy plant information to clipboard
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

    // Compress image to fit Convex 1MB limit while respecting crop
    const compressImage = async (uri: string): Promise<{ base64: string; compressedUri: string }> => {
        console.log("Compressing cropped image...");
        
        // Preserve aspect ratio while compressing (user already cropped to square in picker)
        const resized = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }], // Let height scale naturally to preserve aspect ratio
            { 
                compress: 0.4, // Good compression while maintaining quality
                format: ImageManipulator.SaveFormat.JPEG,
                base64: true 
            }
        );
        
        if (!resized.base64) throw new Error("Failed to compress image");
        
        // Check if still too large (base64 is ~33% larger than actual file)
        const sizeInMB = (resized.base64.length * 0.75) / (1024 * 1024);
        console.log(`Compressed image size: ${sizeInMB.toFixed(2)} MB`);
        
        if (sizeInMB > 0.8) { // Leave some buffer under 1MB
            console.log("Still too large, compressing further...");
            const furtherCompressed = await ImageManipulator.manipulateAsync(
                resized.uri,
                [{ resize: { width: 600 } }], // Smaller but preserve aspect ratio
                { 
                    compress: 0.3, // More compression
                    format: ImageManipulator.SaveFormat.JPEG,
                    base64: true 
                }
            );
            if (!furtherCompressed.base64) throw new Error("Failed to compress image further");
            return { 
                base64: furtherCompressed.base64, 
                compressedUri: furtherCompressed.uri 
            };
        }
        
        return { 
            base64: resized.base64, 
            compressedUri: resized.uri 
        };
    };

    const takePhoto = async () => {
        try {
            // Request permissions first
            const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
            const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (cameraPermission.status !== 'granted' && mediaPermission.status !== 'granted') {
                Alert.alert(
                    "Permissions Required",
                    "Camera and photo library access is needed to identify plants. Please enable permissions in Settings.",
                    [{ text: "OK" }]
                );
                return;
            }
            
            let result;
            
            // Try camera first if available, with proper error handling
            if (cameraPermission.status === 'granted') {
                try {
                    result = await ImagePicker.launchCameraAsync({ 
                        base64: false,
                        quality: 0.7,
                        allowsEditing: true,
                        aspect: [1, 1], // Square crop for consistent plant focus
                        allowsMultipleSelection: false,
                    });
                } catch (cameraError) {
                    console.log("Camera not available:", cameraError);
                    // Camera failed, we'll fall through to photo library prompt
                    result = null;
                }
            }
            
            // If camera failed or not available, ask user to choose from photo library
            if (!result || result.canceled) {
                Alert.alert(
                    "Choose Photo Source",
                    "Camera not available. Would you like to select a photo from your library?",
                    [
                        { text: "Cancel", style: "cancel" },
                        { 
                            text: "Photo Library", 
                            onPress: async () => {
                                try {
                                    const libraryResult = await ImagePicker.launchImageLibraryAsync({ 
                                        base64: false,
                                        quality: 0.7,
                                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                        allowsEditing: true,
                                        aspect: [1, 1],
                                        allowsMultipleSelection: false,
                                    });
                                    
                                    if (!libraryResult.canceled) {
                                        await processPhoto(libraryResult.assets[0]);
                                    }
                                } catch (err) {
                                    Alert.alert("Error", "Unable to access photo library.");
                                }
                            }
                        }
                    ]
                );
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

    // Helper function to process the selected photo
    const processPhoto = async (photo: any) => {
        setLoading(true);
        try {
            if (!photo.uri) throw new Error("Failed to get image");
            
            // Compress the cropped image
            const { base64, compressedUri } = await compressImage(photo.uri);
            
            // Send compressed base64 to API
            const res = await identify({ base64 });
            
            // Debug logging for collection check
            console.log("🌿 Identified plant:", res.scientificName);
            console.log("🌿 Existing plants:", plants?.map(p => p.scientificName));
            console.log("🔍 DEBUG: Full identification result:", JSON.stringify(res, null, 2));
            
            setPlant({ ...res, imageUri: compressedUri });
        } catch (err) {
            console.error("Error identifying plant:", err);
            Alert.alert("Error", "Failed to identify plant. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Add photo to multi-photo capture
    const addPhotoToCapture = async () => {
        try {
            // Request permissions first
            const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
            const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (cameraPermission.status !== 'granted' && mediaPermission.status !== 'granted') {
                Alert.alert(
                    "Permissions Required",
                    "Camera and photo library access is needed to identify plants. Please enable permissions in Settings.",
                    [{ text: "OK" }]
                );
                return;
            }
            
            let result;
            
            // Try camera first if available
            if (cameraPermission.status === 'granted') {
                try {
                    result = await ImagePicker.launchCameraAsync({ 
                        base64: false,
                        quality: 0.7,
                        allowsEditing: true,
                        aspect: [1, 1],
                        allowsMultipleSelection: false,
                    });
                } catch (cameraError) {
                    console.log("Camera not available:", cameraError);
                    result = null;
                }
            }
            
            // If camera failed, ask user to choose from photo library
            if (!result || result.canceled) {
                Alert.alert(
                    "Add Photo",
                    "Camera not available. Would you like to select a photo from your library?",
                    [
                        { text: "Cancel", style: "cancel" },
                        { 
                            text: "Photo Library", 
                            onPress: async () => {
                                try {
                                    const libraryResult = await ImagePicker.launchImageLibraryAsync({ 
                                        base64: false,
                                        quality: 0.7,
                                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                        allowsEditing: true,
                                        aspect: [1, 1],
                                        allowsMultipleSelection: false,
                                    });
                                    
                                    if (!libraryResult.canceled) {
                                        await processPhotoForCapture(libraryResult.assets[0]);
                                    }
                                } catch (err) {
                                    Alert.alert("Error", "Unable to access photo library.");
                                }
                            }
                        }
                    ]
                );
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

    // Process photo for multi-photo capture
    const processPhotoForCapture = async (photo: any) => {
        try {
            if (!photo.uri) throw new Error("Failed to get image");
            
            // Compress the cropped image
            const { base64, compressedUri } = await compressImage(photo.uri);
            
            // Add to captured photos array
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

    // Process multiple photos for identification
    const processMultiplePhotos = async () => {
        if (capturedPhotos.length === 0) {
            Alert.alert("No Photos", "Please capture at least one photo first.");
            return;
        }

        setLoading(true);
        try {
            // Send all captured photos to API
            const res = await identifyMultiple({ photos: capturedPhotos });
            
            console.log("🌿 Multi-photo identified plant:", res.scientificName);
            console.log("🌿 Confidence:", res.confidence);
            console.log("🔍 DEBUG: Full multi-photo identification result:", JSON.stringify(res, null, 2));
            
            setPlant({ 
                ...res, 
                imageUri: null, // We'll show the captured photos instead
                capturedPhotos: capturedPhotos.length,
                confidence: res.confidence 
            });
            
            // Clear captured photos after successful identification
            setCapturedPhotos([]);
            setMultiPhotoMode(false);
        } catch (err) {
            console.error("Error identifying plant:", err);
            Alert.alert("Error", "Failed to identify plant with multiple photos. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Clear captured photos
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

    // Add photo to existing plant (from detail view)
    const addPhotoToPlant = async () => {
        if (!plantDetail) return;
        
        try {
            // Request permissions first
            const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
            const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (cameraPermission.status !== 'granted' && mediaPermission.status !== 'granted') {
                Alert.alert(
                    "Permissions Required",
                    "Camera and photo library access is needed to add photos. Please enable permissions in Settings.",
                    [{ text: "OK" }]
                );
                return;
            }
            
            let result;
            
            // Try camera first if available
            if (cameraPermission.status === 'granted') {
                try {
                    result = await ImagePicker.launchCameraAsync({ 
                        base64: false,
                        quality: 0.7,
                        allowsEditing: true,
                        aspect: [1, 1],
                        allowsMultipleSelection: false,
                    });
                } catch (cameraError) {
                    console.log("Camera not available:", cameraError);
                    result = null;
                }
            }
            
            // If camera failed, ask user to choose from photo library
            if (!result || result.canceled) {
                Alert.alert(
                    "Add Photo",
                    "Camera not available. Would you like to select a photo from your library?",
                    [
                        { text: "Cancel", style: "cancel" },
                        { 
                            text: "Photo Library", 
                            onPress: async () => {
                                try {
                                    const libraryResult = await ImagePicker.launchImageLibraryAsync({ 
                                        base64: false,
                                        quality: 0.7,
                                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                        allowsEditing: true,
                                        aspect: [1, 1],
                                        allowsMultipleSelection: false,
                                    });
                                    
                                    if (!libraryResult.canceled) {
                                        await processAddPhoto(libraryResult.assets[0]);
                                    }
                                } catch (err) {
                                    Alert.alert("Error", "Unable to access photo library.");
                                }
                            }
                        }
                    ]
                );
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

    // Helper function to process added photo - NO API call needed!
    const processAddPhoto = async (photo: any) => {
        setLoading(true);
        try {
            if (!photo.uri) throw new Error("Failed to get image");
            if (!plantDetail || 'error' in plantDetail) throw new Error("No plant selected or plant error");
            
            // Compress the cropped image
            const { base64 } = await compressImage(photo.uri);
            
            // Add photo directly to existing plant (user claims it's same species)
            await addPhotoDirectly({ 
                plantId: plantDetail._id, 
                userPhotoBase64: base64 
            });
            
            Alert.alert(
                "Photo Added!", 
                `New sighting of ${plantDetail.commonNames?.[0] || plantDetail.scientificName} has been recorded!\n\n✨ No API verification needed - you know your plants!`,
                [{ text: "OK", onPress: () => {
                    // Refresh the plant detail view
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

    // Add this function to handle tag filtering
    const getAllUniqueTags = () => {
        if (!plants) return [];
        const allTags = plants.flatMap(plant => plant.medicinalTags);
        return [...new Set(allTags)];
    };

    // Add this function to handle traditional usage editing
    const handleSaveTraditionalUsage = async () => {
        if (!plantDetail || 'error' in plantDetail) return;
        try {
            await updateTraditionalUsage({ 
                plantId: plantDetail._id, 
                traditionalUsage: editedTraditionalUsage 
            });
            setIsEditingTraditionalUsage(false);
            // Refresh the plant detail
            setSelectedPlantId(plantDetail._id);
        } catch (error) {
            Alert.alert('Error', 'Failed to update traditional usage');
        }
    };

    // Add this function to handle tags editing
    const handleSaveTags = async () => {
        if (!plantDetail || 'error' in plantDetail) return;
        try {
            await updatePlantTags({ 
                plantId: plantDetail._id, 
                tags: editedTags 
            });
            setIsEditingTags(false);
            // Refresh the plant detail
            setSelectedPlantId(plantDetail._id);
        } catch (error) {
            Alert.alert('Error', 'Failed to update tags');
        }
    };

    // Add this function to format traditional usage text
    const formatTraditionalUsage = (text: string) => {
        if (!text) return '';
        
        // Split into sections if they exist
        const sections = text.split('\n\n');
        
        // Format each section
        return sections.map(section => {
            // Check if it's a header (ends with :)
            if (section.trim().endsWith(':')) {
                return `## ${section.trim()}`;
            }
            
            // Check if it's a list item
            if (section.trim().startsWith('- ')) {
                return section.split('\n').map(line => {
                    if (line.trim().startsWith('- ')) {
                        return `- ${line.trim().substring(2)}`;
                    }
                    return line;
                }).join('\n');
            }
            
            return section;
        }).join('\n\n');
    };

    // Helper function to insert or wrap text with formatting
    const insertOrWrapText = (wrapStart: string, wrapEnd: string = '', placeholder: string = '') => {
        const { start, end } = textSelection;
        const text = editedTraditionalUsage;
        
        if (start === end) {
            // No selection, insert placeholder text
            const newText = text.slice(0, start) + wrapStart + placeholder + wrapEnd + text.slice(start);
            setEditedTraditionalUsage(newText);
        } else {
            // Text is selected, wrap it
            const selectedText = text.slice(start, end);
            const newText = text.slice(0, start) + wrapStart + selectedText + wrapEnd + text.slice(end);
            setEditedTraditionalUsage(newText);
        }
    };

    const renderIdentifyView = () => (
        <>
            <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#166534', marginBottom: 24 }}>🌿 AncesTree</Text>

            {/* Multi-Photo Mode Toggle */}
            <View style={{ 
                flexDirection: 'row', 
                marginBottom: 16, 
                backgroundColor: 'white', 
                borderRadius: 16, 
                padding: 6,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
                borderWidth: 1,
                borderColor: '#e5e7eb'
            }}>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderRadius: 12,
                        backgroundColor: !multiPhotoMode ? '#059669' : 'transparent',
                        shadowColor: !multiPhotoMode ? '#059669' : 'transparent',
                        shadowOffset: { width: 0, height: !multiPhotoMode ? 2 : 0 },
                        shadowOpacity: !multiPhotoMode ? 0.3 : 0,
                        shadowRadius: !multiPhotoMode ? 4 : 0,
                        elevation: !multiPhotoMode ? 3 : 0,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                    onPress={() => {
                        setMultiPhotoMode(false);
                        setCapturedPhotos([]);
                    }}
                    activeOpacity={0.8}
                >
                    {!multiPhotoMode && (
                        <View style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 10
                        }} />
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ 
                            fontSize: 14, 
                            marginRight: 6,
                            textShadowColor: !multiPhotoMode ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
                            textShadowOffset: { width: 1, height: 1 },
                            textShadowRadius: 2
                        }}>📸</Text>
                        <Text style={{ 
                            color: !multiPhotoMode ? 'white' : '#059669', 
                            fontWeight: '600',
                            textAlign: 'center',
                            fontSize: 13,
                            textShadowColor: !multiPhotoMode ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
                            textShadowOffset: { width: 1, height: 1 },
                            textShadowRadius: 2
                        }}>
                            Single Photo
                        </Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderRadius: 12,
                        backgroundColor: multiPhotoMode ? '#0284c7' : 'transparent',
                        shadowColor: multiPhotoMode ? '#0284c7' : 'transparent',
                        shadowOffset: { width: 0, height: multiPhotoMode ? 2 : 0 },
                        shadowOpacity: multiPhotoMode ? 0.3 : 0,
                        shadowRadius: multiPhotoMode ? 4 : 0,
                        elevation: multiPhotoMode ? 3 : 0,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                    onPress={() => setMultiPhotoMode(true)}
                    activeOpacity={0.8}
                >
                    {multiPhotoMode && (
                        <View style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 10
                        }} />
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ 
                            fontSize: 14, 
                            marginRight: 6,
                            textShadowColor: multiPhotoMode ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
                            textShadowOffset: { width: 1, height: 1 },
                            textShadowRadius: 2
                        }}>📷</Text>
                        <Text style={{ 
                            color: multiPhotoMode ? 'white' : '#0284c7', 
                            fontWeight: '600',
                            textAlign: 'center',
                            fontSize: 13,
                            textShadowColor: multiPhotoMode ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
                            textShadowOffset: { width: 1, height: 1 },
                            textShadowRadius: 2
                        }}>
                            Multi-Photo Mode
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Single Photo Mode */}
            {!multiPhotoMode && (
                <>
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#059669',
                            paddingVertical: 20,
                            paddingHorizontal: 32,
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#059669',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 8,
                            borderWidth: 2,
                            borderColor: '#10b981',
                            marginBottom: 8,
                            minWidth: 280,
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onPress={takePhoto}
                        activeOpacity={0.8}
                    >
                        {/* Gradient overlay effect */}
                        <View style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 14
                        }} />
                        
                        {/* Main content */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ 
                                fontSize: 24, 
                                marginRight: 12,
                                textShadowColor: 'rgba(0, 0, 0, 0.3)',
                                textShadowOffset: { width: 1, height: 1 },
                                textShadowRadius: 2
                            }}>📸</Text>
                            <View>
                                <Text style={{ 
                                    color: 'white', 
                                    fontSize: 18, 
                                    fontWeight: 'bold',
                                    textShadowColor: 'rgba(0, 0, 0, 0.3)',
                                    textShadowOffset: { width: 1, height: 1 },
                                    textShadowRadius: 2,
                                    marginBottom: 2
                                }}>
                                    Identify Plant
                                </Text>
                                <Text style={{ 
                                    color: 'rgba(255, 255, 255, 0.9)', 
                                    fontSize: 12, 
                                    fontWeight: '500',
                                    textAlign: 'center'
                                }}>
                                    Tap to capture & analyze
                                </Text>
                            </View>
                        </View>
                        
                        {/* Sparkle effect indicators */}
                        <View style={{ 
                            position: 'absolute', 
                            top: 8, 
                            right: 12,
                            opacity: 0.7
                        }}>
                            <Text style={{ fontSize: 12 }}>✨</Text>
                        </View>
                        <View style={{ 
                            position: 'absolute', 
                            bottom: 8, 
                            left: 12,
                            opacity: 0.7
                        }}>
                            <Text style={{ fontSize: 10 }}>🌿</Text>
                        </View>
                    </TouchableOpacity>
                    
                    <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}>
                        💡 Take a clear photo and crop to focus on the plant for best results
                    </Text>
                </>
            )}

            {/* Multi-Photo Mode */}
            {multiPhotoMode && (
                <>
                    <View style={{ width: '100%', maxWidth: 400, marginBottom: 16 }}>
                        <View style={{ 
                            backgroundColor: '#e0f2fe', 
                            padding: 12, 
                            borderRadius: 8, 
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: '#0284c7'
                        }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0284c7', marginBottom: 4 }}>
                                📷 Multi-Photo Identification
                            </Text>
                            <Text style={{ fontSize: 12, color: '#075985' }}>
                                Capture multiple photos (leaves, flowers, bark, overall plant) for higher accuracy identification
                            </Text>
                        </View>

                        {/* Captured Photos Count */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534' }}>
                                📸 Captured: {capturedPhotos.length} photo{capturedPhotos.length !== 1 ? 's' : ''}
                            </Text>
                            {capturedPhotos.length > 0 && (
                                <TouchableOpacity 
                                    onPress={clearCapturedPhotos}
                                    style={{ 
                                        backgroundColor: '#dc2626', 
                                        paddingHorizontal: 8, 
                                        paddingVertical: 4, 
                                        borderRadius: 6 
                                    }}
                                >
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>Clear All</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Action Buttons */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#0284c7',
                                    paddingVertical: 16,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    shadowColor: '#0284c7',
                                    shadowOffset: { width: 0, height: 3 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 6,
                                    elevation: 6,
                                    borderWidth: 1.5,
                                    borderColor: '#0ea5e9',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onPress={addPhotoToCapture}
                                activeOpacity={0.8}
                            >
                                {/* Subtle gradient overlay */}
                                <View style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: 10
                                }} />
                                
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ 
                                        fontSize: 16, 
                                        marginRight: 6,
                                        textShadowColor: 'rgba(0, 0, 0, 0.3)',
                                        textShadowOffset: { width: 1, height: 1 },
                                        textShadowRadius: 2
                                    }}>📷</Text>
                                    <Text style={{ 
                                        color: 'white', 
                                        fontWeight: '600', 
                                        fontSize: 13,
                                        textShadowColor: 'rgba(0, 0, 0, 0.3)',
                                        textShadowOffset: { width: 1, height: 1 },
                                        textShadowRadius: 2
                                    }}>
                                        Add Photo ({capturedPhotos.length + 1})
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: capturedPhotos.length > 0 ? '#059669' : '#9ca3af',
                                    paddingVertical: 16,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    shadowColor: capturedPhotos.length > 0 ? '#059669' : '#6b7280',
                                    shadowOffset: { width: 0, height: capturedPhotos.length > 0 ? 3 : 1 },
                                    shadowOpacity: capturedPhotos.length > 0 ? 0.3 : 0.1,
                                    shadowRadius: capturedPhotos.length > 0 ? 6 : 3,
                                    elevation: capturedPhotos.length > 0 ? 6 : 2,
                                    borderWidth: 1.5,
                                    borderColor: capturedPhotos.length > 0 ? '#10b981' : '#d1d5db',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onPress={processMultiplePhotos}
                                disabled={capturedPhotos.length === 0 || loading}
                                activeOpacity={0.8}
                            >
                                {/* Gradient overlay for enabled state */}
                                {capturedPhotos.length > 0 && (
                                    <View style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        borderRadius: 10
                                    }} />
                                )}
                                
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ 
                                        fontSize: 16, 
                                        marginRight: 6,
                                        textShadowColor: capturedPhotos.length > 0 ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
                                        textShadowOffset: { width: 1, height: 1 },
                                        textShadowRadius: 2
                                    }}>🔍</Text>
                                    <Text style={{ 
                                        color: 'white', 
                                        fontWeight: '600', 
                                        fontSize: 13,
                                        textShadowColor: capturedPhotos.length > 0 ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
                                        textShadowOffset: { width: 1, height: 1 },
                                        textShadowRadius: 2
                                    }}>
                                        Identify Plant
                                    </Text>
                                </View>
                                
                                {/* Active indicator */}
                                {capturedPhotos.length > 0 && (
                                    <View style={{ 
                                        position: 'absolute', 
                                        top: 4, 
                                        right: 6,
                                        opacity: 0.8
                                    }}>
                                        <Text style={{ fontSize: 10 }}>✨</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>
                            💡 Multiple angles improve accuracy: whole plant, leaves, flowers, bark
                        </Text>
                    </View>
                </>
            )}

            {loading && (
                <View style={{ marginTop: 24, alignItems: 'center' }}>
                    <ActivityIndicator size="large" />
                    <Text style={{ fontSize: 14, color: '#059669', marginTop: 8, textAlign: 'center' }}>
                        {multiPhotoMode ? `🔍 Analyzing ${capturedPhotos.length} photos...` : '🔍 Analyzing your photo...'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'center' }}>
                        {multiPhotoMode ? 'Multi-photo analysis • AI medicinal extraction' : 'Compressing • Identifying • Extracting medicinal properties with AI'}
                    </Text>
                </View>
            )}

            {/* Identification Results - Show FIRST */}
            {plant && (
                <View style={{ marginTop: 32, padding: 16, backgroundColor: 'white', borderRadius: 12, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, width: '100%', maxWidth: 400 }}>
                    {plant.imageUri && (
                        <TouchableOpacity 
                            onPress={() => {
                                if (plant.plantId) {
                                    setSelectedPlantId(plant.plantId);
                                    setCurrentView('detail');
                                } else {
                                    setZoomedImage(plant.imageUri);
                                }
                            }}
                        >
                            <Image source={{ uri: plant.imageUri }} style={{ width: '100%', height: 192, borderRadius: 8, marginBottom: 16 }} />
                        </TouchableOpacity>
                    )}
                    
                    {/* Multi-photo indicator */}
                    {plant.capturedPhotos && (
                        <View style={{ 
                            backgroundColor: '#e0f2fe', 
                            padding: 8, 
                            borderRadius: 6, 
                            marginBottom: 12,
                            alignItems: 'center'
                        }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#0284c7' }}>
                                📷 Analyzed {plant.capturedPhotos} photos • {plant.confidence}
                            </Text>
                        </View>
                    )}
                    
                    <Text selectable style={{ fontSize: 20, fontWeight: 'bold', color: '#15803d' }}>
                        {plant.commonNames?.[0] || plant.scientificName}
                    </Text>
                    <Text selectable style={{ fontStyle: 'italic', color: '#6b7280', marginBottom: 8 }}>{plant.scientificName}</Text>
                    
                    {/* Show if this species was seen before */}
                    {plants && plant && plants.find(p => 
                        p.scientificName.toLowerCase().trim() === plant.scientificName.toLowerCase().trim() && p.sightingsCount > 1
                    ) && (
                        <Text style={{ fontSize: 12, color: '#059669', marginBottom: 8, fontWeight: '600' }}>
                            🎯 Species already in your collection! This adds another sighting.
                        </Text>
                    )}
                    
                    <Text style={{ fontWeight: '600', color: '#166534' }}>Medicinal Properties:</Text>
                    {plant.tags.length > 0 ? (
                        <View style={{ marginTop: 4, marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                {plant.tags.map((tag: string, index: number) => (
                                    <View 
                                        key={index}
                                        style={{ 
                                            backgroundColor: '#dcfce7', 
                                            paddingHorizontal: 8, 
                                            paddingVertical: 4, 
                                            borderRadius: 12, 
                                            marginRight: 6, 
                                            marginBottom: 4,
                                            borderWidth: 1,
                                            borderColor: '#16a34a'
                                        }}
                                    >
                                        <Text selectable style={{ fontSize: 12, color: '#166534', fontWeight: '500' }}>
                                            {tag}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                            <Text style={{ fontSize: 10, color: '#059669', fontStyle: 'italic', marginTop: 4 }}>
                                ✨ Powered by AI analysis
                            </Text>
                        </View>
                    ) : (
                        <Text selectable style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                            No medicinal properties found in available data
                        </Text>
                    )}

                    {/* Traditional Usage Information */}
                    <View style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534' }}>📚 Traditional Uses & Preparation</Text>
                        </View>
                        
                        <View style={{ 
                            backgroundColor: '#f9fafb', 
                            padding: 12, 
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#e5e7eb'
                        }}>
                            {plant.traditionalUsage && plant.traditionalUsage.trim() ? (
                                <Markdown style={{
                                    body: { fontSize: 12, color: '#374151', lineHeight: 18 },
                                    heading1: { fontSize: 14, fontWeight: 'bold', color: '#166534', marginBottom: 4 },
                                    heading2: { fontSize: 13, fontWeight: 'bold', color: '#166534', marginBottom: 3 },
                                    strong: { fontWeight: 'bold', color: '#166534' },
                                    list_item: { fontSize: 12, color: '#374151', marginBottom: 2 },
                                    paragraph: { fontSize: 12, color: '#374151', marginBottom: 4 }
                                }}>
                                    {plant.traditionalUsage}
                                </Markdown>
                            ) : (
                                <Text style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>
                                    Traditional usage information not available for this species
                                </Text>
                            )}
                        </View>
                    </View>
                    
                    {/* Copy helper text */}
                    <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 8 }}>
                        💡 Press and hold text to copy plant information
                    </Text>
                    
                    {/* Quick Copy Button */}
                    <TouchableOpacity 
                        style={{ 
                            marginTop: 8, 
                            padding: 8, 
                            backgroundColor: '#059669', 
                            borderRadius: 6, 
                            alignItems: 'center' 
                        }}
                        onPress={() => copyPlantInfo({
                            commonNames: plant.commonNames,
                            scientificName: plant.scientificName,
                            medicinalTags: plant.tags,
                            traditionalUsage: plant.traditionalUsage,
                            sightingsCount: 1,
                            lastSeen: Date.now()
                        })}
                    >
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                            📋 Copy All Plant Info
                        </Text>
                    </TouchableOpacity>
                    
                    {/* Show collection link */}
                    <TouchableOpacity 
                        style={{ marginTop: 8, padding: 8, backgroundColor: '#f0fdf4', borderRadius: 6 }}
                        onPress={() => {
                            if (plant.plantId) {
                                setSelectedPlantId(plant.plantId);
                                setCurrentView('detail');
                            } else {
                                setCurrentView('collection');
                            }
                        }}
                    >
                        <Text style={{ fontSize: 12, color: '#059669', textAlign: 'center' }}>
                            📚 View Species Detail
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Recently Identified Plants - Show AFTER identification results */}
            {recentPlants && recentPlants.length > 0 && !loading && !plant && (
                <View style={{ marginTop: 32, width: '100%', maxWidth: 400 }}>
                    <TouchableOpacity 
                        style={{ 
                            flexDirection: 'row', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            backgroundColor: 'white',
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: showRecentPlants ? 12 : 0
                        }}
                        onPress={() => setShowRecentPlants(!showRecentPlants)}
                    >
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534' }}>
                            🕒 Recently Identified ({recentPlants.length})
                        </Text>
                        <Text style={{ fontSize: 18, color: '#059669' }}>
                            {showRecentPlants ? '▼' : '▶'}
                        </Text>
                    </TouchableOpacity>

                    {showRecentPlants && (
                        <View style={{ 
                            backgroundColor: 'white', 
                            borderRadius: 8, 
                            padding: 12,
                            shadowOffset: { width: 0, height: 2 }, 
                            shadowOpacity: 0.1, 
                            shadowRadius: 4
                        }}>
                            {recentPlants.map((recentPlant, index) => (
                                <TouchableOpacity 
                                    key={recentPlant._id}
                                    style={{ 
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 8,
                                        borderBottomWidth: index < recentPlants.length - 1 ? 1 : 0,
                                        borderBottomColor: '#f3f4f6'
                                    }}
                                    onPress={() => {
                                        setSelectedPlantId(recentPlant._id);
                                        setCurrentView('detail');
                                    }}
                                >
                                    {recentPlant.latestUserPhoto && (
                                        <Image 
                                            source={{ uri: recentPlant.latestUserPhoto }} 
                                            style={{ 
                                                width: 40, 
                                                height: 40, 
                                                borderRadius: 6, 
                                                marginRight: 12,
                                                backgroundColor: '#f3f4f6'
                                            }} 
                                        />
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#15803d' }}>
                                            {recentPlant.commonNames?.[0] || recentPlant.scientificName}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>
                                            {recentPlant.scientificName}
                                        </Text>
                                        {recentPlant.medicinalTags.length > 0 && (
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 }}>
                                                {recentPlant.medicinalTags.slice(0, 2).map((tag: string, tagIndex: number) => (
                                                    <Text 
                                                        key={tagIndex}
                                                        style={{ 
                                                            fontSize: 9, 
                                                            color: '#059669',
                                                            backgroundColor: '#dcfce7',
                                                            paddingHorizontal: 4,
                                                            paddingVertical: 1,
                                                            borderRadius: 4,
                                                            marginRight: 4,
                                                            marginTop: 2
                                                        }}
                                                    >
                                                        {tag}
                                                    </Text>
                                                ))}
                                                {recentPlant.medicinalTags.length > 2 && (
                                                    <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>
                                                        +{recentPlant.medicinalTags.length - 2}
                                                    </Text>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                                        {new Date(recentPlant.identifiedAt).toLocaleDateString()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            )}
        </>
    );

    const renderCollectionView = () => (
        <>
            <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#166534', marginBottom: 24 }}>🌿 Your Collection</Text>
            
            {/* Filter Tags */}
            <View style={{ marginBottom: 16, width: '100%', maxWidth: 400 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534', marginBottom: 8 }}>
                    🔍 Filter by Properties
                </Text>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 8 }}
                >
                    {getAllUniqueTags().map((tag) => (
                        <TouchableOpacity
                            key={tag}
                            style={{
                                backgroundColor: selectedTags.includes(tag) ? '#059669' : '#e5e7eb',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 16,
                                marginRight: 8,
                                borderWidth: 1,
                                borderColor: selectedTags.includes(tag) ? '#047857' : '#d1d5db'
                            }}
                            onPress={() => {
                                setSelectedTags(prev => 
                                    prev.includes(tag) 
                                        ? prev.filter(t => t !== tag)
                                        : [...prev, tag]
                                );
                            }}
                        >
                            <Text style={{ 
                                color: selectedTags.includes(tag) ? 'white' : '#374151',
                                fontSize: 12,
                                fontWeight: '500'
                            }}>
                                {tag}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Admin Mode Warning */}
            {adminMode && (
                <View style={{ 
                    marginBottom: 16, 
                    padding: 12, 
                    backgroundColor: '#fef2f2', 
                    borderRadius: 8, 
                    borderWidth: 1, 
                    borderColor: '#dc2626' 
                }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#dc2626', marginBottom: 4 }}>
                        🔧 ADMIN MODE ACTIVE
                    </Text>
                    <Text style={{ fontSize: 10, color: '#991b1b' }}>
                        Delete buttons are visible. Use with caution - deletions cannot be undone!
                    </Text>
                </View>
            )}
            
            {plants ? (
                plants.length > 0 ? (
                    plants
                        .filter(plant => 
                            selectedTags.length === 0 || 
                            selectedTags.some(tag => plant.medicinalTags.includes(tag))
                        )
                        .map((plantItem) => (
                        <TouchableOpacity 
                            key={plantItem._id}
                            style={{ 
                                marginBottom: 16, 
                                padding: 16, 
                                backgroundColor: 'white', 
                                borderRadius: 12, 
                                shadowOffset: { width: 0, height: 2 }, 
                                shadowOpacity: 0.1, 
                                shadowRadius: 4, 
                                width: '100%', 
                                maxWidth: 400 
                            }}
                            onPress={() => {
                                setSelectedPlantId(plantItem._id);
                                setCurrentView('detail');
                            }}
                        >
                            {/* Show compressed user photo first, fallback to reference image */}
                            {(plantItem.latestUserPhoto || plantItem.imageUrl) && (
                                <View style={{ position: 'relative' }}>
                                    <Image 
                                        source={{ uri: plantItem.latestUserPhoto || plantItem.imageUrl }} 
                                        style={{ width: '100%', height: 120, borderRadius: 8, marginBottom: 12 }} 
                                    />
                                    {/* Photo type indicator */}
                                    <View style={{ 
                                        position: 'absolute', 
                                        top: 8, 
                                        right: 8, 
                                        backgroundColor: plantItem.latestUserPhoto ? '#059669' : '#6b7280',
                                        paddingHorizontal: 6,
                                        paddingVertical: 2,
                                        borderRadius: 4
                                    }}>
                                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                                            {plantItem.latestUserPhoto ? '📸 Your Photo' : '📚 Reference'}
                                        </Text>
                                    </View>
                                    {/* Sightings count badge */}
                                    {plantItem.sightingsCount > 1 && (
                                        <View style={{ 
                                            position: 'absolute', 
                                            top: 8, 
                                            left: 8, 
                                            backgroundColor: '#f59e0b',
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            borderRadius: 12
                                        }}>
                                            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                                                {plantItem.sightingsCount}×
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                            <Text selectable style={{ fontSize: 18, fontWeight: 'bold', color: '#15803d' }}>
                                {plantItem.commonNames?.[0] || plantItem.scientificName}
                            </Text>
                            <Text selectable style={{ fontStyle: 'italic', color: '#6b7280', fontSize: 14 }}>
                                {plantItem.scientificName}
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                <View style={{ flex: 1 }}>
                                    {plantItem.medicinalTags.length > 0 && (
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                                            {plantItem.medicinalTags.slice(0, 3).map((tag: string, index: number) => (
                                                <View 
                                                    key={index}
                                                    style={{ 
                                                        backgroundColor: '#dcfce7', 
                                                        paddingHorizontal: 6, 
                                                        paddingVertical: 2, 
                                                        borderRadius: 8, 
                                                        marginRight: 4, 
                                                        marginBottom: 2,
                                                        borderWidth: 1,
                                                        borderColor: '#16a34a'
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 10, color: '#166534', fontWeight: '500' }}>
                                                        {tag}
                                                    </Text>
                                                </View>
                                            ))}
                                            {plantItem.medicinalTags.length > 3 && (
                                                <View style={{ 
                                                    backgroundColor: '#f3f4f6', 
                                                    paddingHorizontal: 6, 
                                                    paddingVertical: 2, 
                                                    borderRadius: 8,
                                                    borderWidth: 1,
                                                    borderColor: '#9ca3af'
                                                }}>
                                                    <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '500' }}>
                                                        +{plantItem.medicinalTags.length - 3}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    {plantItem.lastSeen && (
                                        <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                                            Last seen {new Date(plantItem.lastSeen).toLocaleDateString()}
                                        </Text>
                                    )}
                                    {/* Admin Delete Button */}
                                    {adminMode && (
                                        <TouchableOpacity 
                                            style={{ 
                                                marginTop: 4,
                                                backgroundColor: '#dc2626', 
                                                paddingHorizontal: 8, 
                                                paddingVertical: 4, 
                                                borderRadius: 4 
                                            }}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleDeletePlant(plantItem._id, plantItem.commonNames?.[0] || plantItem.scientificName);
                                            }}
                                        >
                                            <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>🗑️ DELETE</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={{ alignItems: 'center', padding: 32 }}>
                        <Text style={{ fontSize: 48, marginBottom: 16 }}>🌱</Text>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#166534', marginBottom: 8, textAlign: 'center' }}>
                            Your Plant Collection
                        </Text>
                        <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>
                            No plants identified yet.{'\n'}Start building your botanical library!
                        </Text>
                        <TouchableOpacity 
                            style={{ 
                                backgroundColor: '#059669', 
                                paddingHorizontal: 24, 
                                paddingVertical: 12, 
                                borderRadius: 8 
                            }}
                            onPress={() => setCurrentView('identify')}
                        >
                            <Text style={{ color: 'white', fontWeight: '600' }}>📸 Identify Your First Plant</Text>
                        </TouchableOpacity>
                    </View>
                )
            ) : (
                <ActivityIndicator size="large" />
            )}
        </>
    );

    const renderPlantDetailView = () => {
        // Show loading while query is in progress
        if (selectedPlantId && plantDetail === undefined) {
            return (
                <View style={{ alignItems: 'center', padding: 32 }}>
                    <ActivityIndicator size="large" color="#059669" />
                    <Text style={{ fontSize: 16, color: '#059669', marginTop: 16 }}>Loading plant details...</Text>
                </View>
            );
        }

        // Safety check - if plant doesn't exist, navigate back to collection
        if (selectedPlantId && plantDetail === null) {
            setTimeout(() => {
                setSelectedPlantId(null);
                setCurrentView('collection');
            }, 500); // Give query a moment to load
            
            return (
                <View style={{ alignItems: 'center', padding: 32 }}>
                    <ActivityIndicator size="large" color="#059669" />
                    <Text style={{ fontSize: 16, color: '#059669', marginTop: 16 }}>Loading plant details...</Text>
                </View>
            );
        }

        // Handle error response
        if (plantDetail?.error) {
            return (
                <View style={{ alignItems: 'center', padding: 32 }}>
                    <Text style={{ fontSize: 16, color: '#dc2626', marginBottom: 16 }}>❌ {plantDetail.error}</Text>
                    <TouchableOpacity 
                        style={{ 
                            backgroundColor: '#059669', 
                            paddingHorizontal: 24, 
                            paddingVertical: 12, 
                            borderRadius: 8 
                        }}
                        onPress={() => {
                            setSelectedPlantId(null);
                            setCurrentView('collection');
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: '600' }}>← Back to Collection</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (!plantDetail) {
            return (
                <View style={{ alignItems: 'center', padding: 32 }}>
                    <Text style={{ fontSize: 16, color: '#dc2626' }}>Plant not found</Text>
                    <TouchableOpacity 
                        style={{ 
                            marginTop: 16,
                            backgroundColor: '#059669', 
                            paddingHorizontal: 24, 
                            paddingVertical: 12, 
                            borderRadius: 8 
                        }}
                        onPress={() => setCurrentView('collection')}
                    >
                        <Text style={{ color: 'white', fontWeight: '600' }}>← Back to Collection</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <>
                {/* Back Button */}
                <TouchableOpacity 
                    style={{ alignSelf: 'flex-start', marginBottom: 16, padding: 8 }}
                    onPress={() => setCurrentView('collection')}
                >
                    <Text style={{ fontSize: 16, color: '#059669' }}>← Back to Collection</Text>
                </TouchableOpacity>

                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#166534', marginBottom: 16, textAlign: 'center' }}>
                    🌿 {plantDetail && !('error' in plantDetail) ? (plantDetail.commonNames?.[0] || plantDetail.scientificName) : 'Plant Details'}
                </Text>
                
                {plantDetail && !('error' in plantDetail) && (
                    <View style={{ width: '100%', maxWidth: 400 }}>
                        {/* Reference Image */}
                        {plantDetail.imageUrl && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 }}>📚 Reference Image</Text>
                                <TouchableOpacity onPress={() => {
                                    if (plantDetail.imageUrl) setZoomedImage(plantDetail.imageUrl);
                                }}>
                                    <Image source={{ uri: plantDetail.imageUrl }} style={{ width: '100%', height: 192, borderRadius: 8 }} />
                                </TouchableOpacity>
                            </View>
                        )}
                        
                        {/* Plant Info */}
                        <View style={{ marginBottom: 16, padding: 16, backgroundColor: 'white', borderRadius: 12 }}>
                            <Text selectable style={{ fontSize: 18, fontWeight: 'bold', color: '#15803d', marginBottom: 4 }}>
                                {plantDetail.commonNames?.[0] || plantDetail.scientificName}
                            </Text>
                            {plantDetail.medicinalTags.length > 0 ? (
                                <View style={{ marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={{ fontWeight: '600', color: '#166534' }}>Medicinal Properties:</Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setIsEditingTags(true);
                                                setEditedTags(plantDetail.medicinalTags);
                                            }}
                                            style={{ padding: 4 }}
                                        >
                                            <Text style={{ color: '#059669', fontSize: 12 }}>✏️ Edit</Text>
                                        </TouchableOpacity>
                                    </View>
                                    
                                    {isEditingTags ? (
                                        <View style={{ marginBottom: 8 }}>
                                            <TextInput
                                                style={{
                                                    borderWidth: 1,
                                                    borderColor: '#d1d5db',
                                                    borderRadius: 6,
                                                    padding: 8,
                                                    marginBottom: 8
                                                }}
                                                value={editedTags.join(', ')}
                                                onChangeText={(text) => setEditedTags(text.split(',').map(tag => tag.trim()))}
                                                placeholder="Enter tags separated by commas"
                                            />
                                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                                                <TouchableOpacity
                                                    onPress={() => setIsEditingTags(false)}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 6,
                                                        backgroundColor: '#e5e7eb',
                                                        borderRadius: 6
                                                    }}
                                                >
                                                    <Text style={{ color: '#374151' }}>Cancel</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={handleSaveTags}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 6,
                                                        backgroundColor: '#059669',
                                                        borderRadius: 6
                                                    }}
                                                >
                                                    <Text style={{ color: 'white' }}>Save</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
                                            {plantDetail.medicinalTags.map((tag: string, index: number) => (
                                                <View 
                                                    key={index}
                                                    style={{ 
                                                        backgroundColor: '#dcfce7', 
                                                        paddingHorizontal: 8, 
                                                        paddingVertical: 4, 
                                                        borderRadius: 12, 
                                                        marginRight: 6, 
                                                        marginBottom: 4,
                                                        borderWidth: 1,
                                                        borderColor: '#16a34a'
                                                    }}
                                                >
                                                    <Text selectable style={{ fontSize: 12, color: '#166534', fontWeight: '500' }}>
                                                        {tag}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <Text selectable style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                                    No known medicinal properties recorded
                                </Text>
                            )}

                            {/* Traditional Usage Information */}
                            {plantDetail.traditionalUsage && plantDetail.traditionalUsage.trim() && (
                                <View style={{ marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534' }}>📚 Traditional Uses & Preparation</Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setIsEditingTraditionalUsage(true);
                                                setEditedTraditionalUsage(plantDetail.traditionalUsage || '');
                                            }}
                                            style={{ padding: 4 }}
                                        >
                                            <Text style={{ color: '#059669', fontSize: 12 }}>✏️ Edit</Text>
                                        </TouchableOpacity>
                                    </View>
                                    
                                    <View style={{ 
                                        backgroundColor: '#f9fafb', 
                                        padding: 12, 
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: '#e5e7eb'
                                    }}>
                                        {isEditingTraditionalUsage ? (
                                            <View>
                                                {/* Edit/Preview Toggle */}
                                                <View style={{ flexDirection: 'row', marginBottom: 8, backgroundColor: '#f3f4f6', borderRadius: 6, padding: 2 }}>
                                                    <TouchableOpacity
                                                        style={{
                                                            flex: 1,
                                                            paddingVertical: 6,
                                                            paddingHorizontal: 12,
                                                            borderRadius: 4,
                                                            backgroundColor: !editPreviewMode ? '#059669' : 'transparent'
                                                        }}
                                                        onPress={() => setEditPreviewMode(false)}
                                                    >
                                                        <Text style={{ 
                                                            color: !editPreviewMode ? 'white' : '#6b7280', 
                                                            fontSize: 12, 
                                                            fontWeight: '600',
                                                            textAlign: 'center'
                                                        }}>
                                                            ✏️ Edit
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={{
                                                            flex: 1,
                                                            paddingVertical: 6,
                                                            paddingHorizontal: 12,
                                                            borderRadius: 4,
                                                            backgroundColor: editPreviewMode ? '#059669' : 'transparent'
                                                        }}
                                                        onPress={() => setEditPreviewMode(true)}
                                                    >
                                                        <Text style={{ 
                                                            color: editPreviewMode ? 'white' : '#6b7280', 
                                                            fontSize: 12, 
                                                            fontWeight: '600',
                                                            textAlign: 'center'
                                                        }}>
                                                            👁️ Preview
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>

                                                {!editPreviewMode ? (
                                                    <View>
                                                        {/* Basic Formatting Buttons */}
                                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, gap: 4 }}>
                                                            <TouchableOpacity
                                                                style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                                                                onPress={() => insertOrWrapText('**', '**', 'Bold Text')}
                                                            >
                                                                <Text style={{ fontSize: 10, fontWeight: 'bold' }}>**Bold**</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                                                                onPress={() => insertOrWrapText('*', '*', 'Italic Text')}
                                                            >
                                                                <Text style={{ fontSize: 10, fontStyle: 'italic' }}>*Italic*</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                                                                onPress={() => insertOrWrapText('\n\n1. **', '**:\n   - ', 'New Section')}
                                                            >
                                                                <Text style={{ fontSize: 10 }}>📝 Section</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                                                                onPress={() => insertOrWrapText('\n   - ', '')}
                                                            >
                                                                <Text style={{ fontSize: 10 }}>• Bullet</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                        
                                                        <TextInput
                                                            style={{
                                                                borderWidth: 1,
                                                                borderColor: '#d1d5db',
                                                                borderRadius: 6,
                                                                padding: 8,
                                                                marginBottom: 8,
                                                                minHeight: 120,
                                                                fontFamily: 'monospace',
                                                                fontSize: 12
                                                            }}
                                                            value={editedTraditionalUsage}
                                                            onChangeText={setEditedTraditionalUsage}
                                                            onSelectionChange={(event) => {
                                                                setTextSelection({
                                                                    start: event.nativeEvent.selection.start,
                                                                    end: event.nativeEvent.selection.end
                                                                });
                                                            }}
                                                            placeholder="Enter traditional usage information using markdown formatting..."
                                                            multiline
                                                            textAlignVertical="top"
                                                        />
                                                        
                                                        <Text style={{ fontSize: 10, color: '#6b7280', marginBottom: 8 }}>
                                                            💡 Select text and use buttons to format, or type **bold**, *italic*, numbered lists (1. 2. 3.), and bullet points (- item)
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <View style={{ 
                                                        backgroundColor: 'white', 
                                                        padding: 8, 
                                                        borderRadius: 4, 
                                                        borderWidth: 1, 
                                                        borderColor: '#d1d5db',
                                                        minHeight: 120
                                                    }}>
                                                        <Text style={{ fontSize: 10, color: '#059669', marginBottom: 4, fontWeight: 'bold' }}>
                                                            📖 Markdown Preview:
                                                        </Text>
                                                        {editedTraditionalUsage.trim() ? (
                                                            <Markdown style={{
                                                                body: { fontSize: 12, color: '#374151', lineHeight: 18 },
                                                                heading1: { fontSize: 14, fontWeight: 'bold', color: '#166534', marginBottom: 4 },
                                                                heading2: { fontSize: 13, fontWeight: 'bold', color: '#166534', marginBottom: 3 },
                                                                strong: { fontWeight: 'bold', color: '#166534' },
                                                                list_item: { fontSize: 12, color: '#374151', marginBottom: 2 },
                                                                paragraph: { fontSize: 12, color: '#374151', marginBottom: 4 }
                                                            }}>
                                                                {editedTraditionalUsage}
                                                            </Markdown>
                                                        ) : (
                                                            <Text style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                                                                Start typing to see preview...
                                                            </Text>
                                                        )}
                                                    </View>
                                                )}
                                                
                                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setIsEditingTraditionalUsage(false);
                                                            setEditPreviewMode(true);
                                                        }}
                                                        style={{
                                                            paddingHorizontal: 12,
                                                            paddingVertical: 6,
                                                            backgroundColor: '#e5e7eb',
                                                            borderRadius: 6
                                                        }}
                                                    >
                                                        <Text style={{ color: '#374151' }}>Cancel</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={handleSaveTraditionalUsage}
                                                        style={{
                                                            paddingHorizontal: 12,
                                                            paddingVertical: 6,
                                                            backgroundColor: '#059669',
                                                            borderRadius: 6
                                                        }}
                                                    >
                                                        <Text style={{ color: 'white' }}>Save</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ) : (
                                            <Markdown style={{
                                                body: { fontSize: 12, color: '#374151', lineHeight: 18 },
                                                heading1: { fontSize: 14, fontWeight: 'bold', color: '#166534', marginBottom: 4 },
                                                heading2: { fontSize: 13, fontWeight: 'bold', color: '#166534', marginBottom: 3 },
                                                strong: { fontWeight: 'bold', color: '#166534' },
                                                list_item: { fontSize: 12, color: '#374151', marginBottom: 2 },
                                                paragraph: { fontSize: 12, color: '#374151', marginBottom: 4 }
                                            }}>
                                                {plantDetail.traditionalUsage}
                                            </Markdown>
                                        )}
                                    </View>
                                </View>
                            )}
                            
                            {/* Plant Classification */}
                            <View style={{ marginBottom: 8 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 }}>🔬 Classification</Text>
                                <View style={{ 
                                    backgroundColor: '#f0fdf4', 
                                    padding: 12, 
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: '#bbf7d0'
                                }}>
                                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', width: 80 }}>Scientific:</Text>
                                        <Text selectable style={{ fontSize: 12, color: '#374151', flex: 1, fontStyle: 'italic' }}>
                                            {plantDetail.scientificName}
                                        </Text>
                                    </View>
                                    {plantDetail.commonNames && plantDetail.commonNames.length > 0 && (
                                        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', width: 80 }}>Common:</Text>
                                            <Text selectable style={{ fontSize: 12, color: '#374151', flex: 1 }}>
                                                {plantDetail.commonNames.join(', ')}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', width: 80 }}>Genus:</Text>
                                        <Text selectable style={{ fontSize: 12, color: '#374151', flex: 1 }}>
                                            {plantDetail.scientificName.split(' ')[0]}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row' }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', width: 80 }}>Species:</Text>
                                        <Text selectable style={{ fontSize: 12, color: '#374151', flex: 1 }}>
                                            {plantDetail.scientificName.split(' ').slice(1).join(' ') || 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Observation Statistics */}
                            <View style={{ marginBottom: 8 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 }}>📊 Your Observations</Text>
                                <View style={{ 
                                    backgroundColor: '#fef3c7', 
                                    padding: 12, 
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: '#fcd34d'
                                }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400e' }}>Total Sightings:</Text>
                                        <Text style={{ fontSize: 12, color: '#92400e', fontWeight: 'bold' }}>
                                            {plantDetail.sightingsCount}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400e' }}>Photos Taken:</Text>
                                        <Text style={{ fontSize: 12, color: '#92400e', fontWeight: 'bold' }}>
                                            {plantDetail.userPhotos.length}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400e' }}>First Spotted:</Text>
                                        <Text style={{ fontSize: 12, color: '#92400e' }}>
                                            {new Date(plantDetail.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    {plantDetail.lastSeen && (
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400e' }}>Last Seen:</Text>
                                            <Text style={{ fontSize: 12, color: '#92400e' }}>
                                                {new Date(plantDetail.lastSeen).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Safety Information */}
                            <View style={{ marginBottom: 8 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 }}>⚠️ Safety & Precautions</Text>
                                <View style={{ 
                                    backgroundColor: '#fef2f2', 
                                    padding: 12, 
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: '#fecaca'
                                }}>
                                    <Text style={{ fontSize: 12, color: '#991b1b', lineHeight: 16 }}>
                                        <Text style={{ fontWeight: 'bold' }}>⚠️ Important:</Text> Always consult with a qualified healthcare professional before using any plant for medicinal purposes. Plant identification through photos may not be 100% accurate. Never consume unknown plants.
                                    </Text>
                                    <Text style={{ fontSize: 10, color: '#7f1d1d', marginTop: 4, fontStyle: 'italic' }}>
                                        This information is for educational purposes only and is not medical advice.
                                    </Text>
                                </View>
                            </View>
                            
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                🔍 Spotted {plantDetail.sightingsCount} time{plantDetail.sightingsCount !== 1 ? 's' : ''}
                                {plantDetail.lastSeen && ` • Last seen ${new Date(plantDetail.lastSeen).toLocaleDateString()}`}
                            </Text>
                            
                            {/* Copy instructions */}
                            <View style={{ marginTop: 8, padding: 8, backgroundColor: '#f0fdf4', borderRadius: 6 }}>
                                <Text style={{ fontSize: 10, color: '#059669', textAlign: 'center' }}>
                                    💡 Press and hold any text above to select and copy plant information
                                </Text>
                            </View>
                            
                            {/* Quick Copy Button */}
                            <TouchableOpacity 
                                style={{ 
                                    marginTop: 8, 
                                    padding: 10, 
                                    backgroundColor: '#059669', 
                                    borderRadius: 6, 
                                    alignItems: 'center' 
                                }}
                                onPress={() => copyPlantInfo(plantDetail)}
                            >
                                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                                    📋 Copy All Plant Info
                                </Text>
                            </TouchableOpacity>
                            
                            {/* Add Photo Button */}
                            <TouchableOpacity 
                                style={{ 
                                    marginTop: 8, 
                                    padding: 10, 
                                    backgroundColor: '#0284c7', 
                                    borderRadius: 6, 
                                    alignItems: 'center' 
                                }}
                                onPress={addPhotoToPlant}
                                disabled={loading}
                            >
                                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                                    {loading ? '📸 Adding Photo...' : '📸 Add Another Photo'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* User Photos Gallery */}
                        {plantDetail.userPhotos.length > 0 && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 }}>
                                    📸 Your Photos ({plantDetail.userPhotos.length})
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                    {plantDetail.userPhotos.map((photo, index) => (
                                        <View 
                                            key={index} 
                                            style={{ position: 'relative', marginRight: 8 }}
                                        >
                                            <TouchableOpacity onPress={() => setZoomedImage(photo)}>
                                                <Image 
                                                    source={{ uri: photo }} 
                                                    style={{ 
                                                        width: 120, 
                                                        height: 120, 
                                                        borderRadius: 8, 
                                                        backgroundColor: '#f3f4f6'
                                                    }} 
                                                />
                                            </TouchableOpacity>
                                            
                                            {/* Delete button - visible in admin mode */}
                                            {adminMode && plantDetail.allSightings?.[index] && (
                                                <TouchableOpacity
                                                    style={{
                                                        position: 'absolute',
                                                        top: 4,
                                                        right: 4,
                                                        backgroundColor: 'rgba(220, 38, 38, 0.9)',
                                                        borderRadius: 12,
                                                        width: 24,
                                                        height: 24,
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        shadowColor: '#000',
                                                        shadowOffset: { width: 0, height: 2 },
                                                        shadowOpacity: 0.25,
                                                        shadowRadius: 3.84,
                                                        elevation: 5,
                                                    }}
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        const sighting = plantDetail.allSightings[index];
                                                        if (sighting) {
                                                            handleDeleteSighting(sighting._id, index);
                                                        }
                                                    }}
                                                >
                                                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>×</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                </ScrollView>
                                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                    💡 Each photo helps build a better reference for this species!
                                    {adminMode && " • Tap × to delete individual photos"}
                                </Text>
                            </View>
                        )}

                        {/* Coming Soon Notice for Additional Features */}
                        <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#ecfdf5', borderRadius: 8, borderWidth: 1, borderColor: '#059669' }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669', marginBottom: 4 }}>
                                ✨ Enhanced Plant Profiles Available!
                            </Text>
                            <Text style={{ fontSize: 11, color: '#047857', marginBottom: 6 }}>
                                Your plant profiles now include classification, observation statistics, and safety information.
                            </Text>
                            <Text style={{ fontSize: 10, color: '#065f46', fontStyle: 'italic' }}>
                                🔮 Coming soon: Growing conditions, seasonal info, companion plants, and more detailed botanical characteristics!
                            </Text>
                        </View>

                        {/* Wikipedia Link */}
                        {plantDetail.wikiUrl && (
                            <TouchableOpacity 
                                style={{ 
                                    padding: 12, 
                                    backgroundColor: '#059669', 
                                    borderRadius: 8, 
                                    alignItems: 'center',
                                    marginTop: 8
                                }}
                                onPress={async () => {
                                    try {
                                        if (!plantDetail.wikiUrl) return;
                                        const supported = await Linking.canOpenURL(plantDetail.wikiUrl);
                                        if (supported) {
                                            await Linking.openURL(plantDetail.wikiUrl);
                                        } else {
                                            Alert.alert("Error", "Cannot open this link");
                                        }
                                    } catch (error) {
                                        Alert.alert("Error", "Failed to open Wikipedia link");
                                    }
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: '600' }}>📖 Learn More on Wikipedia</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </>
        );
    };

    const renderZoomModal = () => {
        const [zoomScale, setZoomScale] = useState(1);

        return (
            <Modal visible={!!zoomedImage} transparent animationType="fade">
                <View style={{ 
                    flex: 1, 
                    backgroundColor: 'rgba(0,0,0,0.95)' 
                }}>
                    {/* Header with close button */}
                    <View style={{ 
                        flexDirection: 'row', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        paddingTop: 50, 
                        paddingHorizontal: 20,
                        paddingBottom: 10,
                        backgroundColor: 'rgba(0,0,0,0.8)'
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                                🔍 Zoom: {zoomScale.toFixed(1)}x
                            </Text>
                        </View>
                        <TouchableOpacity 
                            onPress={() => {
                                setZoomedImage(null);
                                setZoomScale(1);
                            }}
                            style={{ 
                                backgroundColor: 'rgba(255,255,255,0.2)', 
                                borderRadius: 20, 
                                width: 40, 
                                height: 40, 
                                justifyContent: 'center', 
                                alignItems: 'center' 
                            }}
                        >
                            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* Zoomable ScrollView */}
                    {zoomedImage && (
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ 
                                flexGrow: 1, 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                minHeight: screenHeight - 120,
                                backgroundColor: 'rgba(0,0,0,0.5)'
                            }}
                            showsHorizontalScrollIndicator={false}
                            showsVerticalScrollIndicator={false}
                            maximumZoomScale={5}
                            minimumZoomScale={1}
                            bouncesZoom={true}
                            pinchGestureEnabled={true}
                            scrollEventThrottle={16}
                            onScroll={(event) => {
                                const { zoomScale } = event.nativeEvent;
                                setZoomScale(zoomScale);
                            }}
                            centerContent={true}
                            scrollEnabled={true}
                            directionalLockEnabled={false}
                        >
                            <View style={{
                                shadowColor: "#000",
                                shadowOffset: {
                                    width: 0,
                                    height: 4,
                                },
                                shadowOpacity: 0.5,
                                shadowRadius: 8,
                                elevation: 10,
                            }}>
                                <Image 
                                    source={{ uri: zoomedImage }} 
                                    style={{ 
                                        width: screenWidth * 0.9, 
                                        height: screenHeight * 0.6,
                                        resizeMode: 'contain',
                                        borderRadius: 8,
                                        backgroundColor: '#ffffff'
                                    }} 
                                />
                            </View>
                        </ScrollView>
                    )}
                    
                    {/* Simplified Footer */}
                    <View style={{ 
                        paddingHorizontal: 20, 
                        paddingVertical: 15,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        alignItems: 'center'
                    }}>
                        <Text style={{ 
                            color: 'white', 
                            fontSize: 14,
                            textAlign: 'center',
                            marginBottom: 4
                        }}>
                            📱 Pinch to zoom • Drag to pan • Double-tap to zoom in
                        </Text>
                        <Text style={{ 
                            color: '#9ca3af', 
                            fontSize: 12,
                            textAlign: 'center'
                        }}>
                            🖱️ Trackpad: Two-finger pinch/zoom • Works perfectly!
                        </Text>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <ScrollView contentContainerStyle={{ 
            flexGrow: 1, 
            backgroundColor: '#f0fdf4', 
            paddingHorizontal: 24, 
            paddingTop: 60, // Add proper top padding for status bar
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
                
                {/* Admin Mode Toggle - Triple tap to activate */}
                <TouchableOpacity
                    style={{
                        paddingHorizontal: 8,
                        paddingVertical: 12,
                        borderRadius: 8,
                        backgroundColor: adminMode ? '#dc2626' : 'transparent'
                    }}
                    onPress={() => {
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
                            // Show helpful hint on first tap
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
                            // Reset counter after 2 seconds if not completed
                            setTimeout(() => setAdminTapCount(0), 2000);
                        }
                    }}
                >
                    <Text style={{ color: adminMode ? 'white' : '#6b7280', fontSize: 12 }}>
                        {adminMode ? '🔧 ADMIN' : adminTapCount > 0 ? `⚙️ ${adminTapCount}/3` : '⚙️'}
                    </Text>
                </TouchableOpacity>
            </View>

            {currentView === 'identify' ? renderIdentifyView() : currentView === 'collection' ? renderCollectionView() : renderPlantDetailView()}

            {renderZoomModal()}
        </ScrollView>
    );
}
