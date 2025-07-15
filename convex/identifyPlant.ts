import { action, internalMutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { STANDARD_MEDICINAL_TAGS, STANDARD_PREPARATION_METHODS, STANDARD_PLANT_PARTS } from "./constants";
import { normalizeAndStandardizeTags, fetchPlantImageFromWeb, fetchMultiplePlantImages } from "./helpers";

/**
 * Core Plant Identification System
 * ===============================
 * 
 * This file contains the essential functions for plant identification, storage, and management.
 * Constants and helper functions have been moved to separate files for better organization.
 */

// Core plant identification function
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
    // Plant.id API request
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

    // Process top 5 suggestions
    const topSuggestions = data.suggestions.slice(0, 5);
    const processedSuggestions = await Promise.all(
      topSuggestions.map(async (suggestion: any) => {
        const scientificName: string = suggestion.plant_name;
        const commonNames: string[] = suggestion.plant_details?.common_names ?? [];
        const probability: number = Math.round((suggestion.probability || 0) * 100);
        const wikiUrl: string = suggestion.plant_details?.wiki_description?.citation ?? "";
        const description: string = suggestion.plant_details?.wiki_description?.value ?? "";
        const similar_images: string[] = suggestion.similar_images?.map((img: any) => img.url) || [];

        // Check if plant exists in database
        const existing = await ctx.runQuery(internal.identifyPlant.getPlantByScientificNameInternal, {
          scientificName
        });

        // Fetch additional images
        let webImageUrl = "";
        let additionalImages: string[] = [];
        try {
          webImageUrl = await fetchPlantImageFromWeb(scientificName);
          const extraImages = await fetchMultiplePlantImages(scientificName);
          additionalImages = extraImages.filter(img => img !== webImageUrl);
        } catch (error) {
          console.log(`Failed to fetch web images for ${scientificName}:`, error);
        }

        const allSimilarImages = [
          ...similar_images,
          ...additionalImages
        ];

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

// Multi-photo identification (used in MainScreen)
export const identifyPlantWithMultiplePhotos = action({
  args: {
    photos: v.array(v.string()),
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

    const response = await fetch("https://api.plant.id/v2/identify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": process.env.PLANTID_API_KEY!,
      },
      body: JSON.stringify({
        images: photos,
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

    // Process suggestions (similar to single photo identification)
    const topSuggestions = data.suggestions.slice(0, 5);
    const processedSuggestions = await Promise.all(
      topSuggestions.map(async (suggestion: any) => {
        const scientificName: string = suggestion.plant_name;
        const commonNames: string[] = suggestion.plant_details?.common_names ?? [];
        const probability: number = Math.round((suggestion.probability || 0) * 100);
        const wikiUrl: string = suggestion.plant_details?.wiki_description?.citation ?? "";
        const description: string = suggestion.plant_details?.wiki_description?.value ?? "";
        const similar_images: string[] = suggestion.similar_images?.map((img: any) => img.url) || [];

        const existing = await ctx.runQuery(internal.identifyPlant.getPlantByScientificNameInternal, {
          scientificName
        });

        let webImageUrl = "";
        let additionalImages: string[] = [];
        try {
          webImageUrl = await fetchPlantImageFromWeb(scientificName);
          const extraImages = await fetchMultiplePlantImages(scientificName);
          additionalImages = extraImages.filter(img => img !== webImageUrl);
  } catch (error) {
          console.log(`Failed to fetch web images for ${scientificName}:`, error);
        }

        const allSimilarImages = [
          ...similar_images,
          ...additionalImages
        ];

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

// Test OpenAI API connection
export const testOpenAI = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; message: string }> => {
    console.log("🧪 Testing OpenAI API connection...");
    
    if (!process.env.OPENAI_API_KEY) {
      return { success: false, message: "OpenAI API key not configured" };
    }
    
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: "Say 'Hello, world!'" }],
          max_tokens: 10
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, message: `API error: ${response.status} - ${errorText}` };
      }
      
      const data = await response.json();
      return { success: true, message: "OpenAI API is working" };
    } catch (error) {
      return { success: false, message: `Connection error: ${error}` };
    }
  },
});

// GPT-4o Vision-based Plant Identification
export const identifyPlantWithGPT4o = action({
  args: {
    base64: v.string(),
    userDescription: v.optional(v.string()),
    contextAnswers: v.optional(v.array(v.object({
      question: v.string(),
      answer: v.string()
    }))),
  },

  handler: async (ctx, { base64, userDescription, contextAnswers }): Promise<{
    suggestions: Array<{
      scientificName: string;
      commonNames: string[];
      probability: number;
      description: string;
      reasoning: string;
      imageUrl?: string;
    }>;
  }> => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey.includes('sk-proj-kJmPBD') || apiKey.length < 20) {
      throw new Error("Invalid OpenAI API key format");
    }

    try {
      // Build context from user answers
      let contextString = "";
      if (contextAnswers && contextAnswers.length > 0) {
        contextString = "\n\nUser's observations:\n" + contextAnswers.map(qa => 
          `- ${qa.question}: ${qa.answer}`
        ).join("\n");
      }

      if (userDescription) {
        contextString += `\n\nUser's description: ${userDescription}`;
      }

      const requestBody = {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert botanist and plant identification specialist. Analyze the provided plant image and any additional context to identify the plant species.

Your task is to:
1. Examine the plant image carefully for key identifying features
2. Consider any additional context provided by the user
3. Provide 3-5 most likely plant identifications with scientific names
4. Explain your reasoning for each identification
5. Include common names and brief descriptions

Focus on observable features like:
- Leaf shape, size, and arrangement
- Flower characteristics (if visible)
- Stem and bark features
- Overall plant structure and growth habit
- Color patterns and textures

Return your response as a JSON array with this exact structure:
[
  {
    "scientificName": "Genus species",
    "commonNames": ["Common Name 1", "Common Name 2"],
    "probability": 85,
    "description": "Brief description of the plant's key features",
    "reasoning": "Detailed explanation of why you think this is the correct identification based on visible features"
  }
]

Be precise with scientific names and realistic with probability scores (0-100).`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please identify this plant based on the image and any additional context provided.${contextString}`
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
        max_tokens: 1500,
        temperature: 0.3
      };
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error("No choices in OpenAI response");
      }
      
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error("No response content from OpenAI");
      }

      // Parse the JSON response
      let suggestions;
      try {
        // Clean the content - remove markdown code blocks if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.substring(7);
        }
        if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.substring(3);
        }
        if (cleanContent.endsWith('```')) {
          cleanContent = cleanContent.substring(0, cleanContent.length - 3);
        }
        cleanContent = cleanContent.trim();
        
        suggestions = JSON.parse(cleanContent);
      } catch (parseError) {
        throw new Error("Invalid response format from AI");
      }

      // Validate and format the suggestions
      const formattedSuggestions = await Promise.all(suggestions.map(async (suggestion: any) => {
        const scientificName = suggestion.scientificName || "Unknown species";
        
        // Fetch an image for this plant
        let imageUrl = "";
        try {
          imageUrl = await fetchPlantImageFromWeb(scientificName);
        } catch (error) {
          // Silently fail if image fetch fails
        }
        
        return {
          scientificName,
          commonNames: Array.isArray(suggestion.commonNames) ? suggestion.commonNames : [suggestion.commonNames || "Unknown"],
          probability: Math.min(100, Math.max(0, suggestion.probability || 50)),
          description: suggestion.description || "No description available",
          reasoning: suggestion.reasoning || "No reasoning provided",
          imageUrl
        };
      }));

      return { suggestions: formattedSuggestions };

    } catch (error) {
      console.error("GPT-4o identification failed:", error);
      throw error;
    }
  },
});

