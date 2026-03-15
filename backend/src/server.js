require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const { createGeminiSession } = require("./services/gemini-live");

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

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");
  let geminiSession = null;
  let latestVideoFrame = null; // Store latest frame for before/after
  let sessionTranscript = []; // Accumulate transcript for report
  let sessionBookmarks = []; // Accumulate bookmarks
  let sessionMeasurements = []; // Accumulate measurements
  let sessionBudget = null;

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

          console.log("[Server] Starting session with budget:", sessionBudget, "and style profile:", styleProfile);

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
            },

            onError: (err) => {
              console.error("[Gemini] Error:", err.message);
              send(ws, { type: "error", data: err.message });
            },

            // Transcription callback — relay to frontend and accumulate
            onTranscript: (speaker, text) => {
              send(ws, { type: "transcript", speaker, text });
              sessionTranscript.push({ speaker, text, timestamp: Date.now() });
            },

            // Tool call handler
            onToolCall: (name, args, callId) => {
              handleToolCall(ws, geminiSession, name, args, callId, {
                sessionBookmarks,
                sessionMeasurements,
                latestVideoFrame,
              });
            },
          });

          send(ws, { type: "session_started" });
          console.log("[WS] Gemini session started with budget:", sessionBudget?.value || "none");
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
          // Always store the latest frame for before/after generation
          latestVideoFrame = msg.data;
          break;

        case "end_session":
          if (geminiSession) {
            geminiSession.close();
            geminiSession = null;
          }
          send(ws, { type: "session_ended" });
          console.log("[WS] Session ended. Transcript entries:", sessionTranscript.length, "Bookmarks:", sessionBookmarks.length);
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
    if (geminiSession) {
      geminiSession.close();
      geminiSession = null;
    }
  });

  ws.on("error", (err) => {
    console.error("[WS] WebSocket error:", err);
    if (geminiSession) {
      geminiSession.close();
      geminiSession = null;
    }
  });
});

/**
 * Handle Gemini function/tool calls
 */
function handleToolCall(ws, geminiSession, name, args, callId, context) {
  switch (name) {
    case "bookmark_idea": {
      const bookmark = {
        id: crypto.randomUUID(),
        recommendation: args.recommendation || "",
        category: args.category || "other",
        tags: args.tags || [],
        estimatedPrice: args.estimatedPrice || "",
        timestamp: Date.now(),
      };
      context.sessionBookmarks.push(bookmark);
      send(ws, { type: "bookmark_saved", bookmark });
      console.log("[Tool] Bookmark saved:", bookmark.recommendation.slice(0, 50));

      // Respond to Gemini so it continues
      if (geminiSession) {
        geminiSession.sendToolResponse([
          { name: "bookmark_idea", response: { success: true, bookmarkId: bookmark.id } },
        ]);
      }
      break;
    }

    case "update_budget_tracker": {
      send(ws, {
        type: "budget_update",
        item: args.item || "",
        estimatedCost: args.estimatedCost || 0,
        runningTotal: args.runningTotal || 0,
        budgetRemaining: args.budgetRemaining || 0,
      });
      console.log("[Tool] Budget update: $" + (args.runningTotal || 0) + " spent");

      if (geminiSession) {
        geminiSession.sendToolResponse([
          { name: "update_budget_tracker", response: { tracked: true } },
        ]);
      }
      break;
    }

    case "record_measurement": {
      const measurement = {
        label: args.label || "",
        value: args.value || "",
        confidence: args.confidence || "medium",
        method: args.method || "visual_estimate",
      };
      context.sessionMeasurements.push(measurement);
      send(ws, { type: "measurement", ...measurement });
      console.log("[Tool] Measurement recorded:", measurement.label, measurement.value);

      if (geminiSession) {
        geminiSession.sendToolResponse([
          { name: "record_measurement", response: { recorded: true } },
        ]);
      }
      break;
    }

    case "generate_before_after": {
      console.log("[Tool] Before/after requested:", args.changes?.slice(0, 80));
      // Send the before frame and a placeholder — actual image generation
      // would require Imagen API. For now, send the request info to frontend.
      if (context.latestVideoFrame) {
        send(ws, {
          type: "before_after",
          before: context.latestVideoFrame,
          after: context.latestVideoFrame, // placeholder — same image for now
          description: args.changes || "Design visualization",
        });
      }

      if (geminiSession) {
        geminiSession.sendToolResponse([
          { name: "generate_before_after", response: { generated: true, note: "Visualization sent to user" } },
        ]);
      }
      break;
    }

    default:
      console.warn("[Tool] Unknown tool call:", name);
      if (geminiSession) {
        geminiSession.sendToolResponse([
          { name, response: { error: "Unknown tool" } },
        ]);
      }
  }
}

server.listen(PORT, () => {
  console.log(`[NoviSpace] Backend running on port ${PORT}`);
  console.log(`[NoviSpace] WebSocket path: /ws`);
  console.log(`[NoviSpace] Health check: http://localhost:${PORT}/health`);
});
