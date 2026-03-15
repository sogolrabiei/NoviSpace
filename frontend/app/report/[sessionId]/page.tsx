"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Bookmark,
  DollarSign,
  Ruler,
  ShoppingCart,
  MessageSquare,
  ExternalLink,
  Download,
  Palette,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

interface SessionData {
  sessionId: string;
  transcript: TranscriptEntry[];
  bookmarks: BookmarkEntry[];
  measurements: MeasurementEntry[];
  budget: BudgetState | null;
  beforeAfterImages: BeforeAfterEntry[];
  endedAt: number;
}

function generateShoppingLinks(query: string) {
  const q = encodeURIComponent(query);
  return {
    amazon: `https://www.amazon.ca/s?k=${q}`,
    wayfair: `https://www.wayfair.ca/keyword.html?keyword=${q}`,
    ikea: `https://www.ikea.com/ca/en/search/?q=${q}`,
    cb2: `https://www.cb2.ca/search?query=${q}`,
    article: `https://www.article.com/search?q=${q}`,
  };
}

export default function ReportPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<SessionData | null>(null);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem(`novispace_session_${sessionId}`);
    if (data) {
      setSession(JSON.parse(data));
    }
  }, [sessionId]);

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Sparkles className="mb-4 h-8 w-8 text-accent" />
        <h1 className="text-xl font-semibold">Session not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This report may have been generated in a different browser.
        </p>
        <Link href="/" className="mt-4">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  const date = new Date(session.endedAt);
  const budgetLabel = session.budget
    ? session.budget.type === "specific"
      ? `$${Number(session.budget.value).toLocaleString()}`
      : { affordable: "Under $2,000", "mid-range": "$2,000 – $5,000", "high-end": "$5,000 – $15,000" }[session.budget.value] || session.budget.value
    : "Not set";

  // Group bookmarks by category
  const bookmarksByCategory: Record<string, BookmarkEntry[]> = {};
  session.bookmarks.forEach((b) => {
    if (!bookmarksByCategory[b.category]) bookmarksByCategory[b.category] = [];
    bookmarksByCategory[b.category].push(b);
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/sessions" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> All Sessions
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">NoviSpace Report</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold">Design Consultation Report</h1>
          <p className="mt-1 text-muted-foreground">
            {date.toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {" at "}
            {date.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" /> Conversation
            </div>
            <div className="mt-1 text-2xl font-bold">{session.transcript.length}</div>
            <div className="text-xs text-muted-foreground">messages</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bookmark className="h-3.5 w-3.5" /> Bookmarks
            </div>
            <div className="mt-1 text-2xl font-bold">{session.bookmarks.length}</div>
            <div className="text-xs text-muted-foreground">saved ideas</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Ruler className="h-3.5 w-3.5" /> Measurements
            </div>
            <div className="mt-1 text-2xl font-bold">{session.measurements.length}</div>
            <div className="text-xs text-muted-foreground">recorded</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" /> Budget
            </div>
            <div className="mt-1 text-lg font-bold">{budgetLabel}</div>
            {session.budget && session.budget.spent > 0 && (
              <div className="text-xs text-muted-foreground">
                ${Math.round(session.budget.spent).toLocaleString()} estimated
              </div>
            )}
          </div>
        </div>

        {/* Measurements */}
        {session.measurements.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
              <Ruler className="h-5 w-5 text-accent" /> Room Measurements
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {session.measurements.map((m, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                  <span className="font-medium">{m.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{m.value}</span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      m.confidence === "high" ? "bg-green-100 text-green-700" :
                      m.confidence === "medium" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {m.confidence}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bookmarked Ideas with Shopping Links */}
        {session.bookmarks.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
              <ShoppingCart className="h-5 w-5 text-accent" /> Recommended Items & Shopping Links
            </h2>
            <div className="space-y-4">
              {Object.entries(bookmarksByCategory).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    {category}
                  </h3>
                  <div className="space-y-3">
                    {items.map((b) => {
                      const links = generateShoppingLinks(b.recommendation);
                      return (
                        <div key={b.id} className="rounded-lg border bg-card p-4 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-medium">{b.recommendation}</p>
                              {b.tags.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {b.tags.map((tag) => (
                                    <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {b.estimatedPrice && (
                              <span className="whitespace-nowrap rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                                {b.estimatedPrice}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(links).map(([store, url]) => (
                              <a
                                key={store}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
                              >
                                {store.charAt(0).toUpperCase() + store.slice(1)}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Budget Summary */}
        {session.budget && session.budget.items.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
              <DollarSign className="h-5 w-5 text-accent" /> Budget Summary
            </h2>
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/50">
                    <th className="px-4 py-2 text-left font-medium">Item</th>
                    <th className="px-4 py-2 text-right font-medium">Estimated Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {session.budget.items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-4 py-2.5">{item.item}</td>
                      <td className="px-4 py-2.5 text-right font-medium">${item.cost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/30 font-semibold">
                    <td className="px-4 py-3">Total Estimated</td>
                    <td className="px-4 py-3 text-right">${Math.round(session.budget.spent).toLocaleString()}</td>
                  </tr>
                  <tr className="bg-secondary/10">
                    <td className="px-4 py-2 text-muted-foreground">Budget</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{budgetLabel}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* Before/After Images */}
        {session.beforeAfterImages.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
              <Palette className="h-5 w-5 text-accent" /> Before / After Visualizations
            </h2>
            <div className="space-y-4">
              {session.beforeAfterImages.map((ba, i) => (
                <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">{ba.description}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Before</div>
                      <img
                        src={`data:image/jpeg;base64,${ba.before}`}
                        alt="Before"
                        className="w-full rounded-lg border"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">After</div>
                      <img
                        src={`data:image/png;base64,${ba.after}`}
                        alt="After"
                        className="w-full rounded-lg border"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Full Transcript */}
        {session.transcript.length > 0 && (
          <section>
            <button
              onClick={() => setShowFullTranscript(!showFullTranscript)}
              className="flex w-full items-center justify-between text-xl font-semibold mb-4"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-accent" /> Full Conversation
              </span>
              {showFullTranscript ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {showFullTranscript && (
              <div className="rounded-lg border bg-card p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {session.transcript.map((t, i) => (
                  <div key={i} className={cn("flex gap-3", t.speaker === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "rounded-lg px-4 py-2.5 text-sm max-w-[85%]",
                      t.speaker === "user" ? "bg-accent/10" : "bg-secondary"
                    )}>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        {t.speaker === "user" ? "You" : "NoviSpace"}
                      </div>
                      {t.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 border-t pt-6">
          <Link href="/consult">
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" /> Start New Consultation
            </Button>
          </Link>
          <Link href="/sessions">
            <Button variant="outline" className="gap-2">
              <MessageSquare className="h-4 w-4" /> View All Sessions
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