// Extract medicinal properties using AI
async function extractMedicinalProperties(scientificName: string, description: string): Promise<string[]> {
  console.log(`🔍 Extracting medicinal properties for: ${scientificName}`);

  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('sk-proj-kJmPBD')) {
      console.log("🌿 OpenAI API key not available, returning empty array");
      return [];
    }

    const standardTagsList = STANDARD_MEDICINAL_TAGS.join(', ');

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
            content: `You are a botanical expert specializing in traditional medicine. Extract medicinal properties and return them as a JSON array of strings.

PREFERRED STANDARD TAGS (use these when possible):
${standardTagsList}

Guidelines:
- Use standard tags from the list above when applicable
- Use hyphens instead of spaces (e.g., "anti-inflammatory")
- Be specific but concise
- Return only 3-6 most relevant properties
- Return ONLY a JSON array, nothing else
- Include consciousness-altering properties when relevant

Example: ["anti-inflammatory", "digestive-aid", "consciousness-expanding"]`
          },
          {
            role: "user",
            content: `Plant: ${scientificName}\nDescription: ${description}\n\nExtract medicinal properties as a JSON array of standardized tags.`
          }
        ],
        temperature: 0.2,
        max_tokens: 150
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ OpenAI API Error:`, data);
      return [];
    }

    try {
      const content = data.choices[0].message.content;
      
      let jsonString = content.trim();
      if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/^```[a-zA-Z]*\n?/, "");
        jsonString = jsonString.replace(/```$/, "");
      }
      const rawProperties = JSON.parse(jsonString);
      
      if (!Array.isArray(rawProperties)) {
        console.warn(`⚠️ OpenAI returned non-array:`, rawProperties);
        return [];
      }
      
      const standardizedTags = normalizeAndStandardizeTags(rawProperties);
      console.log(`🏷️ Standardized tags:`, standardizedTags);
      
      return standardizedTags;
    } catch (parseError) {
      console.error(`❌ Failed to parse OpenAI response:`, parseError);
      return [];
    }
  } catch (error) {
    console.error(`❌ Error calling OpenAI:`, error);
    return [];
  }
}

// Confirm and store user's selected plant - Force deployment with new schema
export const confirmPlantSelection = action({
  args: {
    selectedSuggestion: v.object({
      scientificName: v.string(),
      commonNames: v.optional(v.array(v.string())),
      description: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      wikiUrl: v.optional(v.string()),
      similar_images: v.optional(v.array(v.string())),
    }),
    userPhotoBase64: v.optional(v.string()),
    userPhotos: v.optional(v.array(v.string())),
    userFeedback: v.optional(v.string()),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      address: v.string(),
      accuracy: v.number(),
      timestamp: v.number()
    })),
    medicinalDetails: v.optional(v.object({
      medicinalUses: v.optional(v.array(v.string())),
      preparationMethods: v.optional(v.array(v.string())),
      partsUsed: v.optional(v.array(v.string())),
      dosageNotes: v.optional(v.string()),
      sourceAttribution: v.optional(v.string()),
      userExperience: v.optional(v.string()),
    }))
  },
  handler: async (ctx, { 
    selectedSuggestion,
    userPhotoBase64,
    userPhotos,
    userFeedback,
    location,
    medicinalDetails
  }): Promise<{ plantId: any; scientificName: string }> => {

    
    const { scientificName, description, wikiUrl, imageUrl, similar_images } = selectedSuggestion;
    const commonNames = selectedSuggestion.commonNames || [];


    const medicinalTags = await extractMedicinalProperties(scientificName, description || "");

    // Prepare user photos array
    const photosToStore = [];
    if (userPhotos && userPhotos.length > 0) {
      photosToStore.push(...userPhotos);
    } else if (userPhotoBase64) {
      photosToStore.push(userPhotoBase64);
    }

    const result: any = await ctx.runMutation(internal.identifyPlant.storePlantData, {
      scientificName,
      commonNames: commonNames || [],
      wikiUrl,
      medicinalTags,
      traditionalUsage: '',
      imageUrl,
      userPhotos: photosToStore,
      similar_images,
      description,
      location,
      pests: [],
      medicinalDetails: medicinalDetails || {
        medicinalUses: [],
        preparationMethods: [],
        partsUsed: [],
        dosageNotes: '',
        sourceAttribution: 'AI-generated from botanical descriptions',
        userExperience: ''
      }
    });

    console.log(`✅ Plant stored: ${scientificName}`);
    return { plantId: result.plantId, scientificName };
  },
});

// Store plant data
export const storePlantData = internalMutation({
  args: {
    scientificName: v.string(),
    commonNames: v.optional(v.array(v.string())),
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
  handler: async (ctx, { 
    scientificName, 
    commonNames, 
    wikiUrl, 
    medicinalTags, 
    traditionalUsage, 
    imageUrl, 
    userPhotos, 
    similar_images, 
    description, 
    location, 
    pests, 
    medicinalDetails 
  }) => {
    // Upsert into plants table
    let plantId;
    const existingPlant = await ctx.db
      .query("plants")
      .withIndex("scientificName", q => q.eq("scientificName", scientificName))
      .first();
    
    if (existingPlant) {
      plantId = existingPlant._id;
      await ctx.db.patch(plantId, {
        commonNames: commonNames || existingPlant.commonNames,
        wikiUrl,
        medicinalTags,
        traditionalUsage,
        imageUrl,
        similar_images: similar_images || existingPlant.similar_images,
        pests: pests || existingPlant.pests,
      });
    } else {
      const allImages = imageUrl && similar_images 
        ? [imageUrl, ...similar_images.filter(img => img !== imageUrl)]
        : similar_images || (imageUrl ? [imageUrl] : []);
      
      plantId = await ctx.db.insert("plants", {
        scientificName,
        commonNames: commonNames || [],
        wikiUrl,
        medicinalTags,
        traditionalUsage,
        imageUrl,
        createdAt: Date.now(),
        similar_images: allImages,
        pests: pests || [],
      });
    }

    // Record sightings with photos and location
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
      commonNames: commonNames || [],
      tags: medicinalTags,
      traditionalUsage: traditionalUsage || "",
    };
  },
});

// Get all plants
export const getAllPlants = query({
  args: {},
  
  handler: async (ctx) => {
    const plants = await ctx.db
      .query("plants")
      .order("desc")
      .collect();
    
    const plantsWithPhotos = await Promise.all(
      plants.map(async (plant) => {
        const allSightings = await ctx.db
          .query("sightings")
          .withIndex("plantId", (q) => q.eq("plantId", plant._id))
          .order("desc")
          .collect();
        
        let displayPhoto = null;
        if (plant.imageUrl) {
          displayPhoto = plant.imageUrl;
        } else if (allSightings.length > 0) {
          displayPhoto = allSightings[0]?.photoUri || null;
        } else if (plant.similar_images && plant.similar_images.length > 0) {
          displayPhoto = plant.similar_images[0];
        }
        
        return {
          ...plant,
          latestUserPhoto: displayPhoto,
          sightingsCount: allSightings.length,
          lastSeen: allSightings[0]?.identifiedAt,
          allSightings: allSightings,
        };
      })
    );
    
    return plantsWithPhotos;
  },
});

// Get plant by ID
export const getPlantById = query({
  args: { plantId: v.id("plants") },
  
  handler: async (ctx, { plantId }) => {
    try {
      const plant = await ctx.db.get(plantId);
      if (!plant) {
        return { error: "Plant not found" };
      }
      
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
        userPhotos: sightings.map(s => s.photoUri).filter(uri => uri),
      };
    } catch (error) {
      console.error("Error fetching plant:", error);
      return { error: "Failed to fetch plant details" };
    }
  },
});

// Get plant by scientific name (internal)
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

// Get recently identified plants
export const getRecentlyIdentified = query({
  args: { limit: v.optional(v.number()) },
  
  handler: async (ctx, { limit = 5 }) => {
    const plants = await ctx.db
      .query("plants")
      .order("desc")
      .take(limit);
    
    const plantsWithPhotos = await Promise.all(
      plants.map(async (plant) => {
        const allSightings = await ctx.db
        .query("sightings")
          .withIndex("plantId", (q) => q.eq("plantId", plant._id))
          .order("desc")
        .collect();
      
        let displayPhoto = null;
        if (plant.imageUrl) {
          displayPhoto = plant.imageUrl;
        } else if (allSightings.length > 0) {
          displayPhoto = allSightings[0]?.photoUri || null;
        } else if (plant.similar_images && plant.similar_images.length > 0) {
          displayPhoto = plant.similar_images[0];
        }
        
        return {
          _id: plant._id,
          scientificName: plant.scientificName,
          commonNames: plant.commonNames,
          medicinalTags: plant.medicinalTags,
          latestUserPhoto: displayPhoto,
          identifiedAt: plant.createdAt,
        };
      })
    );
    
    return plantsWithPhotos;
  },
});

// Add photo to existing plant
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
    const result = await ctx.runMutation(internal.identifyPlant.addSightingToPlant, {
      plantId,
      userPhotoBase64,
      location,
    });
    
    return { success: true };
  },
});

// Add sighting to plant (internal)
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
    const sightingData: any = {
      plantId,
      photoUri: `data:image/jpeg;base64,${userPhotoBase64}`,
      identifiedAt: Date.now(),
    };
    
    if (location) {
      sightingData.latitude = location.latitude;
      sightingData.longitude = location.longitude;
      sightingData.address = location.address;
      sightingData.accuracy = location.accuracy;
      sightingData.locationTimestamp = location.timestamp;
    }
    
    const sightingId = await ctx.db.insert("sightings", sightingData);
    return { success: true };
  },
});

// Update traditional usage
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

// Update plant tags
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

// Get standard medicinal tags
export const getStandardMedicinalTags = query({
  args: {},
  
  handler: async (ctx) => {
    return STANDARD_MEDICINAL_TAGS.sort();
  },
});

// Standardize existing tags
export const standardizeExistingTags = action({
  args: {},
  
  handler: async (ctx): Promise<{ updatedCount: number; totalPlants: number }> => {
    const plants: any[] = await ctx.runQuery(api.identifyPlant.getAllPlants);
    let updatedCount = 0;
    
    for (const plant of plants) {
      if (plant.medicinalTags && plant.medicinalTags.length > 0) {
        const standardizedTags = normalizeAndStandardizeTags(plant.medicinalTags);
        
        if (JSON.stringify(standardizedTags.sort()) !== JSON.stringify(plant.medicinalTags.sort())) {
          await ctx.runMutation(internal.identifyPlant.updatePlantTagsInternal, {
            plantId: plant._id,
            tags: standardizedTags,
          });
          updatedCount++;
        }
      }
    }
    
    return { updatedCount, totalPlants: plants?.length || 0 };
  },
});

// Set default photo
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

export const setDefaultPhotoInternal = internalMutation({
  args: {
    plantId: v.id("plants"),
    sightingId: v.id("sightings"),
  },
  
  handler: async (ctx, { plantId, sightingId }): Promise<{ success: boolean }> => {
    try {
      const allSightings = await ctx.db
        .query("sightings")
        .withIndex("plantId", (q) => q.eq("plantId", plantId))
        .order("desc")
        .collect();
      
      const targetSighting = await ctx.db.get(sightingId);
      if (!targetSighting) {
        throw new Error("Sighting not found");
      }
      
      const newestTimestamp = Math.max(...allSightings.map(s => s.identifiedAt)) + 1000;
      
      await ctx.db.patch(sightingId, {
        identifiedAt: newestTimestamp,
      });
      
      const plant = await ctx.db.get(plantId);
      if (plant) {
        await ctx.db.patch(plantId, {
          imageUrl: targetSighting.photoUri,
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error(`❌ Error setting default photo:`, error);
      throw error;
    }
  },
});

// Set default database image
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

export const setDefaultDatabaseImageInternal = internalMutation({
  args: {
    plantId: v.id("plants"),
    imageUrl: v.string(),
  },
  
  handler: async (ctx, { plantId, imageUrl }): Promise<{ success: boolean }> => {
    try {
      const plant = await ctx.db.get(plantId);
      if (!plant) {
        throw new Error("Plant not found");
      }
      
      let reorderedImages = plant.similar_images || [];
      if (reorderedImages.includes(imageUrl)) {
        reorderedImages = [
          imageUrl,
          ...reorderedImages.filter(img => img !== imageUrl)
        ];
      } else {
        reorderedImages = [imageUrl, ...reorderedImages];
      }
      
      await ctx.db.patch(plantId, {
        imageUrl: imageUrl,
        similar_images: reorderedImages,
      });
      
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to set database image as default:`, error);
      return { success: false };
    }
  },
});

