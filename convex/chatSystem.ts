import { action, mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Generate a unique message ID
const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get chat messages for a plant
export const getChatMessages = query({
  args: { 
    plantId: v.id("plants"),
    sightingId: v.optional(v.id("sightings"))
  },
  handler: async (ctx, { plantId, sightingId }) => {
    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("plantId", (q) => q.eq("plantId", plantId))
      .order("asc")
      .collect();

    // If sightingId is provided, filter messages for that specific sighting
    if (sightingId) {
      return messages.filter(msg => msg.sightingId === sightingId);
    }

    return messages;
  },
});

// Send a user message and get AI response with streaming
export const sendMessage = action({
  args: {
    plantId: v.id("plants"),
    sightingId: v.optional(v.id("sightings")),
    content: v.string(),
    messageId: v.string(),
  },
  handler: async (ctx, { plantId, sightingId, content, messageId }) => {
    console.log("🚀 SEND MESSAGE FUNCTION CALLED - NEW VERSION");
    
    // Store user message
    await ctx.runMutation(internal.chatSystem.storeUserMessage, {
      plantId,
      sightingId,
      content,
      messageId,
    });

    // Get comprehensive context including all user data
    const plant = await ctx.runQuery(internal.chatSystem.getPlantContext, { plantId });
    const sighting = sightingId ? await ctx.runQuery(internal.chatSystem.getSightingContext, { sightingId }) : null;
    const allSightings = await ctx.runQuery(internal.chatSystem.getAllSightingsForPlant, { plantId });
    const plantFeedback = await ctx.runQuery(internal.chatSystem.getPlantFeedback, { plantId });
    const plantRejections = await ctx.runQuery(internal.chatSystem.getPlantRejections, { plantId });
    const collectionStats = await ctx.runQuery(internal.chatSystem.getCollectionStats, {});
    const chatHistory = await ctx.runQuery(internal.chatSystem.getChatHistory, { plantId, sightingId });

    // Log the data retrieved from database
    console.log("=== DATABASE QUERY RESULTS ===");
    console.log("Plant retrieved:", !!plant);
    console.log("Sighting retrieved:", !!sighting);
    console.log("All Sightings retrieved:", allSightings.length);
    console.log("Plant Feedback retrieved:", plantFeedback.length);
    console.log("Plant Rejections retrieved:", plantRejections.length);
    console.log("Collection Stats retrieved:", !!collectionStats);
    console.log("Chat History retrieved:", chatHistory.length);
    console.log("=== END DATABASE QUERIES ===");

    // Generate AI response with streaming
    const aiMessageId = generateMessageId();
    const streamResponse = await generateStreamingAIResponse(
      plant, 
      sighting, 
      allSightings, 
      plantFeedback,
      plantRejections,
      collectionStats,
      chatHistory, 
      content,
      aiMessageId,
      plantId,
      sightingId,
      messageId,
      ctx
    );

    return { success: true, aiMessageId, streamResponse };
  },
});

// Edit a message and regenerate conversation from that point
export const editMessage = action({
  args: {
    plantId: v.id("plants"),
    messageId: v.string(),
    newContent: v.string(),
  },
  handler: async (ctx, { plantId, messageId, newContent }) => {
    console.log("🔧 EDIT MESSAGE FUNCTION CALLED - NEW VERSION");
    console.log("🚨 THIS IS THE NEW VERSION - IF YOU SEE THIS, THE DEPLOYMENT WORKED!");
    
    // Update the message
    await ctx.runMutation(internal.chatSystem.updateMessage, {
      messageId,
      newContent,
    });

    // Get all messages up to this point
    const messages = await ctx.runQuery(internal.chatSystem.getChatMessagesInternal, { plantId });
    const messageIndex = messages.findIndex((msg: any) => msg.messageId === messageId);
    
    if (messageIndex === -1) {
      throw new Error("Message not found");
    }

    // Delete all messages after this one (including AI responses)
    const messagesToDelete = messages.slice(messageIndex + 1);
    for (const msg of messagesToDelete) {
      await ctx.runMutation(internal.chatSystem.deleteMessageInternal, { messageId: msg.messageId });
    }

    // If this was a user message, generate new AI response with streaming
    const message = messages[messageIndex];
    if (message.role === "user") {
      // Get comprehensive context for new response
      const plant = await ctx.runQuery(internal.chatSystem.getPlantContext, { plantId });
      const allSightings = await ctx.runQuery(internal.chatSystem.getAllSightingsForPlant, { plantId });
      const plantFeedback = await ctx.runQuery(internal.chatSystem.getPlantFeedback, { plantId });
      const plantRejections = await ctx.runQuery(internal.chatSystem.getPlantRejections, { plantId });
      const collectionStats = await ctx.runQuery(internal.chatSystem.getCollectionStats, {});
      const remainingHistory = messages.slice(0, messageIndex + 1);

      // Log the data retrieved from database
      console.log("=== EDIT MESSAGE - DATABASE QUERY RESULTS ===");
      console.log("Plant retrieved:", !!plant);
      console.log("All Sightings retrieved:", allSightings.length);
      console.log("Plant Feedback retrieved:", plantFeedback.length);
      console.log("Plant Rejections retrieved:", plantRejections.length);
      console.log("Collection Stats retrieved:", !!collectionStats);
      console.log("Chat History retrieved:", remainingHistory.length);
      console.log("=== END EDIT MESSAGE DATABASE QUERIES ===");

      // Generate new AI response with streaming
      const aiMessageId = generateMessageId();
      const streamResponse = await generateStreamingAIResponse(
        plant, 
        null, 
        allSightings, 
        plantFeedback,
        plantRejections,
        collectionStats,
        remainingHistory, 
        newContent,
        aiMessageId,
        plantId,
        message.sightingId,
        messageId,
        ctx
      );

      return { success: true, aiMessageId, streamResponse };
    }

    return { success: true };
  },
});

// Delete a message and all subsequent messages
export const deleteMessage = action({
  args: {
    plantId: v.id("plants"),
    messageId: v.string(),
  },
  handler: async (ctx, { plantId, messageId }) => {
    // Get all messages
    const messages = await ctx.runQuery(internal.chatSystem.getChatMessagesInternal, { plantId });
    const messageIndex = messages.findIndex((msg: any) => msg.messageId === messageId);
    
    if (messageIndex === -1) {
      throw new Error("Message not found");
    }

    // Delete this message and all subsequent messages
    const messagesToDelete = messages.slice(messageIndex);
    for (const msg of messagesToDelete) {
      await ctx.runMutation(internal.chatSystem.deleteMessageInternal, { messageId: msg.messageId });
    }

    return { success: true };
  },
});

// Internal mutations
export const storeUserMessage = internalMutation({
  args: {
    plantId: v.id("plants"),
    sightingId: v.optional(v.id("sightings")),
    content: v.string(),
    messageId: v.string(),
  },
  handler: async (ctx, { plantId, sightingId, content, messageId }) => {
    await ctx.db.insert("chat_messages", {
      plantId,
      sightingId,
      role: "user",
      content,
      timestamp: Date.now(),
      messageId,
    });
  },
});

export const storeAIMessage = internalMutation({
  args: {
    plantId: v.id("plants"),
    sightingId: v.optional(v.id("sightings")),
    content: v.string(),
    messageId: v.string(),
    parentMessageId: v.optional(v.string()),
  },
  handler: async (ctx, { plantId, sightingId, content, messageId, parentMessageId }) => {
    await ctx.db.insert("chat_messages", {
      plantId,
      sightingId,
      role: "assistant",
      content,
      timestamp: Date.now(),
      messageId,
      parentMessageId,
    });
  },
});

export const updateMessage = internalMutation({
  args: {
    messageId: v.string(),
    newContent: v.string(),
  },
  handler: async (ctx, { messageId, newContent }) => {
    const message = await ctx.db
      .query("chat_messages")
      .withIndex("messageId", (q) => q.eq("messageId", messageId))
      .unique();

    if (message) {
      await ctx.db.patch(message._id, {
        content: newContent,
        isEdited: true,
        editedAt: Date.now(),
      });
    }
  },
});

export const deleteMessageInternal = internalMutation({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db
      .query("chat_messages")
      .withIndex("messageId", (q) => q.eq("messageId", messageId))
      .unique();

    if (message) {
      await ctx.db.delete(message._id);
    }
  },
});

