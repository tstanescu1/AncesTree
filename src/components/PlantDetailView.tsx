import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, ScrollView, TextInput, Linking, Alert, Modal, Clipboard, Pressable, SafeAreaView } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Id } from "../../convex/_generated/dataModel";
import { useAction, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import LocationPickerModal from './LocationPickerModal';
import PlantMedicinalDetailsView from './PlantMedicinalDetailsView';
import PlantMedicinalQAModal from './PlantMedicinalQAModal';
import PlantMedicinalDetailsModal from './PlantMedicinalDetailsModal';
import PlantChatView from './PlantChatView';
import PlantLocationsView from './PlantLocationsView';
import MedicinalObservationModal from './MedicinalObservationModal';
import MedicinalObservationsView from './MedicinalObservationsView';
import { useLocationHandler, LocationData } from '../hooks/useLocationHandler';

interface PlantDetailViewProps {
    selectedPlantId: string | null;
    plantDetail: any;
    plantFeedback?: any[];
    loading: boolean;
    deletingPlant: boolean;
    deletingSighting: boolean;
    settingDefaultPhoto: boolean;
    isEditingTraditionalUsage: boolean;
    editedTraditionalUsage: string;
    isEditingTags: boolean;
    editedTags: string[];
    editPreviewMode: boolean;
    textSelection: { start: number; end: number };
    showSafetyInfo: boolean;
    adminMode: boolean;
    setCurrentView: (view: 'identify' | 'collection' | 'detail') => void;
    setIsEditingTraditionalUsage: (editing: boolean) => void;
    setEditedTraditionalUsage: (text: string) => void;
    setIsEditingTags: (editing: boolean) => void;
    setEditedTags: (tags: string[]) => void;
    setEditPreviewMode: (mode: boolean) => void;
    setTextSelection: (selection: { start: number; end: number }) => void;
    setShowSafetyInfo: (show: boolean) => void;
    setZoomedImage: (uri: string | null) => void;
    handleSaveTraditionalUsage: () => void;
    handleSaveTags: () => void;
    insertOrWrapText: (wrapStart: string, wrapEnd?: string, placeholder?: string) => void;
    copyPlantInfo: (plant: any) => void;
    addPhotoToPlant: () => void;
    handleDeleteSighting: (sightingId: any, photoIndex: number) => void;
    handleSetDefaultPhoto: (sightingId: any) => void;
    handleSetDefaultDatabaseImage?: (imageUrl: string, plantId: string) => void;
    updatePlantFeedback: (args: { feedbackId: Id<"plant_feedback">, feedback: string }) => Promise<any>;
    addPlantFeedback: (args: { plantId: Id<"plants">, scientificName: string, feedback: string, timestamp: number }) => Promise<any>;
    refreshPlantData: () => Promise<void>;
    handleAddLocationToPlant: (plantId: string, location: LocationData) => Promise<void>;
}

export default function PlantDetailView({
    selectedPlantId,
    plantDetail,
    plantFeedback,
    loading,
    deletingPlant,
    deletingSighting,
    settingDefaultPhoto,
    isEditingTraditionalUsage,
    editedTraditionalUsage,
    isEditingTags,
    editedTags,
    editPreviewMode,
    textSelection,
    showSafetyInfo,
    adminMode,
    setCurrentView,
    setIsEditingTraditionalUsage,
    setEditedTraditionalUsage,
    setIsEditingTags,
    setEditedTags,
    setEditPreviewMode,
    setTextSelection,
    setShowSafetyInfo,
    setZoomedImage,
    handleSaveTraditionalUsage,
    handleSaveTags,
    insertOrWrapText,
    copyPlantInfo,
    addPhotoToPlant,
    handleDeleteSighting,
    handleSetDefaultPhoto,
    handleSetDefaultDatabaseImage,
    updatePlantFeedback,
    addPlantFeedback,
    refreshPlantData,
    handleAddLocationToPlant
}: PlantDetailViewProps) {
    // Community knowledge tracking
    const [communityRating, setCommunityRating] = useState(0);
    const [communityNotes, setCommunityNotes] = useState('');
    const [knowledgeContributions, setKnowledgeContributions] = useState<string[]>([]);
    const [showCommunityModal, setShowCommunityModal] = useState(false);
    const [communityTip, setCommunityTip] = useState('');
    const [showSharingOptions, setShowSharingOptions] = useState(false);
    const [plantRating, setPlantRating] = useState(0);
    const [userExperience, setUserExperience] = useState('');

    // Location handler hook
    const { openInMaps, currentLocation, getDistanceFromCurrentLocation, formatDecimalCoordinates } = useLocationHandler();

    // Convex client for medicinal Q&A
    const convex = useConvex();

    // State for editing feedback
    const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
    const [editingFeedbackText, setEditingFeedbackText] = useState('');
    const [savingFeedback, setSavingFeedback] = useState(false);
    // State for adding a new note
    const [addingNote, setAddingNote] = useState(false);
    const [newNoteText, setNewNoteText] = useState('');
    const [savingNewNote, setSavingNewNote] = useState(false);

    // State for adding location to entries without location data
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [addingLocation, setAddingLocation] = useState(false);
    const [showMedicinalDetailsModal, setShowMedicinalDetailsModal] = useState(false);
    const [showMedicinalQAModal, setShowMedicinalQAModal] = useState(false);
    const [showChatView, setShowChatView] = useState(false);
    const [showLocationsView, setShowLocationsView] = useState(false);
    const [showLocationSection, setShowLocationSection] = useState(false);
    const [showMedicinalObservationModal, setShowMedicinalObservationModal] = useState(false);
    const [showObservationsView, setShowObservationsView] = useState(false);
    const [showLearningSafety, setShowLearningSafety] = useState(false);

    // Add state for refresh functionality
    const [refreshingComprehensiveData, setRefreshingComprehensiveData] = useState(false);
    
    // Add the action for re-extracting comprehensive data
    const reExtractComprehensiveData = useAction(api.identifyPlant.reExtractComprehensiveData);

    // Handler functions for location picker
    const handleOpenLocationPicker = () => {
        setShowLocationPicker(true);
    };

    const handleCloseLocationPicker = () => {
        setShowLocationPicker(false);
    };

    const handleLocationSelected = async (location: LocationData) => {
        if (!selectedPlantId) return;

        setAddingLocation(true);
        try {
            await handleAddLocationToPlant(selectedPlantId!, location);
            setShowLocationPicker(false);
        } catch (error) {
            console.error('Error adding location:', error);
        } finally {
            setAddingLocation(false);
        }
    };

    // Calculate distance between two points using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Filter sightings by distance from current location
    const filterSightingsByDistance = (sightings: any[]) => {
        if (!currentLocation) return sightings;

        return sightings.filter(sighting => {
            if (!sighting.latitude || !sighting.longitude) return false;

            const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                sighting.latitude,
                sighting.longitude
            );

            return distance <= 5; // 5km radius (much more reasonable)
        });
    };

    // --- Nearby Sightings Logic ---
    const [showNearbySightings, setShowNearbySightings] = useState(false);

    // Show loading while query is in progress
    if (selectedPlantId && plantDetail === undefined) {
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
                    onPress={() => setCurrentView('collection')}
                >
                    <Text style={{ color: 'white', fontWeight: '600' }}>← Back to Collection</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Don't render anything if plantDetail is not available yet
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

    // At this point, plantDetail is guaranteed to exist and not have an error

    // Community knowledge functions
    const updateCommunityRating = (rating: number) => {
        setCommunityRating(rating);
        Alert.alert('Rating Updated', `Community rating updated to ${rating}/5`);
    };

    const addKnowledgeContribution = (contribution: string) => {
        setKnowledgeContributions([...knowledgeContributions, contribution]);
    };

    // Handler for medicinal Q&A using Convex backend
    const handleMedicinalQuestion = async (question: string): Promise<string> => {
        if (!selectedPlantId) {
            throw new Error("No plant selected");
        }

        try {
            // Call the Convex function for AI-powered responses
            const response = await convex.query(api.index.askMedicinalQuestion, {
                plantId: selectedPlantId as Id<"plants">,
                question: question
            });

            return response.response;
        } catch (error) {
            console.error('Error getting medicinal response:', error);
            return "I'm sorry, I couldn't process your question right now. Please try again later or consult with a qualified herbalist or healthcare provider.";
        }
    };

    // Handler for refreshing comprehensive data
    const handleRefreshComprehensiveData = async () => {
        if (!selectedPlantId || refreshingComprehensiveData) return;
        
        setRefreshingComprehensiveData(true);
        try {
            console.log('🔄 Refreshing comprehensive medicinal data...');
            
            const result = await reExtractComprehensiveData({ plantId: selectedPlantId as any });
            
            if (result.success) {
                console.log('✅ Comprehensive data refreshed:', result.message);
                Alert.alert(
                    '✅ Success', 
                    `Updated ${plantDetail?.scientificName} with comprehensive medicinal data!\n\n` +
                    `• ${result.data.medicinalTags.length} medicinal properties\n` +
                    `• ${result.data.preparationMethods.length} preparation methods\n` +
                    `• ${result.data.partsUsed.length} parts used\n` +
                    `• ${result.data.medicinalUses.length} detailed uses`
                );
                
                // Refresh the plant data to show the new information
                await refreshPlantData();
            } else {
                Alert.alert('❌ Error', 'Failed to refresh comprehensive data');
            }
        } catch (error) {
            console.error('❌ Error refreshing comprehensive data:', error);
            Alert.alert('❌ Error', 'Failed to refresh comprehensive data. Please try again.');
        } finally {
            setRefreshingComprehensiveData(false);
        }
    };

    return (
        <>
            {/* Back Button */}
            <TouchableOpacity
                style={{ alignSelf: 'flex-start', marginBottom: 16, padding: 8 }}
                onPress={() => setCurrentView('collection')}
            >
                <Text style={{ fontSize: 16, color: '#059669' }}>← Back to Collection</Text>
            </TouchableOpacity>

            {/* Header with Refresh Button */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#166534', flex: 1, textAlign: 'center' }}>
                    🌿 {plantDetail && !('error' in plantDetail) ? (plantDetail.commonNames?.[0] || plantDetail.scientificName) : 'Plant Details'}
                </Text>
                
                {/* Refresh Comprehensive Data Button */}
                <TouchableOpacity
                    style={{
                        backgroundColor: '#f59e0b',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        marginLeft: 8,
                        opacity: refreshingComprehensiveData ? 0.6 : 1
                    }}
                    onPress={handleRefreshComprehensiveData}
                    disabled={refreshingComprehensiveData}
                >
                    {refreshingComprehensiveData ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                            🔄 Refresh
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {plantDetail && !('error' in plantDetail) && (
                <View style={{ width: '100%', maxWidth: 400 }}>
                    {/* Show refresh status */}
                    {refreshingComprehensiveData && (
                        <View style={{ 
                            backgroundColor: '#fef3c7', 
                            padding: 12, 
                            borderRadius: 8, 
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: '#f59e0b'
                        }}>
                            <Text style={{ fontSize: 14, color: '#92400e', textAlign: 'center' }}>
                                🔄 Extracting comprehensive medicinal data...
                            </Text>
                        </View>
                    )}
                    
                    {/* Show if comprehensive data is missing */}
                    {!refreshingComprehensiveData && 
                     (!plantDetail.medicinalUses || plantDetail.medicinalUses.length === 0) &&
                     (!plantDetail.preparationMethods || plantDetail.preparationMethods.length === 0) &&
                     (!plantDetail.partsUsed || plantDetail.partsUsed.length === 0) && (
                        <View style={{ 
                            backgroundColor: '#fef2f2', 
                            padding: 12, 
                            borderRadius: 8, 
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: '#fecaca'
                        }}>
                            <Text style={{ fontSize: 14, color: '#dc2626', textAlign: 'center', marginBottom: 8 }}>
                                ⚠️ Comprehensive medicinal data not available
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                                Tap the refresh button above to extract detailed medicinal information
                            </Text>
                        </View>
                    )}

                    {/* NEW: Plant Description Section */}
                    {plantDetail.description && (
                        <View style={{ marginBottom: 16, padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                                🌿 Description
                            </Text>
                            <View style={{ 
                                backgroundColor: 'white', 
                                padding: 12, 
                                borderRadius: 8, 
                                borderWidth: 1, 
                                borderColor: '#e2e8f0' 
                            }}>
                                <Text style={{ 
                                    fontSize: 13, 
                                    color: '#374151', 
                                    lineHeight: 18,
                                    textAlign: 'justify'
                                }}>
                                    {plantDetail.description}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Comprehensive Photo Gallery - All images in one place */}
                    {((plantDetail.userPhotos && plantDetail.userPhotos.length > 0) || (plantDetail.similar_images && plantDetail.similar_images.length > 0) || true) && (
                        <View style={{ marginBottom: 16 }}>

                            <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                                {(() => {
                                    // Simplified photo count calculation - show all photos
                                    const userPhotoCount = plantDetail.userPhotos ? plantDetail.userPhotos.length : 0;
                                    const databasePhotoCount = plantDetail.similar_images ? plantDetail.similar_images.length : 0;
                                    const totalCount = userPhotoCount + databasePhotoCount;

                                    if (userPhotoCount > 0 && databasePhotoCount > 0) {
                                        return `${userPhotoCount} your photos • ${databasePhotoCount} database images • ${totalCount} total`;
                                    } else if (userPhotoCount > 0) {
                                        return `${userPhotoCount} photos of your plant`;
                                    } else if (databasePhotoCount > 0) {
                                        return `${databasePhotoCount} reference images from community database`;
                                    }
                                    return 'Add photos to build a comprehensive gallery';
                                })()}
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {/* User's photos in gallery */}
                                    {plantDetail.userPhotos && plantDetail.userPhotos.length > 0 && (() => {
                                        // Show all user photos since we removed the reference photo section
                                        return plantDetail.userPhotos.map((photo: string, index: number) => {
                                            // Debug logging for user photos (without flooding console)
                                            console.log(` User photo ${index}: ${photo.substring(0, 20)}...`);
                                            console.log(`🔍 Corresponding sighting: ${plantDetail.allSightings?.[index]?._id}`);

                                            return (
                                                <View
                                                    key={`user-${index}`}
                                                    style={{ position: 'relative' }}
                                                >
                                                    <TouchableOpacity
                                                        onPress={() => setZoomedImage(photo)}
                                                        onLongPress={() => {
                                                            // Disable long press during delete operations
                                                            if (deletingSighting || settingDefaultPhoto) return;

                                                            Alert.alert(
                                                                "Photo Options",
                                                                "Choose an action for this photo:",
                                                                [
                                                                    { text: "Cancel", style: "cancel" },
                                                                    {
                                                                        text: "🖼️ Set as Default",
                                                                        onPress: () => {
                                                                            const sighting = plantDetail.allSightings?.[index];
                                                                            if (sighting) {
                                                                                console.log(`🖼️ Setting user photo as default: sighting ${sighting._id}`);
                                                                                handleSetDefaultPhoto(sighting._id);
                                                                            } else {
                                                                                console.error(`❌ Could not find sighting for photo ${index}`);
                                                                                Alert.alert('Error', 'Could not find associated photo data');
                                                                            }
                                                                        }
                                                                    },
                                                                    {
                                                                        text: "🗑️ Delete Photo",
                                                                        style: "destructive",
                                                                        onPress: () => {
                                                                            Alert.alert(
                                                                                "Delete Photo",
                                                                                "Are you sure you want to delete this photo? This cannot be undone.",
                                                                                [
                                                                                    { text: "Cancel", style: "cancel" },
                                                                                    {
                                                                                        text: "Delete",
                                                                                        style: "destructive",
                                                                                        onPress: () => {
                                                                                            const sighting = plantDetail.allSightings?.[index];
                                                                                            if (sighting) {
                                                                                                console.log(`🗑️ Deleting user photo: sighting ${sighting._id}`);
                                                                                                handleDeleteSighting(sighting._id, index);
                                                                                            } else {
                                                                                                console.error(`❌ Could not find sighting for photo ${index}`);
                                                                                                Alert.alert('Error', 'Could not find associated photo data');
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                ]
                                                                            );
                                                                        }
                                                                    }
                                                                ]
                                                            );
                                                        }}
                                                        style={{
                                                            borderRadius: 8,
                                                            overflow: 'hidden',
                                                            opacity: (deletingSighting || settingDefaultPhoto) ? 0.5 : 1
                                                        }}
                                                        activeOpacity={0.8}
                                                        disabled={deletingSighting || settingDefaultPhoto}
                                                    >
                                                        <Image
                                                            source={{ uri: photo.startsWith('data:') ? photo : `data:image/jpeg;base64,${photo}` }}
                                                            style={{
                                                                width: 120,
                                                                height: 120,
                                                                backgroundColor: '#f3f4f6'
                                                            }}
                                                            resizeMode="cover"
                                                        />

                                                        {/* Photo source indicator */}
                                                        <View style={{
                                                            position: 'absolute',
                                                            bottom: 4,
                                                            left: 4,
                                                            backgroundColor: 'rgba(5, 150, 105, 0.9)',
                                                            paddingHorizontal: 4,
                                                            paddingVertical: 2,
                                                            borderRadius: 4
                                                        }}>
                                                            <Text style={{ color: 'white', fontSize: 8, fontWeight: '600' }}>
                                                                📸 Your Photo
                                                            </Text>
                                                        </View>

                                                        {/* Set as default hint */}
                                                        <View style={{
                                                            position: 'absolute',
                                                            top: 4,
                                                            left: 4,
                                                            backgroundColor: 'rgba(59, 130, 246, 0.9)',
                                                            paddingHorizontal: 4,
                                                            paddingVertical: 2,
                                                            borderRadius: 4
                                                        }}>
                                                            <Text style={{ color: 'white', fontSize: 8, fontWeight: '600' }}>
                                                                Hold
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                </View>
                                            );
                                        });
                                    })()}

                                    {/* Database images */}
                                    {plantDetail.similar_images && plantDetail.similar_images.map((imageUrl: string, index: number) => (
                                        <TouchableOpacity
                                            key={`database-${index}`}
                                            onPress={() => setZoomedImage(imageUrl)}
                                            onLongPress={() => {
                                                Alert.alert(
                                                    "Database Image Options",
                                                    "Choose an action for this reference image:",
                                                    [
                                                        { text: "Cancel", style: "cancel" },
                                                        {
                                                            text: "🔍 View Larger",
                                                            onPress: () => setZoomedImage(imageUrl)
                                                        },
                                                        {
                                                            text: "🖼️ Set as Default",
                                                            onPress: () => {
                                                                handleSetDefaultDatabaseImage && handleSetDefaultDatabaseImage(imageUrl, plantDetail._id);
                                                            }
                                                        },
                                                        {
                                                            text: "📋 Copy Image URL",
                                                            onPress: async () => {
                                                                try {
                                                                    await Clipboard.setString(imageUrl);
                                                                    Alert.alert("✅ Copied", "Image URL copied to clipboard!");
                                                                } catch (error) {
                                                                    Alert.alert("❌ Error", "Failed to copy URL");
                                                                }
                                                            }
                                                        },
                                                        {
                                                            text: "🗑️ Remove from Collection",
                                                            style: "destructive",
                                                            onPress: () => {
                                                                Alert.alert(
                                                                    "Remove Reference Image",
                                                                    "Remove this image from your plant's reference collection?",
                                                                    [
                                                                        { text: "Cancel", style: "cancel" },
                                                                        {
                                                                            text: "Remove",
                                                                            style: "destructive",
                                                                            onPress: () => {
                                                                                // TODO: Implement remove database image functionality
                                                                                Alert.alert(
                                                                                    "Feature Coming Soon",
                                                                                    "The ability to manage reference images will be available in the next update!"
                                                                                );
                                                                            }
                                                                        }
                                                                    ]
                                                                );
                                                            }
                                                        }
                                                    ]
                                                );
                                            }}
                                            style={{
                                                position: 'relative',
                                                borderRadius: 8,
                                                overflow: 'hidden'
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Image
                                                source={{ uri: imageUrl }}
                                                style={{
                                                    width: 120,
                                                    height: 120,
                                                    backgroundColor: '#f3f4f6'
                                                }}
                                                resizeMode="cover"
                                                onError={() => {
                                                    console.log(`Failed to load database image: ${imageUrl}`);
                                                }}
                                            />

                                            {/* Photo source indicator */}
                                            <View style={{
                                                position: 'absolute',
                                                bottom: 4,
                                                left: 4,
                                                backgroundColor: 'rgba(107, 114, 128, 0.9)',
                                                paddingHorizontal: 4,
                                                paddingVertical: 2,
                                                borderRadius: 4
                                            }}>
                                                <Text style={{ color: 'white', fontSize: 8, fontWeight: '600' }}>
                                                    🗂️ Database
                                                </Text>
                                            </View>

                                            {/* Hold hint for database images */}
                                            <View style={{
                                                position: 'absolute',
                                                top: 4,
                                                left: 4,
                                                backgroundColor: 'rgba(107, 114, 128, 0.9)',
                                                paddingHorizontal: 4,
                                                paddingVertical: 2,
                                                borderRadius: 4
                                            }}>
                                                <Text style={{ color: 'white', fontSize: 8, fontWeight: '600' }}>
                                                    Hold
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}

                                    {/* Add Photo Button - Moved to end of gallery */}
                                    <TouchableOpacity
                                        style={{
                                            width: 120,
                                            height: 120,
                                            borderRadius: 8,
                                            backgroundColor: loading ? '#f3f4f6' : '#f0fdf4',
                                            borderWidth: 2,
                                            borderColor: loading ? '#d1d5db' : '#bbf7d0',
                                            borderStyle: 'dashed',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            position: 'relative',
                                            opacity: loading ? 0.7 : 1
                                        }}
                                        onPress={addPhotoToPlant}
                                        disabled={loading}
                                        activeOpacity={0.7}
                                    >
                                        {loading ? (
                                            <>
                                                <ActivityIndicator size="small" color="#059669" style={{ marginBottom: 4 }} />
                                                <Text style={{
                                                    fontSize: 11,
                                                    fontWeight: '600',
                                                    color: '#059669',
                                                    textAlign: 'center',
                                                    paddingHorizontal: 8
                                                }}>
                                                    Adding...
                                                </Text>
                                            </>
                                        ) : (
                                            <>
                                                <Text style={{ fontSize: 24, marginBottom: 4 }}>📸</Text>
                                                <Text style={{
                                                    fontSize: 11,
                                                    fontWeight: '600',
                                                    color: '#059669',
                                                    textAlign: 'center',
                                                    paddingHorizontal: 8
                                                }}>
                                                    Add Photo
                                                </Text>

                                                {/* Pulse animation hint */}
                                                <View style={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    right: 8,
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: 4,
                                                    backgroundColor: '#10b981'
                                                }} />
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>

                            <Text style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 4 }}>
                                💡 Tap to zoom • Long press your photos for options
                            </Text>
                        </View>
                    )}

                    {/* Plant Info */}
                    <View style={{ marginBottom: 6, padding: 6, backgroundColor: 'white', borderRadius: 12 }}>

                        {/* Plant Classification */}
                        <View style={{ marginBottom: 1 }}>
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
                    </View>

                    {/* Enhanced Medicinal Knowledge Section */}
                    <View style={{ marginBottom: 16, padding: 16, backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0' }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#166534', marginBottom: 12 }}>
                            🌿 Traditional Medicinal Knowledge
                        </Text>

                        {/* AI-Generated Medicinal Information */}
                        {(plantDetail.medicinalUses || plantDetail.preparationMethods || plantDetail.partsUsed) && (
                            <View style={{ marginBottom: 16, padding: 12, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534', marginBottom: 8 }}>
                                    🌻 Medicinal Information
                                </Text>
                                
                                {/* Medicinal Uses */}
                                {plantDetail.medicinalUses && plantDetail.medicinalUses.length > 0 && (
                                    <View style={{ marginBottom: 12 }}>
                                        {plantDetail.medicinalUses.map((use: string, index: number) => (
                                            <View key={index} style={{ 
                                                backgroundColor: '#f0fdf4', 
                                                padding: 8, 
                                                borderRadius: 6, 
                                                marginBottom: 8, // Increased margin for spacing
                                                borderLeftWidth: 3,
                                                borderLeftColor: '#16a34a'
                                            }}>
                                                <Text style={{ fontSize: 11, color: '#166534', lineHeight: 16 }}>
                                                    • {use}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                
                                {/* Preparation Methods */}
                                {plantDetail.preparationMethods && plantDetail.preparationMethods.length > 0 && (
                                    <View style={{ marginBottom: 12 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                                            🔬 Preparation Methods:
                                        </Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                            {plantDetail.preparationMethods.map((method: string, index: number) => (
                                                <View 
                                                    key={index}
                                                    style={{ 
                                                        backgroundColor: '#dbeafe', 
                                                        paddingHorizontal: 8, 
                                                        paddingVertical: 4, 
                                                        borderRadius: 12,
                                                        borderWidth: 1,
                                                        borderColor: '#3b82f6'
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 11, color: '#1e40af', fontWeight: '500' }}>
                                                        {method}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                                
                                {/* Parts Used */}
                                {plantDetail.partsUsed && plantDetail.partsUsed.length > 0 && (
                                    <View style={{ marginBottom: 12 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                                            🌿 Parts Used:
                                        </Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                            {plantDetail.partsUsed.map((part: string, index: number) => (
                                                <View 
                                                    key={index}
                                                    style={{ 
                                                        backgroundColor: '#fef3c7', 
                                                        paddingHorizontal: 8, 
                                                        paddingVertical: 4, 
                                                        borderRadius: 12,
                                                        borderWidth: 1,
                                                        borderColor: '#f59e0b'
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 11, color: '#92400e', fontWeight: '500' }}>
                                                        {part}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Medicinal Properties */}
                        {plantDetail.medicinalTags && plantDetail.medicinalTags.length > 0 && (
                            <View style={{ marginBottom: 16, padding: 12, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534', marginBottom: 8 }}>
                                    🌻 Medicinal Properties
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                    {plantDetail.medicinalTags.map((tag: string, index: number) => (
                                        <View
                                            key={index}
                                            style={{
                                                backgroundColor: '#dcfce7',
                                                paddingHorizontal: 8,
                                                paddingVertical: 4,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: '#16a34a'
                                            }}
                                        >
                                            <Text style={{ fontSize: 12, color: '#166534', fontWeight: '500' }}>
                                                {tag}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            style={{
                                backgroundColor: '#059669',
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 8,
                                alignItems: 'center',
                                marginBottom: 16
                            }}
                            onPress={() => setShowMedicinalQAModal(true)}
                        >
                            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                                💬 Ask Questions About This Plant
                            </Text>
                        </TouchableOpacity>

                        {/* Traditional Usage Information - MOVED HERE */}
                        {plantDetail.traditionalUsage && plantDetail.traditionalUsage.trim() && (
                            <View style={{ marginBottom: 16 }}>
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
                                                            list_item: { fontSize: 13, color: '#374151', marginBottom: 2 },
                                                            paragraph: { fontSize: 13, color: '#374151', marginBottom: 4 }
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
                                                        setEditPreviewMode(false);
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
                                            list_item: { fontSize: 13, color: '#374151', marginBottom: 2 },
                                            paragraph: { fontSize: 13, color: '#374151', marginBottom: 4 }
                                        }}>
                                            {plantDetail.traditionalUsage}
                                        </Markdown>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* User's Medicinal Observations */}
                        {plantDetail.allSightings && plantDetail.allSightings.some((s: any) => s.medicinalUses || s.preparationMethods || s.partsUsed || s.dosageNotes || s.sourceAttribution || s.userExperience) && (
                            <View style={{ marginBottom: 16, padding: 12, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534', marginBottom: 12 }}>
                                    📝 Your Medicinal Observations
                                </Text>
                                {plantDetail.allSightings.map((sighting: any, index: number) => (
                                    (sighting.medicinalUses || sighting.preparationMethods || sighting.partsUsed || sighting.dosageNotes || sighting.sourceAttribution || sighting.userExperience) && (
                                        <View key={index} style={{ marginBottom: 12, padding: 10, backgroundColor: '#f8fafc', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' }}>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                                                Observation #{index + 1} - {new Date(sighting.identifiedAt).toLocaleDateString()}
                                            </Text>
                                            <PlantMedicinalDetailsView
                                                details={{
                                                    medicinalUses: sighting.medicinalUses || [],
                                                    preparationMethods: sighting.preparationMethods || [],
                                                    partsUsed: sighting.partsUsed || [],
                                                    dosageNotes: sighting.dosageNotes || '',
                                                    sourceAttribution: sighting.sourceAttribution || '',
                                                    userExperience: sighting.userExperience || '',
                                                }}
                                                showEditButton={false}
                                            />
                                        </View>
                                    )
                                ))}
                            </View>
                        )}

                        {/* Add New Medicinal Observation Button */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#059669',
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                                borderRadius: 8,
                                alignItems: 'center',
                                marginTop: 8
                            }}
                            onPress={() => {
                                console.log('Opening medicinal observation modal');
                                setShowMedicinalObservationModal(true);
                            }}
                        >
                            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                                ➕ Share Your Medicinal Insights
                            </Text>
                        </TouchableOpacity>

                        {/* View All Observations Button */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#f3f4f6',
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                                borderRadius: 8,
                                alignItems: 'center',
                                marginTop: 8,
                                borderWidth: 1,
                                borderColor: '#d1d5db'
                            }}
                            onPress={() => {
                                console.log('Opening observations view');
                                setShowObservationsView(true);
                            }}
                        >
                            <Text style={{ color: '#374151', fontSize: 14, fontWeight: '600' }}>
                                🌍 Explore Community Observations 
                            </Text>
                        </TouchableOpacity>
                    </View>


                    {/* Locations & Observations - Improved Design */}
                    {plantDetail.allSightings && plantDetail.allSightings.some((s: any) => s.latitude && s.longitude) && (
                        <View style={{
                            marginBottom: 16,
                            backgroundColor: 'white',
                            borderRadius: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.08,
                            shadowRadius: 8,
                            elevation: 4,
                            overflow: 'hidden'
                        }}>
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 16,
                                    backgroundColor: '#f0f9ff',
                                    borderBottomWidth: showLocationSection ? 1 : 0,
                                    borderBottomColor: '#e0f2fe'
                                }}
                                onPress={() => setShowLocationSection(!showLocationSection)}
                                activeOpacity={0.7}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        backgroundColor: '#0ea5e9',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginRight: 12
                                    }}>
                                        <Text style={{ fontSize: 16 }}>📍</Text>
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#0c4a6e', marginBottom: 2 }}>
                                            Locations & Observations
                                        </Text>
                                        <Text style={{ fontSize: 12, color: '#0369a1' }}>
                                            {plantDetail.allSightings.filter((s: any) => s.latitude && s.longitude).length} location{plantDetail.allSightings.filter((s: any) => s.latitude && s.longitude).length !== 1 ? 's' : ''} found
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {plantDetail.allSightings.filter((s: any) => s.latitude && s.longitude).length > 1 && showLocationSection && (
                                        <TouchableOpacity
                                            style={{
                                                backgroundColor: '#0ea5e9',
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: 8,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 1 },
                                                shadowOpacity: 0.1,
                                                shadowRadius: 2,
                                                elevation: 2,
                                            }}
                                            onPress={() => setShowLocationsView(true)}
                                        >
                                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                                                🗺️ View All
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    <View style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 14,
                                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        paddingBottom: 2
                                    }}>
                                        <Text style={{ fontSize: 14, color: '#0ea5e9', fontWeight: '600' }}>
                                            {showLocationSection ? '−' : '+'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {showLocationSection && (
                                <View style={{ padding: 16 }}>
                                    {/* Common in Area Section - Improved */}
                                    {currentLocation && (() => {
                                        const nearbySightings: any[] = (currentLocation && plantDetail && plantDetail.allSightings)
                                            ? filterSightingsByDistance(plantDetail.allSightings)
                                            : [];
                                        const sortedNearbySightings = nearbySightings.length > 0 && currentLocation
                                            ? [...nearbySightings].sort((a, b) => {
                                                const distA = calculateDistance(currentLocation.latitude, currentLocation.longitude, a.latitude, a.longitude);
                                                const distB = calculateDistance(currentLocation.latitude, currentLocation.longitude, b.latitude, b.longitude);
                                                return distA - distB;
                                            })
                                            : [];
                                        const hasNearby = sortedNearbySightings.length > 0;

                                        return (
                                            <View style={{
                                                marginBottom: 16,
                                                padding: 14,
                                                backgroundColor: hasNearby ? '#f0fdf4' : '#fffbeb',
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: hasNearby ? '#bbf7d0' : '#fed7aa',
                                                flexDirection: 'row',
                                                alignItems: 'center'
                                            }}>
                                                <View style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 16,
                                                    backgroundColor: hasNearby ? '#dcfce7' : '#fef3c7',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    marginRight: 12
                                                }}>
                                                    <Text style={{ fontSize: 16 }}>
                                                        {hasNearby ? '🌱' : '🔍'}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 14, fontWeight: '600', color: hasNearby ? '#166534' : '#92400e', marginBottom: 2 }}>
                                                        {hasNearby ? 'Common in your area' : 'Rare in your area'}
                                                    </Text>
                                                    <Text style={{ fontSize: 12, color: hasNearby ? '#15803d' : '#a16207', lineHeight: 16 }}>
                                                        {hasNearby ? 'Based on plant sightings within 5km of your current location.' : 'No sightings of this plant within 5km of your current location.'}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })()}

                                    {/* Observation Statistics - Improved */}
                                    <View style={{ marginBottom: 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                            <View style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 14,
                                                backgroundColor: '#fef3c7',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginRight: 10
                                            }}>
                                                <Text style={{ fontSize: 14 }}>📊</Text>
                                            </View>
                                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#92400e' }}>
                                                Your Observations
                                            </Text>
                                        </View>
                                        <View style={{
                                            backgroundColor: '#fef3c7',
                                            padding: 16,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: '#fcd34d'
                                        }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>Total Sightings:</Text>
                                                <Text style={{ fontSize: 13, color: '#92400e', fontWeight: 'bold' }}>
                                                    {plantDetail.sightingsCount}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>Photos Taken:</Text>
                                                <Text style={{ fontSize: 13, color: '#92400e', fontWeight: 'bold' }}>
                                                    {plantDetail.userPhotos.length}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>First Spotted:</Text>
                                                <Text style={{ fontSize: 13, color: '#92400e' }}>
                                                    {new Date(plantDetail.createdAt).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            {plantDetail.lastSeen && (
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>Last Seen:</Text>
                                                    <Text style={{ fontSize: 13, color: '#92400e' }}>
                                                        {new Date(plantDetail.lastSeen).toLocaleDateString()}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Location Details - Improved */}
                                    <View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                            <View style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 14,
                                                backgroundColor: '#e0f2fe',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginRight: 10
                                            }}>
                                                <Text style={{ fontSize: 14 }}>🗺️</Text>
                                            </View>
                                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#0c4a6e' }}>
                                                Location Details
                                            </Text>
                                        </View>
                                        {plantDetail.allSightings.filter((s: any) => s.latitude && s.longitude).slice(0, 2).map((sighting: any, index: number) => (
                                            <Pressable
                                                key={index}
                                                style={{
                                                    marginBottom: 12,
                                                    padding: 14,
                                                    backgroundColor: '#f8fafc',
                                                    borderRadius: 12,
                                                    borderWidth: 1,
                                                    borderColor: '#e2e8f0',
                                                    shadowColor: '#000',
                                                    shadowOffset: { width: 0, height: 1 },
                                                    shadowOpacity: 0.05,
                                                    shadowRadius: 2,
                                                    elevation: 1,
                                                }}
                                                onPress={() => {
                                                    if (sighting.latitude && sighting.longitude) {
                                                        openInMaps(sighting.latitude, sighting.longitude, plantDetail.commonNames?.[0] || plantDetail.scientificName);
                                                    }
                                                }}
                                            >
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                                                    {sighting.address || 'Unknown location'}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', marginBottom: 8 }}>
                                                    {sighting.latitude.toFixed(6)}, {sighting.longitude.toFixed(6)}
                                                </Text>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 11, color: '#6b7280' }}>
                                                        {new Date(sighting.identifiedAt).toLocaleDateString()}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: '#0ea5e9', fontWeight: '600' }}>
                                                        🗺️ Open in Maps
                                                    </Text>
                                                </View>
                                            </Pressable>
                                        ))}
                                        {plantDetail.allSightings.filter((s: any) => s.latitude && s.longitude).length > 2 && (
                                            <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', fontStyle: 'italic', marginTop: 8 }}>
                                                +{plantDetail.allSightings.filter((s: any) => s.latitude && s.longitude).length - 2} more locations
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>
                    )}



                    {/* Chat with Taita Button */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                padding: 12,
                                backgroundColor: '#7c3aed',
                                borderRadius: 8,
                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 3,
                            }}
                            onPress={() => setShowChatView(true)}
                        >
                            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600', marginBottom: 2 }}>
                                🌿 Chat with Taita
                            </Text>
                            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 10 }}>
                                Ask about traditional uses & wisdom
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Learning & Safety Section - Full Width */}
                    <View style={{
                        marginTop: 20,
                        marginBottom: 20,
                        backgroundColor: 'white',
                        borderRadius: 20,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 8,
                        overflow: 'hidden'
                    }}>
                        {/* Header with gradient background */}
                        <TouchableOpacity 
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 20,
                                backgroundColor: '#667eea',
                                paddingBottom: 16
                            }}
                            onPress={() => setShowLearningSafety(!showLearningSafety)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 12
                                }}>
                                    <Text style={{ fontSize: 18 }}>📚</Text>
                                </View>
                                <View>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: 'white', marginBottom: 2 }}>
                                        Learning & Safety
                                    </Text>
                                    <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' }}>
                                        Identification tips & sustainable practices
                                    </Text>
                                </View>
                            </View>
                            <View style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                justifyContent: 'center',
                                alignItems: 'center',
                                paddingBottom: 2

                            }}>
                                <Text style={{ fontSize: 20, color: 'white', fontWeight: '600' }}>
                                    {showLearningSafety ? '−' : '+'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {showLearningSafety && (
                            <View style={{ padding: 20 }}>
                                {/* Medical Disclaimer - Redesigned */}
                                <View style={{
                                    marginBottom: 20,
                                    padding: 16,
                                    backgroundColor: '#fef2f2',
                                    borderRadius: 12,
                                    borderLeftWidth: 4,
                                    borderLeftColor: '#dc2626',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start'
                                }}>
                                    <Text style={{ fontSize: 16, marginRight: 8, marginTop: 2 }}>⚠️</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 13, color: '#991b1b', fontWeight: '600', marginBottom: 4 }}>
                                            Medical Disclaimer
                                        </Text>
                                        <Text style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 16 }}>
                                            This information is for educational purposes only and does not constitute medical advice. Always consult healthcare professionals before using any plant medicinally.
                                        </Text>
                                    </View>
                                </View>

                                {/* Identification Tips - Redesigned */}
                                <View style={{ marginBottom: 20 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                        <View style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 14,
                                            backgroundColor: '#dbeafe',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginRight: 10
                                        }}>
                                            <Text style={{ fontSize: 14 }}>🔍</Text>
                                        </View>
                                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#1e40af' }}>
                                            Identification Tips
                                        </Text>
                                    </View>
                                    <View style={{
                                        backgroundColor: '#f8fafc',
                                        padding: 16,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: '#e2e8f0'
                                    }}>
                                        {[
                                            'Look for distinctive leaf patterns and flower structures',
                                            'Check the stem texture and growth pattern',
                                            'Note the habitat and growing conditions',
                                            'Take photos from multiple angles for better identification',
                                            'Compare with similar species to avoid confusion'
                                        ].map((tip, index) => (
                                            <View key={index} style={{ flexDirection: 'row', marginBottom: index < 4 ? 8 : 0 }}>
                                                <Text style={{ fontSize: 12, color: '#3b82f6', marginRight: 8, marginTop: 1 }}>•</Text>
                                                <Text style={{ fontSize: 12, color: '#374151', lineHeight: 16, flex: 1 }}>
                                                    {tip}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {/* Harvesting Guidelines - Redesigned */}
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                        <View style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 14,
                                            backgroundColor: '#dcfce7',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginRight: 10
                                        }}>
                                            <Text style={{ fontSize: 14 }}>🌿</Text>
                                        </View>
                                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534' }}>
                                            Sustainable Harvesting
                                        </Text>
                                    </View>
                                    <View style={{
                                        backgroundColor: '#f8fafc',
                                        padding: 16,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: '#e2e8f0'
                                    }}>
                                        {[
                                            'Only harvest from abundant populations',
                                            'Take no more than 10% of any population',
                                            'Leave enough for wildlife and reproduction',
                                            'Avoid harvesting rare or endangered species',
                                            'Respect private property and protected areas'
                                        ].map((guideline, index) => (
                                            <View key={index} style={{ flexDirection: 'row', marginBottom: index < 4 ? 8 : 0 }}>
                                                <Text style={{ fontSize: 12, color: '#16a34a', marginRight: 8, marginTop: 1 }}>•</Text>
                                                <Text style={{ fontSize: 12, color: '#374151', lineHeight: 16, flex: 1 }}>
                                                    {guideline}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Learn More Section - Just the buttons, no container */}
            <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        backgroundColor: '#f8fafc',
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2,
                    }}
                    onPress={() => {
                        if (plantDetail.wikiUrl) {
                            Linking.openURL(plantDetail.wikiUrl);
                        }
                    }}
                >
                    <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: '#dbeafe',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 8
                    }}>
                        <Text style={{ fontSize: 16 }}>🌐</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#1e40af', fontWeight: '600', marginBottom: 2 }}>
                        Wikipedia
                    </Text>
                    <Text style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>
                        Scientific details
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{
                        flex: 1,
                        backgroundColor: '#f8fafc',
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2,
                    }}
                    onPress={() => {
                        const searchQuery = encodeURIComponent(plantDetail.scientificName);
                        // Point to PubMed for scientific research
                        Linking.openURL(`https://pubmed.ncbi.nlm.nih.gov/?term=${searchQuery}+medicinal`);
                    }}
                >
                    <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: '#fef3c7',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 8
                    }}>
                        <Text style={{ fontSize: 16 }}>🔬</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '600', marginBottom: 2 }}>
                        Research
                    </Text>
                    <Text style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>
                        PubMed studies
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{
                        flex: 1,
                        backgroundColor: '#f8fafc',
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2,
                    }}
                    onPress={() => {
                        const searchQuery = encodeURIComponent(plantDetail.scientificName);
                        // Point to iNaturalist for identification help
                        Linking.openURL(`https://www.inaturalist.org/search?q=${searchQuery}`);
                    }}
                >
                    <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: '#e0e7ff',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 8
                    }}>
                        <Text style={{ fontSize: 16 }}>📸</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#3730a3', fontWeight: '600', marginBottom: 2 }}>
                        ID Guide
                    </Text>
                    <Text style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>
                        iNaturalist
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Loading Overlays for Delete Operations */}
            {(deletingPlant || deletingSighting || settingDefaultPhoto) && (
                <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                }}>
                    <View style={{
                        backgroundColor: 'white',
                        paddingVertical: 24,
                        paddingHorizontal: 32,
                        borderRadius: 16,
                        alignItems: 'center',
                        minWidth: 200,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 8,
                    }}>
                        <ActivityIndicator size="large" color={deletingPlant ? '#dc2626' : settingDefaultPhoto ? '#0ea5e9' : '#f59e0b'} />
                        <Text style={{
                            marginTop: 16,
                            fontSize: 16,
                            fontWeight: '600',
                            color: deletingPlant ? '#dc2626' : settingDefaultPhoto ? '#0ea5e9' : '#f59e0b',
                            textAlign: 'center'
                        }}>
                            {deletingPlant && '🗑️ Deleting Plant...'}
                            {deletingSighting && '🗑️ Deleting Photo...'}
                            {settingDefaultPhoto && '🖼️ Setting Default Photo...'}
                        </Text>
                        <Text style={{
                            marginTop: 8,
                            fontSize: 12,
                            color: '#6b7280',
                            textAlign: 'center',
                            lineHeight: 16
                        }}>
                            {deletingPlant && 'Removing species and all sightings from your collection'}
                            {deletingSighting && 'Removing this photo from your plant gallery'}
                            {settingDefaultPhoto && 'Making this your primary reference photo'}
                        </Text>

                        {/* Progress indicator */}
                        <View style={{
                            marginTop: 12,
                            width: 120,
                            height: 4,
                            backgroundColor: '#f3f4f6',
                            borderRadius: 2,
                            overflow: 'hidden'
                        }}>
                            <View style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: deletingPlant ? '#dc2626' : settingDefaultPhoto ? '#0ea5e9' : '#f59e0b',
                                borderRadius: 2,
                                opacity: 0.8
                            }} />
                        </View>
                    </View>
                </View>
            )}

            {/* Location Picker Modal for adding location to entries without location data */}
            <LocationPickerModal
                visible={showLocationPicker}
                onClose={handleCloseLocationPicker}
                onLocationSelected={handleLocationSelected}
                currentLocation={currentLocation}
            />

            {/* Medicinal Q&A Modal */}
            <PlantMedicinalQAModal
                visible={showMedicinalQAModal}
                onClose={() => setShowMedicinalQAModal(false)}
                plantName={plantDetail?.commonNames?.[0] || plantDetail?.scientificName || 'Unknown Plant'}
                plantScientificName={plantDetail?.scientificName}
                traditionalUsage={plantDetail?.traditionalUsage}
                medicinalTags={plantDetail?.medicinalTags}
                plantId={selectedPlantId as Id<"plants">}
            />

            {/* Medicinal Details Modal */}
            <PlantMedicinalDetailsModal
                visible={showMedicinalDetailsModal}
                onClose={() => setShowMedicinalDetailsModal(false)}
                plantName={plantDetail?.commonNames?.[0] || plantDetail?.scientificName || 'Unknown Plant'}
                onSave={async (details) => {
                    // Here you would save the medicinal details to the backend
                    console.log('Saving medicinal details:', details);
                    setShowMedicinalDetailsModal(false);
                    await refreshPlantData();
                }}
            />

            {/* Medicinal Observation Modal */}
            <MedicinalObservationModal
                visible={showMedicinalObservationModal}
                onClose={() => setShowMedicinalObservationModal(false)}
                plantId={selectedPlantId as Id<"plants">}
                plantName={plantDetail?.commonNames?.[0] || plantDetail?.scientificName || 'Unknown Plant'}
                scientificName={plantDetail?.scientificName || ''}
                onObservationAdded={() => {
                    setShowMedicinalObservationModal(false);
                    refreshPlantData();
                }}
            />

            {/* Chat with Taita Modal */}
            <Modal
                visible={showChatView}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setShowChatView(false)}
            >
                <PlantChatView
                    plantId={selectedPlantId as Id<"plants">}
                    plantName={plantDetail?.commonNames?.[0] || plantDetail?.scientificName || 'Unknown Plant'}
                    onClose={() => setShowChatView(false)}
                />
            </Modal>

            {/* Plant Locations View Modal */}
            <Modal
                visible={showLocationsView}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setShowLocationsView(false)}
            >
                <PlantLocationsView
                    plantId={selectedPlantId || ''}
                    plantName={plantDetail?.commonNames?.[0] || plantDetail?.scientificName || 'Unknown Plant'}
                    onClose={() => setShowLocationsView(false)}
                />
            </Modal>

            {/* Medicinal Observations View Modal */}
            <Modal
                visible={showObservationsView}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setShowObservationsView(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
                    <View style={{ 
                        flexDirection: 'row', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: 16, 
                        paddingTop: 8,
                        borderBottomWidth: 1, 
                        borderBottomColor: '#e2e8f0',
                        backgroundColor: '#f8fafc'
                    }}>
                        <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151' }}>
                            📝 Medicinal Observations
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowObservationsView(false)}
                            style={{ padding: 8 }}
                        >
                            <Text style={{ fontSize: 24, color: '#6b7280' }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <MedicinalObservationsView
                        plantId={selectedPlantId as Id<"plants">}
                        onObservationUpdated={() => refreshPlantData()}
                    />
                </SafeAreaView>
            </Modal>
        </>
    );
} 