import { action, internalMutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * identifyPlant
 * -------------
 * Args:
 *   base64 – a Base-64 image string from React Native.
 *
 * Flow:
 *   1. Send the image to Plant.id.
 *   2. Parse the best match.
 *   3. Upsert the species into `plants`.
 *   4. Record the sighting in `sightings`.
 *   5. Return minimal info to the client.
 */
/**
 * NOTE: This is implemented as a mutation() even though it performs external I/O
 * (calls the Plant.id API). Convex recommends putting slow/external logic inside
 * `action()` functions, and separating DB logic via `internalMutation()`.
 *
 * For simplicity in the MVP, this function does both:
 * - Sends image to Plant.id API
 * - Parses result
 * - Inserts plant and sighting directly into Convex DB
 *
 * ⚠️ In the future, consider refactoring this to:
 * - action(): for the API call to Plant.id
 * - internalMutation(): for storing the result
 * This will improve retryability, separation of concerns, and align with Convex best practices.
 */

// Predefined standardized medicinal tags
const STANDARD_MEDICINAL_TAGS = [
  // Immune System
  'immune-support', 'antiviral', 'antibacterial', 'antifungal', 'antimicrobial',
  
  // Inflammation & Pain
  'anti-inflammatory', 'pain-relief', 'muscle-relaxant', 'joint-support',
  
  // Digestive System
  'digestive-aid', 'stomach-soothing', 'nausea-relief', 'appetite-stimulant', 'liver-support',
  
  // Respiratory System
  'respiratory-support', 'cough-suppressant', 'expectorant', 'bronchodilator', 'decongestant',
  
  // Cardiovascular
  'heart-support', 'circulation-improvement', 'blood-pressure-support', 'cholesterol-support',
  
  // Nervous System
  'stress-relief', 'anxiety-relief', 'sleep-aid', 'mood-enhancer', 'memory-support', 'neuroprotective',
  
  // Skin & Wound Care
  'skin-soothing', 'wound-healing', 'antiseptic', 'moisturizing', 'anti-aging',
  
  // Antioxidants & General Health
  'antioxidant', 'detoxification', 'energy-boost', 'adaptogenic', 'tonic',
  
  // Women's Health
  'menstrual-support', 'hormone-balance', 'pregnancy-support', 'lactation-support',
  
  // Urinary System
  'diuretic', 'kidney-support', 'bladder-support', 'urinary-tract-support',
  
  // Metabolic
  'blood-sugar-support', 'weight-management', 'metabolism-boost', 'thyroid-support'
];

// Tag normalization mapping - maps variations to standard tags
const TAG_NORMALIZATION_MAP: { [key: string]: string } = {
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
};

// Function to normalize and standardize tags
function normalizeAndStandardizeTags(rawTags: string[]): string[] {
  const normalizedTags = new Set<string>();
  
  rawTags.forEach(tag => {
    // Clean up the tag
    const cleanTag = tag.toLowerCase().trim();
    
    // Check if it has a direct mapping
    if (TAG_NORMALIZATION_MAP[cleanTag]) {
      normalizedTags.add(TAG_NORMALIZATION_MAP[cleanTag]);
      return;
    }
    
    // Check if it's already a standard tag
    if (STANDARD_MEDICINAL_TAGS.includes(cleanTag)) {
      normalizedTags.add(cleanTag);
      return;
    }
    
    // Try to find partial matches for compound variations
    const normalizedTag = findBestTagMatch(cleanTag);
    if (normalizedTag) {
      normalizedTags.add(normalizedTag);
      return;
    }
    
    // If no match found, keep the original but cleaned up
    if (cleanTag && cleanTag.length > 2) {
      normalizedTags.add(cleanTag.replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-'));
    }
  });
  
  return Array.from(normalizedTags);
}

// Function to find the best matching standard tag
function findBestTagMatch(tag: string): string | null {
  // Look for key words that might indicate a standard tag
  const keywordMappings: { [key: string]: string } = {
    'immune': 'immune-support',
    'inflammat': 'anti-inflammatory',
    'pain': 'pain-relief',
    'digest': 'digestive-aid',
    'stomach': 'stomach-soothing',
    'stress': 'stress-relief',
    'anxiety': 'anxiety-relief',
    'sleep': 'sleep-aid',
    'skin': 'skin-soothing',
    'wound': 'wound-healing',
    'respiratory': 'respiratory-support',
    'lung': 'respiratory-support',
    'cough': 'cough-suppressant',
    'heart': 'heart-support',
    'circulation': 'circulation-improvement',
    'memory': 'memory-support',
    'brain': 'memory-support',
    'energy': 'energy-boost',
    'antioxidant': 'antioxidant',
    'detox': 'detoxification',
    'liver': 'liver-support',
    'kidney': 'kidney-support',
    'blood': 'circulation-improvement',
  };
  
  for (const [keyword, standardTag] of Object.entries(keywordMappings)) {
    if (tag.includes(keyword)) {
      return standardTag;
    }
  }
  
  return null;
}

// Updated function to extract medicinal properties with standardization
async function extractMedicinalProperties(scientificName: string, description: string): Promise<string[]> {
  console.log(`🔍 Extracting medicinal properties for: ${scientificName}`);
  console.log(`📝 Description provided: ${description.substring(0, 100)}...`);

  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('sk-proj-kJmPBD')) {
      console.log("🌿 OpenAI API key not available, cannot extract medicinal properties for:", scientificName);
      // Return empty array - don't make up fake properties
      return [];
    }

    // Create a prompt that encourages standard tags
    const standardTagsList = STANDARD_MEDICINAL_TAGS.join(', ');

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a botanical expert. Extract medicinal properties and return them as a JSON array of strings.

PREFERRED STANDARD TAGS (use these when possible):
${standardTagsList}

Guidelines:
- Use standard tags from the list above when applicable
- Use hyphens instead of spaces (e.g., "anti-inflammatory" not "anti inflammatory")
- Be specific but concise
- Return only 3-6 most relevant properties
- Return ONLY a JSON array, nothing else

Example: ["anti-inflammatory", "digestive-aid", "immune-support"]`
          },
          {
            role: "user",
            content: `Plant: ${scientificName}\nDescription: ${description}\n\nExtract medicinal properties as a JSON array of standardized tags.`
          }
        ],
        temperature: 0.2, // Lower temperature for more consistent output
        max_tokens: 150
      }),
    });

    const data = await response.json();
    console.log(`🤖 OpenAI Response:`, JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error(`❌ OpenAI API Error:`, data);
      return []; // Don't make up properties on API error
    }

    try {
      const content = data.choices[0].message.content;
      console.log(`📦 Raw OpenAI content:`, content);
      
      // Some models wrap JSON in markdown code fences. Strip them if present.
      let jsonString = content.trim();
      if (jsonString.startsWith("```")) {
        // Remove first ``` and optional language identifier
        jsonString = jsonString.replace(/^```[a-zA-Z]*\n?/, "");
        // Remove trailing ```
        jsonString = jsonString.replace(/```$/, "");
      }
      const rawProperties = JSON.parse(jsonString);
      console.log(`✅ Extracted raw properties:`, rawProperties);
      
      if (!Array.isArray(rawProperties)) {
        console.warn(`⚠️ OpenAI returned non-array:`, rawProperties);
        return []; // Don't make up properties on parse error
      }
      
      // Normalize and standardize the tags
      const standardizedTags = normalizeAndStandardizeTags(rawProperties);
      console.log(`🏷️ Standardized tags:`, standardizedTags);
      
      return standardizedTags;
    } catch (parseError) {
      console.error(`❌ Failed to parse OpenAI response:`, parseError);
      return []; // Don't make up properties on parse error
    }
  } catch (error) {
    console.error(`❌ Error calling OpenAI:`, error);
    return []; // Don't make up properties on network error
  }
}

// Function to get all standardized medicinal tags for UI
export const getStandardMedicinalTags = query({
  args: {},
  
  handler: async (ctx) => {
    return STANDARD_MEDICINAL_TAGS.sort();
  },
});

// Function to clean up existing tags in the database
export const standardizeExistingTags = action({
  args: {},
  
  handler: async (ctx): Promise<{ updatedCount: number; totalPlants: number }> => {
    const plants: any[] = await ctx.runQuery(api.identifyPlant.getAllPlants);
    let updatedCount = 0;
    
    for (const plant of plants) {
      if (plant.medicinalTags && plant.medicinalTags.length > 0) {
        const standardizedTags = normalizeAndStandardizeTags(plant.medicinalTags);
        
        // Only update if tags actually changed
        if (JSON.stringify(standardizedTags.sort()) !== JSON.stringify(plant.medicinalTags.sort())) {
          await ctx.runMutation(internal.identifyPlant.updatePlantTagsInternal, {
            plantId: plant._id,
            tags: standardizedTags,
          });
          updatedCount++;
          console.log(`🏷️ Updated tags for ${plant.scientificName}: ${plant.medicinalTags} → ${standardizedTags}`);
        }
      }
    }
    
    console.log(`✅ Standardized tags for ${updatedCount} plants`);
    return { updatedCount, totalPlants: plants?.length || 0 };
  },
});

export const identifyPlant = action({
  args: {
    base64: v.string(),
  },

  handler: async (ctx, { base64 }): Promise<{
    suggestions: Array<{
      plantId?: any;
    scientificName: string;
    commonNames: string[];
      probability: number;
      description: string;
      wikiUrl: string;
      imageUrl?: string;
      similar_images: string[];
    }>;
    isMultipleResults: boolean;
  }> => {
    /* ---------- 1. Plant.id request ---------- */
    const response = await fetch("https://api.plant.id/v2/identify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": process.env.PLANTID_API_KEY!,
      },
      body: JSON.stringify({
        images: [base64],
        modifiers: ["crops_simple"],
        plant_details: ["common_names", "wiki_description"],
      }),
    });

    const responseText = await response.text();
    console.log("Plant.id API response status:", response.status);
    console.log("Plant.id API response:", responseText);

    if (!response.ok) {
      throw new Error(`Plant.id API error: ${response.status} - ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response from Plant.id API: ${responseText}`);
    }

    if (!data?.suggestions || data.suggestions.length === 0) {
      throw new Error("No plant match found");
    }

    /* ---------- 2. Process top 5 suggestions ---------- */
    const topSuggestions = data.suggestions.slice(0, 5);
    const processedSuggestions = await Promise.all(
      topSuggestions.map(async (suggestion: any) => {
        const scientificName: string = suggestion.plant_name;
        const commonNames: string[] = suggestion.plant_details?.common_names ?? [];
        const probability: number = Math.round((suggestion.probability || 0) * 100);
        const wikiUrl: string = suggestion.plant_details?.wiki_description?.citation ?? "";
        const description: string = suggestion.plant_details?.wiki_description?.value ?? "";
        const similar_images: string[] = suggestion.similar_images?.map((img: any) => img.url) || [];

        // Check if this plant already exists in our database
        const existing = await ctx.runQuery(internal.identifyPlant.getPlantByScientificNameInternal, {
          scientificName
        });

        // Fetch additional images from web if needed
        let webImageUrl = "";
        let additionalImages: string[] = [];
        try {
          // Get primary web image
          webImageUrl = await fetchPlantImageFromWeb(scientificName);
          
          // Get additional diverse images from multiple sources
          const extraImages = await fetchMultiplePlantImages(scientificName);
          additionalImages = extraImages.filter(img => img !== webImageUrl); // Remove duplicate of main image
        } catch (error) {
          console.log(`Failed to fetch web images for ${scientificName}:`, error);
        }

        // Combine Plant.id similar_images with our web-fetched images for maximum variety
        const allSimilarImages = [
          ...similar_images, // Plant.id provided images
          ...additionalImages // Our additional web images
        ];

        // Remove duplicates and limit to 8 total images
        const uniqueSimilarImages = [...new Set(allSimilarImages)].slice(0, 8);

        return {
          plantId: existing?._id,
          scientificName,
          commonNames,
          probability,
          description: description.substring(0, 200) + (description.length > 200 ? "..." : ""),
          wikiUrl,
          imageUrl: webImageUrl || similar_images[0] || "",
          similar_images: uniqueSimilarImages,
        };
      })
    );

    return {
      suggestions: processedSuggestions,
      isMultipleResults: true,
    };
  },
});

// Helper function to fetch plant images from web
async function fetchPlantImageFromWeb(scientificName: string): Promise<string> {
  try {
    console.log(`🖼️ Fetching image for: ${scientificName}`);
    
    // Try multiple sources for plant images
    const imageSources = [
      // Wikipedia/Wikimedia Commons API
      async () => await fetchFromWikipedia(scientificName),
      // iNaturalist (high quality botanical images)
      async () => await fetchFromiNaturalist(scientificName),
      // Biodiversity Heritage Library (free plant images)
      async () => await fetchFromBHL(scientificName),
      // Improved Unsplash search
      async () => await fetchFromUnsplash(scientificName),
    ];

    // Try each source in order until we get a valid image
    for (const fetchFunction of imageSources) {
      try {
        const imageUrl = await fetchFunction();
        if (imageUrl) {
          // console.log(`✅ Found image from source: ${imageUrl}`);
          return imageUrl;
        }
      } catch (error) {
        console.log(`⚠️ Image source failed:`, error);
        continue;
      }
    }

    // Fallback to a generic plant placeholder
    return `https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop&crop=center`;
  } catch (error) {
    console.error(`❌ Error fetching image for ${scientificName}:`, error);
    return "";
  }
}

// Enhanced function to fetch multiple diverse images for a plant species
async function fetchMultiplePlantImages(scientificName: string): Promise<string[]> {
  const images: string[] = [];
  
  try {
    console.log(`🖼️ Fetching multiple images for: ${scientificName}`);
    
    // Get images from different sources in parallel
    const imagePromises = [
      fetchFromWikipedia(scientificName),
      fetchFromiNaturalist(scientificName),
      fetchFromUnsplash(scientificName),
      fetchAdditionalUnsplashImages(scientificName), // Get multiple Unsplash variants
    ];

    const results = await Promise.allSettled(imagePromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        images.push(result.value);
        // console.log(`✅ Found image from source ${index + 1}: ${result.value}`);
      }
    });

    // Remove duplicates and limit to 6 diverse images
    const uniqueImages = [...new Set(images)].slice(0, 6);
    
    console.log(`📸 Collected ${uniqueImages.length} diverse images for ${scientificName}`);
    return uniqueImages;
    
  } catch (error) {
    console.error(`❌ Error fetching multiple images for ${scientificName}:`, error);
    return [];
  }
}

// Fetch from Wikipedia/Wikimedia Commons
async function fetchFromWikipedia(scientificName: string): Promise<string> {
  try {
    // Wikipedia API to get page info
    const wikiResponse = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName)}`
    );
    
    if (wikiResponse.ok) {
      const wikiData = await wikiResponse.json();
      if (wikiData.thumbnail?.source) {
        // Get higher resolution version
        const highResUrl = wikiData.thumbnail.source.replace(/\/\d+px-/, '/400px-');
        return highResUrl;
      }
    }

    // Alternative: Use Wikimedia Commons API
    const commonsResponse = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${encodeURIComponent(scientificName)}&pithumbsize=400&origin=*`
    );
    
    if (commonsResponse.ok) {
      const commonsData = await commonsResponse.json();
      const pages = commonsData.query?.pages;
      if (pages) {
        const pageId = Object.keys(pages)[0];
        const thumbnail = pages[pageId]?.thumbnail?.source;
        if (thumbnail) {
          return thumbnail;
        }
      }
    }

    return "";
  } catch (error) {
    console.log(`Wikipedia fetch failed for ${scientificName}:`, error);
    return "";
  }
}

// Fetch from Biodiversity Heritage Library (BHL)
async function fetchFromBHL(scientificName: string): Promise<string> {
  try {
    // BHL has a public API for biodiversity images
    // This is a simplified approach - in practice you'd search their collections
    const genus = scientificName.split(' ')[0];
    const species = scientificName.split(' ')[1];
    
    if (!genus || !species) return "";
    
    // For now, return empty - BHL API requires more complex implementation
    // You could implement this with their actual API endpoints
    return "";
  } catch (error) {
    console.log(`BHL fetch failed for ${scientificName}:`, error);
    return "";
  }
}

// Fetch from iNaturalist (using their public endpoints)
async function fetchFromiNaturalist(scientificName: string): Promise<string> {
  try {
    // iNaturalist has a public API for species data
    const response = await fetch(
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&is_active=true&rank=species&per_page=1`
    );
    
    if (response.ok) {
      const data = await response.json();
      const taxon = data.results?.[0];
      if (taxon?.default_photo?.medium_url) {
        return taxon.default_photo.medium_url;
      }
      // Try square photo for consistency
      if (taxon?.default_photo?.square_url) {
        return taxon.default_photo.square_url;
      }
    }

    return "";
  } catch (error) {
    console.log(`iNaturalist fetch failed for ${scientificName}:`, error);
    return "";
  }
}