// Migration to clean up old chat messages with invalid fields
export const migrateChatMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allMessages = await ctx.db.query("chat_messages").collect();
    
    for (const message of allMessages) {
      // Check if message has invalid fields
      if ('editedAt' in message || 'isEdited' in message) {
        // Create new message without invalid fields
        const cleanMessage = {
          messageId: message.messageId,
          plantId: message.plantId,
          sightingId: message.sightingId,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          parentMessageId: message.parentMessageId,
        };
        
        // Delete old message and insert clean one
        await ctx.db.delete(message._id);
        await ctx.db.insert("chat_messages", cleanMessage);
      }
    }
    
    return { success: true, processed: allMessages.length };
  },
});

// Public action to run migration
export const runMigration = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; processed: number }> => {
    return await ctx.runMutation(internal.chatSystem.migrateChatMessages, {});
  },
});

// Clean up all existing chat messages to fix schema validation
export const cleanupChatMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allMessages = await ctx.db.query("chat_messages").collect();
    for (const message of allMessages) {
      await ctx.db.delete(message._id);
    }
    return { deleted: allMessages.length };
  },
});

// Public action to run cleanup
export const runCleanup = action({
  args: {},
  handler: async (ctx): Promise<{ deleted: number }> => {
    return await ctx.runMutation(internal.chatSystem.cleanupChatMessages, {});
  },
});

