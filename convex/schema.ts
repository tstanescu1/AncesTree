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
  }).index("scientificName", ["scientificName"]),

  sightings: defineTable({
    plantId: v.id("plants"),
    photoUri: v.string(),
    identifiedAt: v.number()
  }).index("plantId", ["plantId"]),

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
  }).index("rejectedPlantName", ["rejectedPlantName"])
});