// Improved Unsplash search with better keywords
async function fetchFromUnsplash(scientificName: string): Promise<string> {
  try {
    const genus = scientificName.split(' ')[0];
    const species = scientificName.split(' ')[1];
    
    // Try different search strategies
    const searchTerms = [
      `${scientificName} plant botanical`,
      `${genus} ${species} flower`,
      `${genus} plant species`,
      `${genus} botanical illustration`,
    ];

    for (const searchTerm of searchTerms) {
      const encodedTerm = encodeURIComponent(searchTerm.replace(/\s+/g, '+'));
      const url = `https://source.unsplash.com/400x300/?${encodedTerm}`;
      
      // Test if the URL returns a valid image
      try {
        const testResponse = await fetch(url, { method: 'HEAD' });
        if (testResponse.ok) {
          return url;
        }
      } catch (testError) {
        continue;
      }
    }

    return "";
  } catch (error) {
    console.log(`Unsplash fetch failed for ${scientificName}:`, error);
    return "";
  }
}

// Fetch additional Unsplash images with different search terms for variety
async function fetchAdditionalUnsplashImages(scientificName: string): Promise<string> {
  try {
    const genus = scientificName.split(' ')[0];
    const species = scientificName.split(' ')[1];
    
    // Try more specific search terms for additional variety
    const searchTerms = [
      `${genus} ${species} leaf closeup`,
      `${genus} ${species} habitat natural`,
      `${scientificName} botanical garden`,
      `${genus} plant identification guide`,
      `${species} ${genus} wild native`,
    ];

    for (const searchTerm of searchTerms) {
      const encodedTerm = encodeURIComponent(searchTerm.replace(/\s+/g, '+'));
      const url = `https://source.unsplash.com/400x300/?${encodedTerm}`;
      
      try {
        const testResponse = await fetch(url, { method: 'HEAD' });
        if (testResponse.ok) {
          return url;
        }
      } catch (testError) {
        continue;
      }
    }

    return "";
  } catch (error) {
    console.log(`Additional Unsplash fetch failed for ${scientificName}:`, error);
    return "";
  }
}

