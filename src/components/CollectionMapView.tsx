import React, { useRef, useEffect } from 'react';
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
  _justSelected?: boolean;
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
  const markerRefs = useRef<Record<string, MapMarker | null>>({});

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

  // Highlight pin when selectedLocation changes
  useEffect(() => {
    if (selectedLocation && mapRef.current) {
      // Show callout without zooming if we're already close to the location
      const key = `${selectedLocation.latitude}_${selectedLocation.longitude}`;
      const marker = markerRefs.current[key];
      marker?.showCallout();
      
      // Only zoom if this is a new selection (not just a callout click)
      // We'll use a simple approach: only zoom on first selection or when coming from list
      if (!selectedLocation._justSelected) {
        mapRef.current.animateToRegion(
          {
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          },
          500
        );
      }
    }
  }, [selectedLocation?.latitude, selectedLocation?.longitude]);

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
          const key = `${loc.latitude}_${loc.longitude}`;
          return (
          <Marker
            key={idx}
            ref={(ref) => {
              markerRefs.current[key] = ref;
            }}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            pinColor="#059669"
          >
            <Callout
              tooltip={false}
              onPress={() => {
                if (onImagePress) {
                  onImagePress(loc);
                } else if (onSelectLocation) {
                  // Mark this as a callout click to prevent zooming
                  onSelectLocation({ ...loc, _justSelected: true });
                } else {
                  openInMaps(loc.latitude, loc.longitude, loc.plantName);
                }
              }}
            >
              <View style={{ padding: 6, maxWidth: 220 }}>
                <Text style={{ fontWeight: '600', marginBottom: 4 }}>{loc.plantName}</Text>
                {loc.plantImage && (
                  <Image
                    source={{ 
                      uri: loc.plantImage.startsWith('data:') ? loc.plantImage : 
                             loc.plantImage ? `data:image/jpeg;base64,${loc.plantImage}` : loc.plantImage
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