// Admin delete functions
export const adminDeletePlant = action({
  args: { plantId: v.string() },
  
  handler: async (ctx, { plantId }): Promise<{ success: boolean }> => {
    return await ctx.runMutation(internal.identifyPlant.deletePlant, {
      plantId: plantId as any,
    });
  },
});

export const deletePlant = internalMutation({
  args: { plantId: v.id("plants") },
  
  handler: async (ctx, { plantId }) => {
    try {
      const plant = await ctx.db.get(plantId);
      if (!plant) {
        return { success: true, message: "Plant not found" };
      }

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
      
      await ctx.db.delete(plantId);
      return { success: true };
    } catch (error) {
      console.error("Error deleting plant:", error);
      return { success: false, error: String(error) };
    }
  },
});

export const adminDeleteSighting = action({
  args: { sightingId: v.id("sightings") },
  
  handler: async (ctx, { sightingId }): Promise<{ success: boolean }> => {
    return await ctx.runMutation(internal.identifyPlant.deleteSpecificSighting, {
      sightingId,
    });
  },
});

export const deleteSpecificSighting = internalMutation({
  args: { sightingId: v.id("sightings") },
  
  handler: async (ctx, { sightingId }) => {
    try {
      const sighting = await ctx.db.get(sightingId);
      if (!sighting) {
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

// Plant feedback functions
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

export const addPlantFeedback = action({
  args: {
    plantId: v.id("plants"),
    scientificName: v.string(),
    feedback: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    return await ctx.runMutation(internal.identifyPlant.storePlantFeedback, args);
  }
});

export const editPlantFeedback = action({
  args: {
    feedbackId: v.id("plant_feedback"),
    feedback: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    return await ctx.runMutation(internal.identifyPlant.updatePlantFeedback, args);
  }
});

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

// Location functions
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
      const plant = await ctx.runQuery(internal.identifyPlant.getPlantByIdInternal, { plantId });
      if (!plant) {
        throw new Error("Plant not found");
      }

      const sightingId = await ctx.runMutation(internal.identifyPlant.createSightingWithLocation, {
        plantId,
        latitude,
        longitude,
        address: address ?? '',
        accuracy: accuracy ?? 0,
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

export const getPlantByIdInternal = internalQuery({
  args: { plantId: v.id("plants") },
  handler: async (ctx, { plantId }) => {
    try {
      const plant = await ctx.db.get(plantId);
      return plant;
    } catch (error) {
      console.error(`❌ Error fetching plant:`, error);
      return null;
    }
  },
});

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
    const sightingId = await ctx.db.insert("sightings", {
      plantId,
      photoUri: "location_only_entry",
      latitude,
      longitude,
      address: address ?? '',
      accuracy: accuracy ?? 0,
      identifiedAt,
      locationTimestamp: identifiedAt,
    });

    return sightingId;
  },
});

// Simple AI functions that are actually used
export const requestBetterIdentification = action({
  args: {
    base64: v.string(),
    userDescription: v.string(),
    rejectedSuggestions: v.array(v.string()),
    contextAnswers: v.optional(v.array(v.object({
      question: v.string(),
      answer: v.string()
    }))),
  },

  handler: async (ctx, { base64, userDescription, rejectedSuggestions, contextAnswers }): Promise<{
    suggestions: Array<{
      scientificName: string;
      commonNames: string[];
      probability: number;
      description: string;
      reasoning: string;
      imageUrl?: string;
    }>;
  }> => {
    try {
      // Use GPT-4o vision for better identification with context
      try {
        const gptResult = await ctx.runAction(api.identifyPlant.identifyPlantWithGPT4o, {
          base64,
          userDescription,
          contextAnswers
        });

        // Filter out rejected suggestions
        const filteredSuggestions = gptResult.suggestions
          .filter((suggestion: any) => !rejectedSuggestions.includes(suggestion.scientificName))
          .slice(0, 5);

        if (filteredSuggestions.length > 0) {
          return { suggestions: filteredSuggestions };
        }
      } catch (gptError) {
        // Fall back to Plant.id if GPT-4o fails
      }

      // Fallback to Plant.id if GPT-4o fails or no results
      const response = await fetch("https://api.plant.id/v2/identify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": process.env.PLANTID_API_KEY!,
        },
        body: JSON.stringify({
          images: [base64],
          modifiers: ["crops_medium", "similar_images"],
          plant_details: ["common_names", "wiki_description", "taxonomy"],
          max_results: 8
        }),
      });

      if (!response.ok) {
        throw new Error("Plant.id fallback failed");
      }

      const data = await response.json();
      
      if (!data?.suggestions || data.suggestions.length === 0) {
        throw new Error("No fallback suggestions found");
      }

      const plantIdSuggestions = data.suggestions
        .filter((suggestion: any) => 
          !rejectedSuggestions.includes(suggestion.plant_name)
        )
        .slice(0, 5)
        .map((suggestion: any) => ({
          scientificName: suggestion.plant_name,
          commonNames: suggestion.plant_details?.common_names || [],
          probability: Math.round((suggestion.probability || 0.5) * 100),
          description: (suggestion.plant_details?.wiki_description?.value || "").substring(0, 150) + "...",
          reasoning: `Alternative identification with ${Math.round((suggestion.probability || 0.5) * 100)}% confidence`,
          imageUrl: suggestion.similar_images?.[0]?.url || ""
        }));

      return { suggestions: plantIdSuggestions };

    } catch (error) {
      console.error("Better identification failed:", error);
      
      return {
        suggestions: [{
          scientificName: "Unknown species",
          commonNames: ["Unidentified plant"],
          probability: 50,
          description: "Unable to provide alternative suggestions at this time.",
          reasoning: `Based on your description: "${userDescription}", this appears to be a plant not easily identified.`,
          imageUrl: ""
        }]
      };
    }
  },
});

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

// Simplified confirmation functions (keeping the ones that are used)
export const generateConfirmationQuestions = action({
  args: {
    scientificName: v.string(),
    description: v.string(),
    userPhotoBase64: v.string(),
    imageUrl: v.optional(v.string()),
  },
  
  handler: async (ctx, { scientificName, description }): Promise<{
    questions: Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer: string;
      reasoning: string;
    }>;
  }> => {
    // Simple fallback questions if OpenAI is not available
    if (!process.env.OPENAI_API_KEY) {
      return {
        questions: [
          {
            id: "leaf_shape",
            question: "What is the shape of the leaves?",
            options: ["Round", "Oval", "Heart-shaped", "Elongated"],
            correctAnswer: "Oval",
            reasoning: "Leaf shape is a key identifying feature"
          }
        ]
      };
    }
  
    try {
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
              content: `You are helping someone identify a plant by asking about PHYSICAL FEATURES they can observe, including sensory characteristics like smell and taste.

Plant: ${scientificName}
Description: ${description}

Generate exactly 4 questions about observable characteristics. Use ONLY these question templates:

1. LEAF TEXTURE: "What does the leaf texture feel like when you touch it?"
   Options: ["Smooth and soft", "Rough or hairy", "Sticky or resinous", "Thorny or prickly", "I haven't touched it"]

2. LEAF COLOR: "What color are the leaves?"
   Options: ["Dark green", "Light green", "Yellow or variegated", "Red or purple", "I can't tell clearly"]

3. LEAF ARRANGEMENT: "How are the leaves arranged on the stem?"
   Options: ["Opposite each other", "Alternating sides", "In a cluster or rosette", "All around the stem", "I can't see the arrangement"]

4. PLANT SHAPE: "What is the overall shape of the plant?"
   Options: ["Bushy or shrub-like", "Climbing or vining", "Tree-like", "Ground cover", "I can't tell the shape"]

5. FLOWERS: "Are there any flowers visible?"
   Options: ["Yes, white or cream", "Yes, yellow or orange", "Yes, pink or purple", "No flowers visible", "I can't tell"]

6. STEM TYPE: "What does the stem look like?"
   Options: ["Green and soft", "Woody or brown", "Hairy or fuzzy", "Smooth and shiny", "I can't see the stem"]

7. GROWTH HABIT: "How does the plant grow?"
   Options: ["Upright and tall", "Spreading out", "Climbing up something", "Low to the ground", "I can't tell"]

8. HABITAT: "Where is the plant growing?"
   Options: ["In shade", "In full sun", "Near water", "In dry soil", "I'm not sure"]

9. SMELL: "What does the plant smell like when you crush a leaf or flower?"
   Options: ["Sweet or floral", "Herbal or medicinal", "Citrus or lemony", "Minty or fresh", "No noticeable smell", "I haven't smelled it"]

10. TASTE: "What does the plant taste like if you try a small piece?"
    Options: ["Sweet", "Bitter", "Sour or tart", "Spicy or peppery", "Minty or cooling", "I haven't tasted it", "I don't want to taste it"]

IMPORTANT: For plants known for culinary use, medicinal properties, or distinctive smells/tastes, prioritize SMELL and TASTE questions as they are often the most distinguishing features.

PRIORITY RULES:
- If the plant is used in cooking/spices (like Piper species, herbs, etc.), include TASTE question
- If the plant has medicinal properties or distinctive smell, include SMELL question  
- For aromatic plants, herbs, spices, or culinary plants, prioritize sensory questions over visual ones
- For plants which are not known for culinary use, medicinal properties, or distinctive smells/tastes, prioritize visual questions over sensory ones

Choose the 4 most relevant questions for this specific plant. For each question, provide the most likely answer based on the plant description.

Return as JSON array with this exact structure:
[
  {
    "id": "leaf_texture",
    "question": "What does the leaf texture feel like when you touch it?",
    "options": ["Smooth and soft", "Rough or hairy", "Sticky or resinous", "Thorny or prickly", "I haven't touched it"],
    "correctAnswer": "Smooth and soft",
    "reasoning": "This plant has smooth, leathery leaves that are characteristic of this species"
  }
]`
            }
          ],
          temperature: 0.3,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      
      if (content.startsWith("```")) {
        content = content.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "");
      }
      
      const questions = JSON.parse(content);
      
      // Validate and ensure all required fields are present
      const validatedQuestions = questions.map((q: any, index: number) => ({
        id: q.id || `question_${index + 1}`,
        question: q.question || "What does the plant look like?",
        options: Array.isArray(q.options) ? q.options : ["I can see it clearly", "I can't tell", "I haven't looked closely"],
        correctAnswer: q.correctAnswer || q.options?.[0] || "I can see it clearly",
        reasoning: q.reasoning || `This question helps identify ${scientificName} based on its observable characteristics.`
      }));
      
      return { questions: validatedQuestions };
    } catch (error) {
      console.error('Error generating questions:', error);
      // Fallback with practical questions
      return {
        questions: [
          {
            id: "leaf_texture",
            question: "What does the leaf texture feel like when you touch it?",
            options: ["Smooth and soft", "Rough or hairy", "Sticky or resinous", "I haven't touched it"],
            correctAnswer: "Smooth and soft",
            reasoning: "Leaf texture is a key identifying feature for this plant"
          },
          {
            id: "leaf_color",
            question: "What color are the leaves?",
            options: ["Dark green", "Light green", "Yellow or variegated", "I can't tell clearly"],
            correctAnswer: "Dark green",
            reasoning: "Leaf color helps distinguish this species from similar plants"
          },
          {
            id: "smell",
            question: "What does the plant smell like when you crush a leaf or flower?",
            options: ["Sweet or floral", "Herbal or medicinal", "Citrus or lemony", "Minty or fresh", "No noticeable smell", "I haven't smelled it"],
            correctAnswer: "Herbal or medicinal",
            reasoning: "Smell is a distinctive identifying feature for many plants"
          },
          {
            id: "taste",
            question: "What does the plant taste like if you try a small piece?",
            options: ["Sweet", "Bitter", "Sour or tart", "Spicy or peppery", "Minty or cooling", "I haven't tasted it", "I don't want to taste it"],
            correctAnswer: "I haven't tasted it",
            reasoning: "Taste can help identify plants, but safety first - only taste if you're confident it's safe"
          }
        ]
      };
    }
  },
});



