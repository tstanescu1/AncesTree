import { useState, useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

export interface LocationData {
    latitude: number;
    longitude: number;
    address?: string;
    accuracy?: number;
    timestamp?: number;
}

export const useLocationHandler = () => {
    const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
    const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(false);

    // Check location permission status on mount
    useEffect(() => {
        checkLocationPermission();
    }, []);

    const checkLocationPermission = async () => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            setLocationPermission(status);
            return status === Location.PermissionStatus.GRANTED;
        } catch (error) {
            console.error('Error checking location permission:', error);
            return false;
        }
    };

    const requestLocationPermission = async (): Promise<boolean> => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status);
            
            if (status !== Location.PermissionStatus.GRANTED) {
                Alert.alert(
                    'Location Permission Required',
                    'This app needs location access to save where you found plants. Please enable location permissions in Settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error requesting location permission:', error);
            Alert.alert('Error', 'Failed to request location permission');
            return false;
        }
    };

    const getCurrentLocation = async (): Promise<LocationData | null> => {
        try {
            setLoadingLocation(true);
            
            const hasPermission = await checkLocationPermission() || await requestLocationPermission();
            if (!hasPermission) {
                return null;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeInterval: 1000,
                distanceInterval: 10,
            });

            const locationData: LocationData = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy || undefined,
                timestamp: location.timestamp,
            };

            // Try to get address via reverse geocoding
            try {
                const address = await Location.reverseGeocodeAsync({
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                });

                if (address.length > 0) {
                    const addr = address[0];
                    locationData.address = [
                        addr.name,
                        addr.street,
                        addr.city,
                        addr.region,
                        addr.country
                    ].filter(Boolean).join(', ');
                }
            } catch (geocodeError) {
                console.warn('Reverse geocoding failed:', geocodeError);
            }

            setCurrentLocation(locationData);
            return locationData;

        } catch (error) {
            console.error('Error getting current location:', error);
            Alert.alert(
                'Location Error',
                'Failed to get current location. Please make sure location services are enabled and try again.'
            );
            return null;
        } finally {
            setLoadingLocation(false);
        }
    };

    const formatCoordinates = (lat: number, lng: number): string => {
        const formatCoord = (coord: number, isLat: boolean) => {
            const abs = Math.abs(coord);
            const degrees = Math.floor(abs);
            const minutes = Math.floor((abs - degrees) * 60);
            const seconds = ((abs - degrees - minutes / 60) * 3600).toFixed(1);
            const direction = coord >= 0 ? (isLat ? 'N' : 'E') : (isLat ? 'S' : 'W');
            return `${degrees}°${minutes}'${seconds}"${direction}`;
        };

        return `${formatCoord(lat, true)}, ${formatCoord(lng, false)}`;
    };

    const formatDecimalCoordinates = (lat: number, lng: number): string => {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    };

    const openInMaps = (lat: number, lng: number, label?: string) => {
        const url = Platform.select({
            ios: `http://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(label || 'Plant Location')}`,
            android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label || 'Plant Location')})`,
            default: `https://www.google.com/maps?q=${lat},${lng}`
        });

        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Unable to open maps application');
        });
    };

    const getDistanceFromCurrentLocation = (lat: number, lng: number): number | null => {
        if (!currentLocation) return null;
        
        const R = 6371; // Radius of Earth in kilometers
        const dLat = (lat - currentLocation.latitude) * Math.PI / 180;
        const dLng = (lng - currentLocation.longitude) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(currentLocation.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in kilometers
    };

    const formatDistance = (distanceKm: number): string => {
        if (distanceKm < 1) {
            return `${Math.round(distanceKm * 1000)}m away`;
        } else if (distanceKm < 10) {
            return `${distanceKm.toFixed(1)}km away`;
        } else {
            return `${Math.round(distanceKm)}km away`;
        }
    };

    return {
        currentLocation,
        locationPermission,
        loadingLocation,
        checkLocationPermission,
        requestLocationPermission,
        getCurrentLocation,
        formatCoordinates,
        formatDecimalCoordinates,
        openInMaps,
        getDistanceFromCurrentLocation,
        formatDistance
    };
}; 