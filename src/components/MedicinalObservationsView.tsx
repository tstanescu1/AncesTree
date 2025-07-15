import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface MedicinalObservationsViewProps {
  plantId: Id<"plants">;
  onObservationUpdated?: () => void;
}

export default function MedicinalObservationsView({
  plantId,
  onObservationUpdated
}: MedicinalObservationsViewProps) {
  const [enhancingObservation, setEnhancingObservation] = useState<string | null>(null);
  
  // Queries
  const observations = useQuery(api.identifyPlant.getMedicinalObservations, { plantId });
  const observationStats = useQuery(api.identifyPlant.getObservationStats, { plantId });
  
  // Actions
  const voteOnObservation = useAction(api.identifyPlant.voteOnObservation);
  const enhanceObservation = useAction(api.identifyPlant.enhanceObservationWithAI);
  const deleteObservation = useAction(api.identifyPlant.deleteMedicinalObservation);

  const handleVote = async (observationId: Id<"medicinal_observations">, voteType: 'upvote' | 'downvote') => {
    try {
      await voteOnObservation({ observationId, voteType });
      onObservationUpdated?.();
    } catch (error) {
      console.error('Error voting on observation:', error);
      Alert.alert('Error', 'Failed to vote on observation');
    }
  };

  const handleEnhanceObservation = async (observationId: Id<"medicinal_observations">) => {
    setEnhancingObservation(observationId);
    try {
      const result = await enhanceObservation({ observationId });
      Alert.alert(
        'Enhanced!',
        'Your observation has been enhanced with AI insights.',
        [{ text: 'OK', onPress: () => onObservationUpdated?.() }]
      );
    } catch (error) {
      console.error('Error enhancing observation:', error);
      Alert.alert('Error', 'Failed to enhance observation');
    } finally {
      setEnhancingObservation(null);
    }
  };

  const handleDeleteObservation = async (observationId: Id<"medicinal_observations">) => {
    Alert.alert(
      'Delete Observation',
      'Are you sure you want to delete this observation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteObservation({ observationId });
              onObservationUpdated?.();
            } catch (error) {
              console.error('Error deleting observation:', error);
              Alert.alert('Error', 'Failed to delete observation');
            }
          }
        }
      ]
    );
  };

  const getObservationTypeIcon = (type: string) => {
    switch (type) {
      case 'personal-experience': return '👤';
      case 'traditional-knowledge': return '🏛️';
      case 'scientific-research': return '🔬';
      case 'anecdotal': return '📖';
      default: return '📝';
    }
  };

  const getObservationTypeLabel = (type: string) => {
    switch (type) {
      case 'personal-experience': return 'Personal Experience';
      case 'traditional-knowledge': return 'Traditional Knowledge';
      case 'scientific-research': return 'Scientific Research';
      case 'anecdotal': return 'Anecdotal Evidence';
      default: return 'Observation';
    }
  };

  if (!observations) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading observations...</Text>
      </View>
    );
  }

  if (observations.length === 0) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 18, color: '#6b7280', textAlign: 'center' }}>
          📝 No medicinal observations yet
        </Text>
        <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
          Be the first to share your experience with this plant!
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Statistics Header */}
      {observationStats && (
        <View style={{ 
          backgroundColor: '#f8fafc', 
          padding: 16, 
          marginBottom: 16, 
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#e2e8f0'
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
            📊 Observation Statistics
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <View style={{ alignItems: 'center', minWidth: 80 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#059669' }}>
                {observationStats.totalObservations}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Total</Text>
            </View>
            <View style={{ alignItems: 'center', minWidth: 80 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#059669' }}>
                {observationStats.averageEffectiveness.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Avg Rating</Text>
            </View>
            <View style={{ alignItems: 'center', minWidth: 80 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#059669' }}>
                {observationStats.totalUpvotes}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Upvotes</Text>
            </View>
            <View style={{ alignItems: 'center', minWidth: 80 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#059669' }}>
                {observationStats.verifiedObservations}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Verified</Text>
            </View>
          </View>
        </View>
      )}

      {/* Observations List */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {observations.map((observation) => (
          <View
            key={observation._id}
            style={{
              backgroundColor: 'white',
              padding: 16,
              marginBottom: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 16, marginRight: 6 }}>
                    {getObservationTypeIcon(observation.observationType)}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>
                    {getObservationTypeLabel(observation.observationType)}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
                  {observation.observationTitle}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                  {new Date(observation.timestamp).toLocaleDateString()}
                </Text>
                {observation.isVerified && (
                  <View style={{ 
                    backgroundColor: '#dcfce7', 
                    paddingHorizontal: 6, 
                    paddingVertical: 2, 
                    borderRadius: 4,
                    marginTop: 4
                  }}>
                    <Text style={{ fontSize: 10, color: '#166534', fontWeight: '600' }}>
                      ✓ Verified
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Content */}
            <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 12 }}>
              {observation.observationContent}
            </Text>

            {/* Medicinal Tags */}
            {observation.medicinalTags && observation.medicinalTags.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6 }}>
                  Medicinal Properties:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {observation.medicinalTags.slice(0, 6).map((tag) => (
                    <View
                      key={tag}
                      style={{
                        backgroundColor: '#f3f4f6',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#374151' }}>{tag}</Text>
                    </View>
                  ))}
                  {observation.medicinalTags.length > 6 && (
                    <View
                      style={{
                        backgroundColor: '#f3f4f6',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>
                        +{observation.medicinalTags.length - 6} more
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Effectiveness Rating */}
            {observation.effectiveness && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 }}>
                  Effectiveness Rating:
                </Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <View
                      key={rating}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: rating <= observation.effectiveness! ? '#fbbf24' : '#f3f4f6',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 10, color: rating <= observation.effectiveness! ? '#92400e' : '#9ca3af' }}>
                        ★
                      </Text>
                    </View>
                  ))}
                  <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>
                    {observation.effectiveness}/5
                  </Text>
                </View>
              </View>
            )}

            {/* Additional Details */}
            {((observation.preparationMethods && observation.preparationMethods.length > 0) || 
              (observation.partsUsed && observation.partsUsed.length > 0) || 
              observation.dosageNotes) && (
              <View style={{ marginBottom: 12, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                {observation.preparationMethods && observation.preparationMethods.length > 0 && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>
                      Preparation: {observation.preparationMethods.join(', ')}
                    </Text>
                  </View>
                )}
                {observation.partsUsed && observation.partsUsed.length > 0 && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>
                      Parts Used: {observation.partsUsed.join(', ')}
                    </Text>
                  </View>
                )}
                {observation.dosageNotes && (
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>
                      Dosage Notes:
                    </Text>
                    <Text style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
                      {observation.dosageNotes}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Safety Information */}
            {(observation.sideEffects || observation.contraindications) && (
              <View style={{ marginBottom: 12, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#dc2626', marginBottom: 6 }}>
                  ⚠️ Safety Information
                </Text>
                {observation.sideEffects && (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#dc2626' }}>
                      Side Effects:
                    </Text>
                    <Text style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
                      {observation.sideEffects}
                    </Text>
                  </View>
                )}
                {observation.contraindications && (
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#dc2626' }}>
                      Contraindications:
                    </Text>
                    <Text style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
                      {observation.contraindications}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Environmental Context */}
            {(observation.season || observation.weather || observation.plantCondition) && (
              <View style={{ marginBottom: 12, padding: 8, backgroundColor: '#f0f9ff', borderRadius: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#0369a1', marginBottom: 4 }}>
                  🌱 Environmental Context
                </Text>
                <Text style={{ fontSize: 11, color: '#374151' }}>
                  {[observation.season, observation.weather, observation.plantCondition]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
              </View>
            )}

            {/* Voting and Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => handleVote(observation._id, 'upvote')}
                >
                  <Text style={{ fontSize: 16 }}>👍</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    {observation.upvotes || 0}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => handleVote(observation._id, 'downvote')}
                >
                  <Text style={{ fontSize: 16 }}>👎</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    {observation.downvotes || 0}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    backgroundColor: '#f3f4f6',
                    borderRadius: 6,
                  }}
                  onPress={() => handleEnhanceObservation(observation._id)}
                  disabled={enhancingObservation === observation._id}
                >
                  {enhancingObservation === observation._id ? (
                    <ActivityIndicator size="small" color="#059669" />
                  ) : (
                    <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600' }}>
                      🤖 Enhance
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    backgroundColor: '#fef2f2',
                    borderRadius: 6,
                  }}
                  onPress={() => handleDeleteObservation(observation._id)}
                >
                  <Text style={{ fontSize: 11, color: '#dc2626', fontWeight: '600' }}>
                    🗑️ Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
} 