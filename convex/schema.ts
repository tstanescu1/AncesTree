import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  plants: defineTable({
    scientificName: v.string(),
    commonNames: v.array(v.string()),
    wikiUrl: v.optional(v.string()),
    medicinalTags: v.array(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number()
  }).index("scientificName", ["scientificName"]),

  sightings: defineTable({
    plantId: v.id("plants"),
    photoUri: v.string(),
    identifiedAt: v.number()
  }).index("plantId", ["plantId"])
});
