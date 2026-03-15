const { GoogleGenAI, Modality } = require("@google/genai");

const BASE_SYSTEM_PROMPT = `You are NoviSpace, an expert spatial design consultant with 15+ years of experience in residential interior design and architecture. You specialize in helping homeowners optimize their living spaces, particularly in urban high-rise environments with unique constraints like Toronto condos.

Your role is to:
- Analyze physical spaces in real-time through the user's camera feed
- Identify architectural constraints: structural columns, load-bearing walls, ceiling beams, odd angles, alcoves
- Assess natural and artificial lighting conditions and their impact on design choices
- Provide specific, actionable design recommendations with real dimensions (e.g., "a 36-inch-wide console" not "a small table")
- Suggest furniture pieces, materials, and color palettes grounded in current design trends
- Consider traffic flow, ergonomics, and spatial functionality
- Adapt recommendations instantly when the user interrupts or changes direction

Communication style:
- Professional yet warm and conversational — like a trusted designer friend
- Lead with observations about what you see before making suggestions
- Be specific: mention actual dimensions, materials (walnut, oak, linen, bouclé), and brand-agnostic product types
- Acknowledge constraints first, then reframe them as design opportunities
- When interrupted, respond naturally — "Got it, let's pivot" or "Ah, interesting — in that case..."
- Ask one clarifying question at a time when needed, never a list of questions
- Keep responses concise and focused — this is a live conversation, not a lecture

When analyzing a space, always consider:
- Natural light direction, intensity, and time-of-day impact
- Structural elements that cannot be moved
- Room proportions and ceiling height
- Existing furniture and how it interacts with the space
- Traffic flow and clearance requirements (minimum 36 inches for walkways)
- The user's stated needs, lifestyle, and aesthetic preferences

TOOLS — You have access to tools. USE THEM ACTIVELY:

1. bookmark_idea — When the user says "save that", "bookmark this", "I love that", "remember that", "let's do that", or expresses strong interest in an idea, ALWAYS call bookmark_idea to save it. Also call it when you make a recommendation you think is particularly good. After calling it, confirm briefly: "Saved that for your report!"

2. update_budget_tracker — After EVERY furniture or decor recommendation, call this to track the running cost. Always mention the price range in conversation and how much budget is left.

3. record_measurement — When you identify or estimate room dimensions from the video (using doors as ~80" tall reference, windows, or objects the user shows), record them. Proactively ask about room dimensions if you haven't yet. Look for standard doors, credit cards, or other reference objects.

4. generate_before_after — When the user asks "show me what that would look like" or "can you visualize that", or when you've made several suggestions for one area, offer to generate a before/after visualization.

SHOPPING LINKS:
- If the user asks for shopping links or where to buy something during the call, tell them: "I'll include shopping links to Amazon, Wayfair, IKEA, CB2, and Article in your post-session design report. You'll get it when we end the call."
- Do NOT try to provide URLs or links during the conversation — they will be automatically generated in the report.

Never:
- Give generic advice like "add some plants" without spatial reasoning
- Ignore what you see in the video feed
- Provide a long monologue — keep it conversational and interruptible
- Pretend to see something that isn't clearly visible
- Forget to use budget_tracker after recommending items
- Miss a bookmark opportunity when the user expresses excitement`;

// Use the current Live API model
const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

