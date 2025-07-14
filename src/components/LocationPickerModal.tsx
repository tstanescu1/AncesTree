import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    Modal, 
    ActivityIndicator, 
    Alert, 
    TextInput,
    ScrollView,
    Linking,
    Platform,
    Dimensions 
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useLocationHandler, LocationData } from '../hooks/useLocationHandler';

interface LocationPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onLocationSelected: (location: LocationData) => void;
    currentLocation?: LocationData | null;
}

export default function LocationPickerModal({
    visible,
    onClose,
    onLocationSelected,
    currentLocation
}: LocationPickerModalProps) {
    const {
        getCurrentLocation,
        loadingLocation,
        formatCoordinates,
        formatDecimalCoordinates,
        openInMaps,
        setCustomLocation
    } = useLocationHandler();

    const mapRef = useRef<MapView>(null);
    const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(currentLocation || null);
    const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
    const [manualAddress, setManualAddress] = useState('');
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [showMap, setShowMap] = useState(true);
    const [mapRegion, setMapRegion] = useState<Region>({
        latitude: currentLocation?.latitude || 37.78825,
        longitude: currentLocation?.longitude || -122.4324,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });
    const [isMapReady, setIsMapReady] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isMapMoving, setIsMapMoving] = useState(false);

    const screenHeight = Dimensions.get('window').height;

    useEffect(() => {
        if (currentLocation) {
            setSelectedLocation(currentLocation);
            setMapRegion({
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    }, [currentLocation]);

    // Update manual coordinates when location changes
    useEffect(() => {
        if (selectedLocation) {
            setManualCoords({
                lat: selectedLocation.latitude.toString(),
                lng: selectedLocation.longitude.toString()
            });
        }
    }, [selectedLocation]);

    const handleGetCurrentLocation = async () => {
        try {
            const location = await getCurrentLocation();
            if (location) {
                setSelectedLocation(location);
                const newRegion = {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                };
                setMapRegion(newRegion);
                
                // Animate map to new location
                mapRef.current?.animateToRegion(newRegion, 1000);
                
                Alert.alert(
                    'Location Found!',
                    `Current location: ${location.address || 'Unknown address'}\n\nCoordinates: ${formatDecimalCoordinates(location.latitude, location.longitude)}`,
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    const handleMapPress = (event: any) => {
        if (isDragging || isMapMoving) return; // Don't handle map press while dragging or moving
        
        const { coordinate } = event.nativeEvent;
        const location: LocationData = {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            address: `Location: ${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
            timestamp: Date.now()
        };
        setSelectedLocation(location);
        
        // Provide immediate feedback
        console.log(` Location selected: ${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`);
    };

    const handleMarkerDragStart = () => {
        setIsDragging(true);
        console.log('🎯 Started dragging marker');
    };

    const handleMarkerDrag = (event: any) => {
        const { coordinate } = event.nativeEvent;
        // Update coordinates in real-time while dragging
        setManualCoords({
            lat: coordinate.latitude.toFixed(6),
            lng: coordinate.longitude.toFixed(6)
        });
    };

    const handleMarkerDragEnd = (event: any) => {
        const { coordinate } = event.nativeEvent;
        const location: LocationData = {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            address: `Location: ${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
            timestamp: Date.now()
        };
        setSelectedLocation(location);
        setIsDragging(false);
        
        console.log(`🎯 Marker dropped at: ${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`);
    };

    const handleMapReady = () => {
        setIsMapReady(true);
    };

    const handleRegionChange = (region: Region) => {
        setMapRegion(region);
        setIsMapMoving(true);
    };

    const handleRegionChangeComplete = (region: Region) => {
        setMapRegion(region);
        setIsMapMoving(false);
        
        // Update manual coordinates to center of map when map stops moving
        if (!isDragging && !selectedLocation) {
            setManualCoords({
                lat: region.latitude.toFixed(6),
                lng: region.longitude.toFixed(6)
            });
        }
    };

    const validateCoordinates = (lat: string, lng: string): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        if (isNaN(latNum)) {
            errors.push('Latitude must be a valid number');
        } else if (latNum < -90 || latNum > 90) {
            errors.push('Latitude must be between -90 and 90 degrees');
        }

        if (isNaN(lngNum)) {
            errors.push('Longitude must be a valid number');
        } else if (lngNum < -180 || lngNum > 180) {
            errors.push('Longitude must be between -180 and 180 degrees');
        }

        return { isValid: errors.length === 0, errors };
    };

    const handleManualLocationEntry = () => {
        const validation = validateCoordinates(manualCoords.lat, manualCoords.lng);
        
        if (!validation.isValid) {
            Alert.alert('Invalid Coordinates', validation.errors.join('\n'));
            return;
        }

        const lat = parseFloat(manualCoords.lat);
        const lng = parseFloat(manualCoords.lng);

        const location: LocationData = {
            latitude: lat,
            longitude: lng,
            address: manualAddress.trim() || '',
            timestamp: Date.now()
        };

        setSelectedLocation(location);
        const newRegion = {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
        setMapRegion(newRegion);
        
        // Animate map to new location
        mapRef.current?.animateToRegion(newRegion, 1000);
        
        setIsManualEntry(false);
        Alert.alert(
            'Location Set!',
            `Location set to: ${manualAddress || 'Custom coordinates'}\n\nCoordinates: ${formatDecimalCoordinates(lat, lng)}`,
            [{ text: 'OK' }]
        );
    };

    const handleCoordinateChange = (field: 'lat' | 'lng', value: string) => {
        setManualCoords(prev => ({ ...prev, [field]: value }));
        
        // Real-time validation feedback
        const otherField = field === 'lat' ? 'lng' : 'lat';
        const validation = validateCoordinates(
            field === 'lat' ? value : manualCoords[otherField],
            field === 'lng' ? value : manualCoords[otherField]
        );
        
        // Update map preview if coordinates are valid
        if (validation.isValid) {
            const lat = parseFloat(field === 'lat' ? value : manualCoords.lat);
            const lng = parseFloat(field === 'lng' ? value : manualCoords.lng);
            
            const newRegion = {
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            setMapRegion(newRegion);
            
            // Animate map to new location
            mapRef.current?.animateToRegion(newRegion, 500);
        }
    };

    const handleOpenWebMaps = () => {
        const url = 'https://www.google.com/maps';
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Unable to open maps in browser');
        });
    };

    const handleConfirmLocation = () => {
        if (!selectedLocation) {
            Alert.alert('No Location Selected', 'Please select a location before confirming.');
            return;
        }
        
        // Set the custom location in the location handler so it can be used for searching
        console.log('🗺️ LocationPickerModal - Setting custom location:', selectedLocation);
        setCustomLocation(selectedLocation);
        
        onLocationSelected(selectedLocation);
        onClose();
    };

    const resetToCurrentLocation = () => {
        if (currentLocation) {
            setSelectedLocation(currentLocation);
            const newRegion = {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            setMapRegion(newRegion);
            
            // Animate map to current location
            mapRef.current?.animateToRegion(newRegion, 1000);
        }
    };

    const handleZoomIn = () => {
        const newRegion = {
            ...mapRegion,
            latitudeDelta: mapRegion.latitudeDelta * 0.5,
            longitudeDelta: mapRegion.longitudeDelta * 0.5,
        };
        setMapRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 300);
    };

    const handleZoomOut = () => {
        const newRegion = {
            ...mapRegion,
            latitudeDelta: mapRegion.latitudeDelta * 2,
            longitudeDelta: mapRegion.longitudeDelta * 2,
        };
        setMapRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 300);
    };

    const getCoordinateValidationStyle = (field: 'lat' | 'lng') => {
        const value = manualCoords[field];
        if (!value) return { borderColor: '#d1d5db' };
        
        const validation = validateCoordinates(
            field === 'lat' ? value : manualCoords.lat,
            field === 'lng' ? value : manualCoords.lng
        );
        
        if (validation.isValid) {
            return { borderColor: '#059669', borderWidth: 2 };
        } else {
            return { borderColor: '#dc2626', borderWidth: 2 };
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20
            }}>
                <View style={{
                    backgroundColor: 'white',
                    borderRadius: 16,
                    padding: 24,
                    width: '100%',
                    maxWidth: 420,
                    maxHeight: showMap ? '95%' : '90%'
                }}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={{ 
                            fontSize: 20, 
                            fontWeight: 'bold', 
                            color: '#15803d', 
                            marginBottom: 16, 
                            textAlign: 'center' 
                        }}>
                            📍 Choose Location
                        </Text>

                        {/* Current Selection Display */}
                        {selectedLocation && (
                            <View style={{
                                backgroundColor: '#f0fdf4',
                                padding: 12,
                                borderRadius: 8,
                                marginBottom: 16,
                                borderWidth: 1,
                                borderColor: '#bbf7d0'
                            }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534', marginBottom: 4 }}>
                                    📌 Selected Location:
                                </Text>
                                {selectedLocation.address && (
                                    <Text style={{ fontSize: 13, color: '#374151', marginBottom: 2 }}>
                                        📍 {selectedLocation.address}
                                    </Text>
                                )}
                                <Text style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>
                                    🌐 {formatDecimalCoordinates(selectedLocation.latitude, selectedLocation.longitude)}
                                </Text>
                                
                                {/* Preview in Maps */}
                                <TouchableOpacity
                                    style={{
                                        marginTop: 8,
                                        backgroundColor: '#059669',
                                        paddingVertical: 6,
                                        paddingHorizontal: 10,
                                        borderRadius: 6,
                                        alignSelf: 'flex-start'
                                    }}
                                    onPress={() => openInMaps(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.address)}
                                >
                                    <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>
                                        🗺️ Preview in Maps
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Map View */}
                        {showMap && (
                            <View style={{
                                height: Math.min(screenHeight * 0.5, 350), // Larger map
                                borderRadius: 12,
                                overflow: 'hidden',
                                marginBottom: 16,
                                borderWidth: 2,
                                borderColor: '#059669',
                                backgroundColor: '#f3f4f6'
                            }}>
                                {!isMapReady && (
                                    <View style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: '#f9fafb',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        zIndex: 1000
                                    }}>
                                        <ActivityIndicator size="large" color="#059669" />
                                        <Text style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>
                                            Loading map...
                                        </Text>
                                    </View>
                                )}
                                <MapView
                                    ref={mapRef}
                                    style={{ flex: 1 }}
                                    region={mapRegion}
                                    onRegionChange={handleRegionChange}
                                    onRegionChangeComplete={handleRegionChangeComplete}
                                    onPress={handleMapPress}
                                    showsUserLocation={true}
                                    showsMyLocationButton={true}
                                    onMapReady={handleMapReady}
                                    loadingEnabled={true}
                                    loadingIndicatorColor="#059669"
                                    showsCompass={true}
                                    showsScale={true}
                                >
                                    {selectedLocation && (
                                        <Marker
                                            coordinate={{
                                                latitude: selectedLocation.latitude,
                                                longitude: selectedLocation.longitude,
                                            }}
                                            title="Selected Location"
                                            description={selectedLocation.address || "Selected plant location"}
                                            pinColor="#059669"
                                            draggable={true}
                                            onDragStart={handleMarkerDragStart}
                                            onDrag={handleMarkerDrag}
                                            onDragEnd={handleMarkerDragEnd}
                                        />
                                    )}
                                </MapView>

                                {/* Zoom Controls */}
                                <View style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    backgroundColor: 'rgba(255,255,255,0.9)',
                                    borderRadius: 8,
                                    padding: 4
                                }}>
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: '#059669',
                                            width: 32,
                                            height: 32,
                                            borderRadius: 6,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginBottom: 4
                                        }}
                                        onPress={handleZoomIn}
                                    >
                                        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>+</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: '#059669',
                                            width: 32,
                                            height: 32,
                                            borderRadius: 6,
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}
                                        onPress={handleZoomOut}
                                    >
                                        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>−</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={{
                                    position: 'absolute',
                                    top: 8,
                                    left: 8,
                                    backgroundColor: 'rgba(5,150,105,0.9)',
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 6
                                }}>
                                    <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>
                                        📍 Tap to select or drag the pin
                                    </Text>
                                </View>
                                {selectedLocation && (
                                    <View style={{
                                        position: 'absolute',
                                        bottom: 8,
                                        left: 8,
                                        right: 8,
                                        backgroundColor: 'rgba(5,150,105,0.95)',
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        borderRadius: 6
                                    }}>
                                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '600', textAlign: 'center' }}>
                                            {isDragging ? '🎯 Dragging...' : `✅ Location: ${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Location Options - Simplified */}
                        <View style={{ marginBottom: 16 }}>
                            {/* Secondary Options - Smaller and less prominent */}
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                {/* Use Current GPS Location */}
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        backgroundColor: loadingLocation ? '#9ca3af' : '#0ea5e9',
                                        paddingVertical: 10,
                                        paddingHorizontal: 12,
                                        borderRadius: 6,
                                        alignItems: 'center',
                                        opacity: loadingLocation ? 0.6 : 1,
                                        flexDirection: 'row',
                                        justifyContent: 'center'
                                    }}
                                    onPress={handleGetCurrentLocation}
                                    disabled={loadingLocation}
                                >
                                    {loadingLocation ? (
                                        <ActivityIndicator size="small" color="white" style={{ marginRight: 6 }} />
                                    ) : (
                                        <Text style={{ fontSize: 14, marginRight: 6 }}>📍</Text>
                                    )}
                                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>
                                        {loadingLocation ? 'Getting...' : 'Use GPS'}
                                    </Text>
                                </TouchableOpacity>

                                {/* Manual Entry Toggle */}
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        backgroundColor: isManualEntry ? '#dc2626' : '#6b7280',
                                        paddingVertical: 10,
                                        paddingHorizontal: 12,
                                        borderRadius: 6,
                                        alignItems: 'center'
                                    }}
                                    onPress={() => setIsManualEntry(!isManualEntry)}
                                >
                                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>
                                        {isManualEntry ? '❌ Cancel' : '✏️ Manual'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Reset to Default (if current location exists) */}
                            {currentLocation && selectedLocation !== currentLocation && (
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: '#f3f4f6',
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                        borderRadius: 6,
                                        alignItems: 'center',
                                        borderWidth: 1,
                                        borderColor: '#d1d5db'
                                    }}
                                    onPress={resetToCurrentLocation}
                                >
                                    <Text style={{ color: '#6b7280', fontWeight: '600', fontSize: 11 }}>
                                        🔄 Reset to Current Location
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Enhanced Manual Entry Form */}
                        {isManualEntry && (
                            <View style={{
                                backgroundColor: '#f8fafc',
                                padding: 12,
                                borderRadius: 8,
                                marginBottom: 16,
                                borderWidth: 1,
                                borderColor: '#e2e8f0'
                            }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 }}>
                                    📝 Manual Coordinates:
                                </Text>

                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                                            Latitude:
                                        </Text>
                                        <TextInput
                                            style={[{
                                                borderWidth: 1,
                                                borderRadius: 6,
                                                padding: 8,
                                                fontSize: 12,
                                                fontFamily: 'monospace'
                                            }, getCoordinateValidationStyle('lat')]}
                                            placeholder="40.785091"
                                            value={manualCoords.lat}
                                            onChangeText={(text) => handleCoordinateChange('lat', text)}
                                            keyboardType="numeric"
                                        />
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                                            Longitude:
                                        </Text>
                                        <TextInput
                                            style={[{
                                                borderWidth: 1,
                                                borderRadius: 6,
                                                padding: 8,
                                                fontSize: 12,
                                                fontFamily: 'monospace'
                                            }, getCoordinateValidationStyle('lng')]}
                                            placeholder="-73.968285"
                                            value={manualCoords.lng}
                                            onChangeText={(text) => handleCoordinateChange('lng', text)}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>

                                {/* Address Input */}
                                <View style={{ marginBottom: 10 }}>
                                    <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                                        Address (optional):
                                    </Text>
                                    <TextInput
                                        style={{
                                            borderWidth: 1,
                                            borderColor: '#d1d5db',
                                            borderRadius: 6,
                                            padding: 8,
                                            fontSize: 12
                                        }}
                                        placeholder="e.g., Central Park, New York"
                                        value={manualAddress}
                                        onChangeText={setManualAddress}
                                    />
                                </View>

                                {/* Validation Status */}
                                {manualCoords.lat && manualCoords.lng && (
                                    <View style={{
                                        padding: 8,
                                        borderRadius: 6,
                                        marginBottom: 10,
                                        backgroundColor: validateCoordinates(manualCoords.lat, manualCoords.lng).isValid ? '#f0fdf4' : '#fef2f2',
                                        borderWidth: 1,
                                        borderColor: validateCoordinates(manualCoords.lat, manualCoords.lng).isValid ? '#bbf7d0' : '#fecaca'
                                    }}>
                                        <Text style={{
                                            fontSize: 11,
                                            color: validateCoordinates(manualCoords.lat, manualCoords.lng).isValid ? '#166534' : '#dc2626',
                                            fontWeight: '600'
                                        }}>
                                            {validateCoordinates(manualCoords.lat, manualCoords.lng).isValid ? '✅ Valid coordinates' : '❌ Invalid coordinates'}
                                        </Text>
                                        {!validateCoordinates(manualCoords.lat, manualCoords.lng).isValid && (
                                            <Text style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>
                                                {validateCoordinates(manualCoords.lat, manualCoords.lng).errors.join(', ')}
                                            </Text>
                                        )}
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={{
                                        backgroundColor: validateCoordinates(manualCoords.lat, manualCoords.lng).isValid ? '#059669' : '#9ca3af',
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                        borderRadius: 6,
                                        alignItems: 'center',
                                        opacity: validateCoordinates(manualCoords.lat, manualCoords.lng).isValid ? 1 : 0.6
                                    }}
                                    onPress={handleManualLocationEntry}
                                    disabled={!validateCoordinates(manualCoords.lat, manualCoords.lng).isValid}
                                >
                                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>
                                        ✅ Set Location
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#6b7280',
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    alignItems: 'center'
                                }}
                                onPress={onClose}
                            >
                                <Text style={{ color: 'white', fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: selectedLocation ? '#059669' : '#9ca3af',
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    opacity: selectedLocation ? 1 : 0.6
                                }}
                                onPress={handleConfirmLocation}
                                disabled={!selectedLocation}
                            >
                                <Text style={{ color: 'white', fontWeight: '600' }}>
                                    {selectedLocation ? 'Use This Location' : 'Select Location'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}; 