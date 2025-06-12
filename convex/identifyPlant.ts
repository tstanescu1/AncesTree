import { action, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

// Helper function to extract medicinal properties using OpenAI
async function extractMedicinalProperties(scientificName: string, description: string): Promise<string[]> {
  console.log(`🔍 Extracting medicinal properties for: ${scientificName}`);
  console.log(`📝 Description provided: ${description.substring(0, 100)}...`);

  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('sk-proj-kJmPBD')) {
      console.log("🌿 OpenAI API key not available, using demo medicinal tags for:", scientificName);
      return getDemoMedicinalTags(scientificName);
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
            content: "You are a botanical expert. Extract ONLY medicinal properties from the plant description. Return ONLY a JSON array of strings, nothing else. Example: [\"anti-inflammatory\", \"antioxidant\"]"
          },
          {
            role: "user",
            content: `Plant: ${scientificName}\nDescription: ${description}\n\nExtract medicinal properties as a JSON array of strings.`
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      }),
    });

    const data = await response.json();
    console.log(`🤖 OpenAI Response:`, JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error(`❌ OpenAI API Error:`, data);
      return getDemoMedicinalTags(scientificName);
    }

    try {
      const content = data.choices[0].message.content;
      console.log(`📦 Raw OpenAI content:`, content);
      
      // Try to parse the content as JSON
      const properties = JSON.parse(content);
      console.log(`✅ Extracted properties:`, properties);
      
      if (!Array.isArray(properties)) {
        console.warn(`⚠️ OpenAI returned non-array:`, properties);
        return getDemoMedicinalTags(scientificName);
      }
      
      return properties;
    } catch (parseError) {
      console.error(`❌ Failed to parse OpenAI response:`, parseError);
      return getDemoMedicinalTags(scientificName);
    }
  } catch (error) {
    console.error(`❌ Error calling OpenAI:`, error);
    return getDemoMedicinalTags(scientificName);
  }
}

// Demo medicinal tags for testing without OpenAI API
function getDemoMedicinalTags(scientificName: string): string[] {
  const plantName = scientificName.toLowerCase();
  
  // Common medicinal plant mappings for demo
  const demoMappings: { [key: string]: string[] } = {
    'rosa': ['anti-inflammatory', 'skin-soothing', 'stress-relief'],
    'aloe': ['skin-soothing', 'wound-healing', 'anti-inflammatory'],
    'echinacea': ['immune-support', 'anti-inflammatory', 'cold-flu-relief'],
    'lavandula': ['stress-relief', 'sleep-aid', 'skin-soothing'],
    'chamomilla': ['digestive-aid', 'stress-relief', 'anti-inflammatory'],
    'calendula': ['wound-healing', 'skin-soothing', 'anti-inflammatory'],
    'matricaria': ['digestive-aid', 'anti-inflammatory', 'stress-relief'],
    'mentha': ['digestive-aid', 'stomach-soothing', 'respiratory-support'],
    'thymus': ['respiratory-support', 'antibacterial', 'antifungal'],
    'salvia': ['antioxidant', 'memory-support', 'anti-inflammatory'],
    'citrus': ['antioxidant', 'immune-support', 'digestive-aid'],
    'eucalyptus': ['respiratory-support', 'anti-inflammatory', 'antibacterial'],
    'ginkgo': ['circulation-improvement', 'antioxidant', 'memory-support'],
    'panax': ['immune-support', 'stress-relief', 'energy-boost'],
    'default': ['antioxidant', 'anti-inflammatory']
  };
  
  // Find matching pattern
  for (const [pattern, tags] of Object.entries(demoMappings)) {
    if (plantName.includes(pattern)) {
      console.log(`🌿 Demo tags for ${scientificName}:`, tags);
      return tags;
    }
  }
  
  // Default fallback
  console.log(`🌿 Demo tags for ${scientificName}:`, demoMappings.default);
  return demoMappings.default;
}

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

export const identifyPlant = action({
  args: {
    base64: v.string(),
  },

  handler: async (ctx, { base64 }): Promise<{
    plantId: any;
    scientificName: string;
    commonNames: string[];
    tags: string[];
    traditionalUsage: string;
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

    const best = data?.suggestions?.[0];
    if (!best) throw new Error("No plant match found");

    /* ---------- 2. Parse fields ---------- */
    const scientificName: string = best.plant_name;
    const commonNames: string[] = best.plant_details?.common_names ?? [];
    const wikiUrl: string =
      best.plant_details?.wiki_description?.citation ?? "";
    const description: string =
      best.plant_details?.wiki_description?.value ?? "";

    // Use OpenAI to extract comprehensive medicinal properties
    const medicinalTags: string[] = await extractMedicinalProperties(scientificName, description);

    // Get traditional usage information
    const traditionalUsage: string = await extractTraditionalUsage(scientificName, description);

    /* ---------- 3. Store in database ---------- */
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
      imageUrl: best.similar_images?.[0]?.url,
      userPhotoBase64: base64,
    });

    return result;
  },
});

