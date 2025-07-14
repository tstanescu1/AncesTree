import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Mock AI response generator for medicinal questions
// In a real app, this would integrate with OpenAI, Claude, or similar AI service
const generateMedicinalResponse = async (
  plantName: string,
  scientificName: string,
  traditionalUsage: string,
  medicinalTags: string[],
  question: string
): Promise<string> => {
  
  const questionLower = question.toLowerCase();
  const plantDisplayName = plantName || scientificName || 'this plant';
  
  // Comprehensive response templates based on question type
  if (questionLower.includes('prepare') || questionLower.includes('preparation') || questionLower.includes('how to make')) {
    return `**Traditional Preparation Methods for ${plantDisplayName}**\n\n` +
           `Based on traditional knowledge, here are common preparation methods:\n\n` +
           `🌿 **Tea/Infusion**\n` +
           `• Use 1-2 teaspoons of dried herb per cup of hot water\n` +
           `• Steep for 10-15 minutes, covered\n` +
           `• Strain and drink 1-3 times daily\n\n` +
           `🍶 **Tincture**\n` +
           `• Soak plant material in 80-100 proof alcohol\n` +
           `• Use 1:5 ratio (1 part herb to 5 parts alcohol)\n` +
           `• Let steep for 2-6 weeks in dark location\n` +
           `• Strain and store in dark glass bottles\n\n` +
           `🔥 **Decoction** (for roots, bark, seeds)\n` +
           `• Simmer 1 tablespoon herb in 2 cups water\n` +
           `• Boil for 20-30 minutes\n` +
           `• Strain and drink warm\n\n` +
           `💆 **Poultice** (external use)\n` +
           `• Crush fresh plant material\n` +
           `• Apply directly to affected area\n` +
           `• Cover with clean cloth\n\n` +
           `⚠️ **Safety**: Always start with small amounts and consult healthcare providers.`;
  }
  
  if (questionLower.includes('parts') || questionLower.includes('used') || questionLower.includes('which part')) {
    const commonParts = ['leaves', 'flowers', 'roots', 'bark', 'seeds', 'berries', 'stems'];
    const mentionedParts = commonParts.filter(part => 
      traditionalUsage.toLowerCase().includes(part) || 
      medicinalTags.some(tag => tag.toLowerCase().includes(part))
    );
    
    return `**Medicinal Parts of ${plantDisplayName}**\n\n` +
           `Traditional medicine uses these parts:\n\n` +
           `${mentionedParts.length > 0 ? mentionedParts.map(part => `• **${part.charAt(0).toUpperCase() + part.slice(1)}**: ${getPartDescription(part)}`).join('\n') : 
           '• **Various parts** depending on the preparation and intended use'}\n\n` +
           `**General Guidelines:**\n` +
           `• **Leaves & Flowers**: Usually harvested in spring/summer, used fresh or dried\n` +
           `• **Roots & Bark**: Typically harvested in fall/winter, often dried\n` +
           `• **Seeds & Berries**: Harvested when mature, can be used fresh or dried\n\n` +
           `**Harvesting Tips:**\n` +
           `• Choose healthy, disease-free plants\n` +
           `• Harvest in morning after dew dries\n` +
           `• Leave enough for plant regeneration\n` +
           `• Follow sustainable practices`;
  }
  
  if (questionLower.includes('safety') || questionLower.includes('precaution') || questionLower.includes('dangerous')) {
    return `**⚠️ Safety Precautions for ${plantDisplayName}**\n\n` +
           `**Essential Safety Guidelines:**\n\n` +
           `🔍 **Identification**:\n` +
           `• Always identify the plant correctly before use\n` +
           `• Use multiple identification methods\n` +
           `• When in doubt, don't use it\n\n` +
           `⚖️ **Dosage Safety**:\n` +
           `• Start with very small amounts\n` +
           `• Test for allergic reactions\n` +
           `• Never exceed recommended doses\n` +
           `• Individual responses vary greatly\n\n` +
           `🚫 **Contraindications**:\n` +
           `• Pregnancy and breastfeeding (consult doctor)\n` +
           `• Children under 12 (consult pediatrician)\n` +
           `• Elderly individuals (start with lower doses)\n` +
           `• People with liver/kidney conditions\n` +
           `• Those taking medications (check interactions)\n\n` +
           `🆘 **Emergency Signs**:\n` +
           `• Stop immediately if you experience:\n` +
           `  - Rash, itching, or swelling\n` +
           `  - Difficulty breathing\n` +
           `  - Nausea, vomiting, or diarrhea\n` +
           `  - Dizziness or confusion\n\n` +
           `**This information is for educational purposes only. Always consult qualified healthcare providers.**`;
  }
  
  if (questionLower.includes('dosage') || questionLower.includes('how much') || questionLower.includes('amount')) {
    return `**📏 Dosage Guidelines for ${plantDisplayName}**\n\n` +
           `**Standard Dosage Recommendations:**\n\n` +
           `☕ **Tea/Infusion**:\n` +
           `• 1-2 cups per day\n` +
           `• 1 teaspoon dried herb per cup\n` +
           `• Steep 10-15 minutes\n\n` +
           `💧 **Tincture**:\n` +
           `• 10-30 drops, 2-3 times daily\n` +
           `• Dilute in water or juice\n` +
           `• Start with lower dose\n\n` +
           `💊 **Capsules**:\n` +
           `• Follow manufacturer's instructions\n` +
           `• Usually 1-2 capsules, 2-3 times daily\n\n` +
           `🖐️ **Topical Use**:\n` +
           `• Apply as needed for external conditions\n` +
           `• Test on small area first\n\n` +
           `**⚠️ Important Notes:**\n` +
           `• Start with the lowest recommended dose\n` +
           `• Individual responses vary significantly\n` +
           `• Consult healthcare provider for personalized advice\n` +
           `• Not a substitute for professional medical care\n` +
           `• Monitor your response and adjust accordingly`;
  }
  
  if (questionLower.includes('effects') || questionLower.includes('how long') || questionLower.includes('timeline')) {
    return `**⏰ Expected Effects and Timeline for ${plantDisplayName}**\n\n` +
           `**Typical Response Timeline:**\n\n` +
           `⚡ **Immediate Effects** (within hours):\n` +
           `• Some preparations may provide quick relief\n` +
           `• Calming effects from teas\n` +
           `• Topical relief from poultices\n\n` +
           `📈 **Short-term** (1-2 weeks):\n` +
           `• Gradual improvement in symptoms\n` +
           `• Building up therapeutic levels\n` +
           `• Body adjusting to the herb\n\n` +
           `🎯 **Long-term** (1-3 months):\n` +
           `• Full therapeutic benefits\n` +
           `• Systemic improvements\n` +
           `• Optimal healing response\n\n` +
           `**Factors Affecting Response:**\n` +
           `• Preparation method used\n` +
           `• Individual constitution and health\n` +
           `• Condition being treated\n` +
           `• Quality and freshness of plant material\n` +
           `• Consistency of use\n\n` +
           `**Monitoring Your Response:**\n` +
           `• Keep a journal of effects\n` +
           `• Note any side effects\n` +
           `• Adjust dosage as needed\n` +
           `• Consult healthcare provider if concerns arise`;
  }
  
  if (questionLower.includes('combine') || questionLower.includes('herbs') || questionLower.includes('mix')) {
    return `**🌿 Combining ${plantDisplayName} with Other Herbs**\n\n` +
           `**Common Herbal Combinations:**\n\n` +
           `😌 **Calming Combinations**:\n` +
           `• Chamomile + Lavender + Valerian\n` +
           `• Lemon Balm + Passionflower\n` +
           `• Skullcap + Hops\n\n` +
           `🫁 **Respiratory Support**:\n` +
           `• Thyme + Eucalyptus + Peppermint\n` +
           `• Mullein + Coltsfoot + Licorice\n` +
           `• Elderberry + Ginger + Honey\n\n` +
           `🩸 **Immune Support**:\n` +
           `• Echinacea + Astragalus + Elderberry\n` +
           `• Garlic + Ginger + Turmeric\n` +
           `• Reishi + Chaga + Turkey Tail\n\n` +
           `💚 **Digestive Support**:\n` +
           `• Ginger + Peppermint + Fennel\n` +
           `• Chamomile + Marshmallow + Slippery Elm\n` +
           `• Dandelion + Milk Thistle + Burdock\n\n` +
           `**⚠️ Important Guidelines:**\n` +
           `• Research interactions before combining\n` +
           `• Start with one herb at a time\n` +
           `• Consult with qualified herbalist\n` +
           `• Some combinations may enhance or reduce effects\n` +
           `• Be aware of potential contraindications`;
  }
  
  if (questionLower.includes('contraindication') || questionLower.includes('avoid') || questionLower.includes('not safe')) {
    return `**🚫 Contraindications for ${plantDisplayName}**\n\n` +
           `**When to Avoid This Plant:**\n\n` +
           `🤰 **Pregnancy & Breastfeeding**:\n` +
           `• Avoid unless specifically approved by healthcare provider\n` +
           `• Many herbs can affect pregnancy\n` +
           `• Some may pass into breast milk\n\n` +
           `👶 **Children**:\n` +
           `• Children under 12 should avoid unless approved by pediatrician\n` +
           `• Children's bodies process herbs differently\n` +
           `• Lower body weight means higher risk\n\n` +
           `🏥 **Medical Conditions**:\n` +
           `• Liver or kidney disease\n` +
           `• Heart conditions\n` +
           `• Autoimmune disorders\n` +
           `• Diabetes (may affect blood sugar)\n` +
           `• Bleeding disorders\n\n` +
           `💊 **Medication Interactions**:\n` +
           `• Blood thinners\n` +
           `• Diabetes medications\n` +
           `• Blood pressure medications\n` +
           `• Sedatives or antidepressants\n` +
           `• Always check with pharmacist or doctor\n\n` +
           `🔍 **Allergies**:\n` +
           `• Known allergies to this plant family\n` +
           `• Cross-reactions with related plants\n` +
           `• Environmental allergies that may be aggravated\n\n` +
           `**Always consult healthcare provider before use, especially if you have any medical conditions or take medications.**`;
  }
  
  if (questionLower.includes('store') || questionLower.includes('storage') || questionLower.includes('preserve')) {
    return `**📦 Storage Guidelines for ${plantDisplayName}**\n\n` +
           `**Optimal Storage Conditions:**\n\n` +
           `🌿 **Dried Herbs**:\n` +
           `• Store in airtight glass containers\n` +
           `• Keep in cool, dark, dry location\n` +
           `• Avoid direct sunlight and moisture\n` +
           `• Use within 1-2 years for best potency\n` +
           `• Label with harvest date\n\n` +
           `🍶 **Tinctures**:\n` +
           `• Store in dark glass bottles\n` +
           `• Keep in cool, dark location\n` +
           `• Refrigerate for longer shelf life\n` +
           `• Use within 3-5 years\n` +
           `• Check for cloudiness or off-odors\n\n` +
           `🫙 **Oils & Salves**:\n` +
           `• Store in dark glass containers\n` +
           `• Keep in refrigerator\n` +
           `• Use within 6-12 months\n` +
           `• Check for rancidity\n\n` +
           `🌱 **Fresh Preparations**:\n` +
           `• Refrigerate and use within 1 week\n` +
           `• Freeze for longer storage\n` +
           `• Label with preparation date\n` +
           `• Discard if mold or off-odors develop\n\n` +
           `**Storage Tips:**\n` +
           `• Keep away from heat sources\n` +
           `• Maintain consistent temperature\n` +
           `• Check regularly for signs of spoilage\n` +
           `• Rotate stock (first in, first out)`;
  }
  
  if (questionLower.includes('harvest') || questionLower.includes('time of year') || questionLower.includes('when to pick')) {
    return `**🌱 Best Harvest Times for ${plantDisplayName}**\n\n` +
           `**Seasonal Harvesting Guide:**\n\n` +
           `🌸 **Spring Harvest** (March-May):\n` +
           `• New leaves and shoots\n` +
           `• Early flowers and buds\n` +
           `• Fresh, tender growth\n` +
           `• Highest in vitamins and minerals\n\n` +
           `☀️ **Summer Harvest** (June-August):\n` +
           `• Full blooms and flowers\n` +
           `• Peak medicinal compounds\n` +
           `• Mature leaves\n` +
           `• Optimal essential oil content\n\n` +
           `🍂 **Fall Harvest** (September-November):\n` +
           `• Roots and rhizomes\n` +
           `• Seeds and berries\n` +
           `• Bark (if applicable)\n` +
           `• Plants storing energy for winter\n\n` +
           `❄️ **Winter Harvest** (December-February):\n` +
           `• Dormant roots\n` +
           `• Evergreen leaves\n` +
           `• Bark from deciduous trees\n` +
           `• Limited but valuable harvests\n\n` +
           `**Harvesting Best Practices:**\n` +
           `• Harvest in morning after dew dries\n` +
           `• Choose healthy, disease-free plants\n` +
           `• Leave enough for plant regeneration\n` +
           `• Follow sustainable harvesting practices\n` +
           `• Respect local regulations and private property`;
  }
  
  // Default comprehensive response
  return `**🌿 About ${plantDisplayName}**\n\n` +
         `Thank you for your question about ${plantDisplayName}!\n\n` +
         `**Traditional Knowledge:**\n` +
         `${traditionalUsage || 'This plant has been used in traditional medicine for various purposes.'}\n\n` +
         `**Medicinal Properties:**\n` +
         `${medicinalTags.length > 0 ? medicinalTags.join(', ') : 'Various traditional medicinal properties'}\n\n` +
         `**For Specific Information, Ask About:**\n` +
         `• Preparation methods and recipes\n` +
         `• Which parts of the plant to use\n` +
         `• Safety precautions and contraindications\n` +
         `• Dosage guidelines\n` +
         `• Expected effects and timeline\n` +
         `• Combining with other herbs\n` +
         `• Storage and preservation\n` +
         `• Best harvesting times\n\n` +
         `**⚠️ Important:** Always consult with qualified healthcare providers before using any medicinal plants. This information is for educational purposes and traditional knowledge sharing.`;
};

