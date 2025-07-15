import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, ScrollView, TextInput, Linking, Alert, Modal, Clipboard, Pressable } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Id } from "../../convex/_generated/dataModel";
import { useAction, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import LocationMapPreview from './LocationMapPreview';
import LocationPickerModal from './LocationPickerModal';
import PlantMedicinalDetailsView from './PlantMedicinalDetailsView';
import PlantMedicinalQAModal from './PlantMedicinalQAModal';
import PlantMedicinalDetailsModal from './PlantMedicinalDetailsModal';
import PlantChatView from './PlantChatView';
import PlantLocationsView from './PlantLocationsView';
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
                    

                    
                    {/* Common in Area Section */}
                    {currentLocation && (() => {
                        // Calculate nearby sightings only when needed
                        const nearbySightings: any[] = (currentLocation && plantDetail && plantDetail.allSightings)
                            ? filterSightingsByDistance(plantDetail.allSightings)
                            : [];
                        // Sort by distance to find the closest sighting
                        const sortedNearbySightings = nearbySightings.length > 0 && currentLocation
                            ? [...nearbySightings].sort((a, b) => {
                                const distA = calculateDistance(currentLocation.latitude, currentLocation.longitude, a.latitude, a.longitude);
                                const distB = calculateDistance(currentLocation.latitude, currentLocation.longitude, b.latitude, b.longitude);
                                return distA - distB;
                              })
                            : [];
                        const hasNearby = sortedNearbySightings.length > 0;
                        
                        return (
                        <View style={{ marginBottom: 12, padding: 10, backgroundColor: hasNearby ? '#dcfce7' : '#fef3c7', borderRadius: 8, borderWidth: 1, borderColor: hasNearby ? '#16a34a' : '#f59e0b' }}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: hasNearby ? '#166534' : '#92400e', textAlign: 'center' }}>
                                {hasNearby ? '🌱 Common in your area' : '🔍 Rare in your area'}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 2 }}>
                                {hasNearby ? 'Based on plant sightings within 5km of your current location.' : 'No sightings of this plant within 5km of your current location.'}
                            </Text>
                        </View>
                    );
                    })()}

                    {/* Simple Location Section */}
                    {plantDetail.allSightings && plantDetail.allSightings.some((s: any) => s.latitude && s.longitude) && (
                        <View style={{ marginBottom: 16, padding: 14, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                            <TouchableOpacity 
                                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: showLocationSection ? 12 : 0 }}
                                onPress={() => setShowLocationSection(!showLocationSection)}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
                                    📍 Locations & Observations
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {plantDetail.allSightings.filter((s: any) => s.latitude && s.longitude).length > 1 && showLocationSection && (
                                        <TouchableOpacity
                                            style={{
                                                backgroundColor: '#059669',
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: 6,
                                            }}
                                            onPress={() => setShowLocationsView(true)}
                                        >
                                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                                                🗺️ View All
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    <Text style={{ fontSize: 18, color: '#6b7280' }}>
                                        {showLocationSection ? '▼' : '▶'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            
                            {showLocationSection && (
                                <>
                                    {/* Observation Statistics - moved here */}
                                    <View style={{ marginBottom: 12 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534', marginBottom: 8 }}>📊 Your Observations</Text>
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

                                    {/* Location Details */}
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534', marginBottom: 8 }}> Location Details</Text>
                                    {plantDetail.allSightings.filter((s: any) => s.latitude && s.longitude).slice(0, 2).map((sighting: any, index: number) => (
                                        <Pressable
                                            key={index}
                                            style={{ marginBottom: 8, padding: 10, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}
                                            onPress={() => {
                                                if (sighting.latitude && sighting.longitude) {
                                                    openInMaps(sighting.latitude, sighting.longitude, plantDetail.commonNames?.[0] || plantDetail.scientificName);
                                                }
                                            }}
                                        >
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
                                                {sighting.address || 'Unknown location'}
                                            </Text>
                                            <Text style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>
                                                {sighting.latitude.toFixed(6)}, {sighting.longitude.toFixed(6)}
                                            </Text>
                                            <Text style={{ fontSize: 10, color: '#059669', marginTop: 2, textAlign: 'right' }}>
                                                🗺️ Tap to open in maps
                                            </Text>
                                            <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                                                {new Date(sighting.identifiedAt).toLocaleDateString()}
                                            </Text>
                                        </Pressable>
                                    ))}
                                    {plantDetail.allSightings.filter((s: any) => s.latitude && s.longitude).length > 2 && (
                                        <Text style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', fontStyle: 'italic' }}>
                                            +{plantDetail.allSightings.filter((s: any) => s.latitude && s.longitude).length - 2} more locations
                                        </Text>
                                    )}
                                </>
                            )}
                        </View>
                    )}
                    
                    {/* Plant Info */}
                    <View style={{ marginBottom: 16, padding: 16, backgroundColor: 'white', borderRadius: 12 }}>
                        <Text selectable style={{ fontSize: 18, fontWeight: 'bold', color: '#15803d', marginBottom: 4 }}>
                            {plantDetail.commonNames?.[0] || plantDetail.scientificName}
                        </Text>
                        
                        {/* Medicinal Properties Section */}
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
                    </View>

                    {/* Enhanced Community Knowledge Section */}
                    <View style={{ marginBottom: 16, padding: 14, backgroundColor: '#f0f9ff', borderRadius: 10, borderWidth: 1, borderColor: '#0ea5e9' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0c4a6e' }}>🌍 Community Knowledge</Text>
                        </View>
                        
                        {/* Community Stats */}
                        <View style={{ 
                            backgroundColor: 'white', 
                            padding: 10, 
                            borderRadius: 8, 
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: '#0ea5e9'
                        }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0ea5e9' }}>
                                        {plantDetail.allSightings?.length || 0}
                                    </Text>
                                    <Text style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>
                                        Sightings
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0ea5e9' }}>
                                        {plantDetail.userPhotos?.length || 0}
                                    </Text>
                                    <Text style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>
                                        Photos
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0ea5e9' }}>
                                        {plantFeedback?.length || 0}
                                    </Text>
                                    <Text style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>
                                        Tips Shared
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Share Knowledge Button */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#0ea5e9',
                                paddingVertical: 10,
                                paddingHorizontal: 16,
                                borderRadius: 8,
                                alignItems: 'center',
                                marginBottom: 12
                            }}
                            onPress={() => {
                                Alert.prompt(
                                    'Share Your Knowledge',
                                    'What have you learned about this plant? Share traditional uses, preparation methods, or personal experiences.',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Share',
                                            onPress: async (text) => {
                                                if (text && text.trim()) {
                                                    try {
                                                        await addPlantFeedback({
                                                            plantId: selectedPlantId as any,
                                                            scientificName: plantDetail.scientificName,
                                                            feedback: text.trim(),
                                                            timestamp: Date.now()
                                                        });
                                                        Alert.alert('Thank You!', 'Your knowledge has been shared with the community.');
                                                    } catch (error) {
                                                        Alert.alert('Error', 'Failed to share your knowledge. Please try again.');
                                                    }
                                                }
                                            }
                                        }
                                    ],
                                    'plain-text'
                                );
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                                💬 Share Your Knowledge
                            </Text>
                        </TouchableOpacity>

                        {/* Community Tips */}
                        {plantFeedback && plantFeedback.length > 0 && (
                            <View>
                                <Text style={{ fontSize: 12, color: '#0369a1', marginBottom: 6 }}>
                                    💡 Recent Community Tips:
                                </Text>
                                {plantFeedback.slice(0, 2).map((feedback, index) => (
                                    <View 
                                        key={feedback._id} 
                                        style={{ 
                                            backgroundColor: 'white', 
                                            padding: 8, 
                                            borderRadius: 6, 
                                            borderWidth: 1, 
                                            borderColor: '#0ea5e9',
                                            marginBottom: 6
                                        }}
                                    >
                                        <Text style={{ fontSize: 11, color: '#374151', fontStyle: 'italic' }}>
                                            "{feedback.feedback}"
                                        </Text>
                                        <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>
                                            — Community member, {new Date(feedback.timestamp).toLocaleDateString()}
                                        </Text>
                                    </View>
                                ))}
                                {plantFeedback.length > 2 && (
                                    <Text style={{ fontSize: 10, color: '#0ea5e9', textAlign: 'center', fontStyle: 'italic' }}>
                                        +{plantFeedback.length - 2} more tips from the community
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Enhanced Medicinal Knowledge Section */}
                    <View style={{ marginBottom: 16, padding: 16, backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0' }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#166534', marginBottom: 12 }}>
                            🌿 Traditional Medicinal Knowledge
                        </Text>
                        
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

                        {/* Medicinal Properties */}
                        {plantDetail.medicinalTags && plantDetail.medicinalTags.length > 0 && (
                            <View style={{ marginBottom: 16, padding: 12, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534', marginBottom: 8 }}>
                                    💊 Medicinal Properties
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
                                console.log('Opening medicinal details modal');
                                setShowMedicinalDetailsModal(true);
                            }}
                        >
                            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                                ➕ Add Medicinal Observation
                            </Text>
                        </TouchableOpacity>

                                                {/* User Notes & Feedback Section */}
                        <View style={{ marginBottom: 16, padding: 16, backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534' }}>📝 User Notes & Corrections</Text>
                                {!addingNote && (
                                    <TouchableOpacity
                                        style={{ marginLeft: 8, backgroundColor: '#d1fae5', borderRadius: 20, padding: 6, borderWidth: 1, borderColor: '#6ee7b7' }}
                                        onPress={() => {
                                            setAddingNote(true);
                                            setEditingFeedbackId(null);
                                        }}
                                        disabled={addingNote || editingFeedbackId !== null}
                                    >
                                        <Text style={{ color: '#047857', fontSize: 18 }}>➕</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            {/* Add Note Button or Form */}
                            {addingNote && (
                                <View style={{ marginBottom: 16 }}>
                                    <TextInput
                                        style={{
                                            borderWidth: 1,
                                            borderColor: '#d1d5db',
                                            borderRadius: 6,
                                            padding: 8,
                                            minHeight: 40,
                                            fontSize: 13,
                                            marginBottom: 6
                                        }}
                                        value={newNoteText}
                                        onChangeText={setNewNoteText}
                                        multiline
                                        editable={!savingNewNote}
                                        placeholder="Add a note or correction about this plant..."
                                    />
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity
                                            style={{ backgroundColor: '#059669', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, opacity: savingNewNote ? 0.6 : 1 }}
                                            onPress={async () => {
                                                if (!plantDetail || !plantDetail._id || !plantDetail.scientificName) return;
                                                setSavingNewNote(true);
                                                try {
                                                    await addPlantFeedback({
                                                        plantId: plantDetail._id,
                                                        scientificName: plantDetail.scientificName,
                                                        feedback: newNoteText,
                                                        timestamp: Date.now(),
                                                    });
                                                    setAddingNote(false);
                                                    setNewNoteText('');
                                                } catch (err) {
                                                    Alert.alert('Error', 'Failed to add note');
                                                } finally {
                                                    setSavingNewNote(false);
                                                }
                                            }}
                                            disabled={savingNewNote || newNoteText.trim() === ''}
                                        >
                                            <Text style={{ color: 'white', fontWeight: '600' }}>Save</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{ backgroundColor: '#e5e7eb', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
                                            onPress={() => {
                                                setAddingNote(false);
                                                setNewNoteText('');
                                            }}
                                            disabled={savingNewNote}
                                        >
                                            <Text style={{ color: '#374151' }}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                            {plantFeedback && plantFeedback.length > 0 ? (
                                <ScrollView style={{ maxHeight: 160 }}>
                                    {plantFeedback.map((fb, idx) => (
                                        <View key={fb._id || idx} style={{ marginBottom: 12, paddingBottom: 8, borderBottomWidth: idx < plantFeedback.length - 1 ? 1 : 0, borderColor: '#d1fae5', backgroundColor: 'white', borderRadius: 8, padding: 10, minHeight: 48 }}>
                                            <View style={{ flex: 1 }}>
                                                {editingFeedbackId === fb._id ? (
                                                    <>
                                                        <TextInput
                                                            style={{
                                                                borderWidth: 1,
                                                                borderColor: '#d1d5db',
                                                                borderRadius: 6,
                                                                padding: 8,
                                                                minHeight: 40,
                                                                fontSize: 13,
                                                                marginBottom: 6
                                                            }}
                                                            value={editingFeedbackText}
                                                            onChangeText={setEditingFeedbackText}
                                                            multiline
                                                            editable={!savingFeedback}
                                                        />
                                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                                            <TouchableOpacity
                                                                style={{ backgroundColor: '#059669', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, opacity: savingFeedback ? 0.6 : 1 }}
                                                                onPress={async () => {
                                                                    setSavingFeedback(true);
                                                                    try {
                                                                        await updatePlantFeedback({ feedbackId: fb._id, feedback: editingFeedbackText });
                                                                        setEditingFeedbackId(null);
                                                                        setEditingFeedbackText('');
                                                                    } catch (err) {
                                                                        Alert.alert('Error', 'Failed to update note');
                                                                    } finally {
                                                                        setSavingFeedback(false);
                                                                    }
                                                                }}
                                                                disabled={savingFeedback || editingFeedbackText.trim() === ''}
                                                            >
                                                                <Text style={{ color: 'white', fontWeight: '600' }}>Save</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                style={{ backgroundColor: '#e5e7eb', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
                                                                onPress={() => {
                                                                    setEditingFeedbackId(null);
                                                                    setEditingFeedbackText('');
                                                                }}
                                                                disabled={savingFeedback}
                                                            >
                                                                <Text style={{ color: '#374151' }}>Cancel</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Text style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
                                                            {fb.feedback}
                                                        </Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                                            <Text style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
                                                                {new Date(fb.timestamp).toLocaleString()}
                                                            </Text>
                                                            {editingFeedbackId !== fb._id && (
                                                                <TouchableOpacity
                                                                    style={{ marginLeft: 8, padding: 2 }}
                                                                    onPress={() => {
                                                                        setEditingFeedbackId(fb._id);
                                                                        setEditingFeedbackText(fb.feedback);
                                                                    }}
                                                                >
                                                                    <Text style={{ fontSize: 14, color: '#b45309' }}>✏️</Text>
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>
                                                    </>
                                                )}
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>
                            ) : (
                                <Text style={{ fontSize: 13, color: '#6b7280', fontStyle: 'italic' }}>
                                    No notes or corrections have been added for this plant yet.
                                </Text>
                            )}
                        </View>
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

                    {/* Safety Information - moved to bottom and with clearer color */}
                    <View style={{ marginTop: 20, marginBottom: 8 }}>
                        <TouchableOpacity 
                            style={{ 
                                flexDirection: 'row', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                backgroundColor: '#fef08a', // bright yellow
                                padding: 14,
                                borderRadius: 8,
                                borderWidth: 2,
                                borderColor: '#facc15', // strong yellow border
                                marginBottom: 0
                            }}
                            onPress={() => setShowSafetyInfo(!showSafetyInfo)}
                        >
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#b91c1c' }}>⚠️ Safety & Precautions</Text>
                            <Text style={{ fontSize: 18, color: '#b91c1c' }}>
                                {showSafetyInfo ? '▼' : '▶'}
                            </Text>
                        </TouchableOpacity>
                        {showSafetyInfo && (
                            <View style={{ 
                                backgroundColor: '#fef2f2', 
                                padding: 14, 
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: '#fecaca',
                                marginTop: 4
                            }}>
                                <Text style={{ fontSize: 13, color: '#991b1b', lineHeight: 18 }}>
                                    <Text style={{ fontWeight: 'bold' }}>⚠️ Important:</Text> Always consult with a qualified healthcare professional before using any plant for medicinal purposes. Plant identification through photos may not be 100% accurate. Never consume unknown plants.
                                </Text>
                                <Text style={{ fontSize: 11, color: '#7f1d1d', marginTop: 6, fontStyle: 'italic' }}>
                                    This information is for educational purposes only and is not medical advice.
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Educational Content & Safety */}
                    <View style={{ marginBottom: 16, padding: 14, backgroundColor: '#fef2f2', borderRadius: 10, borderWidth: 1, borderColor: '#fecaca' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#991b1b' }}>📚 Learning & Safety</Text>
                            <TouchableOpacity
                                onPress={() => setShowSafetyInfo(!showSafetyInfo)}
                                style={{
                                    backgroundColor: showSafetyInfo ? '#dc2626' : '#f59e0b',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 6
                                }}
                            >
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                                    {showSafetyInfo ? 'Hide' : 'Show'} Safety
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Safety Warnings */}
                        {showSafetyInfo && (
                            <View style={{ marginBottom: 12 }}>
                                <View style={{ 
                                    backgroundColor: '#fef2f2', 
                                    padding: 8, 
                                    borderRadius: 6, 
                                    borderWidth: 1, 
                                    borderColor: '#fecaca',
                                    marginBottom: 8
                                }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#dc2626', marginBottom: 4 }}>
                                        ⚠️ Important Safety Information
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#991b1b', lineHeight: 16 }}>
                                        • Always consult healthcare professionals before using plants medicinally{'\n'}
                                        • Some plants may be toxic or cause allergic reactions{'\n'}
                                        • Proper identification is crucial - similar-looking plants can be dangerous{'\n'}
                                        • This information is for educational purposes only
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Identification Tips */}
                        <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 12, color: '#991b1b', marginBottom: 6 }}>
                                🔍 Identification Tips:
                            </Text>
                            <View style={{ backgroundColor: 'white', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#fecaca' }}>
                                <Text style={{ fontSize: 11, color: '#374151', lineHeight: 16 }}>
                                    • Look for distinctive leaf patterns and flower structures{'\n'}
                                    • Check the stem texture and growth pattern{'\n'}
                                    • Note the habitat and growing conditions{'\n'}
                                    • Take photos from multiple angles for better identification{'\n'}
                                    • Compare with similar species to avoid confusion
                                </Text>
                            </View>
                        </View>

                        {/* Harvesting Guidelines */}
                        <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 12, color: '#991b1b', marginBottom: 6 }}>
                                🌿 Sustainable Harvesting:
                            </Text>
                            <View style={{ backgroundColor: 'white', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#fecaca' }}>
                                <Text style={{ fontSize: 11, color: '#374151', lineHeight: 16 }}>
                                    • Only harvest from abundant populations{'\n'}
                                    • Take no more than 10% of any population{'\n'}
                                    • Leave enough for wildlife and reproduction{'\n'}
                                    • Avoid harvesting rare or endangered species{'\n'}
                                    • Respect private property and protected areas
                                </Text>
                            </View>
                        </View>

                        {/* Learning Resources */}
                        <View>
                            <Text style={{ fontSize: 12, color: '#991b1b', marginBottom: 6 }}>
                                📖 Learn More:
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        backgroundColor: 'white',
                                        padding: 8,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: '#fecaca',
                                        alignItems: 'center'
                                    }}
                                    onPress={() => {
                                        if (plantDetail.wikiUrl) {
                                            Linking.openURL(plantDetail.wikiUrl);
                                        }
                                    }}
                                >
                                    <Text style={{ fontSize: 10, color: '#059669', fontWeight: '600' }}>
                                        🌐 Wikipedia
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        backgroundColor: 'white',
                                        padding: 8,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: '#fecaca',
                                        alignItems: 'center'
                                    }}
                                    onPress={() => {
                                        const searchQuery = encodeURIComponent(plantDetail.scientificName);
                                        Linking.openURL(`https://www.google.com/search?q=${searchQuery}+medicinal+uses`);
                                    }}
                                >
                                    <Text style={{ fontSize: 10, color: '#059669', fontWeight: '600' }}>
                                        🔍 Research
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        backgroundColor: 'white',
                                        padding: 8,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: '#fecaca',
                                        alignItems: 'center'
                                    }}
                                    onPress={() => {
                                        const searchQuery = encodeURIComponent(`${plantDetail.scientificName} plant identification`);
                                        Linking.openURL(`https://www.google.com/search?q=${searchQuery}`);
                                    }}
                                >
                                    <Text style={{ fontSize: 10, color: '#059669', fontWeight: '600' }}>
                                        📸 ID Guide
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            )}

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
        </>
    );
} 