// New function to confirm and store user's selected plant
export const confirmPlantSelection = action({
  args: {
    selectedSuggestion: v.object({
      scientificName: v.string(),
      commonNames: v.array(v.string()),
      description: v.string(),
      wikiUrl: v.string(),
      imageUrl: v.optional(v.string()),
      similar_images: v.optional(v.array(v.string())),
    }),
    userPhotoBase64: v.optional(v.string()),
    userPhotos: v.optional(v.array(v.string())),
    userFeedback: v.optional(v.string()),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      address: v.optional(v.string()),
      accuracy: v.optional(v.number()),
      timestamp: v.optional(v.number()),
    })),
    // Add medicinal details for each sighting
    medicinalDetails: v.optional(v.object({
      medicinalUses: v.optional(v.array(v.string())),
      preparationMethods: v.optional(v.array(v.string())),
      partsUsed: v.optional(v.array(v.string())),
      dosageNotes: v.optional(v.string()),
      sourceAttribution: v.optional(v.string()),
      userExperience: v.optional(v.string()),
    })),
  },

  handler: async (ctx, { selectedSuggestion, userPhotoBase64, userPhotos, userFeedback, location, medicinalDetails }): Promise<{
    plantId: any;
    scientificName: string;
    commonNames: string[];
    tags: string[];
    traditionalUsage: string;
  }> => {
    const { scientificName, commonNames, description, wikiUrl, imageUrl, similar_images } = selectedSuggestion;

    // Use OpenAI to extract medicinal properties
    const medicinalTags: string[] = await extractMedicinalProperties(scientificName, description);

    // Get traditional usage information
    const traditionalUsage: string = await extractTraditionalUsage(scientificName, description);

    // Determine which photos to save - prioritize userPhotos array if provided
    const photosToSave = userPhotos && userPhotos.length > 0 ? userPhotos : (userPhotoBase64 ? [userPhotoBase64] : []);
    
    console.log(`📸 Saving ${photosToSave.length} user photos for ${scientificName}`);
    console.log(`🗂️ Also saving ${(similar_images || []).length} preview images + main image`);
    console.log(`📍 Location data: ${location ? `${location.latitude}, ${location.longitude}` : 'None provided'}`);

    // Store the confirmed plant data with preview images and location
    const result: {
      plantId: any;
      scientificName: string;
      commonNames: string[];
      tags: string[];
      traditionalUsage: string;
    } = await ctx.runMutation(internal.identifyPlant.storePlantData, {
      scientificName,
      commonNames,
      wikiUrl,
      medicinalTags,
      traditionalUsage,
      imageUrl,
      userPhotos: photosToSave,
      similar_images: similar_images || [],
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address ?? '',
        accuracy: location.accuracy ?? 0,
        timestamp: location.timestamp ?? Date.now(),
      } : undefined,
      medicinalDetails: medicinalDetails || undefined,
    });

    // Trigger GPT extraction for advanced fields
    await ctx.runAction(api.identifyPlant.extractAndUpdateAdvancedPlantProfile, { plantId: result.plantId });

    // Store user feedback if provided
    if (userFeedback) {
      await ctx.runMutation(internal.identifyPlant.storePlantFeedback, {
        plantId: result.plantId,
        scientificName,
        feedback: userFeedback,
        timestamp: Date.now(),
      });
    }

    return result;
  },
});

// Function to get plant by scientific name (for checking if it exists)
export const getPlantByScientificName = query({
  args: { scientificName: v.string() },
  
  handler: async (ctx, { scientificName }) => {
    const plant = await ctx.db
      .query("plants")
      .withIndex("scientificName", (q) => q.eq("scientificName", scientificName))
      .unique();
    
    return plant;
  },
});

// Internal version for use within actions
export const getPlantByScientificNameInternal = internalQuery({
  args: { scientificName: v.string() },
  
  handler: async (ctx, { scientificName }) => {
    const plant = await ctx.db
      .query("plants")
      .withIndex("scientificName", (q) => q.eq("scientificName", scientificName))
      .unique();
    
    return plant;
  },
});

// Store user feedback about plant identification
export const storePlantFeedback = internalMutation({
  args: {
    plantId: v.id("plants"),
    scientificName: v.string(),
    feedback: v.string(),
    timestamp: v.number(),
  },
  
  handler: async (ctx, { plantId, scientificName, feedback, timestamp }) => {
    await ctx.db.insert("plant_feedback", {
      plantId,
      scientificName,
      feedback,
      timestamp,
    });
    
    return { success: true };
  },
});

// Function to request better identification from AI when user is not satisfied
export const requestBetterIdentification = action({
  args: {
    base64: v.string(),
    userDescription: v.string(),
    rejectedSuggestions: v.array(v.string()), // Array of scientific names that were rejected
  },

  handler: async (ctx, { base64, userDescription, rejectedSuggestions }): Promise<{
    suggestions: Array<{
      scientificName: string;
      commonNames: string[];
      probability: number;
      description: string;
      reasoning: string;
      imageUrl?: string;
    }>;
  }> => {
    console.log("🤖 Requesting better identification with AI feedback");
    
    // Use OpenAI to analyze the image with user context
    const aiAnalysis = await analyzeImageWithAI(base64, userDescription, rejectedSuggestions);
    
    return {
      suggestions: aiAnalysis.suggestions,
    };
  },
});

// Helper function to analyze image with AI when standard identification fails
async function analyzeImageWithAI(base64: string, userDescription: string, rejectedSuggestions: string[]): Promise<{
  suggestions: Array<{
    scientificName: string;
    commonNames: string[];
    probability: number;
    description: string;
    reasoning: string;
    imageUrl?: string;
  }>;
}> {
  console.log("🤖 Using OpenAI Vision API for alternative plant identification");
  
  try {
    // Call OpenAI Vision API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a world-class botanical expert with extensive knowledge of plant identification, traditional medicinal uses, regional plant varieties, and elevation-specific flora. You specialize in identifying plants that might be missed by standard plant ID databases.

CRITICAL: Respond ONLY with valid JSON in this exact format:
{
  "suggestions": [
    {
      "scientificName": "Genus species",
      "commonNames": ["Common Name 1", "Common Name 2"],
      "probability": 85,
      "description": "Brief botanical description",
      "reasoning": "Why this matches the user's description"
    }
  ]
}

Rules:
- Provide exactly 5 alternative plant species that match the image and description
- Focus on less common species, regional variants, elevation-specific plants, or young/mature stages
- Pay special attention to altitude/elevation if mentioned - many plants have specific elevation ranges
- Avoid the rejected suggestions completely
- Include confidence percentage (realistic 65-95% range)
- Prioritize medicinal/edible plants if relevant to description
- Consider seasonal variations, growth stages, environmental factors, and habitat specifics
- Include reasoning that references specific visual features and/or environmental factors`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please identify this plant based on the image and my detailed description: "${userDescription}"

The following species were already suggested but don't match:
${rejectedSuggestions.map(name => `- ${name}`).join('\n')}

I need 5 alternative suggestions that better match my description. Focus on:
1. Species that might be confused with the rejected ones
2. Less common varieties or subspecies  
3. Plants at different growth stages or seasonal appearances
4. Regional variants, cultivars, or elevation-specific species
5. Plants with medicinal properties if mentioned in my description
6. Habitat-specific species (alpine, desert, wetland, etc.)

Pay special attention to any altitude/elevation details I've provided, as this is crucial for accurate identification.

Respond with JSON only containing exactly 5 suggestions.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1200,
        temperature: 0.2 // Lower temperature for more consistent, accurate results
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    let aiResult;
    try {
      // Some models wrap JSON in markdown code fences. Strip them if present.
      let jsonString = content.trim();
      if (jsonString.startsWith("```")) {
        // Remove first ``` and optional language identifier
        jsonString = jsonString.replace(/^```[a-zA-Z]*\n?/, "");
        // Remove trailing ```
        jsonString = jsonString.replace(/```$/, "");
      }
      aiResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error("Invalid response format from AI");
    }

    // Enhance suggestions with web images
    const enhancedSuggestions = await Promise.all(
      aiResult.suggestions.map(async (suggestion: any) => {
        let imageUrl = "";
        try {
          // Get a representative image for this species
          imageUrl = await fetchPlantImageFromWeb(suggestion.scientificName);
        } catch (error) {
          console.log(`Could not fetch image for ${suggestion.scientificName}`);
        }

        return {
          scientificName: suggestion.scientificName,
          commonNames: suggestion.commonNames || [],
          probability: Math.min(Math.max(suggestion.probability || 75, 65), 95), // Clamp between 65-95%
          description: suggestion.description || "AI-suggested alternative identification",
          reasoning: suggestion.reasoning || "Matches your description and visual characteristics",
          imageUrl: imageUrl || `https://source.unsplash.com/400x300/?${encodeURIComponent(suggestion.scientificName)},plant,botanical`
        };
      })
    );

    // Ensure we have exactly 5 suggestions (or as many as provided, up to 5)
    const finalSuggestions = enhancedSuggestions.slice(0, 5);
    
    console.log(`✅ OpenAI provided ${finalSuggestions.length} alternative suggestions`);
    return { suggestions: finalSuggestions };

  } catch (error) {
    console.error("OpenAI Vision API error:", error);
    
    // Fallback: Enhanced Plant.id search with different parameters
    console.log("🔄 Falling back to enhanced Plant.id search");
    return await fallbackToEnhancedPlantId(base64, userDescription, rejectedSuggestions);
  }
}

