import { mutation } from "./_generated/server";
import { v } from "convex/values";

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

export const identifyPlant = mutation({
  args: {
    base64: v.string(),
  },

  // Convex infers the ctx type; the generic here keeps TypeScript happy.
  handler: async (ctx, { base64 }) => {
    /* ---------- 1. Plant.id request ---------- */
    const response = await fetch("https://api.plant.id/v3/identify", {
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

    const data = await response.json();
    const best = data?.suggestions?.[0];
    if (!best) throw new Error("No plant match found");

    /* ---------- 2. Parse fields ---------- */
    const scientificName: string = best.plant_name;
    const commonNames: string[] = best.plant_details?.common_names ?? [];
    const wikiUrl: string =
      best.plant_details?.wiki_description?.citation ?? "";
    const description: string =
      best.plant_details?.wiki_description?.value ?? "";

    // VERY simple keyword scan for “anti-” medicinal tags
    const medicinalTags: string[] =
      description.toLowerCase().match(/anti[- ]\w+/g) ?? [];

    /* ---------- 3. Upsert into `plants` ---------- */
    const existing = await ctx.db
      .query("plants")
      .withIndex("scientificName", (q) => q.eq("scientificName", scientificName))
      .unique();

    const plantId = existing
      ? existing._id
      : await ctx.db.insert("plants", {
          scientificName,
          commonNames,
          wikiUrl,
          medicinalTags,
          imageUrl: best.similar_images?.[0]?.url ?? null,
          createdAt: Date.now(),
        });

    /* ---------- 4. Record sighting ---------- */
    await ctx.db.insert("sightings", {
      plantId,
      photoUri: "", // optional: later store the actual URI
      identifiedAt: Date.now(),
    });

    /* ---------- 5. Return result ---------- */
    return {
      plantId,
      scientificName,
      commonNames,
      tags: medicinalTags,
    };
  },
});