const getPartDescription = (part: string): string => {
  const descriptions: { [key: string]: string } = {
    leaves: 'Often used for teas, infusions, and tinctures',
    flowers: 'Used in tinctures, salves, and teas',
    roots: 'Typically prepared as decoctions or tinctures',
    bark: 'Used in traditional medicine preparations',
    seeds: 'Can be used whole, ground, or as oils',
    berries: 'Used fresh, dried, or in syrups',
    stems: 'Sometimes used in teas and preparations'
  };
  return descriptions[part] || 'Used in various traditional preparations';
};

// Build comprehensive context for medicinal Q&A
function buildMedicinalContext(
  plant: any, 
  allSightings: any[], 
  plantFeedback: any[],
  plantRejections: any[],
  collectionStats: any
): string {
  let context = `**Plant Information:**\n`;
  context += `- Scientific Name: ${plant.scientificName}\n`;
  context += `- Common Names: ${plant.commonNames?.join(', ') || 'Unknown'}\n`;
  context += `- Traditional Usage: ${plant.traditionalUsage || 'Traditional uses being documented'}\n`;
  context += `- Medicinal Properties: ${plant.medicinalTags?.join(', ') || 'Various traditional properties'}\n`;
  
  if (plant.growingConditions) context += `- Growing Conditions: ${plant.growingConditions}\n`;
  if (plant.seasonInfo) context += `- Seasonal Information: ${plant.seasonInfo}\n`;
  if (plant.toxicity) context += `- Safety Notes: ${plant.toxicity}\n`;
  if (plant.otherDetails) context += `- Additional Details: ${plant.otherDetails}\n`;
  
  // Collection context
  if (allSightings.length > 0) {
    context += `\n**Your Collection Context:**\n`;
    context += `- Total sightings of this plant: ${allSightings.length}\n`;
    
    const locations = allSightings.filter(s => s.latitude && s.longitude);
    if (locations.length > 0) {
      context += `- Found in ${locations.length} different locations\n`;
    }
    
    const experiences = allSightings.filter(s => s.userExperience);
    if (experiences.length > 0) {
      context += `- ${experiences.length} sightings with personal experiences documented\n`;
    }
  }

  // Plant feedback context
  if (plantFeedback.length > 0) {
    context += `\n**Your Feedback & Experiences:**\n`;
    plantFeedback.forEach((feedback, index) => {
      context += `- Feedback ${index + 1}: ${feedback.feedback}\n`;
    });
  }

  // Plant rejections context (learning from mistakes)
  if (plantRejections.length > 0) {
    context += `\n**Related Identification Challenges:**\n`;
    context += `- You've encountered ${plantRejections.length} similar plants that were misidentified\n`;
    plantRejections.forEach((rejection, index) => {
      context += `- Rejected as: ${rejection.rejectedPlantName}\n`;
    });
  }

  // Overall collection statistics
  context += `\n**Your Overall Collection:**\n`;
  context += `- Total plants in your collection: ${collectionStats.totalPlants}\n`;
  context += `- Total sightings across all plants: ${collectionStats.totalSightings}\n`;
  context += `- Plants with documented experiences: ${collectionStats.plantsWithFeedback}\n`;
  context += `- Total feedback entries: ${collectionStats.totalFeedback}\n`;
  
  return context;
}