// Internal queries for context
export const getPlantContext = internalQuery({
  args: { plantId: v.id("plants") },
  handler: async (ctx, { plantId }) => {
    return await ctx.db.get(plantId);
  },
});

export const getSightingContext = internalQuery({
  args: { sightingId: v.id("sightings") },
  handler: async (ctx, { sightingId }) => {
    return await ctx.db.get(sightingId);
  },
});

export const getAllSightingsForPlant = internalQuery({
  args: { plantId: v.id("plants") },
  handler: async (ctx, { plantId }) => {
    return await ctx.db
      .query("sightings")
      .withIndex("plantId", (q) => q.eq("plantId", plantId))
      .collect();
  },
});

// NEW: Get all plant feedback for context
export const getPlantFeedback = internalQuery({
  args: { plantId: v.id("plants") },
  handler: async (ctx, { plantId }) => {
    return await ctx.db
      .query("plant_feedback")
      .withIndex("plantId", (q) => q.eq("plantId", plantId))
      .collect();
  },
});

// NEW: Get all plant rejections for context
export const getPlantRejections = internalQuery({
  args: { plantId: v.id("plants") },
  handler: async (ctx, { plantId }) => {
    const plant = await ctx.db.get(plantId);
    if (!plant) return [];
    
    // Get rejections that might be related to this plant
    const allRejections = await ctx.db
      .query("plant_rejections")
      .collect();
    
    // Filter rejections that might be related to this plant's names
    return allRejections.filter(rejection => {
      const plantNames = [plant.scientificName, ...(plant.commonNames || [])];
      return plantNames.some(name => 
        rejection.rejectedPlantName.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(rejection.rejectedPlantName.toLowerCase())
      );
    });
  },
});

// NEW: Get comprehensive collection statistics
export const getCollectionStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allPlants = await ctx.db.query("plants").collect();
    const allSightings = await ctx.db.query("sightings").collect();
    const allFeedback = await ctx.db.query("plant_feedback").collect();
    const allRejections = await ctx.db.query("plant_rejections").collect();
    
    return {
      totalPlants: allPlants.length,
      totalSightings: allSightings.length,
      totalFeedback: allFeedback.length,
      totalRejections: allRejections.length,
      plantsWithSightings: new Set(allSightings.map(s => s.plantId)).size,
      plantsWithFeedback: new Set(allFeedback.map(f => f.plantId)).size,
      // NEW: Include all plant names for context
      allPlantNames: allPlants.map(p => ({
        scientificName: p.scientificName,
        commonNames: p.commonNames || [],
        medicinalTags: p.medicinalTags || []
      }))
    };
  },
});

export const getChatHistory = internalQuery({
  args: { 
    plantId: v.id("plants"),
    sightingId: v.optional(v.id("sightings"))
  },
  handler: async (ctx, { plantId, sightingId }) => {
    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("plantId", (q) => q.eq("plantId", plantId))
      .order("asc")
      .collect();

    if (sightingId) {
      return messages.filter(msg => msg.sightingId === sightingId);
    }

    return messages;
  },
});

export const getChatMessagesInternal = internalQuery({
  args: { 
    plantId: v.id("plants"),
    sightingId: v.optional(v.id("sightings"))
  },
  handler: async (ctx, { plantId, sightingId }) => {
    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("plantId", (q) => q.eq("plantId", plantId))
      .order("asc")
      .collect();

    // If sightingId is provided, filter messages for that specific sighting
    if (sightingId) {
      return messages.filter(msg => msg.sightingId === sightingId);
    }

    return messages;
  },
});

