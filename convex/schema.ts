import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  plants: defineTable({
    scientificName: v.string(),
    commonNames: v.array(v.string()),
    wikiUrl: v.optional(v.string()),
    medicinalTags: v.array(v.string()),
    traditionalUsage: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    similar_images: v.optional(v.array(v.string())),
    growingConditions: v.optional(v.string()),
    seasonInfo: v.optional(v.string()),
    companionPlants: v.optional(v.array(v.string())),
    propagationMethods: v.optional(v.array(v.string())),
    edibilityUses: v.optional(v.string()),
    toxicity: v.optional(v.string()),
    otherDetails: v.optional(v.string()),
    activeCompounds: v.optional(v.array(v.string())),
    pests: v.optional(v.array(v.string())),
    // New fields for AI-generated medicinal information
    preparationMethods: v.optional(v.array(v.string())),
    partsUsed: v.optional(v.array(v.string())),
    medicinalUses: v.optional(v.array(v.string())),
    // NEW: Add description field
    description: v.optional(v.string()),
  }).index("scientificName", ["scientificName"]),

  sightings: defineTable({
    plantId: v.id("plants"),
    photoUri: v.string(),
    identifiedAt: v.number(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    address: v.optional(v.string()),
    accuracy: v.optional(v.number()),
    locationTimestamp: v.optional(v.number()),
    // Medicinal details per sighting
    medicinalUses: v.optional(v.array(v.string())),
    preparationMethods: v.optional(v.array(v.string())),
    partsUsed: v.optional(v.array(v.string())),
    dosageNotes: v.optional(v.string()),
    sourceAttribution: v.optional(v.string()),
    userExperience: v.optional(v.string()),
  }).index("plantId", ["plantId"]),

  // NEW: Medicinal observations table for user-contributed observations
  medicinal_observations: defineTable({
    plantId: v.id("plants"),
    scientificName: v.string(),
    observationTitle: v.string(),
    observationContent: v.string(),
    observationType: v.string(), // "personal-experience", "traditional-knowledge", "scientific-research", "anecdotal"
    medicinalTags: v.array(v.string()), // Tags from user's observation
    preparationMethods: v.optional(v.array(v.string())),
    partsUsed: v.optional(v.array(v.string())),
    dosageNotes: v.optional(v.string()),
    effectiveness: v.optional(v.number()), // 1-5 rating
    sideEffects: v.optional(v.string()),
    contraindications: v.optional(v.string()),
    sourceAttribution: v.optional(v.string()), // "personal", "traditional", "research", etc.
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      address: v.string(),
      accuracy: v.number(),
      timestamp: v.number()
    })),
    season: v.optional(v.string()), // When the observation was made
    weather: v.optional(v.string()), // Weather conditions during observation
    plantCondition: v.optional(v.string()), // "fresh", "dried", "flowering", "fruiting", etc.
    timestamp: v.number(),
    isVerified: v.optional(v.boolean()), // For community verification
    verifiedBy: v.optional(v.array(v.string())), // Array of user IDs who verified
    upvotes: v.optional(v.number()),
    downvotes: v.optional(v.number()),
  })
  .index("plantId", ["plantId"])
  .index("scientificName", ["scientificName"])
  .index("observationType", ["observationType"])
  .index("timestamp", ["timestamp"]),

  plant_feedback: defineTable({
    plantId: v.id("plants"),
    scientificName: v.string(),
    feedback: v.string(),
    timestamp: v.number()
  }).index("plantId", ["plantId"]),

  plant_rejections: defineTable({
    rejectedPlantName: v.string(),
    userPhotoBase64: v.string(),
    plantIdSuggestions: v.array(v.object({
      scientificName: v.string(),
      probability: v.number(),
    })),
    timestamp: v.number()
  }).index("rejectedPlantName", ["rejectedPlantName"]),

  chat_messages: defineTable({
    messageId: v.string(),
    plantId: v.id("plants"),
    sightingId: v.optional(v.id("sightings")),
    role: v.string(), // "user" or "assistant"
    content: v.string(),
    timestamp: v.number(),
    parentMessageId: v.optional(v.string()),
    chatType: v.optional(v.string()), // "qa" or "general"
    editedAt: v.optional(v.number()),
    isEdited: v.optional(v.boolean()),
  })
  .index("plantId", ["plantId"])
  .index("messageId", ["messageId"])
  .index("sightingId", ["sightingId"])
  .index("chatType", ["chatType"])
});
