import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, ScrollView, TextInput, Linking, Alert } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface PlantDetailViewProps {
    selectedPlantId: string | null;
    plantDetail: any;
    loading: boolean;
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
}

export default function PlantDetailView({
    selectedPlantId,
    plantDetail,
    loading,
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
    handleDeleteSighting
}: PlantDetailViewProps) {
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
                            <TouchableOpacity 
                                style={{ 
                                    flexDirection: 'row', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    backgroundColor: '#fef2f2',
                                    padding: 12,
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: '#fecaca'
                                }}
                                onPress={() => setShowSafetyInfo(!showSafetyInfo)}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534' }}>⚠️ Safety & Precautions</Text>
                                <Text style={{ fontSize: 16, color: '#991b1b' }}>
                                    {showSafetyInfo ? '▼' : '▶'}
                                </Text>
                            </TouchableOpacity>
                            
                            {showSafetyInfo && (
                                <View style={{ 
                                    backgroundColor: '#fef2f2', 
                                    padding: 12, 
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: '#fecaca',
                                    marginTop: 4
                                }}>
                                    <Text style={{ fontSize: 12, color: '#991b1b', lineHeight: 16 }}>
                                        <Text style={{ fontWeight: 'bold' }}>⚠️ Important:</Text> Always consult with a qualified healthcare professional before using any plant for medicinal purposes. Plant identification through photos may not be 100% accurate. Never consume unknown plants.
                                    </Text>
                                    <Text style={{ fontSize: 10, color: '#7f1d1d', marginTop: 4, fontStyle: 'italic' }}>
                                        This information is for educational purposes only and is not medical advice.
                                    </Text>
                                </View>
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
                                {plantDetail.userPhotos.map((photo: string, index: number) => (
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
} 