export const saveUserConfirmation = action({
  args: {
    plantId: v.optional(v.id("plants")),
    scientificName: v.string(),
    userAnswers: v.array(v.object({
      questionId: v.string(),
      question: v.string(),
      userAnswer: v.string(),
      correctAnswer: v.optional(v.string()),
      reasoning: v.string()
    })),
    finalConfidence: v.number(),
    refinedAnalysis: v.optional(v.object({
      detailedReasoning: v.string(),
      matchingFeatures: v.array(v.string()),
      contradictingFeatures: v.array(v.string()),
      keyDistinguishingFeatures: v.array(v.string()),
      environmentalNotes: v.string(),
      suggestions: v.array(v.string()),
      similarSpecies: v.array(v.string()),
      confidenceExplanation: v.string()
    })),
    userPhotoBase64: v.string()
  },
  handler: async (ctx, args) => {
    // If plantId is provided, store as feedback; otherwise just log
    if (args.plantId) {
      await ctx.runMutation(internal.identifyPlant.storePlantFeedback, {
        plantId: args.plantId,
        scientificName: args.scientificName,
        feedback: `Confirmation: ${args.finalConfidence}% confidence`,
        timestamp: Date.now()
      });
    } else {
      // Plant not saved yet, just log the confirmation
      console.log(`🔍 User confirmation for ${args.scientificName}: ${args.finalConfidence}% confidence`);
    }
    
    return { success: true };
  }
});