// Fallback function for when OpenAI is unavailable
async function fallbackToEnhancedPlantId(base64: string, userDescription: string, rejectedSuggestions: string[]): Promise<{
  suggestions: Array<{
    scientificName: string;
    commonNames: string[];
    probability: number;
    description: string;
    reasoning: string;
    imageUrl?: string;
  }>;
}> {
  try {
    // Try Plant.id with different modifiers for more diverse results
    const response = await fetch("https://api.plant.id/v2/identify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": process.env.PLANTID_API_KEY!,
      },
      body: JSON.stringify({
        images: [base64],
        modifiers: ["crops_medium", "similar_images"], // Different modifiers for alternative results
        plant_details: ["common_names", "wiki_description", "taxonomy"],
        max_results: 8 // Get more results to filter from
      }),
    });

    if (!response.ok) {
      throw new Error("Plant.id fallback failed");
    }

    const data = await response.json();
    
    if (!data?.suggestions || data.suggestions.length === 0) {
      throw new Error("No fallback suggestions found");
    }

    // Filter out rejected suggestions and process alternatives
    const filteredSuggestions = data.suggestions
      .filter((suggestion: any) => 
        !rejectedSuggestions.includes(suggestion.plant_name)
      )
      .slice(0, 5) // Take top 5 after filtering
      .map((suggestion: any) => ({
        scientificName: suggestion.plant_name,
        commonNames: suggestion.plant_details?.common_names || [],
        probability: Math.round((suggestion.probability || 0.5) * 100),
        description: (suggestion.plant_details?.wiki_description?.value || "").substring(0, 150) + "...",
        reasoning: `Alternative identification with ${Math.round((suggestion.probability || 0.5) * 100)}% confidence from enhanced search`,
        imageUrl: suggestion.similar_images?.[0]?.url || ""
      }));

    console.log(`🔄 Plant.id fallback provided ${filteredSuggestions.length} alternative suggestions`);
    return { suggestions: filteredSuggestions };

  } catch (error) {
    console.error("Fallback Plant.id search failed:", error);
    
    // Last resort: Return helpful message
    return {
      suggestions: [{
        scientificName: "Unknown species",
        commonNames: ["Unidentified plant"],
        probability: 50,
        description: "Unable to provide alternative suggestions at this time. Consider consulting a local botanist or plant identification expert.",
        reasoning: `Based on your description: "${userDescription}", this appears to be a plant not easily identified by current databases.`,
        imageUrl: ""
      }]
    };
  }
}

export const storePlantData = internalMutation({
  args: {
    scientificName: v.string(),
    commonNames: v.array(v.string()),
    wikiUrl: v.optional(v.string()),
    medicinalTags: v.array(v.string()),
    traditionalUsage: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    userPhotos: v.optional(v.array(v.string())),
    similar_images: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      address: v.string(),
      accuracy: v.number(),
      timestamp: v.number()
    })),
    pests: v.optional(v.array(v.string())),
    medicinalDetails: v.optional(v.object({
      medicinalUses: v.optional(v.array(v.string())),
      preparationMethods: v.optional(v.array(v.string())),
      partsUsed: v.optional(v.array(v.string())),
      dosageNotes: v.optional(v.string()),
      sourceAttribution: v.optional(v.string()),
      userExperience: v.optional(v.string()),
    }))
  },
  handler: async (ctx, { scientificName, commonNames, wikiUrl, medicinalTags, traditionalUsage, imageUrl, userPhotos, similar_images, description, location, pests, medicinalDetails }) => {
    /* ---------- Upsert into `plants` ---------- */
    let plantId;
    const existingPlant = await ctx.db
      .query("plants")
      .withIndex("scientificName", q => q.eq("scientificName", scientificName))
      .first();
    
    if (existingPlant) {
      // Update existing plant
      plantId = existingPlant._id;
      console.log('🔄 Updating existing plant:', scientificName);
      console.log('🐛 Pests to update:', pests);
      
      await ctx.db.patch(plantId, {
        commonNames,
        wikiUrl,
        medicinalTags,
        traditionalUsage,
        imageUrl,
        similar_images: similar_images || existingPlant.similar_images,
        pests: pests || existingPlant.pests,
      });
    } else {
      // Create new plant with all preview images
      // Combine main imageUrl with similar_images for comprehensive collection
      const allImages = imageUrl && similar_images 
        ? [imageUrl, ...similar_images.filter(img => img !== imageUrl)] // Remove duplicate of main image
        : similar_images || (imageUrl ? [imageUrl] : []);
      
      console.log(`✨ Creating new plant: ${scientificName}`);
      console.log(`📊 Total images being saved: ${allImages.length}`);
      console.log(`🖼️ Images: ${allImages.slice(0, 3).join(', ')}${allImages.length > 3 ? '...' : ''}`);
      console.log('🐛 Pests to save:', pests);
      
      // Extract advanced plant profile fields if description is available
      let advancedFields = {};
      if (description) {
        try {
          advancedFields = await extractAdvancedPlantProfileFields(scientificName, description);
          console.log(`🌱 Extracted advanced fields for ${scientificName}:`, advancedFields);
        } catch (error) {
          console.error(`❌ Failed to extract advanced fields for ${scientificName}:`, error);
        }
      }
      
      plantId = await ctx.db.insert("plants", {
        scientificName,
        commonNames,
        wikiUrl,
        medicinalTags,
        traditionalUsage,
        imageUrl,
        createdAt: Date.now(),
        similar_images: allImages,
        ...advancedFields, // Include the extracted advanced fields
        pests: pests || [], // Ensure pests is always an array
      });
    }

    /* ---------- Record sightings with all user photos, location, and medicinal details ---------- */
    const photosToProcess = userPhotos && userPhotos.length > 0 ? userPhotos : [];
    for (const photoUri of photosToProcess) {
      const sightingData: any = {
        plantId,
        photoUri,
        identifiedAt: Date.now(),
      };

      if (location && typeof location.address === 'string' && typeof location.accuracy === 'number' && typeof location.timestamp === 'number') {
        Object.assign(sightingData, {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          accuracy: location.accuracy,
          locationTimestamp: location.timestamp
        });
      }

      // Add medicinal details if provided
      if (medicinalDetails) {
        Object.assign(sightingData, {
          medicinalUses: medicinalDetails.medicinalUses || [],
          preparationMethods: medicinalDetails.preparationMethods || [],
          partsUsed: medicinalDetails.partsUsed || [],
          dosageNotes: medicinalDetails.dosageNotes || '',
          sourceAttribution: medicinalDetails.sourceAttribution || '',
          userExperience: medicinalDetails.userExperience || '',
        });
      }

      await ctx.db.insert("sightings", sightingData);
    }

    return {
      plantId,
      scientificName,
      commonNames,
      tags: medicinalTags,
      traditionalUsage: traditionalUsage || "", // Ensure we always return a string
    };
  },
});

export const getAllPlants = query({
  args: {},
  
  handler: async (ctx) => {
    const plants = await ctx.db
      .query("plants")
      .order("desc")
      .collect();
    
    // For each plant, get the most recent user photo and all sightings
    const plantsWithPhotos = await Promise.all(
      plants.map(async (plant) => {
        const allSightings = await ctx.db
          .query("sightings")
          .withIndex("plantId", (q) => q.eq("plantId", plant._id))
          .order("desc")
          .collect();
        
        // Determine the best photo to show:
        // 1. If plant.imageUrl is a user photo (starts with data:image), use it
        // 2. Otherwise, use the most recent user photo
        let displayPhoto = null;
        if (plant.imageUrl && plant.imageUrl.startsWith('data:image')) {
          // The plant's imageUrl is a user photo, so use it
          displayPhoto = plant.imageUrl;
        } else if (allSightings.length > 0) {
          // Use the most recent user photo
          displayPhoto = allSightings[0]?.photoUri || null;
        }
        
        return {
          ...plant,
          latestUserPhoto: displayPhoto,
          sightingsCount: allSightings.length,
          lastSeen: allSightings[0]?.identifiedAt,
          allSightings: allSightings, // Include all sightings for location data
        };
      })
    );
    
    return plantsWithPhotos;
  },
});

export const getPlantById = query({
  args: { plantId: v.id("plants") },
  
  handler: async (ctx, { plantId }) => {
    try {
      const plant = await ctx.db.get(plantId);
      if (!plant) {
        return { error: "Plant not found" };
      }
      
      // Get all sightings for this plant
      const sightings = await ctx.db
        .query("sightings")
        .withIndex("plantId", (q) => q.eq("plantId", plantId))
        .order("desc")
        .collect();
      
      return {
        ...plant,
        sightingsCount: sightings.length,
        lastSeen: sightings[0]?.identifiedAt,
        allSightings: sightings,
        userPhotos: sightings.map(s => s.photoUri).filter(uri => uri), // All user photos for backward compatibility
      };
    } catch (error) {
      console.error("Error fetching plant:", error);
      return { error: "Failed to fetch plant details" };
    }
  },
});

export const getPlantDetailsByName = query({
  args: { scientificName: v.string() },
  
  handler: async (ctx, { scientificName }) => {
    const plant = await ctx.db
      .query("plants")
      .withIndex("scientificName", (q) => q.eq("scientificName", scientificName))
      .unique();
    
    if (!plant) throw new Error("Plant not found");
    
    // Get all sightings for this plant
    const sightings = await ctx.db
      .query("sightings")
      .withIndex("plantId", (q) => q.eq("plantId", plant._id))
      .order("desc")
      .collect();
    
    return {
      ...plant,
      sightingsCount: sightings.length,
      lastSeen: sightings[0]?.identifiedAt,
      allSightings: sightings,
      userPhotos: sightings.map(s => s.photoUri).filter(uri => uri), // All user photos for backward compatibility
    };
  },
});

