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
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [showSightingModal, setShowSightingModal] = useState(false);
    const [selectedSighting, setSelectedSighting] = useState<any>(null);

    // Get standardized tags from backend
    const standardTags = useQuery(api.identifyPlant.getStandardMedicinalTags) || [];
    const standardizeExistingTags = useAction(api.identifyPlant.standardizeExistingTags);
    
    // Location handler for maps integration
    const { openInMaps, formatDecimalCoordinates } = useLocationHandler();

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const mapWidth = Math.min(screenWidth - 32, 400);
    const mapHeight = Math.round(mapWidth * 0.6);

    // Get all locations from filtered plants
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
                plant.allSightings.forEach((sighting: any) => {
                    if (sighting.latitude && sighting.longitude) {
                        allLocations.push({
                            ...sighting,
                            plantName: plant.commonNames?.[0] || plant.scientificName,
                            plantScientificName: plant.scientificName,
                            plantId: plant._id,
                            plantImage: sighting.photoUri || plant.latestUserPhoto || plant.imageUrl,
                            medicinalTags: plant.medicinalTags || []
                        });
                    }
                });
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

    const handleNavigateToSighting = (location: any) => {
        setSelectedPlantId(location.plantId);
        setCurrentView('detail');
        onOpenFullscreenMap(location, filteredLocations);
    };

    // removed old InteractiveMapPreview component

    // Remove LocationDetailModal and showLocationModal logic if not needed
    // Remove all references to selectedLocation and setSelectedLocation
    // Only use onOpenFullscreenMap for fullscreen map actions

    return (
        <View style={{ padding: 16, alignSelf: 'flex-start', width: '100%' }}>
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
                <Text style={{ fontSize: 14, color: '#166534', textAlign: 'center', marginBottom: 12 }}>
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
                            paddingVertical: 4,
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
                
                {selectedTags.length > 0 && (
                    <View style={{
                        backgroundColor: '#fef3c7',
                        padding: 8,
                        borderRadius: 6,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: '#fcd34d'
                    }}>
                        <Text style={{ fontSize: 11, color: '#92400e', textAlign: 'center' }}>
                            🔍 Showing plants with ALL selected properties (AND filter)
                        </Text>
                    </View>
                )}
                
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534' }}>
                            🗺️ Filtered Map
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowMap(!showMap)}
                                style={{
                                    backgroundColor: showMap ? '#059669' : '#f3f4f6',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: showMap ? '#059669' : '#e5e7eb'
                                }}
                            >
                                <Text style={{ 
                                    fontSize: 11, 
                                    color: showMap ? 'white' : '#6b7280',
                                    fontWeight: '600'
                                }}>
                                    {showMap ? 'Hide' : 'Show'} Map
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showMap && (
                        <View>
                            {/* Interactive Map Preview */}
                            <View style={{ position: 'relative' }}>
                                <CollectionMapView 
                                    locations={filteredLocations} 
                                    height={mapHeight} 
                                    selectedLocation={selectedLocation}
                                    onSelectLocation={(location) => {
                                        // Focus the pin by updating local state
                                        // Remove the _justSelected flag to allow zooming when selecting from list
                                        const { _justSelected, ...locationWithoutFlag } = location;
                                        setSelectedLocation(locationWithoutFlag);
                                    }}
                                    onImagePress={(location) => {
                                        setSelectedSighting(location);
                                        setShowSightingModal(true);
                                    }}
                                />
                                {/* Fullscreen button */}
                                <TouchableOpacity
                                    onPress={() => onOpenFullscreenMap(null, filteredLocations)}
                                    style={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        backgroundColor: 'rgba(0,0,0,0.6)',
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 6,
                                    }}
                                >
                                    <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>⤢ Fullscreen</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Quick Location List */}
                            <View style={{ marginTop: 12 }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', marginBottom: 8 }}>
                                    📍 Quick Access:
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {filteredLocations.slice(0, 5).map((location, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={{
                                                    backgroundColor: '#f0fdf4',
                                                    padding: 8,
                                                    borderRadius: 6,
                                                    borderWidth: 1,
                                                    borderColor: '#bbf7d0',
                                                    minWidth: 120
                                                }}
                                                onPress={() => {
                                                    if (!showMap) setShowMap(true);
                                                    setSelectedLocation(location);
                                                }}
                                            >
                                                <Text style={{ fontSize: 10, fontWeight: '600', color: '#374151', marginBottom: 2 }}>
                                                    🌿 {location.plantName}
                                                </Text>
                                                <Text style={{ fontSize: 9, color: '#6b7280', fontFamily: 'monospace' }}>
                                                    {formatDecimalCoordinates(location.latitude, location.longitude)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                        {filteredLocations.length > 5 && (
                                            <TouchableOpacity
                                                style={{
                                                    backgroundColor: '#f8fafc',
                                                    padding: 8,
                                                    borderRadius: 6,
                                                    borderWidth: 1,
                                                    borderColor: '#e2e8f0',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    minWidth: 80
                                                }}
                                                onPress={() => onOpenFullscreenMap(null, filteredLocations)}
                                            >
                                                <Text style={{ fontSize: 10, color: '#059669', fontWeight: '600' }}>
                                                    +{filteredLocations.length - 5} more
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
                    )}
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
                                {/* Show compressed user photo first, fallback to reference image */}
                                {(plantItem.latestUserPhoto || plantItem.imageUrl) && (
                                    <View style={{ position: 'relative' }}>
                                        <Image 
                                            source={{ 
                                                uri: (() => {
                                                    const photoUri = plantItem.latestUserPhoto || plantItem.imageUrl;
                                                    return photoUri && photoUri.startsWith('data:') ? photoUri : 
                                                           photoUri ? `data:image/jpeg;base64,${photoUri}` : photoUri;
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

                                {/* Location Preview - Show if any sightings have location data */}
                                {plantItem.allSightings && plantItem.allSightings.some((s: any) => s.latitude && s.longitude) && (
                                    <View style={{ marginTop: 8, marginBottom: 8 }}>
                                        {(() => {
                                            // Get unique locations from sightings
                                            const locationsMap = new Map();
                                            plantItem.allSightings.forEach((sighting: any) => {
                                                if (sighting.latitude && sighting.longitude) {
                                                    const key = `${sighting.latitude.toFixed(4)},${sighting.longitude.toFixed(4)}`;
                                                    if (!locationsMap.has(key)) {
                                                        locationsMap.set(key, {
                                                            latitude: sighting.latitude,
                                                            longitude: sighting.longitude,
                                                            address: sighting.address,
                                                            timestamp: sighting.locationTimestamp || sighting.identifiedAt,
                                                            count: 1
                                                        });
                                                    } else {
                                                        locationsMap.get(key).count++;
                                                    }
                                                }
                                            });
                                            
                                            const uniqueLocations = Array.from(locationsMap.values());
                                            const mostRecentLocation = uniqueLocations.sort((a, b) => b.timestamp - a.timestamp)[0];
                                            
                                            return (
                                                <View>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534' }}>
                                                            📍 Locations ({uniqueLocations.length})
                                                        </Text>
                                                        {uniqueLocations.length > 1 && (
                                                            <Text style={{ fontSize: 10, color: '#6b7280' }}>
                                                                Multiple spots found
                                                            </Text>
                                                        )}
                                                    </View>
                                                    
                                                    {/* Compact location display */}
                                                    <TouchableOpacity
                                                        style={{
                                                            backgroundColor: '#f0fdf4',
                                                            padding: 10,
                                                            borderRadius: 8,
                                                            borderWidth: 1,
                                                            borderColor: '#bbf7d0',
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: 10
                                                        }}
                                                        onPress={() => {
                                                            openInMaps(
                                                                mostRecentLocation.latitude, 
                                                                mostRecentLocation.longitude, 
                                                                plantItem.commonNames?.[0] || plantItem.scientificName
                                                            );
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        {/* Map icon */}
                                                        <View style={{
                                                            backgroundColor: '#059669',
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: 6,
                                                            justifyContent: 'center',
                                                            alignItems: 'center'
                                                        }}>
                                                            <Text style={{ fontSize: 16 }}>🗺️</Text>
                                                        </View>
                                                        
                                                        {/* Location info */}
                                                        <View style={{ flex: 1 }}>
                                                            {mostRecentLocation.address && (
                                                                <Text style={{ fontSize: 11, color: '#374151', marginBottom: 2 }} numberOfLines={1}>
                                                                    {mostRecentLocation.address}
                                                                </Text>
                                                            )}
                                                            <Text style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>
                                                                {formatDecimalCoordinates(mostRecentLocation.latitude, mostRecentLocation.longitude)}
                                                            </Text>
                                                            {uniqueLocations.length > 1 && (
                                                                <Text style={{ fontSize: 9, color: '#059669', fontWeight: '600', marginTop: 2 }}>
                                                                    +{uniqueLocations.length - 1} more location{uniqueLocations.length > 2 ? 's' : ''}
                                                                </Text>
                                                            )}
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
                                                    
                                                    {uniqueLocations.length > 1 && (
                                                        <TouchableOpacity
                                                            style={{
                                                                marginTop: 6,
                                                                backgroundColor: '#f8fafc',
                                                                paddingHorizontal: 8,
                                                                paddingVertical: 4,
                                                                borderRadius: 4,
                                                                alignSelf: 'center',
                                                                borderWidth: 1,
                                                                borderColor: '#e2e8f0'
                                                            }}
                                                            onPress={() => {
                                                                setSelectedPlantId(plantItem._id);
                                                                setCurrentView('detail');
                                                            }}
                                                        >
                                                            <Text style={{ fontSize: 10, color: '#059669', fontWeight: '600' }}>
                                                                🗺️ View All {uniqueLocations.length} Locations
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            );
                                        })()}
                                    </View>
                                )}

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
            <SightingDetailModal
                visible={showSightingModal}
                location={selectedSighting}
                onClose={() => {
                    setShowSightingModal(false);
                    setSelectedSighting(null);
                }}
                onViewPlant={(plantId) => {
                    setSelectedPlantId(plantId);
                    setCurrentView('detail');
                }}
            />
        </View>
    );
} 