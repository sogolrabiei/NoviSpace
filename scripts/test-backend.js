// Quick test script to verify backend WebSocket + Gemini session
const WebSocket = require("ws");

const WS_URL = "wss://novispace-backend-cdenlerfyq-uc.a.run.app/ws";

console.log("Connecting to:", WS_URL);

const ws = new WebSocket(WS_URL);
let sessionStarted = false;
let gotAudio = false;
let gotText = false;
let messageCount = 0;

ws.on("open", () => {
  console.log("[OK] WebSocket connected");
  console.log("Sending start_session...");
  ws.send(JSON.stringify({ type: "start_session" }));
});

ws.on("message", (raw) => {
  const msg = JSON.parse(raw.toString());
  messageCount++;

  switch (msg.type) {
    case "session_started":
      sessionStarted = true;
      console.log("[OK] Session started! Waiting for welcome message from AI...");
      break;
    case "audio":
      if (!gotAudio) {
        gotAudio = true;
        console.log("[OK] Received AUDIO response from Gemini! (" + (msg.data?.length || 0) + " bytes)");
      }
      break;
    case "text":
      gotText = true;
      console.log("[OK] Received TEXT response:", msg.data);
      break;
    case "turn_complete":
      console.log("[OK] Turn complete. AI finished speaking.");
      console.log("\n=== TEST RESULTS ===");
      console.log("Session started:", sessionStarted ? "YES" : "NO");
      console.log("Got audio response:", gotAudio ? "YES" : "NO");
      console.log("Got text response:", gotText ? "YES" : "NO");
      console.log("Total messages:", messageCount);
      console.log(gotAudio ? "\n[SUCCESS] Gemini Live API is working!" : "\n[FAIL] No audio from Gemini");
      ws.close();
      break;
    case "error":
      console.error("[ERROR] From backend:", msg.data);
      ws.close();
      break;
    case "interrupted":
      console.log("[INFO] Interrupted");
      break;
    default:
      console.log("[INFO] Unknown message type:", msg.type);
  }
});

ws.on("error", (err) => {
  console.error("[FAIL] WebSocket error:", err.message);
});

ws.on("close", () => {
  console.log("WebSocket closed");
  process.exit(gotAudio ? 0 : 1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log("\n=== TIMEOUT (30s) ===");
  console.log("Session started:", sessionStarted ? "YES" : "NO");
  console.log("Got audio:", gotAudio ? "YES" : "NO");
  console.log("Got text:", gotText ? "YES" : "NO");
  console.log("Total messages:", messageCount);
  if (!sessionStarted) {
    console.log("[FAIL] Session never started");
  } else if (!gotAudio) {
    console.log("[FAIL] No audio response from Gemini within 30s");
  }
  ws.close();
  process.exit(1);
}, 30000);