// ADMIN FUNCTIONS - For development/admin use only
export const deletePlant = internalMutation({
  args: { plantId: v.id("plants") },
  
  handler: async (ctx, { plantId }) => {
    try {
      // Check if plant exists first
      const plant = await ctx.db.get(plantId);
      if (!plant) {
        console.log(`Plant ${plantId} not found, skipping deletion`);
        return { success: true, message: "Plant not found" };
      }

      // First delete all sightings for this plant
      const sightings = await ctx.db
        .query("sightings")
        .withIndex("plantId", (q) => q.eq("plantId", plantId))
        .collect();
      
      for (const sighting of sightings) {
        try {
          await ctx.db.delete(sighting._id);
        } catch (error) {
          console.log(`Sighting ${sighting._id} already deleted, skipping`);
        }
      }
      
      // Then delete the plant
      await ctx.db.delete(plantId);
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting plant:", error);
      return { success: false, error: String(error) };
    }
  },
});

export const deleteSpecificSighting = internalMutation({
  args: { sightingId: v.id("sightings") },
  
  handler: async (ctx, { sightingId }) => {
    try {
      // Check if sighting exists first
      const sighting = await ctx.db.get(sightingId);
      if (!sighting) {
        console.log(`Sighting ${sightingId} not found, skipping deletion`);
        return { success: true, message: "Sighting not found" };
      }

      await ctx.db.delete(sightingId);
      return { success: true };
    } catch (error) {
      console.error("Error deleting sighting:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});

export const adminDeletePlant = action({
  args: { plantId: v.string() },
  
  handler: async (ctx, { plantId }): Promise<{ success: boolean }> => {
    return await ctx.runMutation(internal.identifyPlant.deletePlant, {
      plantId: plantId as any,
    });
  },
});

// Add photo directly to existing plant (no API verification needed)
export const addPhotoToExistingPlant = action({
  args: {
    plantId: v.id("plants"),
    userPhotoBase64: v.string(),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      address: v.optional(v.string()),
      accuracy: v.optional(v.number()),
      timestamp: v.optional(v.number()),
    })),
  },
  
  handler: async (ctx, { plantId, userPhotoBase64, location }) => {
    console.log('🔍 addPhotoToExistingPlant called with:', {
      plantId: plantId,
      hasPhoto: !!userPhotoBase64,
      hasLocation: !!location,
      location: location
    });
    
    // Simply add a new sighting for this existing plant with location data
    const result = await ctx.runMutation(internal.identifyPlant.addSightingToPlant, {
      plantId,
      userPhotoBase64,
      location,
    });
    
    console.log('✅ addPhotoToExistingPlant completed successfully');
    return { success: true };
  },
});

// Internal mutation to add sighting to existing plant
export const addSightingToPlant = internalMutation({
  args: {
    plantId: v.id("plants"),
    userPhotoBase64: v.string(),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      address: v.optional(v.string()),
      accuracy: v.optional(v.number()),
      timestamp: v.optional(v.number()),
    })),
  },
  
  handler: async (ctx, { plantId, userPhotoBase64, location }) => {
    console.log('🔍 addSightingToPlant called with:', {
      plantId: plantId,
      hasPhoto: !!userPhotoBase64,
      hasLocation: !!location,
      location: location
    });
    
    // Prepare the sighting data
    const sightingData: any = {
      plantId,
      photoUri: `data:image/jpeg;base64,${userPhotoBase64}`,
      identifiedAt: Date.now(),
    };
    
    // Include location data if provided
    if (location) {
      console.log('📍 Adding location data to sighting:', {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        accuracy: location.accuracy,
        locationTimestamp: location.timestamp,
      });
      
      sightingData.latitude = location.latitude;
      sightingData.longitude = location.longitude;
      sightingData.address = location.address;
      sightingData.accuracy = location.accuracy;
      sightingData.locationTimestamp = location.timestamp;
    } else {
      console.log('⚠️ No location data provided to addSightingToPlant');
    }
    
    console.log('💾 Final sighting data to be saved:', JSON.stringify(sightingData, null, 2));
    
    // Record new sighting with user photo and location data
    const sightingId = await ctx.db.insert("sightings", sightingData);
    
    console.log(`✅ Sighting saved with ID: ${sightingId}`);
    console.log(`📍 Added sighting with location: ${location ? `${location.latitude}, ${location.longitude}` : 'No location'}`);
    
    return { success: true };
  },
});

// Admin action to delete specific sighting
export const adminDeleteSighting = action({
  args: { sightingId: v.id("sightings") },
  
  handler: async (ctx, { sightingId }): Promise<{ success: boolean }> => {
    return await ctx.runMutation(internal.identifyPlant.deleteSpecificSighting, {
      sightingId,
    });
  },
});

export const getRecentlyIdentified = query({
  args: { limit: v.optional(v.number()) },
  
  handler: async (ctx, { limit = 5 }) => {
    const plants = await ctx.db
      .query("plants")
      .order("desc")
      .take(limit);
    
    // For each plant, get the most recent user photo
    const plantsWithPhotos = await Promise.all(
      plants.map(async (plant) => {
        const latestSighting = await ctx.db
          .query("sightings")
          .withIndex("plantId", (q) => q.eq("plantId", plant._id))
          .order("desc")
          .first();
        
        return {
          _id: plant._id,
          scientificName: plant.scientificName,
          commonNames: plant.commonNames,
          medicinalTags: plant.medicinalTags,
          latestUserPhoto: latestSighting?.photoUri || null,
          identifiedAt: plant.createdAt,
        };
      })
    );
    
    return plantsWithPhotos;
  },
});

// Enhanced identification with multiple photos for better accuracy
export const identifyPlantWithMultiplePhotos = action({
  args: {
    photos: v.array(v.string()), // Array of base64 images
  },

  handler: async (ctx, { photos }): Promise<{
    suggestions: Array<{
      plantId?: any;
    scientificName: string;
    commonNames: string[];
      probability: number;
      description: string;
      wikiUrl: string;
      imageUrl?: string;
      similar_images: string[];
    }>;
    isMultipleResults: boolean;
    confidence: string;
  }> => {
    if (photos.length === 0) {
      throw new Error("At least one photo is required");
    }

    /* ---------- 1. Plant.id request with multiple images ---------- */
    const response = await fetch("https://api.plant.id/v2/identify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": process.env.PLANTID_API_KEY!,
      },
      body: JSON.stringify({
        images: photos, // Send all photos for better identification
        modifiers: ["crops_simple"],
        plant_details: ["common_names", "wiki_description"],
      }),
    });

    const responseText = await response.text();
    console.log("Plant.id API response status:", response.status);
    console.log("Plant.id API response:", responseText);

    if (!response.ok) {
      throw new Error(`Plant.id API error: ${response.status} - ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response from Plant.id API: ${responseText}`);
    }

    if (!data?.suggestions || data.suggestions.length === 0) {
      throw new Error("No plant match found");
    }

    /* ---------- 2. Process top 5 suggestions ---------- */
    const topSuggestions = data.suggestions.slice(0, 5);
    const processedSuggestions = await Promise.all(
      topSuggestions.map(async (suggestion: any) => {
        const scientificName: string = suggestion.plant_name;
        const commonNames: string[] = suggestion.plant_details?.common_names ?? [];
        const probability: number = Math.round((suggestion.probability || 0) * 100);
        const wikiUrl: string = suggestion.plant_details?.wiki_description?.citation ?? "";
        const description: string = suggestion.plant_details?.wiki_description?.value ?? "";
        const similar_images: string[] = suggestion.similar_images?.map((img: any) => img.url) || [];

        // Check if this plant already exists in our database
        const existing = await ctx.runQuery(internal.identifyPlant.getPlantByScientificNameInternal, {
          scientificName
        });

        // Fetch additional images from web if needed
        let webImageUrl = "";
        let additionalImages: string[] = [];
        try {
          // Get primary web image
          webImageUrl = await fetchPlantImageFromWeb(scientificName);
          
          // Get additional diverse images from multiple sources
          const extraImages = await fetchMultiplePlantImages(scientificName);
          additionalImages = extraImages.filter(img => img !== webImageUrl); // Remove duplicate of main image
        } catch (error) {
          console.log(`Failed to fetch web images for ${scientificName}:`, error);
        }

        // Combine Plant.id similar_images with our web-fetched images for maximum variety
        const allSimilarImages = [
          ...similar_images, // Plant.id provided images
          ...additionalImages // Our additional web images
        ];

        // Remove duplicates and limit to 8 total images
        const uniqueSimilarImages = [...new Set(allSimilarImages)].slice(0, 8);

        return {
          plantId: existing?._id,
      scientificName,
      commonNames,
          probability,
          description: description.substring(0, 200) + (description.length > 200 ? "..." : ""),
      wikiUrl,
          imageUrl: webImageUrl || similar_images[0] || "",
          similar_images: uniqueSimilarImages,
        };
      })
    );

    const confidence: string = photos.length > 1 
      ? `High confidence (${photos.length} photos analyzed)` 
      : "Standard confidence (1 photo)";

    return {
      suggestions: processedSuggestions,
      isMultipleResults: true,
      confidence,
    };
  },
});

