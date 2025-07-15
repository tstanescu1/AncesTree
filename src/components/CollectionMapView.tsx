import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Image, Dimensions, Pressable, TouchableOpacity } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, MapMarker } from 'react-native-maps';
import { useLocationHandler } from '../hooks/useLocationHandler';

interface LocationItem {
  latitude: number;
  longitude: number;
  plantName: string;
  plantScientificName?: string;
  plantImage?: string;
  address?: string;
  locationTimestamp?: number;
  plantId?: string;
  sightingCount?: number;
  locationId?: string;
}

interface CollectionMapViewProps {
  locations: LocationItem[];
  onSelectLocation?: (loc: LocationItem) => void;
  onImagePress?: (loc: LocationItem) => void;
  height: number;
  borderRadius?: number;
  selectedLocation?: LocationItem | null;
}

export default function CollectionMapView({
  locations,
  onSelectLocation,
  onImagePress,
  height,
  borderRadius = 8,
  selectedLocation = null,
}: CollectionMapViewProps) {
  const { openInMaps } = useLocationHandler();
  const mapRef = useRef<MapView>(null);
  const markerRefs = useRef<(MapMarker | null)[]>([]);
  const [lastPinClickTime, setLastPinClickTime] = useState(0);

  if (locations.length === 0) {
    return (
      <View
        style={{
          width: '100%',
          height,
          borderRadius,
          backgroundColor: '#e5e7eb',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 16, color: '#6b7280' }}>No locations</Text>
      </View>
    );
  }

  // Center map around average coordinates
  const avgLat = locations.reduce((sum, l) => sum + l.latitude, 0) / locations.length;
  const avgLng = locations.reduce((sum, l) => sum + l.longitude, 0) / locations.length;

  // Fit map to show all markers on first render or when location list changes
  useEffect(() => {
    if (mapRef.current && locations.length > 1) {
      const coords = locations.map((l) => ({ latitude: l.latitude, longitude: l.longitude }));
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: false,
      });
    }
  }, [locations.length]);

  // Show callout first, then zoom to selected location when it changes
  useEffect(() => {
    if (selectedLocation && mapRef.current) {
      // Find the index of the selected location in the locations array
      // Consider both coordinates and plant ID for more accurate matching
      const selectedIndex = locations.findIndex(loc => {
        const coordMatch = loc.latitude === selectedLocation.latitude && 
                          loc.longitude === selectedLocation.longitude;
        const plantMatch = loc.plantId === selectedLocation.plantId;
        
        // If we have a plant ID, use it for more precise matching
        if (selectedLocation.plantId && loc.plantId) {
          return coordMatch && plantMatch;
        }
        
        // Fallback to coordinate matching only
        return coordMatch;
      });
      
      if (selectedIndex !== -1 && selectedIndex < markerRefs.current.length) {
        const marker = markerRefs.current[selectedIndex];
        
        if (marker) {
          // Show callout immediately
          marker.showCallout();
          
          // Check if this selection came from a recent pin click
          const now = Date.now();
          const isFromPinClick = (now - lastPinClickTime) < 500; // Within 500ms of a pin click
          
          // Only zoom if this is NOT from a pin click (i.e., from list or external selection)
          if (!isFromPinClick) {
            setTimeout(() => {
              mapRef.current?.animateToRegion(
                {
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                  latitudeDelta: 0.012,
                  longitudeDelta: 0.012,
                },
                500
              );
            }, 100);
          }
        }
      }
    }
  }, [selectedLocation?.latitude, selectedLocation?.longitude, selectedLocation?.plantId, locations, lastPinClickTime]);

  return (
    <View style={{ width: '100%', height, borderRadius, overflow: 'hidden' }}>
      <MapView
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        ref={mapRef}
        mapType="terrain"
        initialRegion={{
          latitude: avgLat,
          longitude: avgLng,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
      >
        {locations.map((loc, idx) => {
          return (
          <Marker
            key={loc.locationId || `${loc.plantId}_${loc.latitude}_${loc.longitude}_${idx}`}
            ref={(ref) => {
              markerRefs.current[idx] = ref;
            }}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            pinColor="#059669"
            onPress={() => {
              // Record the pin click time
              setLastPinClickTime(Date.now());
              
              // When pin is pressed, select the location
              if (onSelectLocation) {
                onSelectLocation(loc);
              }
            }}
          >
            <Callout
              tooltip={false}
              onPress={() => {
                if (onImagePress) {
                  onImagePress(loc);
                } else if (onSelectLocation) {
                  onSelectLocation(loc);
                } else {
                  openInMaps(loc.latitude, loc.longitude, loc.plantName);
                }
              }}
            >
              <View style={{ padding: 6, maxWidth: 220 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600' }}>{loc.plantName}</Text>
                  {loc.sightingCount && loc.sightingCount > 1 && (
                    <View style={{ 
                      backgroundColor: '#f59e0b', 
                      paddingHorizontal: 6, 
                      paddingVertical: 2, 
                      borderRadius: 10 
                    }}>
                      <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                        {loc.sightingCount}×
                      </Text>
                    </View>
                  )}
                </View>
                {loc.plantImage && (
                  <Image
                    source={{ 
                      uri: (() => {
                        const photoUri = loc.plantImage;
                        if (!photoUri) return '';
                        // If it's already a data URL or http URL, use as is
                        if (photoUri.startsWith('data:') || photoUri.startsWith('http')) {
                          return photoUri;
                        }
                        // Otherwise, treat as base64 and add data URL prefix
                        return `data:image/jpeg;base64,${photoUri}`;
                      })()
                    }}
                    style={{ width: 200, height: 120, borderRadius: 6, marginBottom: 4 }}
                    resizeMode="cover"
                  />
                )}
                {loc.address && <Text style={{ fontSize: 11, color: '#374151' }}>{loc.address}</Text>}
              </View>
            </Callout>
          </Marker>
          );
        })}
      </MapView>
    </View>
  );
} 