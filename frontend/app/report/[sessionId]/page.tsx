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

/**
 * Extract a concise search query from a bookmark recommendation string.
 * Turns "To maintain good traffic flow, I'd recommend a bookshelf no wider than 40 to 42 inches..."
 * into "minimalist bookshelf 40 inch" — something useful for searching retailers.
 */
function extractSearchQuery(recommendation: string): string {
  const text = recommendation.toLowerCase();

  const materials = [
    "walnut", "oak", "teak", "mahogany", "wood", "metal", "brass",
    "marble", "glass", "linen", "velvet", "leather", "bouclé", "rattan",
    "wicker", "ceramic", "concrete", "pine", "birch", "bamboo", "steel",
  ];
  const colors = [
    "white", "black", "brown", "beige", "gray", "grey", "navy", "blue",
    "green", "cream", "natural", "charcoal", "ivory",
  ];
  const stylesArr = [
    "minimalist", "modern", "mid-century", "scandinavian", "industrial",
    "rustic", "bohemian", "contemporary", "farmhouse", "sleek", "vintage",
  ];
  const products = [
    "bookshelf", "bookcase", "shelving unit", "shelf", "cabinet", "credenza",
    "wardrobe", "dresser", "sofa", "couch", "sectional", "chair", "armchair",
    "accent chair", "dining table", "coffee table", "side table", "end table",
    "console table", "desk", "bed", "headboard", "nightstand", "ottoman",
    "bench", "stool", "tv stand", "media console", "table", "vanity",
    "floor lamp", "table lamp", "pendant light", "lamp", "pendant", "sconce",
    "chandelier", "rug", "carpet", "curtain", "drape", "throw pillow",
    "cushion", "blanket", "mirror", "artwork", "painting", "vase", "planter",
    "basket", "kitchen cart", "bar cart",
  ].sort((a, b) => b.length - a.length); // longest first

  // Find the product mentioned
  let productMatch = "";
  for (const p of products) {
    if (text.includes(p)) { productMatch = p; break; }
  }
  if (!productMatch) {
    // Fallback: use first 4 words that aren't common filler
    const words = recommendation.split(/\s+/).filter(w => w.length > 3).slice(0, 5);
    return words.join(" ");
  }

  // Collect descriptors
  const descriptors: string[] = [];
  for (const m of materials) { if (text.includes(m)) descriptors.push(m); }
  for (const c of colors) { if (text.includes(c)) descriptors.push(c); }
  for (const s of stylesArr) { if (text.includes(s)) descriptors.push(s); }

  const unique = Array.from(new Set(descriptors)).slice(0, 3);
  return unique.length > 0 ? `${unique.join(" ")} ${productMatch}` : productMatch;
}

function generateShoppingLinks(query: string) {
  const q = encodeURIComponent(query);
  const wayfairQ = query.replace(/\s+/g, '+');
  return {
    amazon: `https://www.amazon.ca/s?k=${q}`,
    wayfair: `https://www.wayfair.ca/keyword.php?keyword=${wayfairQ}`,
    ikea: `https://www.ikea.com/ca/en/search/?q=${q}`,
    cb2: `https://www.cb2.ca/search?query=${q}`,
    article: `https://www.article.com/search?q=${q}`,
  };
}

/**
 * Clean transcript text of Gemini audio model artifacts.
 */
