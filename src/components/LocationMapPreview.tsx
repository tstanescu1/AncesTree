import React from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    Alert, 
    Clipboard, 
    Image,
    Dimensions 
} from 'react-native';
import { useLocationHandler, LocationData } from '../hooks/useLocationHandler';

interface LocationMapPreviewProps {
    location: LocationData;
    plantName?: string;
    style?: any;
}

export default function LocationMapPreview({ 
    location, 
    plantName,
    style 
}: LocationMapPreviewProps) {
    const { 
        formatCoordinates, 
        formatDecimalCoordinates, 
        openInMaps,
        getDistanceFromCurrentLocation,
        formatDistance
    } = useLocationHandler();

    const { width: screenWidth } = Dimensions.get('window');
    const mapWidth = Math.min(screenWidth - 64, 350);
    const mapHeight = Math.round(mapWidth * 0.6);

    // Generate static map URL (using Google Static Maps API)
    const generateStaticMapUrl = (lat: number, lng: number, width: number, height: number) => {
        const zoom = 15;
        const mapType = 'hybrid'; // satellite view with roads
        
        return `https://maps.googleapis.com/maps/api/staticmap?` +
               `center=${lat},${lng}&` +
               `zoom=${zoom}&` +
               `size=${width}x${height}&` +
               `maptype=${mapType}&` +
               `markers=color:red%7Clabel:🌿%7C${lat},${lng}&` +
               `key=AIzaSyBX1234567890_PLACEHOLDER_API_KEY`; // You'll need a real API key
    };

    // Fallback to OpenStreetMap static map if Google Maps API key is not available
    const generateOSMStaticMapUrl = (lat: number, lng: number, width: number, height: number) => {
        const zoom = 15;
        return `https://static-maps.yandex.ru/1.x/?` +
               `ll=${lng},${lat}&` +
               `size=${width},${height}&` +
               `z=${zoom}&` +
               `l=sat&` +
               `pt=${lng},${lat},pm2rdm`;
    };

    const copyCoordinates = async (coordinates: string, format: string) => {
        try {
            await Clipboard.setString(coordinates);
            Alert.alert(
                'Copied!',
                `${format} coordinates copied to clipboard:\n${coordinates}`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to copy coordinates');
        }
    };

    const distance = getDistanceFromCurrentLocation(location.latitude, location.longitude);

    return (
        <View style={[{
            backgroundColor: '#f0fdf4',
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: '#bbf7d0'
        }, style]}>
            <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: '#166534', 
                marginBottom: 12,
                textAlign: 'center'
            }}>
                📍 Plant Location
            </Text>

            {/* Map Preview */}
            <View style={{
                borderRadius: 8,
                overflow: 'hidden',
                marginBottom: 12,
                backgroundColor: '#e5e7eb',
                alignItems: 'center',
                justifyContent: 'center',
                height: mapHeight
            }}>
                <TouchableOpacity
                    style={{ width: '100%', height: '100%' }}
                    onPress={() => openInMaps(location.latitude, location.longitude, plantName)}
                    activeOpacity={0.8}
                >
                    {/* Fallback map display */}
                    <View style={{
                        flex: 1,
                        backgroundColor: '#10b981',
                        justifyContent: 'center',
                        alignItems: 'center',
                        position: 'relative'
                    }}>
                        <Text style={{ 
                            fontSize: 48, 
                            marginBottom: 8,
                            textShadowColor: 'rgba(0,0,0,0.3)',
                            textShadowOffset: { width: 1, height: 1 },
                            textShadowRadius: 2
                        }}>
                            🗺️
                        </Text>
                        <Text style={{ 
                            color: 'white', 
                            fontSize: 14, 
                            fontWeight: '600',
                            textAlign: 'center',
                            textShadowColor: 'rgba(0,0,0,0.5)',
                            textShadowOffset: { width: 1, height: 1 },
                            textShadowRadius: 2
                        }}>
                            Tap to Open in Maps
                        </Text>
                        <Text style={{ 
                            color: 'rgba(255,255,255,0.9)', 
                            fontSize: 11, 
                            textAlign: 'center',
                            marginTop: 4,
                            textShadowColor: 'rgba(0,0,0,0.5)',
                            textShadowOffset: { width: 1, height: 1 },
                            textShadowRadius: 2
                        }}>
                            🌿 Plant found here
                        </Text>

                        {/* Overlay with coordinates */}
                        <View style={{
                            position: 'absolute',
                            bottom: 8,
                            left: 8,
                            right: 8,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 4
                        }}>
                            <Text style={{ 
                                color: 'white', 
                                fontSize: 10, 
                                textAlign: 'center',
                                fontFamily: 'monospace'
                            }}>
                                {formatDecimalCoordinates(location.latitude, location.longitude)}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Location Details */}
            <View style={{ 
                backgroundColor: 'white', 
                padding: 12, 
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#d1fae5'
            }}>
                {/* Address */}
                {location.address && (
                    <View style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', marginBottom: 2 }}>
                            📍 Location:
                        </Text>
                        <Text style={{ fontSize: 13, color: '#374151' }}>
                            {location.address}
                        </Text>
                    </View>
                )}

                {/* Distance from current location */}
                {distance !== null && (
                    <View style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', marginBottom: 2 }}>
                            📏 Distance:
                        </Text>
                        <Text style={{ fontSize: 13, color: '#374151' }}>
                            {formatDistance(distance)}
                        </Text>
                    </View>
                )}

                {/* Coordinates */}
                <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', marginBottom: 2 }}>
                        🌐 Coordinates:
                    </Text>
                    
                    {/* Decimal coordinates */}
                    <TouchableOpacity 
                        onPress={() => copyCoordinates(
                            formatDecimalCoordinates(location.latitude, location.longitude),
                            'Decimal'
                        )}
                        style={{
                            backgroundColor: '#f3f4f6',
                            padding: 6,
                            borderRadius: 4,
                            marginBottom: 4,
                            borderWidth: 1,
                            borderColor: '#e5e7eb'
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>
                                {formatDecimalCoordinates(location.latitude, location.longitude)}
                            </Text>
                            <Text style={{ fontSize: 10, color: '#6b7280' }}>📋 Tap to copy</Text>
                        </View>
                    </TouchableOpacity>

                    {/* DMS coordinates */}
                    <TouchableOpacity 
                        onPress={() => copyCoordinates(
                            formatCoordinates(location.latitude, location.longitude),
                            'DMS'
                        )}
                        style={{
                            backgroundColor: '#f3f4f6',
                            padding: 6,
                            borderRadius: 4,
                            borderWidth: 1,
                            borderColor: '#e5e7eb'
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, color: '#374151', fontFamily: 'monospace' }}>
                                {formatCoordinates(location.latitude, location.longitude)}
                            </Text>
                            <Text style={{ fontSize: 10, color: '#6b7280' }}>📋 Tap to copy</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Timestamp */}
                {location.timestamp && (
                    <View>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', marginBottom: 2 }}>
                            🕐 Recorded:
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            {new Date(location.timestamp).toLocaleString()}
                        </Text>
                    </View>
                )}
            </View>

            {/* Action Button */}
            <TouchableOpacity
                style={{
                    backgroundColor: '#059669',
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    alignItems: 'center',
                    marginTop: 12
                }}
                onPress={() => openInMaps(location.latitude, location.longitude, plantName)}
            >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                    🗺️ Open in Maps App
                </Text>
            </TouchableOpacity>

            {/* Help text */}
            <Text style={{ 
                fontSize: 10, 
                color: '#9ca3af', 
                textAlign: 'center', 
                marginTop: 8,
                lineHeight: 12
            }}>
                💡 Tap coordinates to copy • Tap map or button to open in navigation app
            </Text>
        </View>
    );
}; 