// Generate medicinal response with enhanced context
async function generateMedicinalResponseWithContext(
  plantName: string,
  scientificName: string,
  traditionalUsage: string,
  medicinalTags: string[],
  question: string,
  context: string
): Promise<string> {
  // Log the context for debugging
  console.log("=== MEDICINAL Q&A CONTEXT DEBUG ===");
  console.log("Plant:", scientificName);
  console.log("Context Length:", context.length);
  console.log("Question:", question);
  console.log("=== END MEDICINAL Q&A CONTEXT DEBUG ===");

  // For now, use the existing response generation but include context
  const baseResponse = await generateMedicinalResponse(
    plantName,
    scientificName,
    traditionalUsage,
    medicinalTags,
    question
  );

  // Add context information to the response
  return `${baseResponse}\n\n**Your Personal Context:**\n${context}`;
}

export const askMedicinalQuestion = query({
  args: {
    plantId: v.id("plants"),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("🌿 MEDICINAL Q&A FUNCTION CALLED - ENHANCED VERSION");
    console.log("🚨 MEDICINAL Q&A NEW VERSION - IF YOU SEE THIS, THE DEPLOYMENT WORKED!");
    
    // Get comprehensive plant and user data
    const plant = await ctx.db.get(args.plantId);
    if (!plant) {
      throw new Error("Plant not found");
    }

    // Get all sightings for this plant
    const allSightings = await ctx.db
      .query("sightings")
      .withIndex("plantId", (q) => q.eq("plantId", args.plantId))
      .collect();

    // Get plant feedback
    const plantFeedback = await ctx.db
      .query("plant_feedback")
      .withIndex("plantId", (q) => q.eq("plantId", args.plantId))
      .collect();

    // Get plant rejections (related plants that were misidentified)
    const allRejections = await ctx.db
      .query("plant_rejections")
      .collect();
    
    const plantRejections = allRejections.filter(rejection => {
      const plantNames = [plant.scientificName, ...(plant.commonNames || [])];
      return plantNames.some(name => 
        rejection.rejectedPlantName.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(rejection.rejectedPlantName.toLowerCase())
      );
    });

    // Get collection statistics
    const allPlants = await ctx.db.query("plants").collect();
    const allSightingsTotal = await ctx.db.query("sightings").collect();
    const allFeedback = await ctx.db.query("plant_feedback").collect();
    const allRejectionsTotal = await ctx.db.query("plant_rejections").collect();
    
    const collectionStats = {
      totalPlants: allPlants.length,
      totalSightings: allSightingsTotal.length,
      totalFeedback: allFeedback.length,
      totalRejections: allRejectionsTotal.length,
      plantsWithSightings: new Set(allSightingsTotal.map(s => s.plantId)).size,
      plantsWithFeedback: new Set(allFeedback.map(f => f.plantId)).size,
    };

    // Log the data retrieved from database
    console.log("=== MEDICINAL Q&A - DATABASE QUERY RESULTS ===");
    console.log("Plant retrieved:", !!plant);
    console.log("All Sightings retrieved:", allSightings.length);
    console.log("Plant Feedback retrieved:", plantFeedback.length);
    console.log("Plant Rejections retrieved:", plantRejections.length);
    console.log("Collection Stats retrieved:", !!collectionStats);
    console.log("=== END MEDICINAL Q&A DATABASE QUERIES ===");

    // Build comprehensive context
    const context = buildMedicinalContext(plant, allSightings, plantFeedback, plantRejections, collectionStats);
    
    // Generate response with enhanced context
    const response = await generateMedicinalResponseWithContext(
      plant.commonNames?.[0] || plant.scientificName,
      plant.scientificName,
      plant.traditionalUsage || "",
      plant.medicinalTags || [],
      args.question,
      context
    );

    return {
      response,
      plantName: plant.commonNames?.[0] || plant.scientificName,
      timestamp: Date.now()
    };
  },
});

// Store Q&A interactions for learning
export const storeMedicinalQA = mutation({
  args: {
    plantId: v.id("plants"),
    question: v.string(),
    response: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // In a real app, you might store this in a separate table
    // for analytics and improving responses
    console.log("Storing Q&A interaction:", {
      plantId: args.plantId,
      question: args.question,
      response: args.response,
      userId: args.userId,
      timestamp: Date.now()
    });
    
    return { success: true };
  },
}); 