// AI Response Generation
async function generateAIResponse(
  plant: any,
  sighting: any,
  allSightings: any[],
  plantFeedback: any[],
  plantRejections: any[],
  collectionStats: any,
  chatHistory: any[],
  userMessage: string
): Promise<string> {
  // Build context for the AI with comprehensive data
  const context = buildContext(plant, sighting, allSightings, plantFeedback, plantRejections, collectionStats, chatHistory);
  
  // Create the prompt for the AI
  const prompt = createAIPrompt(context, userMessage);
  
  // Log the prompt for debugging
  console.log("=== AI RESPONSE DEBUG ===");
  console.log("Plant:", plant?.scientificName);
  console.log("Sighting:", sighting ? "Present" : "None");
  console.log("All Sightings Count:", allSightings.length);
  console.log("All Sightings Data:", allSightings.map(s => ({ id: s._id, hasLocation: !!(s.latitude && s.longitude), hasExperience: !!s.userExperience })));
  console.log("Plant Feedback Count:", plantFeedback.length);
  console.log("Plant Feedback Data:", plantFeedback.map(f => ({ id: f._id, feedback: f.feedback.substring(0, 50) + "..." })));
  console.log("Plant Rejections Count:", plantRejections.length);
  console.log("Plant Rejections Data:", plantRejections.map(r => ({ id: r._id, rejectedName: r.rejectedPlantName })));
  console.log("Collection Stats:", collectionStats);
  console.log("Chat History Count:", chatHistory.length);
  console.log("Chat History Data:", chatHistory.map(msg => ({ role: msg.role, content: msg.content.substring(0, 30) + "..." })));
  console.log("User Message:", userMessage);
  console.log("Full Prompt Length:", prompt.length);
  console.log("=== END AI RESPONSE DEBUG ===");
  
  try {
    // Call OpenAI API for response
    const response = await callOpenAI(prompt);
    return response;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return "I apologize, but I'm having trouble connecting to my knowledge base right now. Please try again in a moment, or feel free to ask about the traditional uses and properties of this plant based on what we know.";
  }
}

// Streaming AI Response Generation
async function generateStreamingAIResponse(
  plant: any,
  sighting: any,
  allSightings: any[],
  plantFeedback: any[],
  plantRejections: any[],
  collectionStats: any,
  chatHistory: any[],
  userMessage: string,
  aiMessageId: string,
  plantId: string,
  sightingId: string | undefined,
  parentMessageId: string,
  ctx: any
): Promise<string> {
  // Build context for the AI with comprehensive data
  const context = buildContext(plant, sighting, allSightings, plantFeedback, plantRejections, collectionStats, chatHistory);
  
  // Create the prompt for the AI
  const prompt = createAIPrompt(context, userMessage);
  
  // Log the prompt for debugging
  console.log("=== AI PROMPT DEBUG ===");
  console.log("Plant:", plant?.scientificName);
  console.log("Sighting:", sighting ? "Present" : "None");
  console.log("All Sightings Count:", allSightings.length);
  console.log("All Sightings Data:", allSightings.map(s => ({ id: s._id, hasLocation: !!(s.latitude && s.longitude), hasExperience: !!s.userExperience })));
  console.log("Plant Feedback Count:", plantFeedback.length);
  console.log("Plant Feedback Data:", plantFeedback.map(f => ({ id: f._id, feedback: f.feedback.substring(0, 50) + "..." })));
  console.log("Plant Rejections Count:", plantRejections.length);
  console.log("Plant Rejections Data:", plantRejections.map(r => ({ id: r._id, rejectedName: r.rejectedPlantName })));
  console.log("Collection Stats:", collectionStats);
  console.log("Chat History Count:", chatHistory.length);
  console.log("Chat History Data:", chatHistory.map(msg => ({ role: msg.role, content: msg.content.substring(0, 30) + "..." })));
  console.log("User Message:", userMessage);
  console.log("Full Prompt Length:", prompt.length);
  console.log("=== END DEBUG ===");
  
  try {
    // Create initial AI message with "thinking" state
    await ctx.runMutation(internal.chatSystem.storeAIMessage, {
      plantId,
      sightingId,
      content: "Taita is thinking...",
      messageId: aiMessageId,
      parentMessageId,
    });

    // Call OpenAI API with streaming
    const response = await callOpenAIStreaming(prompt, aiMessageId, plantId, sightingId, ctx);
    
    // Update the AI message with the complete response
    await ctx.runMutation(internal.chatSystem.updateMessage, {
      messageId: aiMessageId,
      newContent: response,
    });
    
    return response;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    const errorResponse = "I apologize, but I'm having trouble connecting to my knowledge base right now. Please try again in a moment, or feel free to ask about the traditional uses and properties of this plant based on what we know.";
    
    // Update error response
    await ctx.runMutation(internal.chatSystem.updateMessage, {
      messageId: aiMessageId,
      newContent: errorResponse,
    });
    
    return errorResponse;
  }
}

