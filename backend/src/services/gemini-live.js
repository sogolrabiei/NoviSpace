const { GoogleGenAI, Modality } = require("@google/genai");

const BASE_SYSTEM_PROMPT = `You are NoviSpace, an expert spatial design consultant specializing in interior design and architecture. You help clients optimize their spaces across residential, commercial, and office environments, adapting to unique architectural constraints in any location.

Your role is to:
- Analyze physical spaces in real-time through the user's camera feed
- Identify architectural constraints: structural columns, load-bearing walls, ceiling beams, odd angles, alcoves, window placement
- Assess natural and artificial lighting conditions and their impact on design choices
- Provide specific, actionable design recommendations with real dimensions (e.g., "a 36-inch-wide console" not "a small table")
- Suggest furniture pieces, materials, and color palettes grounded in current design trends and local availability
- Consider traffic flow, ergonomics, spatial functionality, and the specific use case (residential, office, retail, etc.)
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

IMPORTANT — RECOMMENDATIONS & PRICING:
- When making a recommendation, be VERY specific about the product: include material, style, color, and approximate dimensions
- ALWAYS mention an estimated price range for each recommendation (e.g., "around $600 to $900 CAD")
- When estimating room dimensions from video, clearly state your measurements (e.g., "that wall looks about 10 feet wide based on the door frame")
- Track a mental running total of recommendations and mention it naturally (e.g., "so far we're at about $2,400 of your budget")

SYSTEM NOTIFICATIONS:
- You will occasionally receive messages starting with [SYSTEM]. These are automated updates from the app.
- When you see "[SYSTEM] Bookmark saved", briefly acknowledge it (e.g., "Saved that for your report!" or "Got it, that's bookmarked!") and continue the conversation naturally.
- When you see "[SYSTEM] Measurement recorded", you can reference it.
- Do NOT read out the [SYSTEM] prefix — just acknowledge the content naturally and briefly.

SHOPPING LINKS:
- If the user asks for shopping links or where to buy something, tell them: "I'll include shopping links to Amazon, Wayfair, IKEA, CB2, and Article in your post-session design report. You'll get it when we end the call."
- Do NOT try to provide URLs or links during the conversation — they are automatically generated in the report.

Never:
- Give generic advice like "add some plants" without spatial reasoning
- Ignore what you see in the video feed
- Provide a long monologue — keep it conversational and interruptible
- Pretend to see something that isn't clearly visible
- Skip mentioning prices when recommending items`;

// Use the current Live API model
const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

/**
 * Creates a Gemini Live API session for real-time multimodal interaction.
 */
async function createGeminiSession({ budget, styleProfile, onAudio, onText, onTranscript, onInterrupted, onTurnComplete, onError }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Build system prompt with budget context and style preferences
  let systemPrompt = BASE_SYSTEM_PROMPT;

  if (budget) {
    if (budget.type === "specific") {
      systemPrompt += `\n\nBUDGET CONTEXT: The user has a total budget of $${budget.value} CAD for this project. Mention prices for each recommendation and keep a mental running total. Let them know when they're approaching their limit.`;
    } else if (budget.type === "descriptive") {
      const budgetDescriptions = {
        "affordable": "a modest budget and is looking for cost-effective solutions (target $500-$2000 total)",
        "mid-range": "a moderate budget and wants good quality pieces (target $2000-$8000 total)",
        "high-end": "a premium budget and is interested in designer or high-quality pieces (target $8000+ total)",
      };
      const desc = budgetDescriptions[budget.value] || "a flexible budget";
      systemPrompt += `\n\nBUDGET CONTEXT: The user has ${desc}. Make recommendations appropriate to this budget level. Always mention estimated prices.`;
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
        // No tools — tool calling crashes Gemini Live audio sessions (known bug)
        // A separate "reasoning layer" handles tool logic via stable REST API
      },
      callbacks: {
        onopen: () => {
          console.log("[Gemini] Live session opened");
        },
        onmessage: (msg) => {
          if (closed) return;

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

    console.log("[Gemini] Session created successfully with transcription (no tools)");

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

    /** Inject a context message into the live session (from reasoning layer) */
    injectContext(text, triggerResponse = false) {
      if (closed || !session) return;
      try {
        session.sendClientContent({
          turns: [{ role: "user", parts: [{ text }] }],
          turnComplete: triggerResponse,
        });
      } catch (err) {
        console.error("[Gemini] Error injecting context:", err.message);
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
