import React from 'react';
import { View, Text, Image, TouchableOpacity, Modal, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { useLocationHandler } from '../hooks/useLocationHandler';

interface SightingDetailModalProps {
  visible: boolean;
  location: any;
  onClose: () => void;
  onViewPlant: (plantId: string) => void;
}

export default function SightingDetailModal({
  visible,
  location,
  onClose,
  onViewPlant
}: SightingDetailModalProps) {
  const { openInMaps, formatDecimalCoordinates } = useLocationHandler();

  if (!location) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
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
          padding: 20,
          width: '100%',
          maxWidth: 350,
          maxHeight: '80%'
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#166534' }}>
              🌿 Plant Sighting
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: '#f3f4f6',
                padding: 8,
                borderRadius: 20
              }}
            >
              <Text style={{ fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Plant Image */}
            {location.plantImage && (
              <View style={{ marginBottom: 16 }}>
                <Image
                  source={{ uri: location.plantImage }}
                  style={{
                    width: '100%',
                    height: 150,
                    borderRadius: 8,
                    backgroundColor: '#f3f4f6'
                  }}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Plant Name */}
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 4 }}>
              {location.plantName}
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', fontStyle: 'italic', marginBottom: 12 }}>
              {location.plantScientificName}
            </Text>

            {/* Medicinal Tags */}
            {location.medicinalTags && location.medicinalTags.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', marginBottom: 6 }}>
                  🌿 Medicinal Properties:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {location.medicinalTags.slice(0, 5).map((tag: string, index: number) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: '#dcfce7',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#16a34a'
                      }}
                    >
                      <Text style={{ fontSize: 10, color: '#166534', fontWeight: '500' }}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                  {location.medicinalTags.length > 5 && (
                    <View style={{
                      backgroundColor: '#f3f4f6',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#9ca3af'
                    }}>
                      <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '500' }}>
                        +{location.medicinalTags.length - 5}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Location Details */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', marginBottom: 6 }}>
                📍 Location Details:
              </Text>
              <Pressable
                onPress={() => {
                  openInMaps(
                    location.latitude,
                    location.longitude,
                    location.plantName
                  );
                }}
                style={({ pressed }) => [
                  {
                    backgroundColor: pressed ? '#f0f0f0' : 'transparent',
                    borderRadius: 6,
                    padding: 8,
                    marginTop: 4
                  }
                ]}
              >
                {location.address && (
                  <Text style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
                    {location.address}
                  </Text>
                )}
                <Text style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>
                  {formatDecimalCoordinates(location.latitude, location.longitude)}
                </Text>
                <Text style={{ fontSize: 10, color: '#059669', marginTop: 4, textAlign: 'center' }}>
                  🗺️ Tap to open in maps
                </Text>
              </Pressable>
            </View>

            {/* Timestamp */}
            {location.locationTimestamp && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', marginBottom: 4 }}>
                  🕐 Recorded:
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  {new Date(location.locationTimestamp).toLocaleString()}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#059669',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
                onPress={() => {
                  openInMaps(
                    location.latitude,
                    location.longitude,
                    location.plantName
                  );
                  onClose();
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  🗺️ Open in Maps
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#f59e0b',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
                onPress={() => {
                  if (location.plantId) {
                    onViewPlant(location.plantId);
                  }
                  onClose();
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  📖 View Plant
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
} 