function cleanTranscriptText(text: string): string {
  return text
    .replace(/<ctrl\d+>/g, "")
    .replace(/<call:\w+\{[^}]*\}>/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Extract furniture/decor recommendations from AI transcript entries.
 * Uses descriptor-aware extraction to build meaningful search queries.
 */
function extractItemsFromTranscript(transcript: TranscriptEntry[]): { recommendation: string; category: string }[] {
  const materials = [
    "walnut", "oak", "teak", "mahogany", "wood", "wooden", "metal", "brass",
    "marble", "glass", "linen", "velvet", "leather", "bouclé", "rattan",
    "wicker", "ceramic", "concrete", "pine", "birch", "bamboo", "steel",
  ];
  const colors = [
    "white", "black", "brown", "beige", "gray", "grey", "navy", "blue",
    "green", "cream", "natural", "dark", "light", "warm", "charcoal",
  ];
  const styles = [
    "minimalist", "modern", "mid-century", "mcm", "scandinavian", "industrial",
    "rustic", "bohemian", "contemporary", "traditional", "farmhouse", "sleek",
    "clean-lined", "vintage",
  ];

  const productMap: Record<string, string> = {
    "bookshelf": "storage", "bookcase": "storage", "shelving unit": "storage",
    "shelf": "storage", "cabinet": "storage", "credenza": "storage",
    "wardrobe": "storage", "dresser": "storage",
    "sofa": "furniture", "couch": "furniture", "sectional": "furniture",
    "chair": "furniture", "armchair": "furniture", "accent chair": "furniture",
    "dining table": "furniture", "coffee table": "furniture",
    "side table": "furniture", "end table": "furniture", "console table": "furniture",
    "desk": "furniture", "bed": "furniture", "headboard": "furniture",
    "nightstand": "furniture", "ottoman": "furniture", "bench": "furniture",
    "stool": "furniture", "tv stand": "furniture", "media console": "furniture",
    "table": "furniture", "vanity": "furniture",
    "floor lamp": "lighting", "table lamp": "lighting", "pendant light": "lighting",
    "lamp": "lighting", "pendant": "lighting", "sconce": "lighting", "chandelier": "lighting",
    "rug": "decor", "carpet": "decor", "curtain": "decor", "drape": "decor",
    "throw pillow": "decor", "cushion": "decor", "blanket": "decor",
    "mirror": "decor", "artwork": "decor", "painting": "decor",
    "vase": "decor", "planter": "decor",
  };

  // Sort product keys by length DESC so "coffee table" matches before "table"
  const productKeys = Object.keys(productMap).sort((a, b) => b.length - a.length);

  // Recommendation language — sentence must contain one of these to qualify
  const recommendWords = /\b(recommend|suggest|try|consider|perfect|ideal|great|would look|would be|would work|go with|get a|look for|opt for|choose|pick|love|gorgeous|beautiful|stunning)\b/i;

  const results: Map<string, { recommendation: string; category: string; score: number }> = new Map();

  // Process each agent message individually (later messages refine earlier ones)
  const agentMessages = transcript
    .filter((t) => t.speaker === "agent")
    .map((t) => cleanTranscriptText(t.text).toLowerCase());

  for (const text of agentMessages) {
    const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 15);

    for (const sentence of sentences) {
      for (const product of productKeys) {
        const prodIdx = sentence.indexOf(product);
        if (prodIdx < 0) continue;

        // Skip if preceded by "your" (references existing item, not a recommendation)
        const before = sentence.slice(Math.max(0, prodIdx - 6), prodIdx).trim();
        if (/\byour\b/.test(before)) continue;

        // Skip measurement-only sentences (has dimensions but no recommendation language)
        const hasDimensions = /\d+\s*(inch|inches|"|feet|foot|ft|cm|m)\b/.test(sentence);
        const hasRecommendation = recommendWords.test(sentence);
        if (hasDimensions && !hasRecommendation) continue;

        // Must contain recommendation language
        if (!hasRecommendation && !hasDimensions) {
          // Also allow if sentence introduces a product with an article: "a walnut bookshelf"
          const beforeProduct = sentence.slice(Math.max(0, prodIdx - 3), prodIdx).trim();
          if (!/\ba\b/.test(beforeProduct)) continue;
        }

        // Collect descriptors from the sentence
        const descriptors: string[] = [];
        for (const mat of materials) {
          if (sentence.includes(mat)) descriptors.push(mat);
        }
        for (const col of colors) {
          if (sentence.includes(col)) descriptors.push(col);
        }
        for (const sty of styles) {
          if (sentence.includes(sty)) descriptors.push(sty);
        }

        const uniqueDesc = Array.from(new Set(descriptors)).slice(0, 3);
        const searchQuery = uniqueDesc.length > 0
          ? `${uniqueDesc.join(" ")} ${product}`
          : product;

        const score = uniqueDesc.length + (hasRecommendation ? 2 : 0);
        const category = productMap[product];

        // Keep the best (highest score) match per product
        const existing = results.get(product);
        if (!existing || score > existing.score) {
          results.set(product, { recommendation: searchQuery, category, score });
        }
      }
    }
  }

  return Array.from(results.values())
    .filter((item) => item.recommendation.split(" ").length >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ recommendation, category }) => ({ recommendation, category }));
}

/**
 * Extract measurements from transcript as a fallback when the reasoning layer
 * doesn't capture them (e.g. due to API rate limits).
 */
