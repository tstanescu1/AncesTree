import React from 'react';
import { View, Text, Image, ScrollView, Pressable, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import CollectionMapView from './CollectionMapView';
import SightingDetailModal from './SightingDetailModal';

interface FullscreenMapModalProps {
  filteredLocations: any[];
  selectedLocation: any;
  setSelectedLocation: (loc: any) => void;
  onClose: () => void;
  onViewPlant?: (plantId: string) => void;
}

export default function FullscreenMapModal({
  filteredLocations,
  selectedLocation,
  setSelectedLocation,
  onClose,
  onViewPlant
}: FullscreenMapModalProps) {
  const { height: screenHeight } = Dimensions.get('window');
  const [showSightingModal, setShowSightingModal] = useState(false);
  const [selectedSighting, setSelectedSighting] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to selected location in the list
  useEffect(() => {
    if (selectedLocation && scrollViewRef.current) {
      const selectedIndex = filteredLocations.findIndex(loc => 
        loc.latitude === selectedLocation.latitude && 
        loc.longitude === selectedLocation.longitude &&
        loc.plantId === selectedLocation.plantId
      );
      
      if (selectedIndex !== -1) {
        // Calculate item position more accurately
        const itemHeight = 88; // Each item is roughly 88px (80px content + 8px margin)
        const scrollViewHeight = 230; // Max height of scroll view
        
        // Calculate the target scroll position
        const targetScrollY = selectedIndex * itemHeight;
        
        // Position the item in the middle of the visible area when possible
        const idealScrollY = Math.max(0, targetScrollY - (scrollViewHeight / 2) + (itemHeight / 2));
        
        // Add a small delay to ensure the scroll view is ready
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: idealScrollY,
            animated: true
          });
        }, 100);
      }
    }
  }, [selectedLocation, filteredLocations]);

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <SafeAreaView style={{ backgroundColor: '#f0fdf4' }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb'
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#166534' }}>
            🗺️ Collection Map Explorer
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: '#059669',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Location List */}
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ marginBottom: 16 }}>
          {/* <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 12 }}>
            📍 All Locations ({filteredLocations.length})
          </Text> */}
          <ScrollView 
            ref={scrollViewRef}
            style={{ maxHeight: 230 }}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {filteredLocations.map((location, index) => (
              <Pressable
                key={index}
                style={{
                  backgroundColor: selectedLocation && 
                    selectedLocation.latitude === location.latitude && 
                    selectedLocation.longitude === location.longitude &&
                    selectedLocation.plantId === location.plantId 
                    ? '#f0fdf4' : '#f8fafc',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: selectedLocation && 
                    selectedLocation.latitude === location.latitude && 
                    selectedLocation.longitude === location.longitude &&
                    selectedLocation.plantId === location.plantId 
                    ? '#059669' : '#e2e8f0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12
                }}
                onPress={() => {
                  setSelectedLocation(location);
                }}
              >
                {/* Plant Image */}
                {location.plantImage && (
                  <Image
                    source={{ 
                      uri: (() => {
                        const photoUri = location.plantImage;
                        if (!photoUri) return '';
                        // If it's already a data URL or http URL, use as is
                        if (photoUri.startsWith('data:') || photoUri.startsWith('http')) {
                          return photoUri;
                        }
                        // Otherwise, treat as base64 and add data URL prefix
                        return `data:image/jpeg;base64,${photoUri}`;
                      })()
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 6,
                      backgroundColor: '#f3f4f6'
                    }}
                    resizeMode="cover"
                  />
                )}

                {/* Location Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                      🌿 {location.plantName}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {selectedLocation && 
                        selectedLocation.latitude === location.latitude && 
                        selectedLocation.longitude === location.longitude &&
                        selectedLocation.plantId === location.plantId && (
                        <View style={{ 
                          backgroundColor: '#059669', 
                          paddingHorizontal: 4, 
                          paddingVertical: 2, 
                          borderRadius: 4 
                        }}>
                          <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                            ✓
                          </Text>
                        </View>
                      )}
                      {location.sightingCount && location.sightingCount > 1 && (
                        <View style={{ 
                          backgroundColor: '#f59e0b', 
                          paddingHorizontal: 6, 
                          paddingVertical: 2, 
                          borderRadius: 10 
                        }}>
                          <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                            {location.sightingCount}×
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {location.address && (
                    <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }} numberOfLines={1}>
                      📍 {location.address}
                    </Text>
                  )}
                  <Text style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>
                    {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Map */}
        <View style={{ marginBottom: 20 }}>
          <CollectionMapView
            locations={filteredLocations}
            height={screenHeight * 0.559}
            onSelectLocation={setSelectedLocation}
            selectedLocation={selectedLocation}
            onImagePress={(location) => {
              setSelectedSighting(location);
              setShowSightingModal(true);
            }}
          />
        </View>
      </View>

      {/* Sighting Detail Modal */}
      <SightingDetailModal
        visible={showSightingModal}
        location={selectedSighting}
        onClose={() => {
          setShowSightingModal(false);
          setSelectedSighting(null);
        }}
        onViewPlant={(plantId) => {
          if (onViewPlant) {
            onViewPlant(plantId);
          }
          onClose();
        }}
      />
    </View>
  );
} 