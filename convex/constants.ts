// Predefined standardized medicinal tags - EXPANDED with anti-parasitic, purge properties, and consciousness-altering
export const STANDARD_MEDICINAL_TAGS = [
  // Immune System
  'immune-support', 'antiviral', 'antibacterial', 'antifungal', 'antimicrobial', 'antiparasitic',
  
  // Inflammation & Pain
  'anti-inflammatory', 'pain-relief', 'muscle-relaxant', 'joint-support', 'fever-reducer',
  
  // Digestive System
  'digestive-aid', 'stomach-soothing', 'nausea-relief', 'appetite-stimulant', 'liver-support', 'laxative', 'antispasmodic',
  'purgative', 'emetic', 'carminative', 'cholagogue', 'stomachic', 'antiemetic',
  
  // Respiratory System
  'respiratory-support', 'cough-suppressant', 'expectorant', 'bronchodilator', 'decongestant', 'asthma-relief',
  
  // Cardiovascular
  'heart-support', 'circulation-improvement', 'blood-pressure-support', 'cholesterol-support', 'blood-thinner',
  
  // Nervous System
  'stress-relief', 'anxiety-relief', 'sleep-aid', 'mood-enhancer', 'memory-support', 'neuroprotective', 'sedative', 'stimulant',
  
  // Consciousness & Psychedelic Properties (NEW SECTION)
  'psychedelic', 'hallucinogenic', 'vision-enhancing', 'consciousness-expanding', 'spiritual-aid', 'meditation-support',
  'dream-enhancing', 'lucid-dreaming', 'shamanic-aid', 'entheogenic', 'mystical-experience', 'frequency-raising',
  'vibration-enhancing', 'energy-clearing', 'chakra-balancing', 'third-eye-activation', 'crown-chakra-stimulant',
  
  // Skin & Wound Care
  'skin-soothing', 'wound-healing', 'antiseptic', 'moisturizing', 'anti-aging', 'anti-acne', 'scar-reduction',
  
  // Antioxidants & General Health
  'antioxidant', 'detoxification', 'energy-boost', 'adaptogenic', 'tonic', 'immunomodulator',
  
  // Women's Health
  'menstrual-support', 'hormone-balance', 'pregnancy-support', 'lactation-support', 'uterine-tonic',
  
  // Urinary System
  'diuretic', 'kidney-support', 'bladder-support', 'urinary-tract-support', 'kidney-stone-prevention',
  
  // Metabolic
  'blood-sugar-support', 'weight-management', 'metabolism-boost', 'thyroid-support', 'diabetes-support',
  
  // Anti-parasitic & Anti-microbial (ENHANCED SECTION)
  'antiparasitic', 'anthelmintic', 'vermifuge', 'anti-malarial', 'anti-protozoal', 'anti-helminthic',
  'taenifuge', 'ascaricide', 'nematicide', 'anti-amebic', 'anti-giardial',
  
  // Bone & Joint Health
  'bone-strengthening', 'joint-lubrication', 'cartilage-support', 'osteoporosis-prevention',
  
  // Eye Health
  'eye-health', 'vision-support', 'cataract-prevention', 'macular-degeneration-support',
  
  // Dental Health
  'dental-health', 'gum-support', 'tooth-strengthening', 'mouth-ulcer-relief',
  
  // Anti-cancer & Cellular Health
  'anti-cancer', 'tumor-inhibiting', 'cellular-protection', 'dna-protection',
  
  // Reproductive Health
  'fertility-support', 'libido-enhancer', 'prostate-support', 'menopause-support',
  
  // Anti-allergic
  'anti-allergic', 'histamine-reducer', 'allergy-relief', 'hay-fever-support',
  
  // Additional Traditional Properties
  'galactagogue', 'emmenagogue', 'abortifacient', 'contraceptive', 'aphrodisiac',
  'astringent', 'demulcent', 'expectorant', 'rubefacient', 'vesicant', 'caustic',
  'nervine', 'alterative', 'depurative', 'sialagogue', 'sudorific', 'diaphoretic'
];

// Standardized preparation methods
export const STANDARD_PREPARATION_METHODS = [
  'tea', 'tincture', 'poultice', 'salve', 'smoke', 'raw', 'decoction',
  'infusion', 'powder', 'capsule', 'essential-oil', 'bath', 'compress',
  'syrup', 'juice', 'extract', 'ointment', 'cream', 'liniment', 'fomentation',
  'steam-inhalation', 'gargle', 'enema', 'suppository', 'chew', 'snuff'
];

// Standardized plant parts
export const STANDARD_PLANT_PARTS = [
  'leaves', 'roots', 'bark', 'flowers', 'fruits', 'seeds', 'stems',
  'rhizome', 'bulb', 'whole-plant', 'sap', 'resin', 'berries', 'twigs',
  'buds', 'shoots', 'tubers', 'corms', 'needles', 'cones', 'pods',
  'husks', 'shells', 'kernels', 'pulp', 'juice', 'latex', 'gum'
];