// Store plant data with multiple user photos
export const storePlantDataWithMultiplePhotos = internalMutation({
  args: {
    scientificName: v.string(),
    commonNames: v.array(v.string()),
    wikiUrl: v.string(),
    medicinalTags: v.array(v.string()),
    traditionalUsage: v.string(),
    imageUrl: v.optional(v.string()),
    userPhotosBase64: v.array(v.string()),
  },
  
  handler: async (ctx, { scientificName, commonNames, wikiUrl, medicinalTags, traditionalUsage, imageUrl, userPhotosBase64 }) => {
    /* ---------- Upsert into `plants` ---------- */
    const existing = await ctx.db
      .query("plants")
      .withIndex("scientificName", (q) => q.eq("scientificName", scientificName))
      .unique();

    let plantId;
    if (existing) {
      // Update existing plant with new medicinal properties and other data
      await ctx.db.patch(existing._id, {
        commonNames,
        wikiUrl,
        medicinalTags,
        traditionalUsage,
        imageUrl,
      });
      plantId = existing._id;
    } else {
      // Create new plant
      plantId = await ctx.db.insert("plants", {
          scientificName,
          commonNames,
          wikiUrl,
          medicinalTags,
          traditionalUsage,
          imageUrl,
          createdAt: Date.now(),
        });
    }

    /* ---------- Record sightings for each photo ---------- */
    for (const photo of userPhotosBase64) {
      await ctx.db.insert("sightings", {
        plantId,
        photoUri: `data:image/jpeg;base64,${photo}`,
        identifiedAt: Date.now(),
      });
    }

    return {
      plantId,
      scientificName,
      commonNames,
      tags: medicinalTags,
    };
  },
});

// Update traditional usage for a plant
export const updateTraditionalUsage = action({
  args: {
    plantId: v.id("plants"),
    traditionalUsage: v.string(),
  },
  
  handler: async (ctx, { plantId, traditionalUsage }) => {
    await ctx.runMutation(internal.identifyPlant.updateTraditionalUsageInternal, { plantId, traditionalUsage });
    return { success: true };
  },
});

// Internal mutation for updating traditional usage
export const updateTraditionalUsageInternal = internalMutation({
  args: {
    plantId: v.id("plants"),
    traditionalUsage: v.string(),
  },
  
  handler: async (ctx, { plantId, traditionalUsage }) => {
    await ctx.db.patch(plantId, { traditionalUsage });
    return { success: true };
  },
});

// Update medicinal tags for a plant
export const updatePlantTags = action({
  args: {
    plantId: v.id("plants"),
    tags: v.array(v.string()),
  },
  
  handler: async (ctx, { plantId, tags }) => {
    await ctx.runMutation(internal.identifyPlant.updatePlantTagsInternal, { plantId, tags });
    return { success: true };
  },
});

// Internal mutation for updating plant tags
export const updatePlantTagsInternal = internalMutation({
  args: {
    plantId: v.id("plants"),
    tags: v.array(v.string()),
  },
  
  handler: async (ctx, { plantId, tags }) => {
    await ctx.db.patch(plantId, { medicinalTags: tags });
    return { success: true };
  },
});

// Debug query to see exactly what's in the database
export const debugGetAllPlants = query({
  args: {},
  
  handler: async (ctx) => {
    const plants = await ctx.db
      .query("plants")
      .collect();
    
    const plantsWithSightings = await Promise.all(
      plants.map(async (plant) => {
        const sightings = await ctx.db
          .query("sightings")
          .withIndex("plantId", (q) => q.eq("plantId", plant._id))
          .collect();
        
        return {
          plantId: plant._id,
          scientificName: plant.scientificName,
          commonNames: plant.commonNames,
          sightingsCount: sightings.length,
          createdAt: plant.createdAt,
          medicinalTags: plant.medicinalTags
        };
      })
    );
    
    console.log("🔍 DEBUG: All plants in database:", JSON.stringify(plantsWithSightings, null, 2));
    return plantsWithSightings;
  },
});

// Store user rejection feedback to improve AI
export const storeRejectionFeedback = action({
  args: {
    rejectedPlantName: v.string(),
    userPhotoBase64: v.string(),
    plantIdSuggestions: v.array(v.object({
      scientificName: v.string(),
      probability: v.number(),
    })),
  },

  handler: async (ctx, { rejectedPlantName, userPhotoBase64, plantIdSuggestions }) => {
    await ctx.runMutation(internal.identifyPlant.storeRejectionFeedbackInternal, {
      rejectedPlantName,
      userPhotoBase64,
      plantIdSuggestions,
      timestamp: Date.now(),
    });
    
    return { success: true };
  },
});

// Internal mutation to store rejection feedback
export const storeRejectionFeedbackInternal = internalMutation({
  args: {
    rejectedPlantName: v.string(),
    userPhotoBase64: v.string(),
    plantIdSuggestions: v.array(v.object({
      scientificName: v.string(),
      probability: v.number(),
    })),
    timestamp: v.number(),
  },
  
  handler: async (ctx, { rejectedPlantName, userPhotoBase64, plantIdSuggestions, timestamp }) => {
    await ctx.db.insert("plant_rejections", {
      rejectedPlantName,
      userPhotoBase64,
      plantIdSuggestions,
      timestamp,
    });
    
    return { success: true };
  },
});

// Get rejection patterns to filter future suggestions
export const getRejectionPatterns = query({
  args: {},
  
  handler: async (ctx) => {
    const rejections = await ctx.db
      .query("plant_rejections")
      .collect();
    
    // Analyze which plants are most commonly rejected
    const rejectionCounts: { [key: string]: number } = {};
    
    rejections.forEach(rejection => {
      rejectionCounts[rejection.rejectedPlantName] = 
        (rejectionCounts[rejection.rejectedPlantName] || 0) + 1;
    });
    
    // Return top rejected plants (to potentially filter from future suggestions)
    const topRejected = Object.entries(rejectionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([plant, count]) => ({ plant, count }));
    
    return topRejected;
  },
});

// Enhanced identification that learns from rejections
export const identifyPlantWithLearning = action({
  args: {
    base64: v.string(),
  },

  handler: async (ctx, { base64 }): Promise<{
    suggestions: Array<{
      plantId?: any;
      scientificName: string;
      commonNames: string[];
      probability: number;
      description: string;
      wikiUrl: string;
      imageUrl?: string;
      similar_images: string[];
    }>;
    isMultipleResults: boolean;
  }> => {
    // Get standard Plant.id results
    const response = await fetch("https://api.plant.id/v2/identify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": process.env.PLANTID_API_KEY!,
      },
      body: JSON.stringify({
        images: [base64],
        modifiers: ["crops_simple"],
        plant_details: ["common_names", "wiki_description"],
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`Plant.id API error: ${response.status} - ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response from Plant.id API: ${responseText}`);
    }

    if (!data?.suggestions || data.suggestions.length === 0) {
      throw new Error("No plant match found");
    }

    // Get rejection patterns to filter suggestions
    const rejectionPatterns = await ctx.runQuery(internal.identifyPlant.getRejectionPatternsInternal);
    const frequentlyRejected = new Set(
      rejectionPatterns
        .filter((pattern: { plant: string; count: number }) => pattern.count > 3) // Plants rejected more than 3 times
        .map((pattern: { plant: string; count: number }) => pattern.plant)
    );

    // Process and filter suggestions
    const allSuggestions = data.suggestions.slice(0, 8); // Get more initially
    const filteredSuggestions = allSuggestions.filter(
      (suggestion: any) => !frequentlyRejected.has(suggestion.plant_name)
    );

    // Take top 5 after filtering
    const topSuggestions = filteredSuggestions.slice(0, 5);
    
    const processedSuggestions = await Promise.all(
      topSuggestions.map(async (suggestion: any) => {
        const scientificName: string = suggestion.plant_name;
        const commonNames: string[] = suggestion.plant_details?.common_names ?? [];
        const probability: number = Math.round((suggestion.probability || 0) * 100);
        const wikiUrl: string = suggestion.plant_details?.wiki_description?.citation ?? "";
        const description: string = suggestion.plant_details?.wiki_description?.value ?? "";
        const similar_images: string[] = suggestion.similar_images?.map((img: any) => img.url) || [];

        // Check if this plant already exists in our database
        const existing = await ctx.runQuery(internal.identifyPlant.getPlantByScientificNameInternal, {
          scientificName
        });

        // Fetch additional images from web if needed
        let webImageUrl = "";
        let additionalImages: string[] = [];
        try {
          // Get primary web image
          webImageUrl = await fetchPlantImageFromWeb(scientificName);
          
          // Get additional diverse images from multiple sources
          const extraImages = await fetchMultiplePlantImages(scientificName);
          additionalImages = extraImages.filter(img => img !== webImageUrl); // Remove duplicate of main image
        } catch (error) {
          console.log(`Failed to fetch web images for ${scientificName}:`, error);
        }

        // Combine Plant.id similar_images with our web-fetched images for maximum variety
        const allSimilarImages = [
          ...similar_images, // Plant.id provided images
          ...additionalImages // Our additional web images
        ];

        // Remove duplicates and limit to 8 total images
        const uniqueSimilarImages = [...new Set(allSimilarImages)].slice(0, 8);

        return {
          plantId: existing?._id,
          scientificName,
          commonNames,
          probability,
          description: description.substring(0, 200) + (description.length > 200 ? "..." : ""),
          wikiUrl,
          imageUrl: webImageUrl || similar_images[0] || "",
          similar_images: uniqueSimilarImages,
        };
      })
    );

    console.log(`🧠 AI Learning: Filtered out ${allSuggestions.length - topSuggestions.length} frequently rejected species`);

    return {
      suggestions: processedSuggestions,
      isMultipleResults: true,
    };
  },
});