export const storePlantData = internalMutation({
  args: {
    scientificName: v.string(),
    commonNames: v.array(v.string()),
    wikiUrl: v.string(),
    medicinalTags: v.array(v.string()),
    traditionalUsage: v.string(),
    imageUrl: v.optional(v.string()),
    userPhotoBase64: v.optional(v.string()),
  },
  
  handler: async (ctx, { scientificName, commonNames, wikiUrl, medicinalTags, traditionalUsage, imageUrl, userPhotoBase64 }) => {
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

    /* ---------- Record sighting with compressed user photo ---------- */
    await ctx.db.insert("sightings", {
      plantId,
      photoUri: userPhotoBase64 ? `data:image/jpeg;base64,${userPhotoBase64}` : "",
      identifiedAt: Date.now(),
    });

    return {
      plantId,
      scientificName,
      commonNames,
      tags: medicinalTags,
      traditionalUsage,
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
    
    // For each plant, get the most recent user photo
    const plantsWithPhotos = await Promise.all(
      plants.map(async (plant) => {
        const latestSighting = await ctx.db
          .query("sightings")
          .withIndex("plantId", (q) => q.eq("plantId", plant._id))
          .order("desc")
          .first();
        
        const sightingsCount = await ctx.db
          .query("sightings")
          .withIndex("plantId", (q) => q.eq("plantId", plant._id))
          .collect();
        
        return {
          ...plant,
          latestUserPhoto: latestSighting?.photoUri || null,
          sightingsCount: sightingsCount.length,
          lastSeen: latestSighting?.identifiedAt,
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
        userPhotos: sightings.map(s => s.photoUri).filter(uri => uri), // All user photos
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
      userPhotos: sightings.map(s => s.photoUri).filter(uri => uri),
    };
  },
});

// ADMIN FUNCTIONS - For development/admin use only
export const deletePlant = internalMutation({
  args: { plantId: v.id("plants") },
  
  handler: async (ctx, { plantId }) => {
    // First delete all sightings for this plant
    const sightings = await ctx.db
      .query("sightings")
      .withIndex("plantId", (q) => q.eq("plantId", plantId))
      .collect();
    
    for (const sighting of sightings) {
      await ctx.db.delete(sighting._id);
    }
    
    // Then delete the plant
    await ctx.db.delete(plantId);
    
    return { success: true };
  },
});

export const deleteSpecificSighting = internalMutation({
  args: { sightingId: v.id("sightings") },
  
  handler: async (ctx, { sightingId }) => {
    await ctx.db.delete(sightingId);
    return { success: true };
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
  },
  
  handler: async (ctx, { plantId, userPhotoBase64 }) => {
    // Simply add a new sighting for this existing plant
    await ctx.runMutation(internal.identifyPlant.addSightingToPlant, {
      plantId,
      userPhotoBase64,
    });
    
    return { success: true };
  },
});

// Internal mutation to add sighting to existing plant
export const addSightingToPlant = internalMutation({
  args: {
    plantId: v.id("plants"),
    userPhotoBase64: v.string(),
  },
  
  handler: async (ctx, { plantId, userPhotoBase64 }) => {
    // Record new sighting with user photo
    await ctx.db.insert("sightings", {
      plantId,
      photoUri: `data:image/jpeg;base64,${userPhotoBase64}`,
      identifiedAt: Date.now(),
    });
    
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
    plantId: any;
    scientificName: string;
    commonNames: string[];
    tags: string[];
    traditionalUsage: string;
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

    const best = data?.suggestions?.[0];
    if (!best) throw new Error("No plant match found");

    /* ---------- 2. Parse fields ---------- */
    const scientificName: string = best.plant_name;
    const commonNames: string[] = best.plant_details?.common_names ?? [];
    const wikiUrl: string = best.plant_details?.wiki_description?.citation ?? "";
    const description: string = best.plant_details?.wiki_description?.value ?? "";
    const confidence: string = photos.length > 1 
      ? `High confidence (${photos.length} photos analyzed)` 
      : "Standard confidence (1 photo)";

    // Use OpenAI to extract comprehensive medicinal properties
    const medicinalTags: string[] = await extractMedicinalProperties(scientificName, description);
    
    // Get traditional usage information
    const traditionalUsage: string = await extractTraditionalUsage(scientificName, description);

    /* ---------- 3. Store in database with all photos ---------- */
    const result = await ctx.runMutation(internal.identifyPlant.storePlantDataWithMultiplePhotos, {
      scientificName,
      commonNames,
      wikiUrl,
      medicinalTags,
      traditionalUsage,
      imageUrl: best.similar_images?.[0]?.url,
      userPhotosBase64: photos,
    });

    return {
      ...result,
      traditionalUsage,
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