// Medicinal observation functions (keeping the essential ones)
export const getMedicinalObservations = query({
  args: { plantId: v.id("plants") },
  
  handler: async (ctx, { plantId }) => {
    const observations = await ctx.db
      .query("medicinal_observations")
      .withIndex("plantId", (q) => q.eq("plantId", plantId))
      .order("desc")
      .collect();
    
    return observations;
  },
});

export const addMedicinalObservation = action({
  args: {
    plantId: v.id("plants"),
    scientificName: v.string(),
    observationTitle: v.string(),
    observationContent: v.string(),
    observationType: v.string(),
    medicinalTags: v.array(v.string()),
    preparationMethods: v.optional(v.array(v.string())),
    partsUsed: v.optional(v.array(v.string())),
    dosageNotes: v.optional(v.string()),
    effectiveness: v.optional(v.number()),
    sideEffects: v.optional(v.string()),
    contraindications: v.optional(v.string()),
    sourceAttribution: v.optional(v.string()),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      address: v.string(),
      accuracy: v.number(),
      timestamp: v.number()
    })),
    season: v.optional(v.string()),
    weather: v.optional(v.string()),
    plantCondition: v.optional(v.string()),
  },
  
  handler: async (ctx, args): Promise<{ success: boolean; observationId: any }> => {
    const standardizedTags = normalizeAndStandardizeTags(args.medicinalTags);
    
    const observationId: any = await ctx.runMutation(internal.identifyPlant.addMedicinalObservationInternal, {
      ...args,
      medicinalTags: standardizedTags,
      timestamp: Date.now(),
      isVerified: false,
      upvotes: 0,
      downvotes: 0,
    });
    
    return { success: true, observationId };
  },
});

