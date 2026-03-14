"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Construct WebSocket URL dynamically
const getWebSocketURL = () => {
  if (typeof window === "undefined") return "";
  
  // Use environment variable if available (for local dev)
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  
  // In production, use the backend URL
  const isProduction = window.location.hostname.includes("run.app");
  if (isProduction) {
    return "wss://novispace-backend-cdenlerfyq-uc.a.run.app/ws";
  }
  
  // Local development fallback
  return "ws://localhost:8080/ws";
};

type SessionState = "idle" | "connecting" | "active" | "error";

export default function ConsultPage() {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [statusText, setStatusText] = useState("Ready to connect");
  const [errorText, setErrorText] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunkProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Audio playback queue
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const playbackContextRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    console.log("[NoviSpace] Cleaning up resources...");
    
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (audioChunkProcessorRef.current) {
      try {
        audioChunkProcessorRef.current.disconnect();
      } catch (e) {
        console.warn("Error disconnecting audio processor:", e);
      }
      audioChunkProcessorRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {
        console.warn("Error disconnecting source node:", e);
      }
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch((e) => console.warn("Error closing audio context:", e));
      audioContextRef.current = null;
    }
    
    // Stop all tracks BEFORE clearing streamRef
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`[NoviSpace] Stopped ${track.kind} track`);
      });
      streamRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Force video element to release resources
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    console.log("[NoviSpace] Cleanup complete");
  }, []);

  // Play queued audio from Gemini (PCM 24kHz mono)
  const playNextAudioChunk = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
    }

    isPlayingRef.current = true;
    const samples = audioQueueRef.current.shift()!;
    const ctx = playbackContextRef.current;
    const buffer = ctx.createBuffer(1, samples.length, 24000);
    buffer.getChannelData(0).set(samples);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => {
      isPlayingRef.current = false;
      playNextAudioChunk();
    };
    src.start();
  }, []);

  // Decode base64 PCM16 to Float32Array
  const decodePCM16 = useCallback((b64: string): Float32Array => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }
    return float32;
  }, []);

  const startSession = useCallback(async () => {
    setSessionState("connecting");
    setStatusText("Requesting camera & microphone...");
    setErrorText("");

    try {
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "environment" },
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Set up audio context for capturing mic
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // ScriptProcessor to capture PCM chunks
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      audioChunkProcessorRef.current = processor;
      source.connect(processor);
      processor.connect(audioCtx.destination);

      // Connect WebSocket
      setStatusText("Connecting to NoviSpace...");
      const wsUrl = getWebSocketURL();
      console.log("[NoviSpace] Connecting to WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "start_session" }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "session_started":
            setSessionState("active");
            setStatusText("Live — start talking about your space");

            // Start sending audio chunks
            processor.onaudioprocess = (e) => {
              if (!isMicOn || ws.readyState !== WebSocket.OPEN) return;
              const input = e.inputBuffer.getChannelData(0);
              // Convert float32 to int16 then base64
              const int16 = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) {
                int16[i] = Math.max(
                  -32768,
                  Math.min(32767, Math.round(input[i] * 32768))
                );
              }
              const bytes = new Uint8Array(int16.buffer);
              let binary = "";
              for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const b64 = btoa(binary);
              ws.send(JSON.stringify({ type: "audio", data: b64 }));
            };

            // Start sending video frames (1 fps to avoid overwhelming)
            frameIntervalRef.current = setInterval(() => {
              if (
                !isCamOn ||
                !videoRef.current ||
                !canvasRef.current ||
                ws.readyState !== WebSocket.OPEN
              )
                return;
              const canvas = canvasRef.current;
              const ctx = canvas.getContext("2d");
              if (!ctx) return;
              canvas.width = 640;
              canvas.height = 480;
              ctx.drawImage(videoRef.current, 0, 0, 640, 480);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
              const b64 = dataUrl.split(",")[1];
              ws.send(JSON.stringify({ type: "video", data: b64 }));
            }, 1000);
            break;

          case "audio":
            setAgentSpeaking(true);
            const samples = decodePCM16(msg.data);
            audioQueueRef.current.push(samples);
            playNextAudioChunk();
            break;

          case "text":
            // Optional: could display transcript
            break;

          case "interrupted":
            setAgentSpeaking(false);
            audioQueueRef.current = [];
            isPlayingRef.current = false;
            break;

          case "turn_complete":
            setAgentSpeaking(false);
            break;

          case "error":
            setErrorText(msg.data);
            break;
        }
      };

      ws.onerror = () => {
        setErrorText("Connection error. Is the backend running?");
        setSessionState("error");
      };

      ws.onclose = () => {
        if (sessionState === "active") {
          setStatusText("Disconnected");
          setSessionState("idle");
        }
      };
    } catch (err: any) {
      console.error("Failed to start session:", err);
      setErrorText(
        err.name === "NotAllowedError"
          ? "Camera/microphone permission denied. Please allow access and try again."
          : `Failed to start: ${err.message}`
      );
      setSessionState("error");
      cleanup();
    }
  }, [cleanup, decodePCM16, playNextAudioChunk, isMicOn, isCamOn, sessionState]);

  const endSession = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_session" }));
    }
    cleanup();
    setSessionState("idle");
    setAgentSpeaking(false);
    setStatusText("Session ended");
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-4 bg-background">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">NoviSpace</span>
        </div>
        <div className="w-16" />
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        {/* Video area */}
        <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border bg-secondary/30">
          <div className="aspect-video relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "absolute inset-0 h-full w-full object-cover",
                sessionState === "idle" && "hidden"
              )}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Idle state */}
            {sessionState === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-secondary/50 to-muted/30">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-accent/30">
                  <Video className="h-7 w-7 text-accent/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Camera preview will appear here
                </p>
              </div>
            )}

            {/* Agent speaking indicator */}
            {agentSpeaking && (
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 backdrop-blur-sm border border-accent/20">
                <div className="relative h-2 w-2">
                  <div className="absolute inset-0 animate-ping rounded-full bg-accent" />
                  <div className="absolute inset-0 rounded-full bg-accent" />
                </div>
                <span className="text-xs font-medium text-accent">Agent speaking</span>
              </div>
            )}

            {/* Connecting overlay */}
            {sessionState === "connecting" && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-sm text-foreground/80">{statusText}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">{statusText}</p>
          {errorText && (
            <p className="mt-1 text-sm text-destructive">{errorText}</p>
          )}
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center gap-3">
          {sessionState === "idle" || sessionState === "error" ? (
            <Button
              size="lg"
              onClick={startSession}
              className="gap-2"
            >
              <Video className="h-4 w-4" />
              Start Live Consultation
            </Button>
          ) : (
            <>
              <Button
                variant={isMicOn ? "secondary" : "destructive"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => {
                  setIsMicOn(!isMicOn);
                  streamRef.current
                    ?.getAudioTracks()
                    .forEach((t) => (t.enabled = !isMicOn));
                }}
              >
                {isMicOn ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="destructive"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={endSession}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>

              <Button
                variant={isCamOn ? "secondary" : "destructive"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => {
                  setIsCamOn(!isCamOn);
                  streamRef.current
                    ?.getVideoTracks()
                    .forEach((t) => (t.enabled = !isCamOn));
                }}
              >
                {isCamOn ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
