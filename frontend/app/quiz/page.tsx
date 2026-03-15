"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Heart,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Card data: 12 images with hidden tags ──────────────────────────
// Images should be placed in /public/quiz/
const QUIZ_CARDS = [
  {
    filename: "The Sterile Minimalist.png",
    tags: ["Minimalist", "Clean Lines", "Monochromatic", "Low Clutter"],
  },
  {
    filename: "The Cozy Maximalist.png",
    tags: ["Maximalist", "Eclectic", "Bold Patterns", "High Stimulation"],
  },
  {
    filename: "Mid-Century Modern.png",
    tags: ["MCM", "Retro", "Warm Wood", "Structured"],
  },
  {
    filename: "Industrial Edge.png",
    tags: ["Industrial", "Raw Materials", "Urban", "Edgy"],
  },
  {
    filename: "Japandi Organic Modern.png",
    tags: ["Japandi", "Organic", "Serene", "Earth Tones"],
  },
  {
    filename: "Classic Traditional.png",
    tags: ["Traditional", "Elegant", "Classic", "Symmetrical"],
  },
  {
    filename: "Dark and Moody.png",
    tags: ["Moody", "Dark Tones", "Intimate", "High Contrast"],
  },
  {
    filename: "Light and Airy.png",
    tags: ["Bright", "Coastal", "Airy", "Fresh"],
  },
  {
    filename: "Warm Metals.png",
    tags: ["Warm Metals", "Brass"],
  },
  {
    filename: "Cool Metals.png",
    tags: ["Cool Metals", "Chrome"],
  },
  {
    filename: "Open Shelving.png",
    tags: ["Open Storage", "Casual", "Display-Focused"],
  },
  {
    filename: "Concealed Storage.png",
    tags: ["Hidden Storage", "Sleek", "Practical"],
  },
];