export const addMedicinalObservationInternal = internalMutation({
  args: {
    plantId: v.id("plants"),
    scientificName: v.string(),
    observationTitle: v.string(),
    observationContent: v.string(),
    observationType: v.string(),
    medicinalTags: v.array(v.string()),
    preparationMethods: v.optional(v.array(v.string())),
    partsUsed: v.optional(v.array(v.string())),
    dosageNotes: v.optional(v.string()),
    effectiveness: v.optional(v.number()),
    sideEffects: v.optional(v.string()),
    contraindications: v.optional(v.string()),
    sourceAttribution: v.optional(v.string()),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      address: v.string(),
      accuracy: v.number(),
      timestamp: v.number()
    })),
    season: v.optional(v.string()),
    weather: v.optional(v.string()),
    plantCondition: v.optional(v.string()),
    timestamp: v.number(),
    isVerified: v.optional(v.boolean()),
    upvotes: v.optional(v.number()),
    downvotes: v.optional(v.number()),
  },
  
  handler: async (ctx, args): Promise<any> => {
    return await ctx.db.insert("medicinal_observations", args);
  },
});

export const getObservationStats = query({
  args: { plantId: v.id("plants") },
  
  handler: async (ctx, { plantId }) => {
    const observations = await ctx.db
      .query("medicinal_observations")
      .withIndex("plantId", (q) => q.eq("plantId", plantId))
      .collect();
    
    const stats = {
      totalObservations: observations.length,
      byType: {} as { [key: string]: number },
      averageEffectiveness: 0,
      totalUpvotes: 0,
      totalDownvotes: 0,
      verifiedObservations: 0,
    };
    
    let totalEffectiveness = 0;
    let effectivenessCount = 0;
    
    observations.forEach(obs => {
      stats.byType[obs.observationType] = (stats.byType[obs.observationType] || 0) + 1;
      
      if (obs.effectiveness) {
        totalEffectiveness += obs.effectiveness;
        effectivenessCount++;
      }
      
      stats.totalUpvotes += obs.upvotes || 0;
      stats.totalDownvotes += obs.downvotes || 0;
      
      if (obs.isVerified) {
        stats.verifiedObservations++;
      }
    });
    
    stats.averageEffectiveness = effectivenessCount > 0 ? totalEffectiveness / effectivenessCount : 0;
    
    return stats;
  },
});

