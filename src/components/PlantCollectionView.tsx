import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, ActivityIndicator, Image, ScrollView, Alert, Dimensions, Modal, TextInput, SafeAreaView } from 'react-native';
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLocationHandler } from '../hooks/useLocationHandler';
import CollectionMapView from './CollectionMapView';
import SightingDetailModal from './SightingDetailModal';

interface PlantCollectionViewProps {
    plants: any[] | undefined;
    selectedTags: string[];
    adminMode: boolean;
    setSelectedTags: (tags: string[]) => void;
    setSelectedPlantId: (id: string | null) => void;
    setCurrentView: (view: 'identify' | 'collection' | 'detail') => void;
    handleDeletePlant: (plantId: string, plantName: string) => void;
    getAllUniqueTags: () => string[];
    onOpenFullscreenMap: (location: any, filteredLocations: any[]) => void;
    refreshTrigger?: number;
}

export default function PlantCollectionView({
    plants,
    selectedTags,
    adminMode,
    setSelectedTags,
    setSelectedPlantId,
    setCurrentView,
    handleDeletePlant,
    getAllUniqueTags,
    onOpenFullscreenMap
}: PlantCollectionViewProps) {
    const [showAllTags, setShowAllTags] = useState(false);
    const [tagCleanupLoading, setTagCleanupLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    // Remove selectedLocation, showSightingModal, selectedSighting, and all map preview state

    // Get standardized tags from backend
    const standardTags = useQuery(api.identifyPlant.getStandardMedicinalTags) || [];
    const standardizeExistingTags = useAction(api.identifyPlant.standardizeExistingTags);
    
    // Location handler for maps integration
    const { openInMaps, formatDecimalCoordinates } = useLocationHandler();

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const mapWidth = Math.min(screenWidth - 32, 400);
    const mapHeight = Math.round(mapWidth * 0.6);

    // Helper function to calculate distance between two coordinates
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    // Remove getAllFilteredLocations, filteredLocations, and all map preview logic
    // Instead, compute filteredLocations only for fullscreen map
    const getAllFilteredLocations = () => {
        if (!plants) return [];
        const filteredPlants = (selectedTags.length > 0 
            ? plants.filter(plant => selectedTags.every(tag => plant.medicinalTags.includes(tag)))
            : plants).filter(plant => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                const nameMatch = (plant.commonNames?.join(' ') || '').toLowerCase().includes(q) || plant.scientificName.toLowerCase().includes(q);
                const tagMatch = (plant.medicinalTags?.join(' ') || '').toLowerCase().includes(q);
                return nameMatch || tagMatch;
            });
        const allLocations: any[] = [];
        filteredPlants.forEach(plant => {
            if (plant.allSightings) {
                const locationGroups: any[] = [];
                plant.allSightings.forEach((sighting: any) => {
                    if (sighting.latitude && sighting.longitude) {
                        let addedToGroup = false;
                        for (const group of locationGroups) {
                            const distance = calculateDistance(
                                group.latitude,
                                group.longitude,
                                sighting.latitude,
                                sighting.longitude
                            );
                            if (distance < 0.1) {
                                group.sightingCount++;
                                if (sighting.identifiedAt > group.identifiedAt) {
                                    group.latitude = sighting.latitude;
                                    group.longitude = sighting.longitude;
                                    group.address = sighting.address;
                                    group.identifiedAt = sighting.identifiedAt;
                                }
                                if (!group.allSightingsInGroup) {
                                    group.allSightingsInGroup = [group];
                                }
                                group.allSightingsInGroup.push(sighting);
                                group.locationId = `${plant._id}_${group.latitude.toFixed(6)}_${group.longitude.toFixed(6)}`;
                                addedToGroup = true;
                                break;
                            }
                        }
                        if (!addedToGroup) {
                            const locationData = {
                                ...sighting,
                                plantName: plant.commonNames?.[0] || plant.scientificName,
                                plantScientificName: plant.scientificName,
                                plantId: plant._id,
                                plantImage: (() => {
                                    const photoUri = plant.latestUserPhoto;
                                    if (!photoUri) return sighting.photoUri;
                                    if (photoUri.startsWith('data:') || photoUri.startsWith('http')) {
                                        return photoUri;
                                    }
                                    return `data:image/jpeg;base64,${photoUri}`;
                                })(),
                                medicinalTags: plant.medicinalTags || [],
                                sightingCount: 1,
                                allSightingsInGroup: [sighting],
                                locationId: `${plant._id}_${sighting.latitude.toFixed(6)}_${sighting.longitude.toFixed(6)}`
                            };
                            locationGroups.push(locationData);
                        }
                    }
                });
                allLocations.push(...locationGroups);
            }
        });
        return allLocations;
    };
    const filteredLocations = getAllFilteredLocations();

    const handleStandardizeExistingTags = async () => {
        Alert.alert(
            "🏷️ Standardize Tags",
            "This will clean up and standardize all existing plant tags in your collection.\n\nFor example:\n• 'immune booster' → 'immune-support'\n• 'anti inflammatory' → 'anti-inflammatory'\n• 'pain killer' → 'pain-relief'\n\nThis cannot be undone. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Standardize",
                    style: "default",
                    onPress: async () => {
                        setTagCleanupLoading(true);
                        try {
                            const result = await standardizeExistingTags({});
                            Alert.alert(
                                "✅ Tags Standardized",
                                `Updated ${result.updatedCount} out of ${result.totalPlants} plants.\n\nYour tag collection is now cleaner and more consistent!`
                            );
                        } catch (error) {
                            Alert.alert("❌ Error", "Failed to standardize tags. Please try again.");
                            console.error("Tag standardization error:", error);
                        } finally {
                            setTagCleanupLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Remove handleNavigateToSighting and any other function or prop related to selectedLocation, setSelectedLocation, setSelectedSighting, setShowSightingModal

    // removed old InteractiveMapPreview component

    // Remove LocationDetailModal and showLocationModal logic if not needed
    // Remove all references to selectedLocation and setSelectedLocation
    // Only use onOpenFullscreenMap for fullscreen map actions

    return (
        <View style={{ padding: 1, alignSelf: 'flex-start', width: '100%', paddingTop: 16 }}>
            {/* Header with admin functions */}
            {plants && (
            <View style={{ 
                backgroundColor: '#f0fdf4', 
                padding: 16, 
                borderRadius: 12, 
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#bbf7d0'
            }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#15803d', textAlign: 'center', marginBottom: 8 }}>
                    🌿 Plant Collection
                </Text>
                <Text style={{ fontSize: 14, color: '#166534', textAlign: 'center', marginBottom: 2 }}>
                    {plants?.length || 0} species • {plants?.reduce((sum, p) => sum + (p.sightingsCount || 1), 0) || 0} total sightings
                </Text>

                {/* Admin cleanup button */}
                {adminMode && (
                    <TouchableOpacity
                        style={{
                            backgroundColor: tagCleanupLoading ? '#9ca3af' : '#f59e0b',
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            borderRadius: 8,
                            alignSelf: 'center',
                            marginTop: 8,
                            opacity: tagCleanupLoading ? 0.6 : 1,
                        }}
                        onPress={handleStandardizeExistingTags}
                        disabled={tagCleanupLoading}
                    >
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                            {tagCleanupLoading ? '⏳ Standardizing Tags...' : '🏷️ Clean Up Tags'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
            )}

            {/* Search Bar */}
            {plants && (
            <View style={{ width: '100%', maxWidth: 400, marginBottom: 16 }}>
                <TextInput
                    placeholder="🔍 Search by name, scientific name, or property"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={{
                        backgroundColor: 'white',
                        borderWidth: 1,
                        borderColor: '#e5e7eb',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                        color: '#374151'
                    }}
                />
            </View>
            )}

            {/* Filter Properties */}
            {plants && (
            <View style={{ 
                width: '100%', 
                maxWidth: 400, 
                marginBottom: 16, 
                backgroundColor: 'white', 
                borderRadius: 12, 
                padding: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 2,
                borderWidth: 1,
                borderColor: '#f0f0f0'
            }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ 
                        fontSize: 13, 
                        fontWeight: '600', 
                        color: '#374151', 
                        letterSpacing: 0.3
                    }}>
                        Filter by Medicinal Properties
                    </Text>
                    {selectedTags.length > 0 && (
                        <View style={{
                            backgroundColor: '#f0fdf4',
                            paddingHorizontal: 8,
                            paddingVertical: 1,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#bbf7d0'
                        }}>
                            <Text style={{ fontSize: 11, color: '#166534', fontWeight: '600' }}>
                                {plants.filter(plant => 
                                    selectedTags.every(tag => plant.medicinalTags.includes(tag))
                                ).length} plants match
                            </Text>
                        </View>
                    )}
                </View>
                
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ 
                        flexDirection: 'row', 
                        gap: 8,
                        paddingRight: 4
                    }}
                >
                    {getAllUniqueTags().map((tag) => (
                        <TouchableOpacity
                            key={tag}
                            onPress={() => {
                                if (selectedTags.includes(tag)) {
                                    setSelectedTags(selectedTags.filter(t => t !== tag));
                                } else {
                                    setSelectedTags([...selectedTags, tag]);
                                }
                            }}
                            style={{
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 20,
                                backgroundColor: selectedTags.includes(tag) ? '#059669' : '#f8fafc',
                                borderWidth: 1,
                                borderColor: selectedTags.includes(tag) ? '#059669' : '#e2e8f0',
                                shadowColor: selectedTags.includes(tag) ? '#059669' : 'transparent',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: selectedTags.includes(tag) ? 0.2 : 0,
                                shadowRadius: 2,
                                elevation: selectedTags.includes(tag) ? 2 : 0
                            }}
                        >
                            <Text style={{ 
                                fontSize: 12, 
                                color: selectedTags.includes(tag) ? 'white' : '#64748b',
                                fontWeight: selectedTags.includes(tag) ? '600' : '500',
                                letterSpacing: 0.2
                            }}>
                                {tag}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            )}

            {/* Collection Map - Show filtered sightings */}
            {/* Remove the small interactive map preview and quick access list. Replace with a single button to open the fullscreen map. */}
            {filteredLocations.length > 0 && (
                <View style={{ 
                    marginBottom: 16, 
                    backgroundColor: 'white', 
                    borderRadius: 12, 
                    padding: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    borderWidth: 1,
                    borderColor: '#e5e7eb'
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534' }}>
                            🗺️ Interactive Map
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''}
                            </Text>
                            <TouchableOpacity
                                onPress={() => onOpenFullscreenMap(null, filteredLocations)}
                                style={{
                                    backgroundColor: '#059669',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: '#059669'
                                }}
                            >
                                <Text style={{ 
                                    fontSize: 11, 
                                    color: 'white',
                                    fontWeight: '600'
                                }}>
                                    Show Map
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

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
                    <View>
                        {plants
                            .filter(plant => {
                                const tagOk = selectedTags.length === 0 || selectedTags.every(tag => plant.medicinalTags.includes(tag));
                                if (!tagOk) return false;
                                if (!searchQuery.trim()) return true;
                                const q = searchQuery.toLowerCase();
                                const nameMatch = (plant.commonNames?.join(' ') || '').toLowerCase().includes(q) || plant.scientificName.toLowerCase().includes(q);
                                const tagMatch = (plant.medicinalTags?.join(' ') || '').toLowerCase().includes(q);
                                return nameMatch || tagMatch;
                            })
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
                                {/* Show the default/primary image for this plant */}
                                {plantItem.latestUserPhoto && (
                                    <View style={{ position: 'relative' }}>
                                        <Image 
                                            source={{ 
                                                uri: (() => {
                                                    const photoUri = plantItem.latestUserPhoto;
                                                    if (!photoUri) return '';
                                                    // If it's already a data URL or http URL, use as is
                                                    if (photoUri.startsWith('data:') || photoUri.startsWith('http')) {
                                                        return photoUri;
                                                    }
                                                    // Otherwise, treat as base64 and add data URL prefix
                                                    return `data:image/jpeg;base64,${photoUri}`;
                                                })()
                                            }} 
                                            style={{ 
                                                width: '100%', 
                                                height: 120, 
                                                borderRadius: 8, 
                                                marginBottom: 12,
                                                backgroundColor: '#f3f4f6' // Add placeholder background
                                            }}
                                            resizeMode="cover"
                                            loadingIndicatorSource={{ uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgZmlsbD0iI0Y5RkFGQiIvPgo8L3N2Zz4K' }}
                                            onError={() => {
                                                // console.log(`Failed to load plant collection image: ${plantItem.latestUserPhoto || plantItem.imageUrl}`);
                                            }}
                                        />
                                        {/* Photo type indicator */}
                                        <View style={{ 
                                            position: 'absolute', 
                                            top: 8, 
                                            right: 8, 
                                            backgroundColor: (() => {
                                                const photoUri = plantItem.latestUserPhoto;
                                                if (!photoUri) return '#6b7280';
                                                // User photos start with 'data:image', reference images are http URLs
                                                return photoUri.startsWith('data:') ? '#059669' : '#6b7280';
                                            })(),
                                            paddingHorizontal: 6,
                                            paddingVertical: 2,
                                            borderRadius: 4
                                        }}>
                                            <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                                                {(() => {
                                                    const photoUri = plantItem.latestUserPhoto;
                                                    if (!photoUri) return '📚 Reference';
                                                    return photoUri.startsWith('data:') ? '📸 Your Photo' : '📚 Reference';
                                                })()}
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
                                        {plantItem.medicinalTags && plantItem.medicinalTags.length > 0 ? (
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
                                        ) : (
                                            <View style={{ marginTop: 4 }}>
                                                <View style={{ 
                                                    backgroundColor: '#f9fafb', 
                                                    paddingHorizontal: 6, 
                                                    paddingVertical: 2, 
                                                    borderRadius: 8,
                                                    borderWidth: 1,
                                                    borderColor: '#e5e7eb',
                                                    alignSelf: 'flex-start'
                                                }}>
                                                    <Text style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>
                                                        No medicinal properties identified
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
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
                        ))}
                    </View>
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

            {/* Modals */}
            {/* Removed LocationDetailModal and showLocationModal */}
            {/* Remove SightingDetailModal and all related state/logic */}
        </View>
    );
} 