// Internal version of getRejectionPatterns for use within actions
export const getRejectionPatternsInternal = internalQuery({
  args: {},
  
  handler: async (ctx) => {
    const rejections = await ctx.db
      .query("plant_rejections")
      .collect();
    
    // Analyze which plants are most commonly rejected
    const rejectionCounts: { [key: string]: number } = {};
    
    rejections.forEach(rejection => {
      rejectionCounts[rejection.rejectedPlantName] = 
        (rejectionCounts[rejection.rejectedPlantName] || 0) + 1;
    });
    
    // Return top rejected plants (to potentially filter from future suggestions)
    const topRejected = Object.entries(rejectionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([plant, count]) => ({ plant, count }));
    
    return topRejected;
  },
});

// Get detailed traditional usage information using OpenAI
async function extractTraditionalUsage(scientificName: string, description: string): Promise<string> {
  console.log(`🏛️ Extracting traditional usage for: ${scientificName}`);
  console.log(`📝 Description provided: ${description.substring(0, 100)}...`);

  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('sk-proj-kJmPBD')) {
      console.log("🌿 OpenAI API key not available, returning empty traditional usage for:", scientificName);
      return '';
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a botanical expert specializing in traditional plant uses. Extract ONLY traditional medicinal uses and preparation methods from the plant description. Return a well-formatted text with preparation methods and uses. If no traditional uses are mentioned, return an empty string."
          },
          {
            role: "user",
            content: `Plant: ${scientificName}\nDescription: ${description}\n\nExtract traditional medicinal uses and preparation methods. Format as readable text with sections if applicable.`
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      }),
    });

    const data = await response.json();
    console.log(`🤖 OpenAI Traditional Usage Response:`, JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error(`❌ OpenAI API Error for traditional usage:`, data);
      return '';
    }

    try {
      const content = data.choices[0].message.content;
      console.log(`📦 Raw OpenAI traditional usage content:`, content);
      
      // Return the content directly (it should be formatted text, not JSON)
      const traditionalUsage = content.trim();
      console.log(`✅ Extracted traditional usage:`, traditionalUsage);
      
      return traditionalUsage;
    } catch (parseError) {
      console.error(`❌ Failed to parse OpenAI traditional usage response:`, parseError);
      return '';
    }
  } catch (error) {
    console.error(`❌ Error calling OpenAI for traditional usage:`, error);
    return '';
  }
}

// Set default photo by reordering sightings
export const setDefaultPhoto = action({
  args: {
    plantId: v.id("plants"),
    sightingId: v.id("sightings"),
  },
  
  handler: async (ctx, { plantId, sightingId }): Promise<{ success: boolean }> => {
    return await ctx.runMutation(internal.identifyPlant.setDefaultPhotoInternal, {
      plantId,
      sightingId,
    });
  },
});

// Set database image as default photo
export const setDefaultDatabaseImage = action({
  args: {
    plantId: v.id("plants"),
    imageUrl: v.string(),
  },
  
  handler: async (ctx, { plantId, imageUrl }): Promise<{ success: boolean }> => {
    return await ctx.runMutation(internal.identifyPlant.setDefaultDatabaseImageInternal, {
      plantId,
      imageUrl,
    });
  },
});

// Internal mutation to reorder sightings to set default photo
export const setDefaultPhotoInternal = internalMutation({
  args: {
    plantId: v.id("plants"),
    sightingId: v.id("sightings"),
  },
  
  handler: async (ctx, { plantId, sightingId }): Promise<{ success: boolean }> => {
    try {
      // Get all sightings for this plant ordered by identifiedAt (newest first)
      const allSightings = await ctx.db
        .query("sightings")
        .withIndex("plantId", (q) => q.eq("plantId", plantId))
        .order("desc")
        .collect();
      
      // Find the target sighting
      const targetSighting = await ctx.db.get(sightingId);
      if (!targetSighting) {
        throw new Error("Sighting not found");
      }
      
      // Create a timestamp that's newer than all existing ones to make it first
      const newestTimestamp = Math.max(...allSightings.map(s => s.identifiedAt)) + 1000; // Add 1000ms buffer
      
      console.log(`📸 Setting new default photo for plant ${plantId}`);
      console.log(`🔄 Target sighting ${sightingId} - Old timestamp: ${targetSighting.identifiedAt}, New timestamp: ${newestTimestamp}`);
      console.log(`📊 Current order: ${allSightings.map(s => `${s._id}:${s.identifiedAt}`).join(', ')}`);
      
      // Update the target sighting to have the newest timestamp
      await ctx.db.patch(sightingId, {
        identifiedAt: newestTimestamp,
      });
      
      console.log(`✅ Successfully updated sighting ${sightingId} timestamp to ${newestTimestamp}`);
      
      // Also update the plant's imageUrl to use this sighting's photo
      const plant = await ctx.db.get(plantId);
      if (plant) {
        await ctx.db.patch(plantId, {
          imageUrl: targetSighting.photoUri,
        });
        console.log(`🖼️ Updated plant ${plantId} imageUrl to: ${targetSighting.photoUri}`);
      }
      
      // Verify the update worked
      const updatedSightings = await ctx.db
        .query("sightings")
        .withIndex("plantId", (q) => q.eq("plantId", plantId))
        .order("desc")
        .collect();
      
      console.log(`✅ New order after update: ${updatedSightings.map(s => `${s._id}:${s.identifiedAt}`).join(', ')}`);
      console.log(`✅ First sighting is now: ${updatedSightings[0]._id} (should be ${sightingId})`);
      
      return { success: true };
    } catch (error) {
      console.error(`❌ Error setting default photo:`, error);
      throw error;
    }
  },
});

