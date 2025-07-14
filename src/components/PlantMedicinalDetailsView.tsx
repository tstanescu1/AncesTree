import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface MedicinalDetails {
  medicinalUses: string[];
  preparationMethods: string[];
  partsUsed: string[];
  dosageNotes: string;
  sourceAttribution: string;
  userExperience: string;
}

interface PlantMedicinalDetailsViewProps {
  details: MedicinalDetails;
  onEdit?: () => void;
  showEditButton?: boolean;
}

export default function PlantMedicinalDetailsView({
  details,
  onEdit,
  showEditButton = false
}: PlantMedicinalDetailsViewProps) {
  const hasAnyDetails = details.medicinalUses?.length > 0 ||
    details.preparationMethods?.length > 0 ||
    details.partsUsed?.length > 0 ||
    details.dosageNotes ||
    details.sourceAttribution ||
    details.userExperience;

  if (!hasAnyDetails) {
    return (
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
            🌿 Medicinal Details
          </Text>
          {showEditButton && onEdit && (
            <TouchableOpacity
              style={{
                backgroundColor: '#f0fdf4',
                borderWidth: 1,
                borderColor: '#bbf7d0',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6
              }}
              onPress={onEdit}
            >
              <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600' }}>
                Add Details
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{
          backgroundColor: '#f9fafb',
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#e5e7eb'
        }}>
          <Text style={{ fontSize: 14, color: '#9ca3af', fontStyle: 'italic' }}>
            No medicinal details recorded for this sighting
          </Text>
        </View>
      </View>
    );
  }

  const renderTagList = (title: string, items: string[], color: string) => {
    if (!items || items.length === 0) return null;
    
    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
          {title}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {items.map((item, index) => (
            <View
              key={index}
              style={{
                backgroundColor: color,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: color === '#dcfce7' ? '#16a34a' : '#dbeafe'
              }}
            >
              <Text style={{
                fontSize: 12,
                color: color === '#dcfce7' ? '#166534' : '#1e40af',
                fontWeight: '500'
              }}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderTextSection = (title: string, text: string, color: string) => {
    if (!text || text.trim() === '') return null;
    
    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
          {title}
        </Text>
        <View style={{
          backgroundColor: color,
          padding: 10,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: color === '#f0fdf4' ? '#bbf7d0' : '#dbeafe'
        }}>
          <Text style={{
            fontSize: 13,
            color: color === '#f0fdf4' ? '#166534' : '#1e40af',
            lineHeight: 18
          }}>
            {text}
          </Text>
        </View>
      </View>
    );
  };

  const renderTraditionalInfo = () => {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 12 }}>
          📚 Traditional Medicine Context
        </Text>
        <View style={{
          backgroundColor: '#f0fdf4',
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#bbf7d0'
        }}>
          <Text style={{ fontSize: 13, color: '#166534', lineHeight: 18, marginBottom: 8 }}>
            <Text style={{ fontWeight: '600' }}>🌿 Traditional Use:</Text> This plant has been used in traditional medicine for centuries across various cultures.
          </Text>
          <Text style={{ fontSize: 13, color: '#166534', lineHeight: 18, marginBottom: 8 }}>
            <Text style={{ fontWeight: '600' }}>⚖️ Safety Note:</Text> Always consult with qualified healthcare providers before using any medicinal plants.
          </Text>
          <Text style={{ fontSize: 13, color: '#166534', lineHeight: 18 }}>
            <Text style={{ fontWeight: '600' }}>📖 Knowledge Source:</Text> Traditional knowledge is passed down through generations and should be respected and preserved.
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
          🌿 Medicinal Details
        </Text>
        {showEditButton && onEdit && (
          <TouchableOpacity
            style={{
              backgroundColor: '#f0fdf4',
              borderWidth: 1,
              borderColor: '#bbf7d0',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6
            }}
            onPress={onEdit}
          >
            <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600' }}>
              Edit
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={{
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0'
      }}>
        {renderTraditionalInfo()}
        {renderTagList('Medicinal Uses', details.medicinalUses, '#dcfce7')}
        {renderTagList('Preparation Methods', details.preparationMethods, '#dbeafe')}
        {renderTagList('Parts Used', details.partsUsed, '#fef3c7')}
        {renderTextSection('Dosage & Notes', details.dosageNotes, '#f0fdf4')}
        {renderTextSection('Source/Attribution', details.sourceAttribution, '#f0f9ff')}
        {renderTextSection('Your Experience', details.userExperience, '#fef7ff')}
      </View>
    </View>
  );
} 