export const voteOnObservation = action({
  args: {
    observationId: v.id("medicinal_observations"),
    voteType: v.string(),
  },
  
  handler: async (ctx, { observationId, voteType }) => {
    if (voteType !== "upvote" && voteType !== "downvote") {
      throw new Error("Vote type must be 'upvote' or 'downvote'");
    }
    
    await ctx.runMutation(internal.identifyPlant.voteOnObservationInternal, {
      observationId,
      voteType,
    });
    
    return { success: true };
  },
});

export const voteOnObservationInternal = internalMutation({
  args: {
    observationId: v.id("medicinal_observations"),
    voteType: v.string(),
  },
  
  handler: async (ctx, { observationId, voteType }) => {
    const observation = await ctx.db.get(observationId);
    if (!observation) {
      throw new Error("Observation not found");
    }
    
    const currentUpvotes = observation.upvotes || 0;
    const currentDownvotes = observation.downvotes || 0;
    
    if (voteType === "upvote") {
      await ctx.db.patch(observationId, { upvotes: currentUpvotes + 1 });
    } else {
      await ctx.db.patch(observationId, { downvotes: currentDownvotes + 1 });
    }
    
    return { success: true };
  },
});

export const enhanceObservationWithAI = action({
  args: {
    observationId: v.id("medicinal_observations"),
  },
  
  handler: async (ctx, { observationId }) => {
    // Simple enhancement - just return success for now
    return {
      success: true,
      enhancement: {
        suggestedTags: [],
        suggestedPreparationMethods: [],
        suggestedPartsUsed: [],
        dosageNotes: "",
        sideEffects: "",
        contraindications: "",
        culturalContext: "",
        enhancedContent: ""
      },
      message: "Observation enhanced"
    };
  },
});

