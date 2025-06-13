import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, Alert, ScrollView } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useLocationHandler, LocationData } from '../hooks/useLocationHandler';
import LocationPickerModal from './LocationPickerModal';

interface PlantIdentificationViewProps {
    loading: boolean;
    plant: any;
    multiPhotoMode: boolean;
    capturedPhotos: string[];
    showRecentPlants: boolean;
    recentPlants: any[];
    plants: any[] | undefined;
    setMultiPhotoMode: (mode: boolean) => void;
    setCapturedPhotos: (photos: string[]) => void;
    setShowRecentPlants: (show: boolean) => void;
    setSelectedPlantId: (id: string | null) => void;
    setCurrentView: (view: 'identify' | 'collection' | 'detail') => void;
    setZoomedImage: (uri: string | null) => void;
    takePhoto: () => void;
    addPhotoToCapture: () => void;
    processMultiplePhotos: () => void;
    clearCapturedPhotos: () => void;
    copyPlantInfo: (plant: any) => void;
    // Location props
    selectedLocation: LocationData | null;
    setSelectedLocation: (location: LocationData | null) => void;
    useCurrentLocation: boolean;
    setUseCurrentLocation: (use: boolean) => void;
}

export default function PlantIdentificationView({
    loading,
    plant,
    multiPhotoMode,
    capturedPhotos,
    showRecentPlants = true,
    recentPlants,
    plants,
    setMultiPhotoMode,
    setCapturedPhotos,
    setShowRecentPlants,
    setSelectedPlantId,
    setCurrentView,
    setZoomedImage,
    takePhoto,
    addPhotoToCapture,
    processMultiplePhotos,
    clearCapturedPhotos,
    copyPlantInfo,
    selectedLocation,
    setSelectedLocation,
    useCurrentLocation,
    setUseCurrentLocation
}: PlantIdentificationViewProps) {
    // Location functionality - initialize state properly
    const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
    
    const {
        currentLocation,
        getCurrentLocation,
        loadingLocation,
        formatDecimalCoordinates,
        formatCoordinates
    } = useLocationHandler();

    // Get current location on mount
    useEffect(() => {
        if (useCurrentLocation && !currentLocation) {
            getCurrentLocation().catch(console.warn);
        }
    }, [useCurrentLocation, currentLocation, getCurrentLocation]);

    // Debug: Log when selectedLocation changes
    useEffect(() => {
        console.log('🔍 PlantIdentificationView - selectedLocation changed:', selectedLocation);
    }, [selectedLocation]);

    // Debug: Log when useCurrentLocation changes
    useEffect(() => {
        console.log('🔍 PlantIdentificationView - useCurrentLocation changed:', useCurrentLocation);
    }, [useCurrentLocation]);

    // Handler functions
    const handleOpenLocationPicker = () => {
        setShowLocationPicker(true);
    };

    const handleCloseLocationPicker = () => {
        setShowLocationPicker(false);
    };

    const handleLocationSelected = (location: LocationData) => {
        setSelectedLocation(location);
        setUseCurrentLocation(false);
        setShowLocationPicker(false);
    };

    return (
        <>
            <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#166534', marginBottom: 24 }}>🌿 AncesTree</Text>

            {/* Location Section - Compact design with vertical buttons */}
            <View style={{ 
                width: '100%',
                marginBottom: 16, 
                backgroundColor: 'white', 
                borderRadius: 12, 
                padding: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
                borderWidth: 1,
                borderColor: '#e5e7eb'
            }}>
                {/* Current location display with inline Clear button and vertical action buttons */}
                {(useCurrentLocation && currentLocation) || selectedLocation ? (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                        {/* Location info - takes most space */}
                        <View style={{
                            flex: 1,
                            backgroundColor: '#f0fdf4',
                            padding: 16,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#bbf7d0',
                            minHeight: 90
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                                <Text style={{ fontSize: 13, color: '#166534', fontWeight: '600', flex: 1, lineHeight: 18 }}>
                                    {useCurrentLocation ? '📍 Current GPS location' : '📌 Selected location'}
                                </Text>
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: '#f3f4f6',
                                        paddingHorizontal: 10,
                                        paddingVertical: 5,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: '#d1d5db',
                                        marginLeft: 12
                                    }}
                                    onPress={() => {
                                        setSelectedLocation(null);
                                        setUseCurrentLocation(false);
                                    }}
                                >
                                    <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '600' }}>Clear</Text>
                                </TouchableOpacity>
                            </View>
                            {((useCurrentLocation && currentLocation) || selectedLocation) && (
                                <>
                                    {(useCurrentLocation ? currentLocation?.address : selectedLocation?.address) && (
                                        <Text style={{ 
                                            fontSize: 13, 
                                            color: '#374151', 
                                            marginBottom: 8,
                                            lineHeight: 19,
                                            flexWrap: 'wrap'
                                        }} numberOfLines={4}>
                                            {useCurrentLocation ? currentLocation?.address : selectedLocation?.address}
                                        </Text>
                                    )}
                                    <Text style={{ 
                                        fontSize: 11, 
                                        color: '#6b7280', 
                                        fontFamily: 'monospace',
                                        lineHeight: 16
                                    }}>
                                        {formatDecimalCoordinates(
                                            useCurrentLocation ? (currentLocation?.latitude || 0) : (selectedLocation?.latitude || 0),
                                            useCurrentLocation ? (currentLocation?.longitude || 0) : (selectedLocation?.longitude || 0)
                                        )}
                                    </Text>
                                </>
                            )}
                        </View>

                        {/* Vertical action buttons - compact on the right */}
                        <View style={{ gap: 10, alignItems: 'center' }}>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#0ea5e9',
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    minWidth: 80,
                                    minHeight: 40
                                }}
                                onPress={async () => {
                                    console.log('🔍 GPS button clicked - setting useCurrentLocation to true');
                                    setUseCurrentLocation(true);
                                    try {
                                        console.log('🔍 Calling getCurrentLocation()...');
                                        const location = await getCurrentLocation();
                                        console.log('🔍 getCurrentLocation() returned:', location);
                                        if (location) {
                                            console.log('🔍 Setting selectedLocation to:', location);
                                            setSelectedLocation(location); // Store GPS location in selectedLocation state
                                            console.log('🔍 selectedLocation set successfully');
                                        } else {
                                            console.log('🔍 No location returned from getCurrentLocation()');
                                        }
                                    } catch (error) {
                                        console.warn('🔍 Failed to get GPS location:', error);
                                    }
                                }}
                            >
                                {loadingLocation && useCurrentLocation ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={{ fontSize: 16, marginBottom: 3 }}>📍</Text>
                                )}
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: 11, textAlign: 'center' }}>
                                    {loadingLocation && useCurrentLocation ? 'GPS...' : 'GPS'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#059669',
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    minWidth: 80,
                                    minHeight: 40
                                }}
                                onPress={handleOpenLocationPicker}
                            >
                                <Text style={{ fontSize: 16, marginBottom: 3 }}>🗺️</Text>
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: 11, textAlign: 'center' }}>
                                    Choose
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    // No location state - horizontal layout with warning
                    <View>
                        <View style={{
                            backgroundColor: '#fef3c7',
                            padding: 14,
                            borderRadius: 8,
                            marginBottom: 14,
                            borderWidth: 1,
                            borderColor: '#f59e0b'
                        }}>
                            <Text style={{ fontSize: 12, color: '#92400e', textAlign: 'center', lineHeight: 18 }}>
                                📍 No location selected - plant will be saved without location data
                            </Text>
                        </View>
                        
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#0ea5e9',
                                    paddingVertical: 14,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    minHeight: 48
                                }}
                                onPress={async () => {
                                    console.log('🔍 GPS button clicked - setting useCurrentLocation to true');
                                    setUseCurrentLocation(true);
                                    try {
                                        console.log('🔍 Calling getCurrentLocation()...');
                                        const location = await getCurrentLocation();
                                        console.log('🔍 getCurrentLocation() returned:', location);
                                        if (location) {
                                            console.log('🔍 Setting selectedLocation to:', location);
                                            setSelectedLocation(location); // Store GPS location in selectedLocation state
                                            console.log('🔍 selectedLocation set successfully');
                                        } else {
                                            console.log('🔍 No location returned from getCurrentLocation()');
                                        }
                                    } catch (error) {
                                        console.warn('🔍 Failed to get GPS location:', error);
                                    }
                                }}
                            >
                                {loadingLocation && useCurrentLocation ? (
                                    <ActivityIndicator size="small" color="white" style={{ marginRight: 10 }} />
                                ) : (
                                    <Text style={{ fontSize: 16, marginRight: 10 }}>📍</Text>
                                )}
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                                    {loadingLocation && useCurrentLocation ? 'Getting GPS...' : 'Use GPS'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#059669',
                                    paddingVertical: 14,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    minHeight: 48
                                }}
                                onPress={handleOpenLocationPicker}
                            >
                                <Text style={{ fontSize: 16, marginRight: 10 }}>🗺️</Text>
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                                    Choose on Map
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

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
                        <View style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 14
                        }} />
                        
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
                    <ActivityIndicator size="large" color="#059669" />
                    <Text style={{ fontSize: 14, color: '#059669', marginTop: 8, textAlign: 'center', fontWeight: '600' }}>
                        {multiPhotoMode ? `🔍 Identifying species from ${capturedPhotos.length} photos...` : '🔍 Identifying plant species...'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'center' }}>
                        {multiPhotoMode ? 'Analyzing multiple angles • Extracting medicinal properties' : 'Fetching species information • Discovering medicinal uses'}
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
                    {plant.tags && plant.tags.length > 0 ? (
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
                    ) : null}

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
                                        {/* Medicinal tags */}
                                        {recentPlant.medicinalTags && recentPlant.medicinalTags.length > 0 && (
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 4 }}>
                                                {recentPlant.medicinalTags.slice(0, 2).map((tag: string, tagIndex: number) => (
                                                    <View
                                                        key={tagIndex}
                                                        style={{
                                                            backgroundColor: '#f0fdf4',
                                                            paddingHorizontal: 6,
                                                            paddingVertical: 2,
                                                            borderRadius: 8,
                                                            borderWidth: 1,
                                                            borderColor: '#bbf7d0',
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 9, color: '#15803d', fontWeight: '500' }}>{tag}</Text>
                                                    </View>
                                                ))}
                                                {recentPlant.medicinalTags && recentPlant.medicinalTags.length > 2 && (
                                                    <Text style={{ fontSize: 9, color: '#6b7280', alignSelf: 'center' }}>
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

            {/* Location Picker Modal */}
            <LocationPickerModal
                visible={showLocationPicker}
                onClose={handleCloseLocationPicker}
                onLocationSelected={handleLocationSelected}
                currentLocation={currentLocation}
            />
        </>
    );
} 