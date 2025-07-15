import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface MedicinalObservationModalProps {
  visible: boolean;
  onClose: () => void;
  plantId: Id<"plants">;
  plantName: string;
  scientificName: string;
  onObservationAdded?: () => void;
}

// Observation types
const OBSERVATION_TYPES = [
  { value: 'personal-experience', label: 'Personal Experience', icon: '👤' },
  { value: 'traditional-knowledge', label: 'Traditional Knowledge', icon: '🏛️' },
  { value: 'scientific-research', label: 'Scientific Research', icon: '🔬' },
  { value: 'anecdotal', label: 'Anecdotal Evidence', icon: '📖' },
];

// User-friendly medicinal properties with descriptions
const USER_FRIENDLY_MEDICINAL_TAGS = [
  // Common Health Issues
  { value: 'pain-relief', label: 'Pain Relief', description: 'Helps with headaches, muscle pain, joint pain' },
  { value: 'stress-relief', label: 'Stress Relief', description: 'Calms nerves, reduces anxiety, helps you relax' },
  { value: 'sleep-aid', label: 'Sleep Aid', description: 'Helps you fall asleep and sleep better' },
  { value: 'energy-boost', label: 'Energy Boost', description: 'Gives you more energy and vitality' },
  { value: 'immune-support', label: 'Immune Support', description: 'Helps fight colds, flu, and infections' },
  { value: 'digestive-aid', label: 'Digestive Aid', description: 'Helps with stomach problems, digestion' },
  { value: 'anti-inflammatory', label: 'Anti-inflammatory', description: 'Reduces swelling and inflammation' },
  { value: 'skin-soothing', label: 'Skin Soothing', description: 'Helps with rashes, burns, skin irritation' },
  { value: 'wound-healing', label: 'Wound Healing', description: 'Helps cuts, scrapes, and wounds heal faster' },
  { value: 'cough-relief', label: 'Cough Relief', description: 'Helps with coughs and throat irritation' },
  { value: 'fever-reducer', label: 'Fever Reducer', description: 'Helps lower fever and body temperature' },
  { value: 'nausea-relief', label: 'Nausea Relief', description: 'Helps with upset stomach and nausea' },
  { value: 'headache-relief', label: 'Headache Relief', description: 'Helps with headaches and migraines' },
  { value: 'mood-enhancer', label: 'Mood Enhancer', description: 'Improves mood and makes you feel better' },
  { value: 'memory-support', label: 'Memory Support', description: 'Helps with memory and concentration' },
  { value: 'heart-support', label: 'Heart Support', description: 'Good for heart health and circulation' },
  { value: 'liver-support', label: 'Liver Support', description: 'Helps detoxify and support liver health' },
  { value: 'blood-sugar-support', label: 'Blood Sugar Support', description: 'Helps regulate blood sugar levels' },
  { value: 'antioxidant', label: 'Antioxidant', description: 'Protects cells from damage, anti-aging' },
  { value: 'detoxification', label: 'Detoxification', description: 'Helps cleanse and purify the body' },
  
  // Traditional & Spiritual
  { value: 'spiritual-aid', label: 'Spiritual Aid', description: 'Used in spiritual practices and ceremonies' },
  { value: 'meditation-support', label: 'Meditation Support', description: 'Helps with meditation and mindfulness' },
  { value: 'dream-enhancing', label: 'Dream Enhancing', description: 'Affects dreams and dream recall' },
  { value: 'consciousness-expanding', label: 'Consciousness Expanding', description: 'Alters perception and awareness' },
  
  // Women's Health
  { value: 'menstrual-support', label: 'Menstrual Support', description: 'Helps with period cramps and symptoms' },
  { value: 'hormone-balance', label: 'Hormone Balance', description: 'Helps balance hormones naturally' },
  { value: 'pregnancy-support', label: 'Pregnancy Support', description: 'Supports pregnancy and childbirth' },
  
  // Additional Common Uses
  { value: 'appetite-stimulant', label: 'Appetite Stimulant', description: 'Helps increase appetite and hunger' },
  { value: 'laxative', label: 'Laxative', description: 'Helps with constipation and bowel movement' },
  { value: 'diuretic', label: 'Diuretic', description: 'Helps remove excess water from body' },
  { value: 'antiseptic', label: 'Antiseptic', description: 'Kills germs and prevents infection' },
  { value: 'moisturizing', label: 'Moisturizing', description: 'Keeps skin hydrated and soft' },
  { value: 'tonic', label: 'Tonic', description: 'General health tonic and strengthener' },
];

