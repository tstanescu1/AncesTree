import React from 'react';
import { View, Text, Image, ScrollView, Pressable, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useState } from 'react';
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
            style={{ maxHeight: 230 }}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {filteredLocations.map((location, index) => (
              <Pressable
                key={index}
                style={{
                  backgroundColor: '#f8fafc',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12
                }}
                onPress={() => {
                  // Remove the _justSelected flag to allow zooming when selecting from list
                  const { _justSelected, ...locationWithoutFlag } = location;
                  setSelectedLocation(locationWithoutFlag);
                }}
              >
                {/* Plant Image */}
                {location.plantImage && (
                  <Image
                    source={{ 
                      uri: location.plantImage.startsWith('data:') ? location.plantImage : 
                             location.plantImage ? `data:image/jpeg;base64,${location.plantImage}` : location.plantImage
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
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 2 }}>
                    🌿 {location.plantName}
                  </Text>
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
            height={screenHeight * 0.533}
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