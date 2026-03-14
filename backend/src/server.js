require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
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
    timestamp: new Date().toISOString() 
  });
});

// Health check endpoint for Cloud Run
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const server = http.createServer(app);

// WebSocket server for real-time communication
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");
  let geminiSession = null;

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        case "start_session":
          if (geminiSession) {
            geminiSession.close();
          }
          geminiSession = await createGeminiSession({
            onAudio: (b64Audio) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: "audio", data: b64Audio }));
              }
            },
            onText: (text) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: "text", data: text }));
              }
            },
            onInterrupted: () => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: "interrupted" }));
              }
            },
            onTurnComplete: () => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: "turn_complete" }));
              }
            },
            onError: (err) => {
              console.error("[Gemini] Error:", err.message);
              if (ws.readyState === ws.OPEN) {
                ws.send(
                  JSON.stringify({ type: "error", data: err.message })
                );
              }
            },
          });
          ws.send(JSON.stringify({ type: "session_started" }));
          console.log("[WS] Gemini session started");
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
          break;

        case "end_session":
          if (geminiSession) {
            geminiSession.close();
            geminiSession = null;
          }
          ws.send(JSON.stringify({ type: "session_ended" }));
          console.log("[WS] Session ended by client");
          break;

        default:
          console.warn("[WS] Unknown message type:", msg.type);
      }
    } catch (err) {
      console.error("[WS] Error processing message:", err);
      if (ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({ type: "error", data: "Failed to process message" })
        );
      }
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

server.listen(PORT, () => {
  console.log(`[NoviSpace] Backend running on port ${PORT}`);
  console.log(`[NoviSpace] WebSocket path: /ws`);
  console.log(`[NoviSpace] Health check: http://localhost:${PORT}/health`);
});
