import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useLocationHandler } from '../hooks/useLocationHandler';

interface PlantLocationsViewProps {
  plantId: string;
  plantName: string;
  onClose: () => void;
}

export default function PlantLocationsView({ plantId, plantName, onClose }: PlantLocationsViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  
  const { currentLocation, formatDistance, formatDecimalCoordinates } = useLocationHandler();
  const allPlants = useQuery(api.identifyPlant.getAllPlants);

  useEffect(() => {
    if (allPlants) {
      findPlantLocations();
    }
  }, [allPlants, plantId]);

  const findPlantLocations = () => {
    if (!allPlants) return;

    const plant = allPlants.find(p => p._id === plantId);
    if (!plant || !plant.allSightings) {
      setLocations([]);
      setIsLoading(false);
      return;
    }

    // Filter sightings with location data
    const sightingsWithLocation = plant.allSightings.filter((sighting: any) => 
      sighting.latitude && sighting.longitude
    );

    // Group sightings by location (within 100m radius to avoid duplicates)
    const locationGroups: any[] = [];
    
    sightingsWithLocation.forEach((sighting: any) => {
      // Check if this location is close to an existing group
      let addedToGroup = false;
      for (const group of locationGroups) {
        const distance = calculateDistance(
          group.latitude,
          group.longitude,
          sighting.latitude,
          sighting.longitude
        );
        
        if (distance < 0.1) { // Within 100m
          group.sightings.push(sighting);
          group.photoCount += 1;
          addedToGroup = true;
          break;
        }
      }
      
      if (!addedToGroup) {
        locationGroups.push({
          latitude: sighting.latitude,
          longitude: sighting.longitude,
          address: sighting.address,
          accuracy: sighting.accuracy,
          timestamp: sighting.identifiedAt,
          sightings: [sighting],
          photoCount: 1,
          firstSeen: sighting.identifiedAt,
          lastSeen: sighting.identifiedAt,
        });
      }
    });

    // Update first/last seen dates for each group
    locationGroups.forEach(group => {
      const dates = group.sightings.map((s: any) => s.identifiedAt).sort();
      group.firstSeen = dates[0];
      group.lastSeen = dates[dates.length - 1];
    });

    // Sort by most recent first
    locationGroups.sort((a, b) => b.lastSeen - a.lastSeen);
    
    setLocations(locationGroups);
    setIsLoading(false);
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const openInMaps = (latitude: number, longitude: number, address?: string) => {
    const label = address || `${plantName} location`;
    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(label)}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label)})`,
      default: `https://www.google.com/maps?q=${latitude},${longitude}`
    });

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open maps application');
    });
  };

  const renderLocationItem = ({ item, index }: { item: any; index: number }) => {
    const distanceFromUser = currentLocation ? 
      calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        item.latitude,
        item.longitude
      ) : null;

    return (
      <View style={{
        backgroundColor: 'white',
        marginHorizontal: 0,
        marginVertical: 8,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        {/* Location Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 4 }}>
              📍 Location #{index + 1}
            </Text>
            {item.address && (
              <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                {item.address}
              </Text>
            )}
            <Text style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
              {formatDecimalCoordinates(item.latitude, item.longitude)}
            </Text>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: '#059669',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
            onPress={() => openInMaps(item.latitude, item.longitude, item.address)}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>🗺️</Text>
          </TouchableOpacity>
        </View>

        {/* Location Details */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <View>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
              📸 {item.photoCount} photo{item.photoCount !== 1 ? 's' : ''}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
              📅 First seen: {new Date(item.firstSeen).toLocaleDateString()}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
              📅 Last seen: {new Date(item.lastSeen).toLocaleDateString()}
            </Text>
          </View>
          {distanceFromUser && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>
                {formatDistance(distanceFromUser)}
              </Text>
            </View>
          )}
        </View>

        {/* Accuracy Info */}
        {item.accuracy && (
          <Text style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
            📡 GPS accuracy: ±{Math.round(item.accuracy)}m
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
      }}>
        <TouchableOpacity onPress={onClose} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 18, color: '#059669' }}>✕</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937' }}>
            📍 Plant Locations
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280' }}>
            {plantName}
          </Text>
        </View>
      </View>
      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading locations...</Text>
        </View>
      ) : locations.length > 0 ? (
        <FlatList
          data={locations}
          renderItem={renderLocationItem}
          keyExtractor={(item, index) => `location-${index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 0 }}
          ListHeaderComponent={
            <View style={{ backgroundColor: 'white', marginHorizontal: 0, marginTop: 16, marginBottom: 12, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 }}>
                📊 Location Summary
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                🌿 Found in {locations.length} location{locations.length !== 1 ? 's' : ''}
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                📸 Total photos: {locations.reduce((sum, loc) => sum + loc.photoCount, 0)}
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                📅 First sighting: {new Date(Math.min(...locations.map(l => l.firstSeen))).toLocaleDateString()}
              </Text>
            </View>
          }
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 18, color: '#6b7280', textAlign: 'center', marginBottom: 8 }}>
            No location data available
          </Text>
          <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center' }}>
            This plant hasn't been photographed with location data yet
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
} 