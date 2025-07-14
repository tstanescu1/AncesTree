import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface PlantEditViewProps {
  plant: any;
  onClose: () => void;
  onEditSubmitted: () => void;
}

export default function PlantEditView({ plant, onClose, onEditSubmitted }: PlantEditViewProps) {
  const [editType, setEditType] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const proposeEdit = useAction(api.identifyPlant.proposePlantEdit);

  const editTypes = [
    { key: 'scientific_name', label: 'Scientific Name', currentValue: plant.scientificName },
    { key: 'common_names', label: 'Common Names', currentValue: plant.commonNames?.join(', ') },
    { key: 'medicinal_tags', label: 'Medicinal Properties', currentValue: plant.medicinalTags?.join(', ') },
    { key: 'traditional_usage', label: 'Traditional Usage', currentValue: plant.traditionalUsage },
    { key: 'growing_conditions', label: 'Growing Conditions', currentValue: plant.growingConditions },
    { key: 'toxicity', label: 'Toxicity Information', currentValue: plant.toxicity },
  ];

  const handleSubmitEdit = async () => {
    if (!editType || !newValue.trim()) {
      Alert.alert('Error', 'Please select an edit type and provide a new value.');
      return;
    }

    setIsSubmitting(true);
    try {
      let processedValue: any = newValue.trim();
      
      // Handle array fields
      if (editType === 'common_names' || editType === 'medicinal_tags') {
        processedValue = newValue.split(',').map(item => item.trim()).filter(Boolean);
      }

      await proposeEdit({
        plantId: plant._id,
        editType: editType as any,
        newValue: processedValue,
        reason: reason.trim() || undefined,
      });

      Alert.alert(
        'Edit Submitted',
        'Your edit has been submitted for community review. Thank you for contributing!',
        [{ text: 'OK', onPress: onEditSubmitted }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit edit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentValue = () => {
    const selectedEdit = editTypes.find(et => et.key === editType);
    return selectedEdit?.currentValue || '';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
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
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937' }}>
          Edit Plant Information
        </Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Plant Info */}
        <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 8 }}>
            {plant.commonNames?.[0] || plant.scientificName}
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280' }}>
            {plant.scientificName}
          </Text>
        </View>

        {/* Edit Type Selection */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 }}>
            What would you like to edit?
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {editTypes.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  marginRight: 8,
                  marginBottom: 8,
                  backgroundColor: editType === type.key ? '#059669' : '#f3f4f6',
                }}
                onPress={() => {
                  setEditType(type.key);
                  setNewValue(type.currentValue || '');
                }}
              >
                <Text style={{
                  fontSize: 14,
                  color: editType === type.key ? 'white' : '#6b7280',
                  fontWeight: '500',
                }}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Current Value */}
        {editType && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              Current Value:
            </Text>
            <View style={{ backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                {getCurrentValue() || 'Not specified'}
              </Text>
            </View>
          </View>
        )}

        {/* New Value Input */}
        {editType && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              New Value:
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                backgroundColor: 'white',
                minHeight: 80,
              }}
              placeholder={editType === 'common_names' || editType === 'medicinal_tags' 
                ? 'Enter values separated by commas (e.g., value1, value2, value3)'
                : 'Enter new value...'
              }
              value={newValue}
              onChangeText={setNewValue}
              multiline={editType === 'traditional_usage' || editType === 'growing_conditions' || editType === 'toxicity'}
            />
          </View>
        )}

        {/* Reason for Edit */}
        {editType && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              Reason for this edit (optional):
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                backgroundColor: 'white',
                minHeight: 60,
              }}
              placeholder="Explain why this change is needed..."
              value={reason}
              onChangeText={setReason}
              multiline
            />
          </View>
        )}

        {/* Submit Button */}
        {editType && (
          <TouchableOpacity
            style={{
              backgroundColor: '#059669',
              padding: 16,
              borderRadius: 8,
              alignItems: 'center',
              opacity: isSubmitting ? 0.6 : 1,
            }}
            onPress={handleSubmitEdit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                Submit Edit for Review
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Community Guidelines */}
        <View style={{ marginTop: 24, padding: 16, backgroundColor: '#fef3c7', borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400e', marginBottom: 8 }}>
            🌿 Community Guidelines
          </Text>
          <Text style={{ fontSize: 12, color: '#92400e', lineHeight: 18 }}>
            • Scientific name changes require botanical expertise{'\n'}
            • Provide sources when possible{'\n'}
            • Be respectful of traditional knowledge{'\n'}
            • Edits are reviewed by the community{'\n'}
            • Significant changes may require expert verification
          </Text>
        </View>
      </ScrollView>
    </View>
  );
} 