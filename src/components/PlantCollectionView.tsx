import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';

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
    return (
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
                                setSelectedTags(
                                    selectedTags.includes(tag) 
                                        ? selectedTags.filter(t => t !== tag)
                                        : [...selectedTags, tag]
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
} 