// Get all available medicinal tags from the backend
const useMedicinalTags = () => {
  return useQuery(api.identifyPlant.getStandardMedicinalTags);
};

export default function MedicinalObservationModal({
  visible,
  onClose,
  plantId,
  plantName,
  scientificName,
  onObservationAdded
}: MedicinalObservationModalProps) {
  const [observationTitle, setObservationTitle] = useState('');
  const [observationContent, setObservationContent] = useState('');
  const [observationType, setObservationType] = useState('personal-experience');
  const [medicinalTags, setMedicinalTags] = useState<string[]>([]);
  const [preparationMethods, setPreparationMethods] = useState<string[]>([]);
  const [partsUsed, setPartsUsed] = useState<string[]>([]);
  const [dosageNotes, setDosageNotes] = useState('');
  const [effectiveness, setEffectiveness] = useState<number | undefined>();
  const [sideEffects, setSideEffects] = useState('');
  const [contraindications, setContraindications] = useState('');
  const [sourceAttribution, setSourceAttribution] = useState('');
  const [season, setSeason] = useState('');
  const [weather, setWeather] = useState('');
  const [plantCondition, setPlantCondition] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get available tags from backend
  const availableTags = useMedicinalTags();
  
  // Action for adding observation
  const addObservation = useAction(api.identifyPlant.addMedicinalObservation);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setObservationTitle('');
      setObservationContent('');
      setObservationType('personal-experience');
      setMedicinalTags([]);
      setPreparationMethods([]);
      setPartsUsed([]);
      setDosageNotes('');
      setEffectiveness(undefined);
      setSideEffects('');
      setContraindications('');
      setSourceAttribution('');
      setSeason('');
      setWeather('');
      setPlantCondition('');
    }
  }, [visible]);

  const toggleArrayItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const handleSubmit = async () => {
    if (!observationTitle.trim() || !observationContent.trim()) {
      Alert.alert('Missing Information', 'Please provide a title and description for your observation.');
      return;
    }

    if (medicinalTags.length === 0) {
      Alert.alert('Missing Information', 'Please select at least one medicinal property.');
      return;
    }

    setIsSubmitting(true);

    try {
      await addObservation({
        plantId,
        scientificName,
        observationTitle: observationTitle.trim(),
        observationContent: observationContent.trim(),
        observationType,
        medicinalTags,
        preparationMethods: preparationMethods.length > 0 ? preparationMethods : undefined,
        partsUsed: partsUsed.length > 0 ? partsUsed : undefined,
        dosageNotes: dosageNotes.trim() || undefined,
        effectiveness: effectiveness || undefined,
        sideEffects: sideEffects.trim() || undefined,
        contraindications: contraindications.trim() || undefined,
        sourceAttribution: sourceAttribution.trim() || undefined,
        season: season.trim() || undefined,
        weather: weather.trim() || undefined,
        plantCondition: plantCondition.trim() || undefined,
      });

      Alert.alert(
        'Success!',
        'Your medicinal observation has been added successfully.',
        [{ text: 'OK', onPress: () => {
          onClose();
          onObservationAdded?.();
        }}]
      );
    } catch (error) {
      console.error('Error adding observation:', error);
      Alert.alert('Error', 'Failed to add observation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTagSelector = (
    title: string,
    items: string[],
    selectedItems: string[],
    onToggle: (item: string) => void,
    maxItems?: number
  ) => {
    // For medicinal tags, use the user-friendly version
    if (title === 'Medicinal Properties *') {
      return (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, lineHeight: 16 }}>
            Select the health benefits you've observed or learned about this plant:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
              {USER_FRIENDLY_MEDICINAL_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag.value}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 16,
                    borderWidth: 1,
                    backgroundColor: selectedItems.includes(tag.value) ? '#dcfce7' : '#f9fafb',
                    borderColor: selectedItems.includes(tag.value) ? '#16a34a' : '#e5e7eb',
                    minWidth: 120,
                    alignItems: 'center',
                  }}
                  onPress={() => onToggle(tag.value)}
                >
                  <Text style={{
                    fontSize: 12,
                    color: selectedItems.includes(tag.value) ? '#166534' : '#6b7280',
                    fontWeight: selectedItems.includes(tag.value) ? '600' : '400',
                    textAlign: 'center',
                    marginBottom: 2,
                  }}>
                    {tag.label}
                  </Text>
                  <Text style={{
                    fontSize: 10,
                    color: selectedItems.includes(tag.value) ? '#15803d' : '#9ca3af',
                    textAlign: 'center',
                    lineHeight: 12,
                  }}>
                    {tag.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>
            Scroll to see more options. Select all that apply to your experience.
          </Text>
        </View>
      );
    }

    // For other tag selectors, use the original implementation
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
          {title}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
            {(maxItems ? items.slice(0, maxItems) : items).map((item) => (
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
        </ScrollView>
        {maxItems && items.length > maxItems && (
          <Text style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>
            Scroll to see more options...
          </Text>
        )}
      </View>
    );
  };



  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={{
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
          maxHeight: '85%',
          marginTop: 20
        }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 24, marginBottom: 8 }}>📝</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#166534', textAlign: 'center' }}>
              Add Medicinal Observation
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 4 }}>
              {plantName}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
            {/* Observation Type */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Type of Observation
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {OBSERVATION_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 12,
                      borderWidth: 1,
                      backgroundColor: observationType === type.value ? '#dcfce7' : '#f9fafb',
                      borderColor: observationType === type.value ? '#16a34a' : '#e5e7eb',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    onPress={() => setObservationType(type.value)}
                  >
                    <Text style={{ fontSize: 14 }}>{type.icon}</Text>
                    <Text style={{
                      fontSize: 11,
                      color: observationType === type.value ? '#166534' : '#6b7280',
                      fontWeight: observationType === type.value ? '600' : '400',
                    }}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Title */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Title *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                }}
                placeholder="Brief title for your observation..."
                value={observationTitle}
                onChangeText={setObservationTitle}
              />
            </View>

            {/* Content */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Your Experience *
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
                placeholder="Describe what you observed or learned about this plant..."
                value={observationContent}
                onChangeText={setObservationContent}
                multiline
              />
            </View>

            {/* Medicinal Tags */}
            {renderTagSelector(
              'Medicinal Properties *',
              USER_FRIENDLY_MEDICINAL_TAGS.map(tag => tag.value),
              medicinalTags,
              (item) => toggleArrayItem(medicinalTags, item, setMedicinalTags)
            )}

            {/* Effectiveness Rating - only for personal experience */}
            {observationType === 'personal-experience' && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  How effective was it? (1-5)
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        borderWidth: 2,
                        backgroundColor: effectiveness === rating ? '#dcfce7' : '#f9fafb',
                        borderColor: effectiveness === rating ? '#16a34a' : '#e5e7eb',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      onPress={() => setEffectiveness(effectiveness === rating ? undefined : rating)}
                    >
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: effectiveness === rating ? '#166534' : '#6b7280',
                      }}>
                        {rating}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Quick Details */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Quick Details (Optional)
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  minHeight: 60,
                  textAlignVertical: 'top'
                }}
                placeholder="Preparation method, parts used, dosage, warnings, etc..."
                value={`${preparationMethods.join(', ') || ''}${partsUsed.length > 0 ? ' | Parts: ' + partsUsed.join(', ') : ''}${dosageNotes ? ' | ' + dosageNotes : ''}${sideEffects ? ' | Side effects: ' + sideEffects : ''}${contraindications ? ' | Avoid if: ' + contraindications : ''}`.trim()}
                onChangeText={(text) => {
                  // Simple parsing - users can type naturally
                  const parts = text.split('|').map(s => s.trim());
                  if (parts.length > 0) setPreparationMethods(parts[0].split(',').map(s => s.trim()).filter(s => s));
                  if (parts.length > 1 && parts[1].startsWith('Parts:')) setPartsUsed(parts[1].replace('Parts:', '').split(',').map(s => s.trim()).filter(s => s));
                  if (parts.length > 2) setDosageNotes(parts[2]);
                  if (parts.length > 3 && parts[3].startsWith('Side effects:')) setSideEffects(parts[3].replace('Side effects:', '').trim());
                  if (parts.length > 4 && parts[4].startsWith('Avoid if:')) setContraindications(parts[4].replace('Avoid if:', '').trim());
                }}
                multiline
              />
            </View>

            {/* Source */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Source (Optional)
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                }}
                placeholder="e.g., personal experience, traditional healer, research..."
                value={sourceAttribution}
                onChangeText={setSourceAttribution}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#6b7280',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#059669',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                opacity: isSubmitting ? 0.6 : 1,
              }}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  Add Observation
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
} 