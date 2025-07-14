import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Alert } from 'react-native';

interface MedicinalDetails {
  medicinalUses: string[];
  preparationMethods: string[];
  partsUsed: string[];
  dosageNotes: string;
  sourceAttribution: string;
  userExperience: string;
}

interface PlantMedicinalDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (details: MedicinalDetails) => void;
  initialDetails?: MedicinalDetails;
  plantName: string;
}

// Predefined options for quick selection
const COMMON_MEDICINAL_USES = [
  'immune-support', 'anti-inflammatory', 'pain-relief', 'digestive-aid',
  'respiratory-support', 'stress-relief', 'sleep-aid', 'wound-healing',
  'antiseptic', 'antioxidant', 'detoxification', 'energy-boost',
  'heart-support', 'liver-support', 'kidney-support', 'skin-soothing'
];

const COMMON_PREPARATION_METHODS = [
  'tea', 'tincture', 'poultice', 'salve', 'smoke', 'raw', 'decoction',
  'infusion', 'powder', 'capsule', 'essential-oil', 'bath', 'compress'
];

const COMMON_PARTS_USED = [
  'leaves', 'roots', 'bark', 'flowers', 'fruits', 'seeds', 'stems',
  'rhizome', 'bulb', 'whole-plant', 'sap', 'resin', 'berries'
];

export default function PlantMedicinalDetailsModal({
  visible,
  onClose,
  onSave,
  initialDetails,
  plantName
}: PlantMedicinalDetailsModalProps) {
  const [medicinalUses, setMedicinalUses] = useState<string[]>(initialDetails?.medicinalUses || []);
  const [preparationMethods, setPreparationMethods] = useState<string[]>(initialDetails?.preparationMethods || []);
  const [partsUsed, setPartsUsed] = useState<string[]>(initialDetails?.partsUsed || []);
  const [dosageNotes, setDosageNotes] = useState(initialDetails?.dosageNotes || '');
  const [sourceAttribution, setSourceAttribution] = useState(initialDetails?.sourceAttribution || '');
  const [userExperience, setUserExperience] = useState(initialDetails?.userExperience || '');

  // Reset form when modal opens with new initial details
  useEffect(() => {
    if (visible && initialDetails) {
      setMedicinalUses(initialDetails.medicinalUses || []);
      setPreparationMethods(initialDetails.preparationMethods || []);
      setPartsUsed(initialDetails.partsUsed || []);
      setDosageNotes(initialDetails.dosageNotes || '');
      setSourceAttribution(initialDetails.sourceAttribution || '');
      setUserExperience(initialDetails.userExperience || '');
    }
  }, [visible, initialDetails]);

  const toggleArrayItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const handleSave = () => {
    const details: MedicinalDetails = {
      medicinalUses,
      preparationMethods,
      partsUsed,
      dosageNotes,
      sourceAttribution,
      userExperience,
    };
    onSave(details);
    onClose();
  };

  const renderTagSelector = (
    title: string,
    items: string[],
    selectedItems: string[],
    onToggle: (item: string) => void,
    allowCustom?: boolean
  ) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map((item) => (
          <TouchableOpacity
            key={item}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              borderWidth: 1,
              backgroundColor: selectedItems.includes(item) ? '#dcfce7' : '#f9fafb',
              borderColor: selectedItems.includes(item) ? '#16a34a' : '#e5e7eb',
            }}
            onPress={() => onToggle(item)}
          >
            <Text style={{
              fontSize: 12,
              color: selectedItems.includes(item) ? '#166534' : '#6b7280',
              fontWeight: selectedItems.includes(item) ? '600' : '400',
            }}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
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
          padding: 24,
          width: '100%',
          maxWidth: 500,
          maxHeight: '90%'
        }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 24, marginBottom: 8 }}>🌿</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#166534', textAlign: 'center' }}>
              Medicinal Details
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 4 }}>
              {plantName}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            {/* Medicinal Uses */}
            {renderTagSelector(
              'Medicinal Uses',
              COMMON_MEDICINAL_USES,
              medicinalUses,
              (item) => toggleArrayItem(medicinalUses, item, setMedicinalUses)
            )}

            {/* Preparation Methods */}
            {renderTagSelector(
              'Preparation Methods',
              COMMON_PREPARATION_METHODS,
              preparationMethods,
              (item) => toggleArrayItem(preparationMethods, item, setPreparationMethods)
            )}

            {/* Parts Used */}
            {renderTagSelector(
              'Parts Used',
              COMMON_PARTS_USED,
              partsUsed,
              (item) => toggleArrayItem(partsUsed, item, setPartsUsed)
            )}

            {/* Dosage Notes */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Dosage & Notes
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  minHeight: 80,
                  textAlignVertical: 'top'
                }}
                placeholder="Traditional dosage, warnings, or preparation notes..."
                value={dosageNotes}
                onChangeText={setDosageNotes}
                multiline
              />
            </View>

            {/* Source Attribution */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Source/Attribution
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14
                }}
                placeholder="e.g., Grandmother's recipe, Shipibo tradition, local healer..."
                value={sourceAttribution}
                onChangeText={setSourceAttribution}
              />
            </View>

            {/* User Experience */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Your Experience
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  minHeight: 80,
                  textAlignVertical: 'top'
                }}
                placeholder="How did you use it? What happened? Any side effects or benefits?"
                value={userExperience}
                onChangeText={setUserExperience}
                multiline
              />
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: '#6b7280',
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={onClose}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: '#059669',
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={handleSave}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>
                Save Details
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
} 