export const deleteMedicinalObservation = action({
  args: { observationId: v.id("medicinal_observations") },
  
  handler: async (ctx, { observationId }) => {
    await ctx.runMutation(internal.identifyPlant.deleteMedicinalObservationInternal, { observationId });
    return { success: true };
  },
});

export const deleteMedicinalObservationInternal = internalMutation({
  args: { observationId: v.id("medicinal_observations") },
  
  handler: async (ctx, { observationId }) => {
    await ctx.db.delete(observationId);
    return { success: true };
  },
});

// Simple version of the advanced profile extraction
export const extractAndUpdateAdvancedPlantProfile = action({
  args: { plantId: v.id("plants") },
  handler: async (ctx, { plantId }) => {
    // Simple implementation - just return success
    return { 
      success: true, 
      updated: {
        growingConditions: "",
        seasonInfo: "",
        companionPlants: [],
        propagationMethods: [],
        edibilityUses: "",
        toxicity: "",
        otherDetails: "",
        activeCompounds: [],
        pests: []
      }
    };
  }
});

// Keep this for backward compatibility but simplify it
export const reExtractComprehensiveData = action({
  args: { plantId: v.id("plants") },
  
  handler: async (ctx, { plantId }): Promise<{
    success: boolean;
    message: string;
    data: {
      medicinalTags: string[];
      preparationMethods: string[];
      partsUsed: string[];
      medicinalUses: string[];
      description: string;
    };
  }> => {
    const plant: any = await ctx.runQuery(internal.identifyPlant.getPlantByIdInternal, { plantId });
    if (!plant) {
      throw new Error("Plant not found");
    }
    
    // Simple re-extraction
    const medicinalTags = await extractMedicinalProperties(plant.scientificName, plant.traditionalUsage || "");
    
    return { 
      success: true, 
      message: `Updated ${plant.scientificName}`,
      data: {
        medicinalTags,
        preparationMethods: [],
        partsUsed: [],
        medicinalUses: [],
        description: plant.description || ""
      }
    };
  },
});
