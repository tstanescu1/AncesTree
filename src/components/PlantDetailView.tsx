import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, ScrollView, TextInput, Linking, Alert, Clipboard } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Id } from "../../convex/_generated/dataModel";
import LocationMapPreview from './LocationMapPreview';
import { useLocationHandler } from '../hooks/useLocationHandler';

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
    refreshPlantData
}: PlantDetailViewProps) {
    // Location handler hook
    const { openInMaps, currentLocation, getDistanceFromCurrentLocation } = useLocationHandler();
    
    // State for editing feedback
    const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
    const [editingFeedbackText, setEditingFeedbackText] = useState('');
    const [savingFeedback, setSavingFeedback] = useState(false);
    // State for adding a new note
    const [addingNote, setAddingNote] = useState(false);
    const [newNoteText, setNewNoteText] = useState('');
    const [savingNewNote, setSavingNewNote] = useState(false);

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

    // --- Common in Area Logic ---
    let isCommonNearby = false;
    if (currentLocation && plantDetail.allSightings) {
        isCommonNearby = plantDetail.allSightings.some((s: any) => {
            if (typeof s.latitude === 'number' && typeof s.longitude === 'number') {
                // Haversine distance in km
                const R = 6371;
                const dLat = (s.latitude - currentLocation.latitude) * Math.PI / 180;
                const dLng = (s.longitude - currentLocation.longitude) * Math.PI / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(currentLocation.latitude * Math.PI / 180) * Math.cos(s.latitude * Math.PI / 180) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;
                return distance <= 50; // 50km radius
            }
            return false;
        });
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
                    {/* Reference Image - Show the actual default photo (user or database) */}
                    {(() => {
                        // Determine what the primary reference photo should be
                        const hasUserPhotos = plantDetail.userPhotos && plantDetail.userPhotos.length > 0;
                        const hasDatabaseImage = plantDetail.imageUrl;
                        const hasValidSimilarImages = plantDetail.similar_images && plantDetail.similar_images.length > 0;
                        
                        // Debug logging
                        console.log('🔍 Reference photo detection:');
                        console.log('📸 hasUserPhotos:', hasUserPhotos);
                        console.log('🗂️ hasDatabaseImage:', hasDatabaseImage);
                        console.log('📊 hasValidSimilarImages:', hasValidSimilarImages);
                        console.log('🖼️ imageUrl:', plantDetail.imageUrl);
                        console.log('🗂️ similar_images[0]:', plantDetail.similar_images?.[0]);
                        console.log('🗂️ similar_images length:', plantDetail.similar_images?.length);
                        
                        // If imageUrl exists and matches the first similar_image, it was set as default
                        const isDatabaseImageDefault = hasDatabaseImage && hasValidSimilarImages && 
                                                     plantDetail.imageUrl === plantDetail.similar_images[0];
                        
                        console.log('✅ isDatabaseImageDefault:', isDatabaseImageDefault);
                        
                        // Show database image as reference if it was explicitly set as default
                        if (isDatabaseImageDefault) {
                            console.log('🖼️ Showing database image as reference photo');
                            return (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 }}>📸 Reference Photo</Text>
                                    <TouchableOpacity onPress={() => setZoomedImage(plantDetail.imageUrl)}>
                                        <View style={{ position: 'relative' }}>
                                            <Image 
                                                source={{ uri: plantDetail.imageUrl }} 
                                                style={{ 
                                                    width: '100%', 
                                                    height: 192, 
                                                    borderRadius: 8,
                                                    backgroundColor: '#f3f4f6'
                                                }} 
                                                resizeMode="cover"
                                            />
                                            
                                            {/* Default photo badge */}
                                            <View style={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                backgroundColor: 'rgba(16, 185, 129, 0.95)',
                                                paddingHorizontal: 8,
                                                paddingVertical: 4,
                                                borderRadius: 6,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 1 },
                                                shadowOpacity: 0.2,
                                                shadowRadius: 2,
                                                elevation: 2,
                                            }}>
                                                <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
                                                    ⭐ Default
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                                        Database reference photo set as default
                                    </Text>
                                </View>
                            );
                        }
                        
                        // Show user photo as reference if we have user photos and no database default
                        if (hasUserPhotos) {
                            console.log('📸 Showing user photo as reference photo');
                            return (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 }}>📸 Your Reference Photo</Text>
                                    <TouchableOpacity onPress={() => {
                                        if (plantDetail.userPhotos[0]) setZoomedImage(plantDetail.userPhotos[0]);
                                    }}>
                                        <View style={{ position: 'relative' }}>
                                            <Image 
                                                source={{ uri: plantDetail.userPhotos[0] }} 
                                                style={{ 
                                                    width: '100%', 
                                                    height: 192, 
                                                    borderRadius: 8,
                                                    backgroundColor: '#f3f4f6'
                                                }} 
                                                resizeMode="cover"
                                            />
                                            
                                            {/* Default photo badge */}
                                            <View style={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                backgroundColor: 'rgba(16, 185, 129, 0.95)',
                                                paddingHorizontal: 8,
                                                paddingVertical: 4,
                                                borderRadius: 6,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 1 },
                                                shadowOpacity: 0.2,
                                                shadowRadius: 2,
                                                elevation: 2,
                                            }}>
                                                <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
                                                    ⭐ Default
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                                        Your main reference photo for this plant species
                                    </Text>
                                </View>
                            );
                        }
                        
                        // Fallback to database image if no user photos
                        if (hasDatabaseImage) {
                            console.log('🗂️ Showing fallback database image as reference photo');
                            return (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 }}>📸 Reference Photo</Text>
                                    <TouchableOpacity onPress={() => setZoomedImage(plantDetail.imageUrl)}>
                                        <View style={{ position: 'relative' }}>
                                            <Image 
                                                source={{ uri: plantDetail.imageUrl }} 
                                                style={{ 
                                                    width: '100%', 
                                                    height: 192, 
                                                    borderRadius: 8,
                                                    backgroundColor: '#f3f4f6'
                                                }} 
                                                resizeMode="cover"
                                            />
                                            
                                            {/* Default photo badge */}
                                            <View style={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                backgroundColor: 'rgba(16, 185, 129, 0.95)',
                                                paddingHorizontal: 8,
                                                paddingVertical: 4,
                                                borderRadius: 6,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 1 },
                                                shadowOpacity: 0.2,
                                                shadowRadius: 2,
                                                elevation: 2,
                                            }}>
                                                <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
                                                    ⭐ Default
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                                        Database reference photo for this plant species
                                    </Text>
                                </View>
                            );
                        }
                        
                        console.log('❌ No reference photo available');
                        return null;
                    })()}

                    {/* Comprehensive Photo Gallery - All images in one place */}
                    {((plantDetail.userPhotos && plantDetail.userPhotos.length > 1) || (plantDetail.similar_images && plantDetail.similar_images.length > 0) || true) && (
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 }}>
                                🖼️ Photo Gallery
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                                {(() => {
                                    // Determine if database image is default to calculate correct counts
                                    const hasUserPhotos = plantDetail.userPhotos && plantDetail.userPhotos.length > 0;
                                    const hasDatabaseImage = plantDetail.imageUrl;
                                    const hasValidSimilarImages = plantDetail.similar_images && plantDetail.similar_images.length > 0;
                                    const isDatabaseImageDefault = hasDatabaseImage && hasValidSimilarImages && 
                                                                 plantDetail.imageUrl === plantDetail.similar_images[0];
                                    
                                    // Count photos correctly based on what's shown as reference
                                    const userPhotoCount = isDatabaseImageDefault 
                                        ? (plantDetail.userPhotos ? plantDetail.userPhotos.length : 0)  // Show all user photos
                                        : (plantDetail.userPhotos ? plantDetail.userPhotos.length - 1 : 0); // Skip reference photo
                                    
                                    const databasePhotoCount = plantDetail.similar_images ? plantDetail.similar_images.length : 0;
                                    const totalCount = userPhotoCount + databasePhotoCount;
                                    
                                    console.log(`📊 Photo count calculation: isDatabaseImageDefault=${isDatabaseImageDefault}`);
                                    console.log(`📊 User photos in gallery: ${userPhotoCount}`);
                                    console.log(`📊 Database photos: ${databasePhotoCount}`);
                                    console.log(`📊 Total in gallery: ${totalCount}`);
                                    
                                    if (userPhotoCount > 0 && databasePhotoCount > 0) {
                                        return `${userPhotoCount} your photos • ${databasePhotoCount} database images • ${totalCount} total`;
                                    } else if (userPhotoCount > 0) {
                                        return `${userPhotoCount} ${isDatabaseImageDefault ? 'photos of your plant' : 'additional photos of your plant'}`;
                                    } else if (databasePhotoCount > 0) {
                                        return `${databasePhotoCount} reference images from community database`;
                                    }
                                    return 'Add photos to build a comprehensive gallery';
                                })()}
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {/* Add Photo Button - First item in gallery */}
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

                                    {/* User's photos in gallery */}
                                    {plantDetail.userPhotos && plantDetail.userPhotos.length > 0 && (() => {
                                        // Determine if we should show all user photos or skip the first one
                                        const hasUserPhotos = plantDetail.userPhotos && plantDetail.userPhotos.length > 0;
                                        const hasDatabaseImage = plantDetail.imageUrl;
                                        const hasValidSimilarImages = plantDetail.similar_images && plantDetail.similar_images.length > 0;
                                        const isDatabaseImageDefault = hasDatabaseImage && hasValidSimilarImages && 
                                                                     plantDetail.imageUrl === plantDetail.similar_images[0];
                                        
                                        // If database image is default, show ALL user photos
                                        // If user photo is default, skip the first user photo (since it's shown as reference)
                                        const userPhotosToShow = isDatabaseImageDefault ? plantDetail.userPhotos : plantDetail.userPhotos.slice(1);
                                        const startIndex = isDatabaseImageDefault ? 0 : 1;
                                        
                                        console.log(`📸 Gallery logic: isDatabaseImageDefault=${isDatabaseImageDefault}`);
                                        console.log(`📸 Total user photos: ${plantDetail.userPhotos.length}`);
                                        console.log(`📸 Photos to show in gallery: ${userPhotosToShow.length}`);
                                        console.log(`📸 Starting index: ${startIndex}`);
                                        
                                        return userPhotosToShow.map((photo: string, index: number) => {
                                            const actualIndex = startIndex + index; // Adjust for proper sighting mapping
                                            
                                            // Debug logging for user photos
                                            console.log(`📸 User photo ${actualIndex}: ${photo.substring(0, 50)}...`);
                                            console.log(`🔍 Corresponding sighting: ${plantDetail.allSightings?.[actualIndex]?._id}`);
                                            
                                            return (
                                                <View 
                                                    key={`user-${actualIndex}`} 
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
                                                                            const sighting = plantDetail.allSightings?.[actualIndex];
                                                                            if (sighting) {
                                                                                console.log(`🖼️ Setting user photo as default: sighting ${sighting._id}`);
                                                                                handleSetDefaultPhoto(sighting._id);
                                                                            } else {
                                                                                console.error(`❌ Could not find sighting for photo ${actualIndex}`);
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
                                                                                            const sighting = plantDetail.allSightings?.[actualIndex];
                                                                                            if (sighting) {
                                                                                                console.log(`🗑️ Deleting user photo: sighting ${sighting._id}`);
                                                                                                handleDeleteSighting(sighting._id, actualIndex);
                                                                                            } else {
                                                                                                console.error(`❌ Could not find sighting for photo ${actualIndex}`);
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
                                                            source={{ uri: photo }} 
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
                                </View>
                            </ScrollView>
                            
                            <Text style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 4 }}>
                                💡 Tap to zoom • Long press your photos for options • Hold database images for actions • Hold to set default or delete
                            </Text>
                        </View>
                    )}
                    
                    {/* Enhanced Location Information */}
                    {(() => {
                        // Enhanced debug logging
                        // console.log('🔍 PlantDetail allSightings:', plantDetail.allSightings);
                        // console.log('🔍 First sighting data:', plantDetail.allSightings?.[0]);
                        
                        // Check for location data with more detailed logging
                        const sightingsWithLocation = plantDetail.allSightings?.filter((s: any) => {
                            const hasLocation = s.latitude && s.longitude && 
                                              typeof s.latitude === 'number' && 
                                              typeof s.longitude === 'number';
                            if (hasLocation) {
                                console.log('✅ Sighting with location found:', {
                                    latitude: s.latitude,
                                    longitude: s.longitude,
                                    address: s.address,
                                    timestamp: s.locationTimestamp || s.identifiedAt
                                });
                            }
                            return hasLocation;
                        }) || [];
                        
                        console.log('📍 Total sightings with location:', sightingsWithLocation.length);
                        console.log('📍 All sightings count:', plantDetail.allSightings?.length || 0);
                        
                        return sightingsWithLocation.length > 0;
                    })() ? (
                        <View style={{ marginBottom: 16 }}>
                            {(() => {
                                // Get unique locations from sightings
                                const locationsMap = new Map();
                                plantDetail.allSightings.forEach((sighting: any) => {
                                    if (sighting.latitude && sighting.longitude && 
                                        typeof sighting.latitude === 'number' && 
                                        typeof sighting.longitude === 'number') {
                                        const key = `${sighting.latitude.toFixed(4)},${sighting.longitude.toFixed(4)}`;
                                        if (!locationsMap.has(key)) {
                                            locationsMap.set(key, {
                                                latitude: sighting.latitude,
                                                longitude: sighting.longitude,
                                                address: sighting.address,
                                                timestamp: sighting.locationTimestamp || sighting.identifiedAt,
                                                count: 1,
                                                accuracy: sighting.accuracy
                                            });
                                        } else {
                                            locationsMap.get(key).count++;
                                        }
                                    }
                                });
                                
                                const uniqueLocations = Array.from(locationsMap.values());
                                const mostRecentLocation = uniqueLocations.sort((a, b) => b.timestamp - a.timestamp)[0];
                                
                                console.log('🗺️ Unique locations found:', uniqueLocations.length);
                                console.log('📍 Most recent location:', mostRecentLocation);
                                
                                return (
                                    <View>
                                        <Text style={{ 
                                            fontSize: 16, 
                                            fontWeight: '600', 
                                            color: '#166534', 
                                            marginBottom: 12,
                                            textAlign: 'center'
                                        }}>
                                            📍 Sighting Locations ({uniqueLocations.length})
                                        </Text>

                                        {/* Primary Location Map Preview */}
                                        <LocationMapPreview
                                            location={{
                                                latitude: mostRecentLocation.latitude,
                                                longitude: mostRecentLocation.longitude,
                                                address: mostRecentLocation.address,
                                                accuracy: mostRecentLocation.accuracy,
                                                timestamp: mostRecentLocation.timestamp
                                            }}
                                            plantName={plantDetail.commonNames?.[0] || plantDetail.scientificName}
                                            style={{ marginBottom: 12 }}
                                        />

                                        {/* Multiple Locations Summary */}
                                        {uniqueLocations.length > 1 && (
                                            <View style={{
                                                backgroundColor: 'white',
                                                borderRadius: 8,
                                                padding: 12,
                                                borderWidth: 1,
                                                borderColor: '#e5e7eb'
                                            }}>
                                                <Text style={{ 
                                                    fontSize: 14, 
                                                    fontWeight: '600', 
                                                    color: '#166534', 
                                                    marginBottom: 8,
                                                    textAlign: 'center'
                                                }}>
                                                    🗺️ All Sighting Locations
                                                </Text>
                                                
                                                {uniqueLocations.map((location, index) => (
                                                    <TouchableOpacity
                                                        key={index}
                                                        style={{
                                                            backgroundColor: index === 0 ? '#f0fdf4' : '#f9fafb',
                                                            padding: 10,
                                                            borderRadius: 6,
                                                            marginBottom: index < uniqueLocations.length - 1 ? 8 : 0,
                                                            borderWidth: 1,
                                                            borderColor: index === 0 ? '#bbf7d0' : '#e5e7eb',
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: 10
                                                        }}
                                                        onPress={() => {
                                                            openInMaps(
                                                                location.latitude, 
                                                                location.longitude, 
                                                                plantDetail.commonNames?.[0] || plantDetail.scientificName
                                                            );
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        {/* Location icon */}
                                                        <View style={{
                                                            backgroundColor: index === 0 ? '#059669' : '#6b7280',
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: 6,
                                                            justifyContent: 'center',
                                                            alignItems: 'center'
                                                        }}>
                                                            <Text style={{ fontSize: 16 }}>
                                                                {index === 0 ? '📍' : '📌'}
                                                            </Text>
                                                        </View>
                                                        
                                                        {/* Location info */}
                                                        <View style={{ flex: 1 }}>
                                                            {index === 0 && (
                                                                <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600', marginBottom: 2 }}>
                                                                    Most Recent
                                                                </Text>
                                                            )}
                                                            {location.address && (
                                                                <Text style={{ fontSize: 12, color: '#374151', marginBottom: 2 }} numberOfLines={2}>
                                                                    {location.address}
                                                                </Text>
                                                            )}
                                                            <Text style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>
                                                                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                                            </Text>
                                                            <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                                                                {location.count > 1 ? `${location.count} sightings` : '1 sighting'} • {new Date(location.timestamp).toLocaleDateString()}
                                                            </Text>
                                                        </View>
                                                        
                                                        {/* Tap indicator */}
                                                        <View style={{
                                                            backgroundColor: '#e5e7eb',
                                                            paddingHorizontal: 6,
                                                            paddingVertical: 2,
                                                            borderRadius: 4
                                                        }}>
                                                            <Text style={{ fontSize: 9, color: '#6b7280', fontWeight: '600' }}>
                                                                TAP
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                ))}
                                                
                                                <Text style={{ 
                                                    fontSize: 11, 
                                                    color: '#6b7280', 
                                                    textAlign: 'center', 
                                                    marginTop: 8,
                                                    fontStyle: 'italic'
                                                }}>
                                                    💡 Tap any location to open in maps
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })()}
                        </View>
                    ) : (
                        // Enhanced "no location data" message with more helpful information
                        <View style={{ 
                            marginBottom: 16,
                            backgroundColor: '#fef3c7',
                            borderRadius: 8,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: '#fcd34d'
                        }}>
                            <Text style={{ 
                                fontSize: 14, 
                                fontWeight: '600', 
                                color: '#92400e', 
                                marginBottom: 4,
                                textAlign: 'center'
                            }}>
                                📍 No Location Data Available
                            </Text>
                            <Text style={{ 
                                fontSize: 12, 
                                color: '#92400e', 
                                textAlign: 'center',
                                lineHeight: 16,
                                marginBottom: 8
                            }}>
                                This plant was identified without GPS location data. Future photo additions will include location information when:
                            </Text>
                            <View style={{ paddingLeft: 8 }}>
                                <Text style={{ fontSize: 11, color: '#92400e', marginBottom: 2 }}>
                                    • 📸 Photos contain GPS EXIF data
                                </Text>
                                <Text style={{ fontSize: 11, color: '#92400e', marginBottom: 2 }}>
                                    • 🗺️ Manual location is selected during identification
                                </Text>
                                <Text style={{ fontSize: 11, color: '#92400e' }}>
                                    • 📍 Device location services are enabled
                                </Text>
                            </View>
                        </View>
                    )}
                    
                    {/* Common in Area Section */}
                    {currentLocation && (
                        <View style={{ marginBottom: 12, padding: 10, backgroundColor: isCommonNearby ? '#dcfce7' : '#fef3c7', borderRadius: 8, borderWidth: 1, borderColor: isCommonNearby ? '#16a34a' : '#f59e0b' }}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: isCommonNearby ? '#166534' : '#92400e', textAlign: 'center' }}>
                                {isCommonNearby ? '🌱 Common in your area' : '🔍 Rare in your area'}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 2 }}>
                                Based on plant sightings within 50km of your current location.
                            </Text>
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
                    </View>

                    {/* Growing Conditions, Season Info, Companion Plants, More Details */}
                    <View style={{ marginBottom: 16, padding: 14, backgroundColor: '#f0fdf4', borderRadius: 10, borderWidth: 1, borderColor: '#bbf7d0' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534' }}>🌱 Growing Conditions</Text>
                            <TouchableOpacity
                                onPress={refreshPlantData}
                                style={{ padding: 4 }}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#059669" />
                                ) : (
                                    <Text style={{ color: '#059669', fontSize: 12 }}>🔄 Refresh</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>
                            {plantDetail.growingConditions || 'No growing conditions data available yet.'}
                        </Text>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 }}>🗓️ Season Info</Text>
                        <Text style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>
                            {plantDetail.seasonInfo || 'No seasonality information available yet.'}
                        </Text>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 }}>🌼 Companion Plants</Text>
                        {plantDetail.companionPlants && plantDetail.companionPlants.length > 0 ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                                {plantDetail.companionPlants.map((plant: string, index: number) => (
                                    <TouchableOpacity 
                                        key={index}
                                        onPress={async () => {
                                            try {
                                                // Format the plant name for Wikipedia URL
                                                const wikiUrl = `https://en.wikipedia.org/wiki/${plant.replace(/\s+/g, '_')}`;
                                                const supported = await Linking.canOpenURL(wikiUrl);
                                                if (supported) {
                                                    await Linking.openURL(wikiUrl);
                                                } else {
                                                    Alert.alert("Error", "Cannot open Wikipedia link");
                                                }
                                            } catch (error) {
                                                Alert.alert("Error", "Failed to open Wikipedia link");
                                            }
                                        }}
                                        style={{ 
                                            backgroundColor: '#fef3c7', 
                                            paddingHorizontal: 8, 
                                            paddingVertical: 4, 
                                            borderRadius: 12, 
                                            marginRight: 6, 
                                            marginBottom: 4,
                                            borderWidth: 1,
                                            borderColor: '#f59e0b',
                                            flexDirection: 'row',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Text selectable style={{ fontSize: 12, color: '#92400e', fontWeight: '500' }}>
                                            {plant}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#92400e', marginLeft: 4 }}>🔗</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <Text style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>
                                No companion plant data available yet.
                            </Text>
                        )}
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 }}>🐛 Common Pests</Text>
                        {plantDetail.pests && plantDetail.pests.length > 0 ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                                {plantDetail.pests.map((pest: string, index: number) => (
                                    <View
                                        key={index}
                                        style={{
                                            backgroundColor: '#fee2e2',
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            borderRadius: 12,
                                            marginRight: 6,
                                            marginBottom: 4,
                                            borderWidth: 1,
                                            borderColor: '#ef4444',
                                            flexDirection: 'row',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Text selectable style={{ fontSize: 12, color: '#b91c1c', fontWeight: '500' }}>
                                            {pest}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#b91c1c', marginLeft: 4 }}>🐞</Text>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>
                                No pest data available yet.
                            </Text>
                        )}
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 }}>🔎 More Details</Text>
                        {plantDetail.moreDetails ? (
                            <View style={{ 
                                backgroundColor: '#f0fdf4', 
                                padding: 12, 
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: '#bbf7d0'
                            }}>
                                <Markdown style={{
                                    body: { fontSize: 13, color: '#374151', lineHeight: 18 },
                                    heading1: { fontSize: 14, fontWeight: 'bold', color: '#166534', marginBottom: 4 },
                                    heading2: { fontSize: 13, fontWeight: 'bold', color: '#166534', marginBottom: 3 },
                                    strong: { fontWeight: 'bold', color: '#166534' },
                                    list_item: { fontSize: 13, color: '#374151', marginBottom: 2 },
                                    paragraph: { fontSize: 13, color: '#374151', marginBottom: 4 }
                                }}>
                                    {plantDetail.moreDetails}
                                </Markdown>
                            </View>
                        ) : (
                            <Text style={{ fontSize: 13, color: '#374151' }}>
                                No additional details available yet.
                            </Text>
                        )}
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
        </>
    );
} 