// Internal mutation to set database image as default
export const setDefaultDatabaseImageInternal = internalMutation({
  args: {
    plantId: v.id("plants"),
    imageUrl: v.string(),
  },
  
  handler: async (ctx, { plantId, imageUrl }): Promise<{ success: boolean }> => {
    try {
      // Get the plant
      const plant = await ctx.db.get(plantId);
      if (!plant) {
        throw new Error("Plant not found");
      }
      
      console.log(`🖼️ Setting database image as default for plant ${plantId}`);
      console.log(`📸 Current imageUrl: ${plant.imageUrl}`);
      console.log(`📸 New default imageUrl: ${imageUrl}`);
      console.log(`🗂️ Current similar_images: ${plant.similar_images?.slice(0, 3).join(', ')}${(plant.similar_images?.length || 0) > 3 ? '...' : ''}`);
      
      // Always reorder similar_images to put the selected one first
      let reorderedImages = plant.similar_images || [];
      if (reorderedImages.includes(imageUrl)) {
        // Move the selected image to the front
        reorderedImages = [
          imageUrl,
          ...reorderedImages.filter(img => img !== imageUrl)
        ];
        console.log(`🔄 Reordered similar_images to put default first: ${reorderedImages.slice(0, 3).join(', ')}${reorderedImages.length > 3 ? '...' : ''}`);
      } else {
        // If imageUrl is not in similar_images, add it to the front
        reorderedImages = [imageUrl, ...reorderedImages];
        console.log(`➕ Added new image to front of similar_images: ${reorderedImages.slice(0, 3).join(', ')}${reorderedImages.length > 3 ? '...' : ''}`);
      }
      
      // Update the plant with the new default image and reordered images
      await ctx.db.patch(plantId, {
        imageUrl: imageUrl,
        similar_images: reorderedImages,
      });
      
      console.log(`✅ Successfully set database image as default for plant ${plantId}`);
      
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to set database image as default:`, error);
      return { success: false };
    }
  },
});

// Query to get all feedback notes for a plant
export const getPlantFeedback = query({
  args: { plantId: v.id("plants") },
  async handler(ctx, { plantId }) {
    const feedback = await ctx.db
      .query("plant_feedback")
      .withIndex("plantId", q => q.eq("plantId", plantId))
      .order("desc")
      .collect();
    return feedback;
  }
});

// Mutation to update a feedback note by _id
export const updatePlantFeedback = internalMutation({
  args: {
    feedbackId: v.id("plant_feedback"),
    feedback: v.string(),
  },
  handler: async (ctx, { feedbackId, feedback }) => {
    await ctx.db.patch(feedbackId, { feedback });
    return { success: true };
  }
});

// Public action to add feedback
export const addPlantFeedback = action({
  args: {
    plantId: v.id("plants"),
    scientificName: v.string(),
    feedback: v.string(),
    timestamp: v.number(),
  },
  handler: async (
    ctx: any,
    args: { plantId: string; scientificName: string; feedback: string; timestamp: number }
  ): Promise<{ success: boolean }> => {
    return await ctx.runMutation(internal.identifyPlant.storePlantFeedback, args);
  }
});

// Public action to update feedback
export const editPlantFeedback = action({
  args: {
    feedbackId: v.id("plant_feedback"),
    feedback: v.string(),
  },
  handler: async (
    ctx: any,
    args: { feedbackId: string; feedback: string }
  ): Promise<{ success: boolean }> => {
    return await ctx.runMutation(internal.identifyPlant.updatePlantFeedback, args);
  }
});

// Extract advanced plant profile fields using GPT-3.5-turbo
async function extractAdvancedPlantProfileFields(scientificName: string, description: string): Promise<{
  growingConditions?: string;
  seasonInfo?: string;
  companionPlants?: string[];
  propagationMethods?: string[];
  edibilityUses?: string;
  toxicity?: string;
  otherDetails?: string;
  activeCompounds?: string[];
  pests?: string[];
}> {
  console.log('🌱 Extracting advanced fields for:', scientificName);
  console.log('📝 Description provided:', description.substring(0, 100) + '...');

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.log('❌ No OpenAI API key available, skipping advanced extraction');
    return {};
  }

  try {
    console.log('🤖 Calling OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a plant expert. Extract detailed information about ${scientificName} focusing on growing conditions, seasonality, companion planting, and common pests. Format your response as a JSON object with the following fields:
- growingConditions: String describing soil, light, water, temperature requirements
- seasonInfo: String describing when to plant, grow, and harvest
- companionPlants: Array of strings with beneficial companion plants
- propagationMethods: Array of strings with propagation techniques
- edibilityUses: String describing edible parts and uses
- toxicity: String describing any toxic properties or precautions
- otherDetails: String with interesting facts, historical significance, cultural uses, ecological importance, and unique characteristics
- activeCompounds: Array of strings with key active compounds
- pests: Array of strings with common pests and diseases that affect this plant. Include both insects and diseases. For example: ["Aphids", "Spider mites", "Powdery mildew", "Botrytis"]

For otherDetails, include:
1. Historical significance and origin
2. Cultural and traditional uses
3. Ecological importance and wildlife interactions
4. Unique characteristics and adaptations
5. Interesting facts and trivia
6. Conservation status if relevant

IMPORTANT: All fields must be strings or arrays of strings. Do not use nested objects or complex structures.`
          },
          {
            role: 'user',
            content: `Extract detailed growing information for ${scientificName} based on this description: ${description}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      console.error('❌ OpenAI API error:', await response.text());
      return {};
    }

    console.log('✅ OpenAI API response received');
    const data = await response.json();
    const content = data.choices[0].message.content;
    console.log('📦 Raw OpenAI content:', content);

    try {
      const fields = JSON.parse(content);
      console.log('🔍 Parsed fields:', fields);
      console.log('🐛 Pests field:', fields.pests);
      
      // Ensure all fields are in the correct format
      const formattedFields = {
        growingConditions: typeof fields.growingConditions === 'string' ? fields.growingConditions : '',
        seasonInfo: typeof fields.seasonInfo === 'string' ? fields.seasonInfo : '',
        companionPlants: Array.isArray(fields.companionPlants) ? fields.companionPlants : [],
        propagationMethods: Array.isArray(fields.propagationMethods) ? fields.propagationMethods : [],
        edibilityUses: typeof fields.edibilityUses === 'string' ? fields.edibilityUses : '',
        toxicity: typeof fields.toxicity === 'string' ? fields.toxicity : '',
        otherDetails: typeof fields.otherDetails === 'string' ? fields.otherDetails : '',
        activeCompounds: Array.isArray(fields.activeCompounds) ? fields.activeCompounds : [],
        pests: Array.isArray(fields.pests) ? fields.pests : []
      };

      console.log('✅ Successfully parsed and formatted advanced fields:', formattedFields);
      console.log('🐛 Formatted pests field:', formattedFields.pests);
      return formattedFields;
    } catch (error) {
      console.error('❌ Error parsing OpenAI response:', error);
      return {};
    }
  } catch (error) {
    console.error('❌ Error calling OpenAI API:', error);
    return {};
  }
}

// Internal query to get plant by ID
export const getPlantByIdInternal = internalQuery({
  args: { plantId: v.id("plants") },
  handler: async (ctx, { plantId }) => {
    try {
      const plant = await ctx.db.get(plantId);
      if (!plant) {
        console.log(`❌ Plant not found with ID: ${plantId}`);
        return null;
      }
      
      console.log(`✅ Found plant: ${plant.scientificName}`);
      return plant;
    } catch (error) {
      console.error(`❌ Error fetching plant:`, error);
      return null;
    }
  },
});

// Internal mutation to patch plant fields
export const patchPlantFieldsInternal = internalMutation({
  args: {
    plantId: v.id("plants"),
    fields: v.object({
      growingConditions: v.optional(v.string()),
      seasonInfo: v.optional(v.string()),
      companionPlants: v.optional(v.array(v.string())),
      propagationMethods: v.optional(v.array(v.string())),
      edibilityUses: v.optional(v.string()),
      toxicity: v.optional(v.string()),
      otherDetails: v.optional(v.string()),
      activeCompounds: v.optional(v.array(v.string())),
      pests: v.optional(v.array(v.string())), // <-- add pests
    })
  },
  handler: async (ctx, { plantId, fields }) => {
    await ctx.db.patch(plantId, fields);
    return { success: true };
  }
});

// Public action to extract and update advanced plant profile fields for a plant
export const extractAndUpdateAdvancedPlantProfile = action({
  args: { plantId: v.id("plants") },
  handler: async (ctx, { plantId }) => {
    const plant = await ctx.runQuery(internal.identifyPlant.getPlantByIdInternal, { plantId });
    if (!plant) throw new Error("Plant not found");
    
    const scientificName = plant.scientificName;
    // Combine traditional usage and wiki description for better context
    const description = [
      plant.traditionalUsage,
      plant.wikiUrl ? `From Wikipedia: ${plant.wikiUrl}` : null
    ].filter(Boolean).join("\n\n");
    
    console.log(`🌱 Extracting advanced fields for ${scientificName}`);
    console.log(`📝 Using description: ${description.substring(0, 100)}...`);
    
    const fields = await extractAdvancedPlantProfileFields(scientificName, description);
    console.log(`✅ Extracted fields:`, fields);
    
    await ctx.runMutation(internal.identifyPlant.patchPlantFieldsInternal, { plantId, fields });
    return { success: true, updated: fields };
  }
});

// Add location data to an existing plant entry
export const addLocationToPlant = action({
  args: {
    plantId: v.id("plants"),
    latitude: v.number(),
    longitude: v.number(),
    address: v.optional(v.string()),
    accuracy: v.optional(v.number()),
  },
  
  handler: async (ctx, { plantId, latitude, longitude, address, accuracy }): Promise<{
    success: boolean;
    sightingId?: any;
    message?: string;
    error?: string;
  }> => {
    try {
      // Use the correct internal function name
      const plant = await ctx.runQuery(internal.identifyPlant.getPlantByIdInternal, { plantId });
      if (!plant) {
        throw new Error("Plant not found");
      }

      // Create a new sighting with the location data
      const sightingId = await ctx.runMutation(internal.identifyPlant.createSightingWithLocation, {
        plantId,
        latitude,
        longitude,
        address: address ?? '', // always provide a string
        accuracy: accuracy ?? 0, // always provide a number
        identifiedAt: Date.now(),
      });

      return {
        success: true,
        sightingId,
        message: "Location added successfully",
      };
    } catch (error) {
      console.error("Error adding location to plant:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add location",
      };
    }
  },
});

// Internal mutation to create a sighting with location data
export const createSightingWithLocation = internalMutation({
  args: {
    plantId: v.id("plants"),
    latitude: v.number(),
    longitude: v.number(),
    address: v.optional(v.string()),
    accuracy: v.optional(v.number()),
    identifiedAt: v.number(),
  },
  
  handler: async (ctx, { plantId, latitude, longitude, address, accuracy, identifiedAt }): Promise<any> => {
    // Create the sighting with a placeholder photo URI since it's required by schema
    const sightingId = await ctx.db.insert("sightings", {
      plantId,
      photoUri: "location_only_entry", // Placeholder since photoUri is required
      latitude,
      longitude,
      address: address ?? '', // always provide a string
      accuracy: accuracy ?? 0, // always provide a number
      identifiedAt,
      locationTimestamp: identifiedAt,
    });

    return sightingId;
  },
});

// Generate AI-powered confirmation questions for plant identification
export const generateConfirmationQuestions = action({
  args: {
    scientificName: v.string(),
    description: v.string(),
    userPhotoBase64: v.string(),
    imageUrl: v.optional(v.string()),
  },
  
  handler: async (ctx, { scientificName, description, userPhotoBase64, imageUrl }): Promise<{
    questions: Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer: string;
      reasoning: string;
    }>;
  }> => {
    console.log(`🤖 Generating confirmation questions for ${scientificName}`);
    
    try {
      // Call OpenAI to generate specific, distinguishing questions
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a botanical expert specializing in plant identification. Your task is to generate 3-4 specific, distinguishing questions that help confirm if a user's photo matches a particular plant species.

IMPORTANT GUIDELINES:
1. Focus on VISIBLE morphological features that can be observed in photos
2. Ask about specific, distinguishing characteristics that differentiate this species from similar ones
3. Include questions about leaf texture, shape, color, flower characteristics, growth pattern, etc.
4. Make questions clear and answerable by someone looking at a photo
5. Provide 3-4 multiple choice options for each question
6. Include reasoning for why each question helps with identification

Return ONLY a JSON array with this exact structure:
[
  {
    "id": "unique_id_1",
    "question": "What is the texture of the leaves?",
    "options": ["Smooth", "Hairy", "Rough", "Waxy"],
    "correctAnswer": "Hairy",
    "reasoning": "This species has distinctive fine hairs on the leaf surface that are visible in good photos"
  }
]

Plant: ${scientificName}
Description: ${description}`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        console.error('❌ OpenAI API error:', await response.text());
        throw new Error('Failed to generate confirmation questions');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      console.log('📦 Raw OpenAI confirmation questions:', content);

      try {
        const questions = JSON.parse(content);
        console.log(`✅ Generated ${questions.length} confirmation questions`);
        
        return { questions };
      } catch (error) {
        console.error('❌ Error parsing confirmation questions:', error);
        throw new Error('Failed to parse confirmation questions');
      }
    } catch (error) {
      console.error('❌ Error generating confirmation questions:', error);
      throw new Error('Failed to generate confirmation questions');
    }
  },
});