// Tag normalization mapping - maps variations to standard tags
export const TAG_NORMALIZATION_MAP: { [key: string]: string } = {
  // Immune variations
  'immune booster': 'immune-support',
  'immune boosting': 'immune-support',
  'immune system support': 'immune-support',
  'immunity': 'immune-support',
  'immune enhancer': 'immune-support',
  'immunostimulant': 'immune-support',
  
  // Anti-inflammatory variations
  'anti inflammatory': 'anti-inflammatory',
  'antiinflammatory': 'anti-inflammatory',
  'inflammation reducer': 'anti-inflammatory',
  'reduces inflammation': 'anti-inflammatory',
  
  // Pain relief variations
  'pain killer': 'pain-relief',
  'painkiller': 'pain-relief',
  'analgesic': 'pain-relief',
  'pain management': 'pain-relief',
  'relieves pain': 'pain-relief',
  
  // Digestive variations
  'digestion': 'digestive-aid',
  'digestive support': 'digestive-aid',
  'stomach aid': 'stomach-soothing',
  'gastric support': 'stomach-soothing',
  'belly soother': 'stomach-soothing',
  
  // Stress & anxiety variations
  'stress reducer': 'stress-relief',
  'calming': 'stress-relief',
  'relaxing': 'stress-relief',
  'anxiolytic': 'anxiety-relief',
  'anti-anxiety': 'anxiety-relief',
  'anxiety reducer': 'anxiety-relief',
  
  // Sleep variations
  'sedative': 'sleep-aid',
  'sleep support': 'sleep-aid',
  'insomnia relief': 'sleep-aid',
  'sleep inducer': 'sleep-aid',
  
  // Skin variations
  'skin care': 'skin-soothing',
  'dermatological': 'skin-soothing',
  'topical healing': 'skin-soothing',
  'wound care': 'wound-healing',
  'cuts and scrapes': 'wound-healing',
  
  // Respiratory variations
  'lung support': 'respiratory-support',
  'breathing aid': 'respiratory-support',
  'respiratory aid': 'respiratory-support',
  'cold relief': 'respiratory-support',
  'flu relief': 'respiratory-support',
  
  // Antioxidant variations
  'anti-oxidant': 'antioxidant',
  'free radical scavenger': 'antioxidant',
  'oxidative stress': 'antioxidant',
  
  // Energy variations
  'energizing': 'energy-boost',
  'stimulant': 'energy-boost',
  'vitality': 'energy-boost',
  'stamina': 'energy-boost',
  
  // Memory variations
  'cognitive support': 'memory-support',
  'brain health': 'memory-support',
  'mental clarity': 'memory-support',
  'focus enhancement': 'memory-support',
  
  // General variations
  'antimicrobial': 'antimicrobial',
  'anti-microbial': 'antimicrobial',
  'antibacterial': 'antibacterial',
  'anti-bacterial': 'antibacterial',
  'antiviral': 'antiviral',
  'anti-viral': 'antiviral',
  'antifungal': 'antifungal',
  'anti-fungal': 'antifungal',
  
  // Anti-parasitic variations
  'anti parasitic': 'antiparasitic',
  'antiparasitic': 'antiparasitic',
  'parasite killer': 'antiparasitic',
  'worm killer': 'anthelmintic',
  'anthelmintic': 'anthelmintic',
  'vermifuge': 'vermifuge',
  'dewormer': 'anthelmintic',
  'parasite treatment': 'antiparasitic',
  'tapeworm killer': 'taenifuge',
  'roundworm killer': 'ascaricide',
  'threadworm killer': 'nematicide',
  
  // Purgative and emetic variations
  'purgative': 'purgative',
  'laxative': 'laxative',
  'purging': 'purgative',
  'emetic': 'emetic',
  'vomiting': 'emetic',
  'carminative': 'carminative',
  'gas relief': 'carminative',
  'cholagogue': 'cholagogue',
  'bile stimulant': 'cholagogue',
  'stomachic': 'stomachic',
  'stomach tonic': 'stomachic',
  'antiemetic': 'antiemetic',
  'anti vomiting': 'antiemetic',
  
  // Additional traditional properties
  'galactagogue': 'galactagogue',
  'milk production': 'galactagogue',
  'emmenagogue': 'emmenagogue',
  'menstrual stimulant': 'emmenagogue',
  'abortifacient': 'abortifacient',
  'contraceptive': 'contraceptive',
  'aphrodisiac': 'aphrodisiac',
  'astringent': 'astringent',
  'demulcent': 'demulcent',
  'soothing': 'demulcent',
  'expectorant': 'expectorant',
  'mucus expelling': 'expectorant',
  'rubefacient': 'rubefacient',
  'skin reddening': 'rubefacient',
  'vesicant': 'vesicant',
  'blistering': 'vesicant',
  'caustic': 'caustic',
  'burning': 'caustic',
  'nervine': 'nervine',
  'nerve tonic': 'nervine',
  'alterative': 'alterative',
  'blood purifier': 'alterative',
  'depurative': 'depurative',
  'sialagogue': 'sialagogue',
  'saliva stimulant': 'sialagogue',
  'sudorific': 'sudorific',
  'sweat inducing': 'sudorific',
  'diaphoretic': 'diaphoretic',
  'fever breaking': 'diaphoretic',
}; 