// Function declarations for Gemini tool use
const TOOL_DECLARATIONS = [
  {
    name: "bookmark_idea",
    description: "Save/bookmark the current design idea when the user expresses strong interest or explicitly asks to save something. Call this when you hear 'save that', 'bookmark this', 'I love that', 'remember that', 'let's do that', or similar expressions of interest.",
    parameters: {
      type: "object",
      properties: {
        recommendation: { type: "string", description: "The specific recommendation being bookmarked" },
        category: { type: "string", enum: ["furniture", "color", "layout", "lighting", "storage", "decor", "other"], description: "Category of the recommendation" },
        tags: { type: "array", items: { type: "string" }, description: "Relevant tags for this idea" },
        estimatedPrice: { type: "string", description: "Rough price range if applicable, e.g. '$400-$800'" },
      },
      required: ["recommendation", "category"],
    },
  },
  {
    name: "update_budget_tracker",
    description: "Update the running budget total after making a furniture or decor recommendation. Call this EVERY TIME you suggest a specific item with a price.",
    parameters: {
      type: "object",
      properties: {
        item: { type: "string", description: "Name of the item recommended" },
        estimatedCost: { type: "number", description: "Midpoint cost estimate in CAD" },
        runningTotal: { type: "number", description: "Running total of all recommendations so far in CAD" },
        budgetRemaining: { type: "number", description: "How much budget is left in CAD" },
      },
      required: ["item", "estimatedCost", "runningTotal"],
    },
  },
  {
    name: "record_measurement",
    description: "Record a room measurement estimated from the video feed or provided by the user. Use reference objects like doors (standard 80 inches tall), windows, credit cards, etc. to estimate dimensions.",
    parameters: {
      type: "object",
      properties: {
        label: { type: "string", description: "What was measured, e.g. 'living room width', 'ceiling height'" },
        value: { type: "string", description: "Estimated measurement, e.g. '3.2m' or '10.5ft'" },
        confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confidence in the estimate" },
        method: { type: "string", description: "How it was measured: reference_object, user_provided, visual_estimate" },
      },
      required: ["label", "value", "confidence"],
    },
  },
  {
    name: "generate_before_after",
    description: "Generate a before/after visualization showing the current space with suggested design changes applied. Use when user asks to see what changes would look like, or after making several recommendations for one area.",
    parameters: {
      type: "object",
      properties: {
        changes: { type: "string", description: "Detailed description of all design changes to visualize" },
        style: { type: "string", description: "Target design style, e.g. 'mid-century modern', 'scandinavian'" },
      },
      required: ["changes"],
    },
  },
];

/**
 * Build the full system prompt with budget context
 */
function buildSystemPrompt(budget) {
  let prompt = BASE_SYSTEM_PROMPT;
  if (budget) {
    const budgetRanges = {
      affordable: "under $2,000 CAD",
      "mid-range": "$2,000-$5,000 CAD",
      "high-end": "$5,000-$15,000 CAD",
    };
    const budgetStr = budget.type === "specific"
      ? `$${budget.value} CAD`
      : budgetRanges[budget.value] || budget.value;

    prompt += `\n\nUSER BUDGET: ${budgetStr}
Budget rules:
- Always recommend items within the stated budget
- Track a running total using the update_budget_tracker tool after EACH recommendation
- If approaching the budget limit, mention it naturally
- For 'affordable': prioritize IKEA, thrift finds, and DIY options
- For 'mid-range': mix IKEA with Article, CB2, West Elm
- For 'high-end': recommend Design Within Reach, RH, custom pieces`;
  }

  return prompt;
}

/**
 * Creates a Gemini Live API session for real-time multimodal interaction.
 */