// ── Tag frequency tallying utility ─────────────────────────────────
function tallyTags(likedTags: string[]): { tag: string; count: number }[] {
  const freq: Record<string, number> = {};
  for (const tag of likedTags) {
    freq[tag] = (freq[tag] || 0) + 1;
  }
  return Object.entries(freq)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

function generateSummary(topTags: { tag: string; count: number }[]): string {
  if (topTags.length === 0)
    return "You didn\u2019t like any of the images. Try retaking the quiz to discover your style!";
  const top = topTags.slice(0, 5);
  if (top.length === 1)
    return `Based on your choices, your design style leans heavily toward ${top[0].tag}.`;
  if (top.length === 2)
    return `Based on your choices, your design style leans heavily toward ${top[0].tag} and ${top[1].tag}.`;
  const last = top[top.length - 1].tag;
  const rest = top
    .slice(0, -1)
    .map((t) => t.tag)
    .join(", ");
  return `Based on your choices, your design style leans heavily toward ${rest}, with a preference for ${last}.`;
}

// ── Swipe threshold ────────────────────────────────────────────────
const SWIPE_THRESHOLD = 80;

export default function QuizPage() {
  const router = useRouter();

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedTags, setLikedTags] = useState<string[]>([]);
  const [dislikedTags, setDislikedTags] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  // Swipe / drag state
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const startX = useRef(0);

  const card = QUIZ_CARDS[currentIndex];
  const progress = (currentIndex / QUIZ_CARDS.length) * 100;
  const rotation = dragX * 0.08;
  const likeOpacity = Math.min(1, Math.max(0, dragX / SWIPE_THRESHOLD));
  const nopeOpacity = Math.min(1, Math.max(0, -dragX / SWIPE_THRESHOLD));

  // ── Advance to next card ───────────────────────────────────────
  const advanceCard = useCallback(
    (direction: "left" | "right") => {
      const current = QUIZ_CARDS[currentIndex];
      if (direction === "right") {
        setLikedTags((prev) => [...prev, ...current.tags]);
      } else {
        setDislikedTags((prev) => [...prev, ...current.tags]);
      }

      setExitDir(direction);
      setTimeout(() => {
        setExitDir(null);
        setDragX(0);
        if (currentIndex + 1 >= QUIZ_CARDS.length) {
          setDone(true);
        } else {
          setCurrentIndex((i) => i + 1);
        }
      }, 250);
    },
    [currentIndex]
  );

  // ── Pointer / touch handlers ───────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragX(e.clientX - startX.current);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) {
      advanceCard("right");
    } else if (dragX < -SWIPE_THRESHOLD) {
      advanceCard("left");
    } else {
      setDragX(0);
    }
  };

  // ── Button handlers ────────────────────────────────────────────
  const handleLike = useCallback(() => advanceCard("right"), [advanceCard]);
  const handleDislike = useCallback(() => advanceCard("left"), [advanceCard]);

  // ── Tag tally for results ──────────────────────────────────────
  const topTags = tallyTags(likedTags);
  const topTraits = topTags.slice(0, 5);

  // ── Auto-save & redirect when quiz finishes ────────────────────
  useEffect(() => {
    if (!done) return;
    const finalTags = tallyTags(likedTags);
    const finalTraits = finalTags.slice(0, 5);
    const styleProfile = {
      completedAt: new Date().toISOString(),
      topStyles: finalTraits.map((t) => ({
        label: t.tag,
        percentage: Math.round((t.count / Math.max(1, likedTags.length)) * 100),
      })),
      allLikedTags: likedTags,
      allDislikedTags: dislikedTags,
    };
    localStorage.setItem("novispace_style_profile", JSON.stringify(styleProfile));
    router.push("/consult");
  }, [done, likedTags, dislikedTags, router]);

  // ════════════════════════════════════════════════════════════════
  // ── QUIZ / SWIPE SCREEN ────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="flex min-h-screen flex-col bg-background select-none">
      <header className="flex h-14 items-center justify-between border-b px-4 bg-background">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">Style Quiz</span>
        </div>
        <span className="text-xs text-muted-foreground w-16 text-right">
          {currentIndex + 1}/{QUIZ_CARDS.length}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 w-full bg-secondary">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center p-4 overflow-hidden">
        <div className="w-full max-w-lg space-y-6">
          {/* Instruction */}
          <p className="text-center text-sm text-muted-foreground">
            Swipe right if you love it, left to pass
          </p>

          {/* ── Swipeable card stack ── */}
          <div className="relative w-full aspect-[3/4] max-h-[60vh]">
            {/* Next card preview (behind) */}
            {currentIndex + 1 < QUIZ_CARDS.length && (
              <div className="absolute inset-0 rounded-2xl overflow-hidden border bg-card shadow-md scale-[0.95] opacity-60">
                <img
                  src={`/quiz/${QUIZ_CARDS[currentIndex + 1].filename}`}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="eager"
                  draggable={false}
                />
              </div>
            )}

            {/* Active card */}
            <div
              className={cn(
                "absolute inset-0 rounded-2xl overflow-hidden border bg-card shadow-xl cursor-grab active:cursor-grabbing touch-none",
                exitDir && "transition-all duration-250",
                !exitDir && !dragging && "transition-transform duration-200"
              )}
              style={{
                transform: exitDir
                  ? `translateX(${exitDir === "right" ? "120%" : "-120%"}) rotate(${exitDir === "right" ? 15 : -15}deg)`
                  : `translateX(${dragX}px) rotate(${rotation}deg)`,
                opacity: exitDir ? 0 : 1,
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <img
                src={`/quiz/${card.filename}`}
                alt=""
                className="h-full w-full object-cover"
                loading="eager"
                draggable={false}
              />

              {/* LIKE overlay */}
              <div
                className="absolute inset-0 bg-green-500/20 flex items-center justify-center transition-opacity pointer-events-none"
                style={{ opacity: likeOpacity }}
              >
                <div className="rounded-xl border-4 border-green-500 px-6 py-3 rotate-[-15deg]">
                  <Heart className="h-12 w-12 text-green-500 fill-green-500" />
                </div>
              </div>

              {/* NOPE overlay */}
              <div
                className="absolute inset-0 bg-red-500/20 flex items-center justify-center transition-opacity pointer-events-none"
                style={{ opacity: nopeOpacity }}
              >
                <div className="rounded-xl border-4 border-red-500 px-6 py-3 rotate-[15deg]">
                  <X className="h-12 w-12 text-red-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Like / Dislike buttons */}
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={handleDislike}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-300 bg-red-50 text-red-500 hover:bg-red-100 transition-colors shadow-md"
              aria-label="Dislike"
            >
              <X className="h-7 w-7" />
            </button>
            <button
              onClick={handleLike}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-300 bg-green-50 text-green-500 hover:bg-green-100 transition-colors shadow-md"
              aria-label="Like"
            >
              <Heart className="h-7 w-7" />
            </button>
          </div>

          {/* Skip option */}
          <div className="text-center">
            <button
              onClick={() => setDone(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip quiz and start consultation
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
