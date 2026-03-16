"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  ArrowLeft,
  Loader2,
  MessageSquare,
  Bookmark,
  DollarSign,
  Ruler,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Construct WebSocket URL dynamically
const getWebSocketURL = () => {
  if (typeof window === "undefined") return "";
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  const isProduction = window.location.hostname.includes("run.app") || window.location.hostname.includes("novispace.ca");
  if (isProduction) return "wss://novispace-backend-47043371581.us-central1.run.app/ws";
  return "ws://localhost:8080/ws";
};

type SessionState = "idle" | "connecting" | "active" | "error";

interface TranscriptEntry {
  speaker: "user" | "agent";
  text: string;
  timestamp: number;
}

interface BookmarkEntry {
  id: string;
  recommendation: string;
  category: string;
  tags: string[];
  estimatedPrice?: string;
  timestamp: number;
}

interface MeasurementEntry {
  label: string;
  value: string;
  confidence: string;
}

interface BudgetState {
  type: "specific" | "descriptive";
  value: string;
  spent: number;
  items: { item: string; cost: number }[];
}

interface BeforeAfterEntry {
  before: string;
  after: string;
  description: string;
}

export default function ConsultPage() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [statusText, setStatusText] = useState("Ready to connect");
  const [errorText, setErrorText] = useState("");

  // New feature state
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([]);
  const [budget, setBudget] = useState<BudgetState | null>(null);
  const [beforeAfterImages, setBeforeAfterImages] = useState<BeforeAfterEntry[]>([]);
  const [showTranscript, setShowTranscript] = useState(true);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkToast, setBookmarkToast] = useState("");
  const [showBeforeAfter, setShowBeforeAfter] = useState<BeforeAfterEntry | null>(null);
  const [sessionId, setSessionId] = useState<string>("");

  // Budget selection (pre-session)
  const [budgetSelection, setBudgetSelection] = useState<string>("mid-range");
  const [customBudget, setCustomBudget] = useState<string>("");
  const [showBudgetPicker, setShowBudgetPicker] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunkProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Refs to track latest session data (avoids stale closure in endSession)
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const bookmarksRef = useRef<BookmarkEntry[]>([]);
  const measurementsRef = useRef<MeasurementEntry[]>([]);
  const budgetRef = useRef<BudgetState | null>(null);
  const beforeAfterRef = useRef<BeforeAfterEntry[]>([]);
  const sessionIdRef = useRef<string>("");

  // Gapless audio playback with scheduled buffers
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const schedulerRunningRef = useRef(false);

  const cleanup = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (audioChunkProcessorRef.current) {
      try { audioChunkProcessorRef.current.disconnect(); } catch (e) { /* */ }
      audioChunkProcessorRef.current = null;
    }
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch (e) { /* */ }
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    audioQueueRef.current = [];
    nextPlayTimeRef.current = 0;
    schedulerRunningRef.current = false;
  }, []);

  // Gapless audio scheduler — schedules buffers back-to-back with precise timing
  const scheduleAudio = useCallback(() => {
    if (schedulerRunningRef.current) return;
    schedulerRunningRef.current = true;

    const drain = () => {
      if (!playbackContextRef.current || audioQueueRef.current.length === 0) {
        schedulerRunningRef.current = false;
        return;
      }
      const ctx = playbackContextRef.current;
      // Schedule all queued chunks
      while (audioQueueRef.current.length > 0) {
        const samples = audioQueueRef.current.shift()!;
        const buffer = ctx.createBuffer(1, samples.length, 24000);
        buffer.getChannelData(0).set(samples);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);

        const now = ctx.currentTime;
        // If we've fallen behind, reset the schedule
        if (nextPlayTimeRef.current < now) {
          nextPlayTimeRef.current = now + 0.02; // tiny buffer
        }
        src.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += buffer.duration;
      }
      // Check again shortly for new chunks
      setTimeout(drain, 30);
    };
    drain();
  }, []);

  // Decode base64 PCM16 to Float32Array
  const decodePCM16 = useCallback((b64: string): Float32Array => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
    return float32;
  }, []);

  // Auto-scroll transcript (scroll within container only, not the whole page)
  useEffect(() => {
    const el = transcriptEndRef.current;
    if (el && el.parentElement) {
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    }
  }, [transcript]);

  // Bookmark toast auto-hide
  useEffect(() => {
    if (bookmarkToast) {
      const t = setTimeout(() => setBookmarkToast(""), 3000);
      return () => clearTimeout(t);
    }
  }, [bookmarkToast]);

  const startSession = useCallback(async () => {
    setSessionState("connecting");
    setStatusText("Requesting camera & microphone...");
    setErrorText("");
    setTranscript([]);
    setBookmarks([]);
    setMeasurements([]);
    setBeforeAfterImages([]);
    setShowBudgetPicker(false);
    // Reset refs
    transcriptRef.current = [];
    bookmarksRef.current = [];
    measurementsRef.current = [];
    beforeAfterRef.current = [];

    // Generate session ID
    const sid = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setSessionId(sid);
    sessionIdRef.current = sid;

    // Determine budget to send
    const budgetToSend = budgetSelection === "custom"
      ? { type: "specific" as const, value: customBudget || "5000" }
      : { type: "descriptive" as const, value: budgetSelection };
    setBudget({ ...budgetToSend, spent: 0, items: [] });
    budgetRef.current = { ...budgetToSend, spent: 0, items: [] };

    // Load style profile from localStorage (quiz results)
    let styleProfile = null;
    try {
      const saved = localStorage.getItem("novispace_style_profile");
      if (saved) {
        styleProfile = JSON.parse(saved);
        console.log("[ConsultPage] Loaded style profile:", styleProfile);
      }
    } catch (err) {
      console.warn("[ConsultPage] Could not load style profile:", err);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "environment" },
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      audioChunkProcessorRef.current = processor;
      source.connect(processor);
      processor.connect(audioCtx.destination);

      // Initialize playback context
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      nextPlayTimeRef.current = 0;

      setStatusText("Connecting to NoviSpace...");
      const ws = new WebSocket(getWebSocketURL());
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: "start_session",
          budget: budgetToSend,
          styleProfile: styleProfile,
          sessionId: sid,
        }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "session_started":
            setSessionState("active");
            setStatusText("Live — start talking about your space");

            processor.onaudioprocess = (e) => {
              if (!isMicOn || ws.readyState !== WebSocket.OPEN) return;
              const input = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) {
                int16[i] = Math.max(-32768, Math.min(32767, Math.round(input[i] * 32768)));
              }
              const bytes = new Uint8Array(int16.buffer);
              let binary = "";
              for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
              ws.send(JSON.stringify({ type: "audio", data: btoa(binary) }));
            };

            frameIntervalRef.current = setInterval(() => {
              if (!isCamOn || !videoRef.current || !canvasRef.current || ws.readyState !== WebSocket.OPEN) return;
              const canvas = canvasRef.current;
              const ctx = canvas.getContext("2d");
              if (!ctx) return;
              canvas.width = 640;
              canvas.height = 480;
              ctx.drawImage(videoRef.current, 0, 0, 640, 480);
              const b64 = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
              ws.send(JSON.stringify({ type: "video", data: b64 }));
            }, 1000);
            break;

          case "audio":
            setAgentSpeaking(true);
            audioQueueRef.current.push(decodePCM16(msg.data));
            scheduleAudio();
            break;

          case "text":
            break;

          case "transcript": {
            const entry: TranscriptEntry = {
              speaker: msg.speaker,
              text: msg.text,
              timestamp: Date.now(),
            };
            setTranscript((prev) => {
              let next;
              // Append to last entry if same speaker for streaming text
              if (prev.length > 0 && prev[prev.length - 1].speaker === msg.speaker) {
                next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  text: next[next.length - 1].text + msg.text,
                };
              } else {
                next = [...prev, entry];
              }
              transcriptRef.current = next;
              return next;
            });
            break;
          }

          case "bookmark_saved":
            setBookmarks((prev) => {
              const next = [...prev, msg.bookmark];
              bookmarksRef.current = next;
              return next;
            });
            setBookmarkToast(msg.bookmark.recommendation?.slice(0, 60) + "...");
            break;

          case "budget_update":
            setBudget((prev) => {
              const next = prev ? {
                ...prev,
                spent: msg.runningTotal || prev.spent,
                items: [...prev.items, { item: msg.item, cost: msg.estimatedCost }],
              } : prev;
              budgetRef.current = next;
              return next;
            });
            break;

          case "measurement":
            setMeasurements((prev) => {
              const next = [...prev, {
                label: msg.label,
                value: msg.value,
                confidence: msg.confidence || "medium",
              }];
              measurementsRef.current = next;
              return next;
            });
            break;

          case "before_after":
            setBeforeAfterImages((prev) => {
              const next = [...prev, {
                before: msg.before,
                after: msg.after,
                description: msg.description,
              }];
              beforeAfterRef.current = next;
              return next;
            });
            setShowBeforeAfter({
              before: msg.before,
              after: msg.after,
              description: msg.description,
            });
            break;

          case "interrupted":
            setAgentSpeaking(false);
            // Stop scheduled audio
            if (playbackContextRef.current) {
              playbackContextRef.current.close().catch(() => {});
              playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
              nextPlayTimeRef.current = 0;
            }
            audioQueueRef.current = [];
            schedulerRunningRef.current = false;
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
          ? "Camera/microphone permission denied."
          : `Failed to start: ${err.message}`
      );
      setSessionState("error");
      cleanup();
    }
  }, [cleanup, decodePCM16, scheduleAudio, isMicOn, isCamOn, sessionState, budgetSelection, customBudget]);

  const endSession = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_session" }));
    }
    cleanup();
    setSessionState("idle");
    setAgentSpeaking(false);
    setStatusText("Session ended");

    // Use refs for latest data (avoids stale closure)
    const sid = sessionIdRef.current;
    const t = transcriptRef.current;
    const b = bookmarksRef.current;
    const m = measurementsRef.current;
    const bg = budgetRef.current;
    const ba = beforeAfterRef.current;

    // Save session data to localStorage for the report page
    if (sid && (t.length > 0 || b.length > 0)) {
      const sessionData = {
        sessionId: sid,
        transcript: t,
        bookmarks: b,
        measurements: m,
        budget: bg,
        beforeAfterImages: ba,
        endedAt: Date.now(),
      };
      localStorage.setItem(`novispace_session_${sid}`, JSON.stringify(sessionData));
      // Store session ID list
      const sessions = JSON.parse(localStorage.getItem("novispace_sessions") || "[]");
      sessions.unshift({ id: sid, date: new Date().toISOString(), transcriptLength: t.length });
      localStorage.setItem("novispace_sessions", JSON.stringify(sessions));

      // Navigate to report
      router.push(`/report/${sid}`);
    }
  }, [cleanup, router]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Budget helper
  const budgetLabel = (b: BudgetState) => {
    if (b.type === "specific") return `$${Number(b.value).toLocaleString()}`;
    const map: Record<string, string> = {
      affordable: "Under $2,000",
      "mid-range": "$2,000 – $5,000",
      "high-end": "$5,000 – $15,000",
    };
    return map[b.value] || b.value;
  };

  const budgetMax = (b: BudgetState) => {
    if (b.type === "specific") return Number(b.value);
    const map: Record<string, number> = { affordable: 2000, "mid-range": 5000, "high-end": 15000 };
    return map[b.value] || 5000;
  };

  // Pre-session budget picker
  if (sessionState === "idle" && showBudgetPicker) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex h-14 items-center justify-between border-b px-4 bg-background">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">NoviSpace</span>
          </div>
          <div className="w-16" />
        </header>
        <main className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <DollarSign className="mx-auto mb-3 h-10 w-10 text-accent" />
              <h2 className="text-2xl font-bold">What&apos;s your budget?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This helps the AI tailor furniture and decor recommendations to your price range.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { value: "affordable", label: "Affordable", desc: "Under $2,000 — IKEA, thrift, DIY" },
                { value: "mid-range", label: "Mid-Range", desc: "$2,000 – $5,000 — Article, CB2, West Elm" },
                { value: "high-end", label: "High-End", desc: "$5,000 – $15,000 — RH, Design Within Reach" },
                { value: "custom", label: "Custom Amount", desc: "Enter your own budget" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBudgetSelection(opt.value)}
                  className={cn(
                    "w-full rounded-lg border p-4 text-left transition-all",
                    budgetSelection === opt.value
                      ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                      : "border-border hover:border-accent/30"
                  )}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-sm text-muted-foreground">{opt.desc}</div>
                </button>
              ))}
              {budgetSelection === "custom" && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-lg font-medium">$</span>
                  <input
                    type="number"
                    placeholder="5000"
                    value={customBudget}
                    onChange={(e) => setCustomBudget(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-lg outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <span className="text-sm text-muted-foreground">CAD</span>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground text-center">
              By starting a consultation, you agree to our{" "}
              <Link href="/terms" target="_blank" className="underline hover:text-foreground">
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              . Your camera and microphone data will be processed by Google Gemini AI.
            </div>
            <Button size="lg" className="w-full gap-2" onClick={startSession}>
              <Video className="h-4 w-4" />
              Start Live Consultation
            </Button>
            {errorText && <p className="text-sm text-destructive text-center">{errorText}</p>}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen max-h-screen flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-2 sm:px-4 bg-background z-20">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium hidden sm:inline">NoviSpace</span>
        </div>
        {/* Budget indicator */}
        {budget && sessionState === "active" && (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] sm:text-xs font-medium">
                ${Math.round(budget.spent).toLocaleString()} / {budgetLabel(budget)}
              </span>
              <div className="h-1 w-16 sm:w-20 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    budget.spent / budgetMax(budget) < 0.6 ? "bg-green-500" :
                    budget.spent / budgetMax(budget) < 0.85 ? "bg-yellow-500" : "bg-red-500"
                  )}
                  style={{ width: `${Math.min(100, (budget.spent / budgetMax(budget)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
        {!(budget && sessionState === "active") && <div className="w-8 sm:w-16" />}
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Video + Controls */}
        <div className="flex shrink-0 lg:flex-1 flex-col items-center justify-center p-2 sm:p-4 max-h-[65vh] lg:max-h-none">
          {/* Video area */}
          <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border bg-secondary/30">
            <div className="aspect-[4/3] sm:aspect-video relative">
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

              {sessionState === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-secondary/50 to-muted/30">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-accent/30">
                    <Video className="h-7 w-7 text-accent/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">Camera preview will appear here</p>
                </div>
              )}

              {agentSpeaking && (
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 backdrop-blur-sm border border-accent/20">
                  <div className="relative h-2 w-2">
                    <div className="absolute inset-0 animate-ping rounded-full bg-accent" />
                    <div className="absolute inset-0 rounded-full bg-accent" />
                  </div>
                  <span className="text-xs font-medium text-accent">Agent speaking</span>
                </div>
              )}

              {/* Measurements badge */}
              {measurements.length > 0 && (
                <div className="absolute right-4 top-4 rounded-lg bg-background/90 px-3 py-2 backdrop-blur-sm border border-border/50 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Ruler className="h-3 w-3" /> Measurements
                  </div>
                  {measurements.map((m, i) => (
                    <div key={i} className="text-muted-foreground">{m.label}: {m.value}</div>
                  ))}
                </div>
              )}

              {/* Before/After thumbnails */}
              {beforeAfterImages.length > 0 && (
                <div className="absolute left-4 bottom-4 flex gap-2">
                  {beforeAfterImages.map((ba, i) => (
                    <button
                      key={i}
                      onClick={() => setShowBeforeAfter(ba)}
                      className="h-12 w-12 rounded-lg border-2 border-accent/50 overflow-hidden hover:scale-105 transition-transform"
                    >
                      <ImageIcon className="h-full w-full p-2 text-accent" />
                    </button>
                  ))}
                </div>
              )}

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
          <div className="mt-3 text-center">
            <p className="text-sm text-muted-foreground">{statusText}</p>
            {errorText && <p className="mt-1 text-sm text-destructive">{errorText}</p>}
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center gap-3">
            {sessionState === "idle" || sessionState === "error" ? (
              <Button size="lg" onClick={() => setShowBudgetPicker(true)} className="gap-2">
                <Video className="h-4 w-4" /> Start Live Consultation
              </Button>
            ) : (
              <>
                <Button
                  variant={isMicOn ? "secondary" : "destructive"}
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={() => {
                    setIsMicOn(!isMicOn);
                    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !isMicOn));
                  }}
                >
                  {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>

                <Button variant="destructive" size="icon" className="h-14 w-14 rounded-full" onClick={endSession}>
                  <PhoneOff className="h-5 w-5" />
                </Button>

                <Button
                  variant={isCamOn ? "secondary" : "destructive"}
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={() => {
                    setIsCamOn(!isCamOn);
                    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !isCamOn));
                  }}
                >
                  {isCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Transcript + Bookmarks sidebar (visible during active session) */}
        {sessionState === "active" && (
          <div className="w-full border-t lg:w-80 lg:border-l lg:border-t-0 bg-card flex flex-col overflow-hidden flex-1 min-h-0 lg:min-h-0">
            {/* Sidebar tabs */}
            <div className="flex border-b">
              <button
                onClick={() => { setShowTranscript(true); setShowBookmarks(false); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                  showTranscript ? "bg-accent/10 text-accent border-b-2 border-accent" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" /> Transcript
              </button>
              <button
                onClick={() => { setShowTranscript(false); setShowBookmarks(true); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                  showBookmarks ? "bg-accent/10 text-accent border-b-2 border-accent" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Bookmark className="h-3.5 w-3.5" /> Saved ({bookmarks.length})
              </button>
            </div>

            {/* Transcript panel */}
            {showTranscript && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {transcript.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Conversation will appear here...
                  </p>
                )}
                {transcript.map((t, i) => {
                  const cleaned = t.text
                    .replace(/<ctrl\d+>/g, "")
                    .replace(/<call:\w+\{[^}]*\}>/g, "")
                    .replace(/\s{2,}/g, " ")
                    .trim();
                  if (!cleaned) return null;
                  return (
                    <div key={i} className={cn("flex gap-2", t.speaker === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 text-xs max-w-[90%]",
                          t.speaker === "user"
                            ? "bg-accent/10 text-foreground"
                            : "bg-secondary text-foreground"
                        )}
                      >
                        <div className="font-medium mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {t.speaker === "user" ? "You" : "NoviSpace"}
                        </div>
                        {cleaned}
                      </div>
                    </div>
                  );
                })}
                <div ref={transcriptEndRef} />
              </div>
            )}

            {/* Bookmarks panel */}
            {showBookmarks && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {bookmarks.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Say &quot;save that&quot; or &quot;bookmark this&quot; to save ideas.
                  </p>
                )}
                {bookmarks.map((b) => (
                  <div key={b.id} className="rounded-lg border bg-background p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                        {b.category}
                      </span>
                      {b.estimatedPrice && (
                        <span className="text-[10px] text-muted-foreground">{b.estimatedPrice}</span>
                      )}
                    </div>
                    <p className="text-xs text-foreground">{b.recommendation}</p>
                    {b.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {b.tags.map((tag) => (
                          <span key={tag} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bookmark toast */}
      {bookmarkToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-4 py-2.5 shadow-lg animate-in slide-in-from-bottom-4">
          <Bookmark className="h-4 w-4" />
          <span className="text-sm font-medium">Idea saved!</span>
          <span className="text-xs opacity-80">{bookmarkToast}</span>
        </div>
      )}

      {/* Before/After modal */}
      {showBeforeAfter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl rounded-xl bg-background border shadow-2xl overflow-hidden">
            <button
              onClick={() => setShowBeforeAfter(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-background/90 p-1.5 hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="p-4">
              <h3 className="font-semibold mb-3">Before / After Visualization</h3>
              <p className="text-sm text-muted-foreground mb-4">{showBeforeAfter.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Before</div>
                  <img
                    src={`data:image/jpeg;base64,${showBeforeAfter.before}`}
                    alt="Before"
                    className="w-full rounded-lg border"
                  />
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">After</div>
                  <img
                    src={`data:image/png;base64,${showBeforeAfter.after}`}
                    alt="After"
                    className="w-full rounded-lg border"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
