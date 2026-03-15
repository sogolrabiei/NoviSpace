require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const { createGeminiSession } = require("./services/gemini-live");
const { ReasoningLayer } = require("./services/reasoning-layer");

const app = express();
const PORT = process.env.PORT || 8080;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.json({
    service: "NoviSpace Backend",
    status: "running",
    websocket: "/ws",
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint for Cloud Run
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const server = http.createServer(app);

// WebSocket server for real-time communication
const wss = new WebSocketServer({ server, path: "/ws" });

function send(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Process reasoning layer results: send events to frontend, inject context into live session
 */
function processReasoningResults(ws, geminiSession, results, context) {
  if (!results) return;

  // Process bookmarks
  for (const b of results.bookmarks) {
    const bookmark = {
      id: crypto.randomUUID(),
      recommendation: b.recommendation || "",
      category: b.category || "other",
      tags: [],
      estimatedPrice: b.estimatedPrice || "",
      timestamp: Date.now(),
    };
    context.sessionBookmarks.push(bookmark);
    send(ws, { type: "bookmark_saved", bookmark });
    console.log("[SplitBrain] Bookmark:", bookmark.recommendation.slice(0, 60));
  }

  // Process measurements
  for (const m of results.measurements) {
    const measurement = {
      label: m.label || "",
      value: m.value || "",
      confidence: m.confidence || "medium",
      method: "visual_estimate",
    };
    context.sessionMeasurements.push(measurement);
    send(ws, { type: "measurement", ...measurement });
    console.log("[SplitBrain] Measurement:", measurement.label, measurement.value);
  }

  // Process budget items
  for (const item of results.budgetItems) {
    send(ws, {
      type: "budget_update",
      item: item.item,
      estimatedCost: item.estimatedCost,
      runningTotal: item.runningTotal,
      budgetRemaining: 0,
    });
    console.log("[SplitBrain] Budget item:", item.item, "$" + item.estimatedCost);
  }
}

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");
  let geminiSession = null;
  let reasoningLayer = null;
  let latestVideoFrame = null;
  let sessionTranscript = [];
  let sessionBookmarks = [];
  let sessionMeasurements = [];
  let sessionBudget = null;
  let analysisTimer = null;     // Debounce timer for reasoning layer

  // Schedule a reasoning layer analysis (debounced — runs 8s after last trigger
  // to let transcript fragments merge AND reduce API call frequency for rate limits)
  function scheduleAnalysis() {
    if (!reasoningLayer || !geminiSession) return;
    if (analysisTimer) clearTimeout(analysisTimer);
    analysisTimer = setTimeout(async () => {
      try {
        const results = await reasoningLayer.analyze();
        processReasoningResults(ws, geminiSession, results, {
          sessionBookmarks,
          sessionMeasurements,
        });
      } catch (err) {
        console.error("[SplitBrain] Analysis error:", err.message);
      }
    }, 8000);
  }

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        case "start_session":
          if (geminiSession) {
            geminiSession.close();
          }

          // Store budget info and style profile from client
          sessionBudget = msg.budget || null;
          const styleProfile = msg.styleProfile || null;
          sessionTranscript = [];
          sessionBookmarks = [];
          sessionMeasurements = [];

          // Create reasoning layer (uses stable Gemini model via REST API)
          const apiKey = process.env.GEMINI_API_KEY;
          reasoningLayer = new ReasoningLayer(apiKey);

          console.log("[Server] Starting split-brain session. Budget:", sessionBudget, "Style:", styleProfile);

          geminiSession = await createGeminiSession({
            budget: sessionBudget,
            styleProfile: styleProfile,

            onAudio: (b64Audio) => {
              send(ws, { type: "audio", data: b64Audio });
            },

            onText: (text) => {
              send(ws, { type: "text", data: text });
            },

            onInterrupted: () => {
              send(ws, { type: "interrupted" });
            },

            onTurnComplete: () => {
              send(ws, { type: "turn_complete" });
              // Agent finished speaking — schedule reasoning layer analysis
              scheduleAnalysis();
            },

            onError: (err) => {
              console.error("[Gemini] Error:", err.message);
              send(ws, { type: "error", data: err.message });
            },

            // Transcription callback — relay to frontend, accumulate, AND feed to reasoning layer
            onTranscript: (speaker, text) => {
              send(ws, { type: "transcript", speaker, text });
              sessionTranscript.push({ speaker, text, timestamp: Date.now() });

              // Feed to reasoning layer
              if (reasoningLayer) {
                reasoningLayer.addEntry(speaker, text);
              }

              // Check for immediate bookmark intent from user
              if (speaker === "user" && reasoningLayer && reasoningLayer.isBookmarkIntent(text)) {
                const agentMsg = reasoningLayer.getLastAgentMessage();
                if (agentMsg) {
                  // Extract concise product description from agent message
                  // 1) Strip conversational filler from the start
                  let cleaned = agentMsg
                    .replace(/^(got it[.!,]?\s*|sure[.!,]?\s*|absolutely[.!,]?\s*|yes[,!.]?\s*(i can hear you[.!]?\s*)?|okay[.!,]?\s*|great[.!,]?\s*|right[.!,]?\s*|of course[.!,]?\s*|sounds good[.!,]?\s*|perfect[.!,]?\s*)/i, "")
                    .replace(/^(so[,]?\s*|well[,]?\s*|now[,]?\s*)/i, "")
                    .trim();
                  if (!cleaned) cleaned = agentMsg;

                  // 2) Take first 1-2 complete sentences
                  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
                  let recText = sentences.slice(0, 2).join(" ").trim();
                  if (recText.length < 15 && cleaned.length > 15) recText = cleaned.slice(0, 150);
                  if (recText.length > 250) recText = sentences[0]?.trim() || cleaned.slice(0, 150);

                  const bookmark = {
                    id: crypto.randomUUID(),
                    recommendation: recText,
                    category: "other",
                    tags: [],
                    estimatedPrice: "",
                    timestamp: Date.now(),
                  };
                  sessionBookmarks.push(bookmark);
                  send(ws, { type: "bookmark_saved", bookmark });
                  console.log("[SplitBrain] Instant bookmark (user intent):", recText.slice(0, 60));

                  // Mark in reasoning layer so it won't re-extract the same bookmark
                  reasoningLayer.markBookmarked(agentMsg);

                  // Inject context — triggerResponse=false so agent picks it up
                  // naturally on its next turn, avoiding a forced double-acknowledgment
                  if (geminiSession) {
                    geminiSession.injectContext(
                      `[SYSTEM] Bookmark saved for the user's report: "${agentMsg.slice(0, 100)}". Next time you speak, briefly confirm it was saved.`,
                      false
                    );
                  }
                }
              }
            },

          });

          send(ws, { type: "session_started" });
          console.log("[WS] Split-brain session started. Budget:", sessionBudget?.value || "none");
          break;

        case "audio":
          if (geminiSession) {
            geminiSession.sendAudio(msg.data);
          }
          break;

        case "video":
          if (geminiSession) {
            geminiSession.sendVideo(msg.data);
          }
          latestVideoFrame = msg.data;
          break;

        case "end_session":
          if (analysisTimer) clearTimeout(analysisTimer);
          if (geminiSession) {
            geminiSession.close();
            geminiSession = null;
          }
          if (reasoningLayer) {
            reasoningLayer.reset();
            reasoningLayer = null;
          }
          send(ws, { type: "session_ended" });
          console.log("[WS] Session ended. Transcript:", sessionTranscript.length, "Bookmarks:", sessionBookmarks.length, "Measurements:", sessionMeasurements.length);
          break;

        default:
          console.warn("[WS] Unknown message type:", msg.type);
      }
    } catch (err) {
      console.error("[WS] Error processing message:", err);
      send(ws, { type: "error", data: "Failed to process message" });
    }
  });

  ws.on("close", () => {
    console.log("[WS] Client disconnected");
    if (analysisTimer) clearTimeout(analysisTimer);
    if (geminiSession) {
      geminiSession.close();
      geminiSession = null;
    }
    if (reasoningLayer) {
      reasoningLayer.reset();
      reasoningLayer = null;
    }
  });

  ws.on("error", (err) => {
    console.error("[WS] WebSocket error:", err);
    if (analysisTimer) clearTimeout(analysisTimer);
    if (geminiSession) {
      geminiSession.close();
      geminiSession = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`[NoviSpace] Backend running on port ${PORT}`);
  console.log(`[NoviSpace] WebSocket path: /ws`);
  console.log(`[NoviSpace] Health check: http://localhost:${PORT}/health`);
});