async function createGeminiSession({ budget, styleProfile, onAudio, onText, onTranscript, onInterrupted, onTurnComplete, onError, onToolCall }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Build system prompt with budget context and style preferences
  let systemPrompt = BASE_SYSTEM_PROMPT;

  if (budget) {
    if (budget.type === "specific") {
      systemPrompt += `\n\nBUDGET CONTEXT: The user has a total budget of $${budget.value} CAD for this project. Track all recommendations using the update_budget_tracker tool and keep them aware of remaining budget.`;
    } else if (budget.type === "descriptive") {
      const budgetDescriptions = {
        "affordable": "a modest budget and is looking for cost-effective solutions (target $500-$2000 total)",
        "mid-range": "a moderate budget and wants good quality pieces (target $2000-$8000 total)",
        "high-end": "a premium budget and is interested in designer or high-quality pieces (target $8000+ total)",
      };
      const desc = budgetDescriptions[budget.value] || "a flexible budget";
      systemPrompt += `\n\nBUDGET CONTEXT: The user has ${desc}. Make recommendations appropriate to this budget level. Track spending using update_budget_tracker.`;
    }
  }

  if (styleProfile && styleProfile.topStyles && styleProfile.topStyles.length > 0) {
    const styleList = styleProfile.topStyles.map(s => `${s.label} (${s.percentage}%)`).join(", ");
    systemPrompt += `\n\nSTYLE PREFERENCES: The user took a design style quiz and their top preferences are: ${styleList}. Keep these style preferences in mind when making recommendations. Suggest furniture, colors, materials, and layouts that align with these aesthetics.`;
  }

  const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

  let session = null;
  let closed = false;

  console.log("[Gemini] Creating live session with model:", LIVE_MODEL);

  try {
    session = await ai.live.connect({
      model: LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore",
            },
          },
        },
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        // Enable transcription for both input and output
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        // Tools for function calling
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      },
      callbacks: {
        onopen: () => {
          console.log("[Gemini] Live session opened");
        },
        onmessage: (msg) => {
          if (closed) return;

          // Handle tool calls
          if (msg.toolCall) {
            const calls = msg.toolCall.functionCalls || [];
            for (const fn of calls) {
              console.log("[Gemini] Tool call:", fn.name, JSON.stringify(fn.args));
              if (onToolCall) {
                onToolCall(fn.name, fn.args, fn.id);
              }
            }
            return;
          }

          // Handle server content (audio, transcriptions)
          if (msg.serverContent) {
            const sc = msg.serverContent;

            if (sc.interrupted) {
              console.log("[Gemini] Model interrupted by user");
              onInterrupted();
              return;
            }

            if (sc.turnComplete) {
              onTurnComplete();
              return;
            }

            // Output transcription (AI's words as text)
            if (sc.outputTranscription && sc.outputTranscription.text) {
              if (onTranscript) onTranscript("agent", sc.outputTranscription.text);
            }

            // Input transcription (user's words as text)
            if (sc.inputTranscription && sc.inputTranscription.text) {
              if (onTranscript) onTranscript("user", sc.inputTranscription.text);
            }

            // Process model output parts (audio + text)
            if (sc.modelTurn && sc.modelTurn.parts) {
              for (const part of sc.modelTurn.parts) {
                if (part.inlineData && part.inlineData.data) {
                  onAudio(part.inlineData.data);
                }
                if (part.text) {
                  onText(part.text);
                }
              }
            }
          }
        },
        onerror: (err) => {
          console.error("[Gemini] Session error:", err.message || err);
          if (!closed) onError(err);
        },
        onclose: (event) => {
          console.log("[Gemini] Live session closed. Reason:", event?.reason || "unknown");
          closed = true;
        },
      },
    });

    if (!session) {
      throw new Error("Session object is null after connect()");
    }

    console.log("[Gemini] Session created successfully with tools and transcription");

    // Send welcome message
    session.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [{ text: "Hey! I just connected. Please welcome me warmly and briefly introduce yourself. Let me know I can show you my space with the camera or ask you questions about interior design. Keep it short and friendly." }],
        },
      ],
      turnComplete: true,
    });
    console.log("[Gemini] Sent welcome prompt");

  } catch (err) {
    console.error("[Gemini] Session creation error:", err.message, err.stack);
    onError(err);
    return null;
  }

  return {
    sendAudio(b64Audio) {
      if (closed || !session) return;
      try {
        session.sendRealtimeInput({
          audio: { data: b64Audio, mimeType: "audio/pcm;rate=16000" },
        });
      } catch (err) {
        console.error("[Gemini] Error sending audio:", err.message);
      }
    },

    sendVideo(b64Image) {
      if (closed || !session) return;
      try {
        session.sendRealtimeInput({
          video: { data: b64Image, mimeType: "image/jpeg" },
        });
      } catch (err) {
        console.error("[Gemini] Error sending video:", err.message);
      }
    },

    /** Respond to a tool call */
    sendToolResponse(functionResponses) {
      if (closed || !session) return;
      try {
        session.sendToolResponse({ functionResponses });
      } catch (err) {
        console.error("[Gemini] Error sending tool response:", err.message);
      }
    },

    close() {
      if (closed || !session) return;
      closed = true;
      try {
        session.close();
      } catch (err) {
        console.error("[Gemini] Error closing session:", err.message);
      }
    },
  };
}

module.exports = { createGeminiSession };