async function callOpenAIStreaming(prompt: string, aiMessageId: string, plantId: string, sightingId: string | undefined, ctx: any): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are Taita, a knowledgeable yet concise traditional healer. Respond warmly, respectfully, and directly in 120 words or fewer."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 160,
      temperature: 0.5,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  let fullResponse = "";
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return fullResponse;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              // Update the message in the database with the current response
              await ctx.runMutation(internal.chatSystem.updateMessage, {
                messageId: aiMessageId,
                newContent: fullResponse,
              });
            }
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullResponse;
}

function buildContext(
  plant: any, 
  sighting: any, 
  allSightings: any[], 
  plantFeedback: any[],
  plantRejections: any[],
  collectionStats: any,
  chatHistory: any[]
): string {
  let context = `You are a wise Taita (traditional healer) with deep ancestral knowledge of medicinal plants. You speak with warmth, wisdom, and respect for traditional healing practices.\n\n`;
  
  // Plant information
  context += `**Plant Information:**\n`;
  context += `- Scientific Name: ${plant.scientificName}\n`;
  context += `- Common Names: ${plant.commonNames?.join(', ') || 'Unknown'}\n`;
  context += `- Traditional Usage: ${plant.traditionalUsage || 'Traditional uses being documented'}\n`;
  context += `- Medicinal Properties: ${plant.medicinalTags?.join(', ') || 'Various traditional properties'}\n`;
  
  if (plant.growingConditions) context += `- Growing Conditions: ${plant.growingConditions}\n`;
  if (plant.seasonInfo) context += `- Seasonal Information: ${plant.seasonInfo}\n`;
  if (plant.toxicity) context += `- Safety Notes: ${plant.toxicity}\n`;
  if (plant.otherDetails) context += `- Additional Details: ${plant.otherDetails}\n`;
  
  // Sighting-specific information
  if (sighting) {
    context += `\n**This Specific Sighting:**\n`;
    if (sighting.latitude && sighting.longitude) {
      context += `- Location: ${sighting.latitude}, ${sighting.longitude}\n`;
      if (sighting.address) context += `- Address: ${sighting.address}\n`;
    }
    if (sighting.medicinalUses?.length > 0) {
      context += `- Medicinal Uses: ${sighting.medicinalUses.join(', ')}\n`;
    }
    if (sighting.preparationMethods?.length > 0) {
      context += `- Preparation Methods: ${sighting.preparationMethods.join(', ')}\n`;
    }
    if (sighting.partsUsed?.length > 0) {
      context += `- Parts Used: ${sighting.partsUsed.join(', ')}\n`;
    }
    if (sighting.dosageNotes) {
      context += `- Dosage Notes: ${sighting.dosageNotes}\n`;
    }
    if (sighting.userExperience) {
      context += `- Personal Experience: ${sighting.userExperience}\n`;
    }
  }
  
  // Collection context
  if (allSightings.length > 1) {
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
  
  // NEW: Include all plants in your collection for combination suggestions
  if (collectionStats.allPlantNames && collectionStats.allPlantNames.length > 0) {
    // Unique log for debugging
    console.log('🌱 PLANT LIST CONTEXT SECTION:', collectionStats.allPlantNames.length, collectionStats.allPlantNames.map((p: any) => p.scientificName).join(', '));
    context += `\n**Plants in Your Collection (for combination suggestions):**\n`;
    collectionStats.allPlantNames.forEach((plant: any, index: number) => {
      const displayName = plant.commonNames?.[0] || plant.scientificName;
      const properties = plant.medicinalTags?.slice(0, 3).join(', ') || 'traditional properties';
      context += `- ${displayName} (${plant.scientificName}): ${properties}\n`;
    });
  }

  return context;
}

function createAIPrompt(context: string, userMessage: string): string {
  return `
You are Taita, a knowledgeable yet concise traditional healer. Respond warmly, respectfully, and DIRECTLY. Keep answers short (MAX 120 words, ideally 2–4 sentences). Only include information relevant to the user's question and context below – avoid unnecessary ancestral stories.

Guidelines:
- Be concise and clear.
- Answer the question first, then add one helpful tip if needed.
- Use first-person "I" sparingly; speak in a friendly, supportive tone.
- If suggesting plant combinations, ONLY choose from the user's collection list.

Context:
${context}

User Message:
${userMessage}

Answer:
`;
}

async function callOpenAI(prompt: string): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are Taita, a knowledgeable yet concise traditional healer. Respond warmly, respectfully, and directly in 120 words or fewer."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 160,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}