function extractMeasurementsFromTranscript(transcript: TranscriptEntry[]): MeasurementEntry[] {
  const results: Map<string, MeasurementEntry> = new Map();

  // Patterns: "10 feet", "42 inches", "8 foot", "3.5 meters", etc.
  const measurementRegex = /(\d+(?:\.\d+)?)\s*(?:to\s*(\d+(?:\.\d+)?)\s*)?(feet|foot|ft|inches|inch|in|meters?|m|cm|centimeters?)\b/gi;

  // Context words that help identify what was measured
  const labelHints = [
    { pattern: /wall/i, label: "wall" },
    { pattern: /ceiling/i, label: "ceiling height" },
    { pattern: /floor/i, label: "floor" },
    { pattern: /room/i, label: "room" },
    { pattern: /space|gap|between/i, label: "space" },
    { pattern: /window/i, label: "window" },
    { pattern: /door/i, label: "door" },
    { pattern: /width|wide/i, suffix: "width" },
    { pattern: /height|tall|high/i, suffix: "height" },
    { pattern: /length|long/i, suffix: "length" },
    { pattern: /depth|deep/i, suffix: "depth" },
  ];

  const agentMessages = transcript
    .filter((t) => t.speaker === "agent")
    .map((t) => cleanTranscriptText(t.text));

  for (const text of agentMessages) {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);

    for (const sentence of sentences) {
      let match;
      measurementRegex.lastIndex = 0;
      while ((match = measurementRegex.exec(sentence)) !== null) {
        const num1 = match[1];
        const num2 = match[2];
        const unit = match[3].toLowerCase().replace(/s$/, "");
        const normalizedUnit = unit.startsWith("f") ? "feet" : unit.startsWith("i") ? "inches" : unit.startsWith("m") ? "meters" : unit.startsWith("c") ? "cm" : unit;
        const value = num2 ? `${num1}-${num2} ${normalizedUnit}` : `${num1} ${normalizedUnit}`;

        // Try to figure out what was measured from surrounding text
        const context = sentence.slice(Math.max(0, match.index - 60), match.index + match[0].length + 30).toLowerCase();
        let label = "measurement";
        for (const hint of labelHints) {
          if (hint.pattern.test(context)) {
            if ('suffix' in hint && hint.suffix) {
              label = label === "measurement" ? hint.suffix : `${label} ${hint.suffix}`;
            } else {
              label = hint.label || label;
            }
          }
        }
        // Add dimension suffix if not already added
        if (label === "measurement") {
          label = `approx. ${value}`;
        }

        const key = label.toLowerCase();
        if (!results.has(key)) {
          results.set(key, { label, value, confidence: "medium" });
        }
      }
    }
  }

  return Array.from(results.values()).slice(0, 10);
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

  // Fallback: extract measurements from transcript if reasoning layer didn't capture any
  const allMeasurements = session.measurements.length > 0
    ? session.measurements
    : extractMeasurementsFromTranscript(session.transcript);

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
          <h1 className="text-2xl sm:text-3xl font-bold">Design Consultation Report</h1>
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
            <div className="mt-1 text-2xl font-bold">{allMeasurements.length}</div>
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
        {allMeasurements.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
              <Ruler className="h-5 w-5 text-accent" /> Room Measurements
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {allMeasurements.map((m, i) => (
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

        {/* Recommended Items & Shopping Links */}
        {(() => {
          const hasBookmarks = session.bookmarks.length > 0;
          const transcriptItems = !hasBookmarks ? extractItemsFromTranscript(session.transcript) : [];
          const hasItems = hasBookmarks || transcriptItems.length > 0;

          if (!hasItems) return null;

          // Group transcript items by category
          const transcriptByCategory: Record<string, { recommendation: string; category: string }[]> = {};
          transcriptItems.forEach((item) => {
            if (!transcriptByCategory[item.category]) transcriptByCategory[item.category] = [];
            transcriptByCategory[item.category].push(item);
          });

          return (
            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
                <ShoppingCart className="h-5 w-5 text-accent" /> Recommended Items & Shopping Links
              </h2>
              {!hasBookmarks && transcriptItems.length > 0 && (
                <p className="text-sm text-muted-foreground mb-4">
                  Items mentioned during your consultation — click to search retailers.
                </p>
              )}
              <div className="space-y-4">
                {/* Bookmarked items */}
                {hasBookmarks && Object.entries(bookmarksByCategory).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      {category}
                    </h3>
                    <div className="space-y-3">
                      {items.map((b) => {
                        const searchQuery = extractSearchQuery(b.recommendation);
                        const links = generateShoppingLinks(searchQuery);
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
                {/* Transcript-extracted items (fallback) */}
                {!hasBookmarks && Object.entries(transcriptByCategory).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      {category}
                    </h3>
                    <div className="space-y-3">
                      {items.map((item, idx) => {
                        const links = generateShoppingLinks(item.recommendation);
                        return (
                          <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                            <p className="font-medium capitalize">{item.recommendation}</p>
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
          );
        })()}

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
                {session.transcript.map((t, i) => {
                  const cleaned = cleanTranscriptText(t.text);
                  if (!cleaned) return null;
                  return (
                    <div key={i} className={cn("flex gap-3", t.speaker === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "rounded-lg px-4 py-2.5 text-sm max-w-[85%]",
                        t.speaker === "user" ? "bg-accent/10" : "bg-secondary"
                      )}>
                        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                          {t.speaker === "user" ? "You" : "NoviSpace"}
                        </div>
                        {cleaned}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:flex-wrap">
          <Link href="/consult" className="w-full sm:w-auto">
            <Button className="w-full gap-2 sm:w-auto">
              <Sparkles className="h-4 w-4" /> Start New Consultation
            </Button>
          </Link>
          <Link href="/sessions" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full gap-2 sm:w-auto">
              <MessageSquare className="h-4 w-4" /> View All Sessions
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
