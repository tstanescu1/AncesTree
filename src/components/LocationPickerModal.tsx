import React, { useState, useEffect } from 'react';
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
    Platform 
} from 'react-native';
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
        openInMaps
    } = useLocationHandler();

    const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(currentLocation || null);
    const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
    const [manualAddress, setManualAddress] = useState('');
    const [isManualEntry, setIsManualEntry] = useState(false);

    useEffect(() => {
        if (currentLocation) {
            setSelectedLocation(currentLocation);
        }
    }, [currentLocation]);

    const handleGetCurrentLocation = async () => {
        try {
            const location = await getCurrentLocation();
            if (location) {
                setSelectedLocation(location);
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

    const handleManualLocationEntry = () => {
        const lat = parseFloat(manualCoords.lat);
        const lng = parseFloat(manualCoords.lng);

        if (isNaN(lat) || isNaN(lng)) {
            Alert.alert('Invalid Coordinates', 'Please enter valid latitude and longitude values.');
            return;
        }

        if (lat < -90 || lat > 90) {
            Alert.alert('Invalid Latitude', 'Latitude must be between -90 and 90 degrees.');
            return;
        }

        if (lng < -180 || lng > 180) {
            Alert.alert('Invalid Longitude', 'Longitude must be between -180 and 180 degrees.');
            return;
        }

        const location: LocationData = {
            latitude: lat,
            longitude: lng,
            address: manualAddress.trim() || undefined,
            timestamp: Date.now()
        };

        setSelectedLocation(location);
        setIsManualEntry(false);
        Alert.alert(
            'Location Set!',
            `Location set to: ${manualAddress || 'Custom coordinates'}\n\nCoordinates: ${formatDecimalCoordinates(lat, lng)}`,
            [{ text: 'OK' }]
        );
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
        onLocationSelected(selectedLocation);
        onClose();
    };

    const resetToCurrentLocation = () => {
        if (currentLocation) {
            setSelectedLocation(currentLocation);
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
                    maxHeight: '90%'
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
                                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                    📐 {formatCoordinates(selectedLocation.latitude, selectedLocation.longitude)}
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

                        {/* Location Options */}
                        <View style={{ marginBottom: 20 }}>
                            {/* Use Current GPS Location */}
                            <TouchableOpacity
                                style={{
                                    backgroundColor: loadingLocation ? '#9ca3af' : '#059669',
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    marginBottom: 12,
                                    opacity: loadingLocation ? 0.6 : 1,
                                    flexDirection: 'row',
                                    justifyContent: 'center'
                                }}
                                onPress={handleGetCurrentLocation}
                                disabled={loadingLocation}
                            >
                                {loadingLocation ? (
                                    <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                                ) : (
                                    <Text style={{ fontSize: 16, marginRight: 8 }}>📍</Text>
                                )}
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                                    {loadingLocation ? 'Getting Location...' : 'Use Current GPS Location'}
                                </Text>
                            </TouchableOpacity>

                            {/* Reset to Default (if current location exists) */}
                            {currentLocation && selectedLocation !== currentLocation && (
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: '#6b7280',
                                        paddingVertical: 10,
                                        paddingHorizontal: 16,
                                        borderRadius: 8,
                                        alignItems: 'center',
                                        marginBottom: 12
                                    }}
                                    onPress={resetToCurrentLocation}
                                >
                                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                                        🔄 Reset to Current Location
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Manual Entry Toggle */}
                            <TouchableOpacity
                                style={{
                                    backgroundColor: isManualEntry ? '#dc2626' : '#0ea5e9',
                                    paddingVertical: 10,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    marginBottom: 12
                                }}
                                onPress={() => setIsManualEntry(!isManualEntry)}
                            >
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                                    {isManualEntry ? '❌ Cancel Manual Entry' : '✏️ Enter Coordinates Manually'}
                                </Text>
                            </TouchableOpacity>

                            {/* Web Maps Link */}
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#f59e0b',
                                    paddingVertical: 10,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    marginBottom: 12
                                }}
                                onPress={handleOpenWebMaps}
                            >
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                                    🌐 Open Google Maps in Browser
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Manual Entry Form */}
                        {isManualEntry && (
                            <View style={{
                                backgroundColor: '#f8fafc',
                                padding: 16,
                                borderRadius: 8,
                                marginBottom: 16,
                                borderWidth: 1,
                                borderColor: '#e2e8f0'
                            }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
                                    📝 Enter Location Details:
                                </Text>

                                <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                                    📍 Address/Description (optional):
                                </Text>
                                <TextInput
                                    style={{
                                        borderWidth: 1,
                                        borderColor: '#d1d5db',
                                        borderRadius: 6,
                                        padding: 10,
                                        marginBottom: 12,
                                        fontSize: 13
                                    }}
                                    placeholder="e.g., 'Near oak tree in Central Park' or full address"
                                    value={manualAddress}
                                    onChangeText={setManualAddress}
                                />

                                <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                                    🌐 Latitude:
                                </Text>
                                <TextInput
                                    style={{
                                        borderWidth: 1,
                                        borderColor: '#d1d5db',
                                        borderRadius: 6,
                                        padding: 10,
                                        marginBottom: 8,
                                        fontSize: 13,
                                        fontFamily: 'monospace'
                                    }}
                                    placeholder="e.g., 40.785091"
                                    value={manualCoords.lat}
                                    onChangeText={(text) => setManualCoords(prev => ({ ...prev, lat: text }))}
                                    keyboardType="numeric"
                                />

                                <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                                    🌐 Longitude:
                                </Text>
                                <TextInput
                                    style={{
                                        borderWidth: 1,
                                        borderColor: '#d1d5db',
                                        borderRadius: 6,
                                        padding: 10,
                                        marginBottom: 12,
                                        fontSize: 13,
                                        fontFamily: 'monospace'
                                    }}
                                    placeholder="e.g., -73.968285"
                                    value={manualCoords.lng}
                                    onChangeText={(text) => setManualCoords(prev => ({ ...prev, lng: text }))}
                                    keyboardType="numeric"
                                />

                                <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12, lineHeight: 14 }}>
                                    💡 Tip: You can find coordinates by opening Google Maps in your browser, right-clicking on a location, and copying the coordinates.
                                </Text>

                                <TouchableOpacity
                                    style={{
                                        backgroundColor: '#059669',
                                        paddingVertical: 10,
                                        paddingHorizontal: 16,
                                        borderRadius: 6,
                                        alignItems: 'center'
                                    }}
                                    onPress={handleManualLocationEntry}
                                >
                                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                                        ✅ Set This Location
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
                                    {selectedLocation ? '✅ Use This Location' : 'Select Location'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}; 