const { GoogleGenAI, Modality } = require("@google/genai");

const SYSTEM_PROMPT = `You are NoviSpace, an expert spatial design consultant with 15+ years of experience in residential interior design and architecture. You specialize in helping homeowners optimize their living spaces, particularly in urban high-rise environments with unique constraints like Toronto condos.

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
- Budget-conscious alternatives when appropriate

Never:
- Give generic advice like "add some plants" without spatial reasoning
- Ignore what you see in the video feed
- Provide a long monologue — keep it conversational and interruptible
- Pretend to see something that isn't clearly visible`;

// Use the current Live API model (gemini-2.0-flash-live-001 was deprecated)
const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

/**
 * Creates a Gemini Live API session for real-time multimodal interaction.
 * Uses the Multimodal Live API for streaming audio/video input and audio output.
 */
async function createGeminiSession({ onAudio, onText, onInterrupted, onTurnComplete, onError }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  const ai = new GoogleGenAI({ apiKey });

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
          parts: [{ text: SYSTEM_PROMPT }],
        },
      },
      callbacks: {
        onopen: () => {
          console.log("[Gemini] Live session opened");
        },
        onmessage: (msg) => {
          if (closed) return;

          // Handle server content (audio responses)
          if (msg.serverContent) {
            const sc = msg.serverContent;

            // Check if the model was interrupted
            if (sc.interrupted) {
              console.log("[Gemini] Model interrupted by user");
              onInterrupted();
              return;
            }

            // Check for turn completion
            if (sc.turnComplete) {
              onTurnComplete();
              return;
            }

            // Process model output parts
            if (sc.modelTurn && sc.modelTurn.parts) {
              for (const part of sc.modelTurn.parts) {
                if (part.inlineData && part.inlineData.data) {
                  // Audio response from the model
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
          if (!closed) {
            onError(err);
          }
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

    console.log("[Gemini] Session created successfully");

    // Send a welcome message to trigger the AI to greet the user
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
    /**
     * Send audio data from the user's microphone.
     * @param {string} b64Audio - Base64-encoded PCM16 audio at 16kHz
     */
    sendAudio(b64Audio) {
      if (closed || !session) return;
      try {
        session.sendRealtimeInput({
          audio: {
            data: b64Audio,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      } catch (err) {
        console.error("[Gemini] Error sending audio:", err.message);
      }
    },

    /**
     * Send a video frame from the user's camera.
     * @param {string} b64Image - Base64-encoded JPEG image
     */
    sendVideo(b64Image) {
      if (closed || !session) return;
      try {
        session.sendRealtimeInput({
          video: {
            data: b64Image,
            mimeType: "image/jpeg",
          },
        });
      } catch (err) {
        console.error("[Gemini] Error sending video:", err.message);
      }
    },

    /** Close the Gemini Live session */
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
