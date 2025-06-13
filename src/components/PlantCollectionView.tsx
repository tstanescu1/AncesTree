import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface PlantCollectionViewProps {
    plants: any[] | undefined;
    selectedTags: string[];
    adminMode: boolean;
    setSelectedTags: (tags: string[]) => void;
    setSelectedPlantId: (id: string | null) => void;
    setCurrentView: (view: 'identify' | 'collection' | 'detail') => void;
    handleDeletePlant: (plantId: string, plantName: string) => void;
    getAllUniqueTags: () => string[];
}

export default function PlantCollectionView({
    plants,
    selectedTags,
    adminMode,
    setSelectedTags,
    setSelectedPlantId,
    setCurrentView,
    handleDeletePlant,
    getAllUniqueTags
}: PlantCollectionViewProps) {
    const [showAllTags, setShowAllTags] = useState(false);
    const [tagCleanupLoading, setTagCleanupLoading] = useState(false);

    // Get standardized tags from backend
    const standardTags = useQuery(api.identifyPlant.getStandardMedicinalTags) || [];
    const standardizeExistingTags = useAction(api.identifyPlant.standardizeExistingTags);

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

    return (
        <View style={{ padding: 16, alignSelf: 'flex-start', width: '100%' }}>
            {/* Header with admin functions */}
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

            {/* Enhanced Tag Filter Section */}
            <View style={{ 
                backgroundColor: 'white', 
                padding: 12, 
                borderRadius: 12, 
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
            }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#374151' }}>
                        🏷️ Filter by Properties
                    </Text>
                    
                    {selectedTags.length > 0 && (
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#dc2626',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                            }}
                            onPress={() => setSelectedTags([])}
                        >
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                                Clear ({selectedTags.length})
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Display simple collection info */}
                {getAllUniqueTags().length > 0 ? (
                    <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                        Found {getAllUniqueTags().length} medicinal properties in your collection
                    </Text>
                ) : (
                    <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                        No medicinal tags in your collection yet
                    </Text>
                )}

                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={{ marginVertical: 4, height: 40 }}
                >
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        {/* Only show tags that actually exist in user's collection */}
                        {getAllUniqueTags()
                            .sort((a, b) => {
                                // Sort by plant count (descending), then alphabetically
                                const countA = plants?.filter(plant => plant.medicinalTags?.includes(a)).length || 0;
                                const countB = plants?.filter(plant => plant.medicinalTags?.includes(b)).length || 0;
                                if (countA !== countB) return countB - countA;
                                return a.localeCompare(b);
                            })
                            .map((tag) => {
                                const isSelected = selectedTags.includes(tag);
                                const isStandardTag = standardTags.includes(tag);
                                const plantCount = plants?.filter(plant => 
                                    plant.medicinalTags?.includes(tag)
                                ).length || 0;
                                
                                return (
                                    <TouchableOpacity
                                        key={tag}
                                        style={{
                                            backgroundColor: isSelected 
                                                ? '#059669' 
                                                : isStandardTag 
                                                    ? '#f0fdf4' 
                                                    : '#fef3c7',
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: isSelected 
                                                ? '#047857' 
                                                : isStandardTag 
                                                    ? '#bbf7d0' 
                                                    : '#fbbf24',
                                            minWidth: 50,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: 32,
                                        }}
                                        onPress={() => {
                                            if (isSelected) {
                                                setSelectedTags(selectedTags.filter(t => t !== tag));
                                            } else {
                                                setSelectedTags([...selectedTags, tag]);
                                            }
                                        }}
                                    >
                                        <Text style={{
                                            fontSize: 11,
                                            fontWeight: '600',
                                            color: isSelected 
                                                ? 'white' 
                                                : isStandardTag 
                                                    ? '#059669' 
                                                    : '#d97706',
                                            textAlign: 'center',
                                            lineHeight: 12,
                                        }}>
                                            {tag}
                                        </Text>
                                        <Text style={{
                                            fontSize: 9,
                                            color: isSelected 
                                                ? '#bbf7d0' 
                                                : isStandardTag 
                                                    ? '#6b7280' 
                                                    : '#92400e',
                                            marginTop: 1,
                                            lineHeight: 10,
                                        }}>
                                            {plantCount}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                    </View>
                </ScrollView>

                {/* Show legend only if there are tags */}
                {getAllUniqueTags().length > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#bbf7d0' }} />
                            <Text style={{ fontSize: 10, color: '#6b7280' }}>Standard</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fbbf24' }} />
                            <Text style={{ fontSize: 10, color: '#6b7280' }}>Custom</Text>
                        </View>
                    </View>
                )}

                {/* Show helpful message if no plants with medicinal tags */}
                {getAllUniqueTags().length === 0 && plants && plants.length > 0 && (
                    <View style={{ 
                        backgroundColor: '#f0fdf4', 
                        padding: 8, 
                        borderRadius: 6, 
                        marginTop: 4,
                        alignItems: 'center'
                    }}>
                        <Text style={{ fontSize: 11, color: '#059669', textAlign: 'center' }}>
                            💡 Identify more plants to see medicinal property filters
                        </Text>
                    </View>
                )}
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
                    <View>
                        {plants
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
                                                console.log(`Failed to load plant collection image: ${plantItem.latestUserPhoto || plantItem.imageUrl}`);
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
        </View>
    );
} 