const { GoogleGenAI } = require("@google/genai");

// Stable model for reasoning (NOT the preview audio model)
const REASONING_MODEL = "gemini-2.0-flash";

const EXTRACTION_PROMPT = `You are a background analysis system for a live interior design consultation.

Analyze the transcript and extract structured data. ONLY extract from the NEW transcript — skip items in ALREADY EXTRACTED.

BOOKMARKS — Product recommendations worth saving:
- MUST be a specific product the agent recommended (not generic advice).
- Write a SHORT, clear product description (1-2 sentences max). Example:
  GOOD: "40-inch minimalist walnut bookshelf with clean lines, $300-$500 CAD"
  GOOD: "White ceramic vases set for open shelving, $40-$80 CAD"
  BAD: "To maintain good traffic flow, I'd recommend a bookshelf no wider than 40 to 42 inches. This will prevent the area from feeling cramped between the sofa and the kitchen cart."
  BAD: "Yes, I can hear you! For a cohesive look, I'd suggest balancing the open shelves with curated items."
- Do NOT copy raw transcript sentences. Rewrite as a concise product description.
- Include material, style, approximate dimensions and price if mentioned.

MEASUREMENTS — Room dimensions mentioned:
- Extract ANY numeric measurement the agent estimated or the user stated.
- Examples: "that wall is about 10 feet wide" → label: "wall width", value: "10 feet"
- "the space between the sofa and kitchen is roughly 4 feet" → label: "sofa to kitchen gap", value: "4 feet"
- "ceiling height looks about 8 feet" → label: "ceiling height", value: "8 feet"
- Include measurements mentioned in passing, not just explicit callouts.

BUDGET ITEMS — Items with specific prices:
- Must have both a product name AND a numeric cost.
- Use the midpoint if a range was given (e.g., "$600-$900" → 750).

Return ONLY valid JSON (no markdown, no code fences):
{"bookmarks":[{"recommendation":"concise product description","category":"furniture|color|layout|lighting|storage|decor|other","estimatedPrice":"$X-$Y CAD"}],"measurements":[{"label":"what was measured","value":"numeric value with unit","confidence":"high|medium|low"}],"budgetItems":[{"item":"product name","estimatedCost":0}]}

If nothing new: {"bookmarks":[],"measurements":[],"budgetItems":[]}`;

// Phrases that indicate user wants to bookmark
const BOOKMARK_PHRASES = [
  "save that", "save this", "bookmark this", "bookmark that",
  "remember that", "remember this", "i love that", "i love this",
  "let's do that", "let's go with that", "that's perfect",
  "yes do that", "yes, do that", "i want that",
];

class ReasoningLayer {
  constructor(apiKey) {
    this.ai = new GoogleGenAI({ apiKey });

    // Merged transcript: consecutive same-speaker entries are combined
    this.mergedTranscript = [];    // [{ speaker, text, ts }]
    this.lastAnalyzedCount = 0;    // How many merged entries we've analyzed
    this.busy = false;
    this.runningTotal = 0;
    this.bookmarkCooldown = 0;     // Timestamp — skip analysis bookmarks until this time

    // Dedup sets (lowercase keys)
    this.seenBookmarks = new Set();
    this.seenMeasurements = new Set();
    this.seenBudgetItems = new Set();
  }

  /**
   * Add a transcript fragment. Merges consecutive same-speaker entries
   * so the reasoning layer sees coherent messages, not fragments.
   */
  addEntry(speaker, text) {
    // Skip [SYSTEM] injections — they're not real conversation
    if (text.startsWith("[SYSTEM]")) return;

    // Clean common transcription artifacts
    const cleaned = text
      .replace(/<ctrl\d+>/gi, "")
      .replace(/<call:[^>]+>/gi, "")
      .trim();
    if (!cleaned) return;

    const last = this.mergedTranscript[this.mergedTranscript.length - 1];
    if (last && last.speaker === speaker) {
      // Append to existing entry (merge fragments)
      last.text += " " + cleaned;
      last.ts = Date.now();
    } else {
      // New speaker turn
      this.mergedTranscript.push({ speaker, text: cleaned, ts: Date.now() });
    }
  }

  /** Check if user text contains a bookmark intent phrase */
  isBookmarkIntent(userText) {
    const lower = userText.toLowerCase();
    return BOOKMARK_PHRASES.some((p) => lower.includes(p));
  }

  /**
   * Get the last substantial agent message from the MERGED transcript.
   * This returns a full, coherent message, not a fragment.
   */
  getLastAgentMessage() {
    for (let i = this.mergedTranscript.length - 1; i >= 0; i--) {
      const entry = this.mergedTranscript[i];
      if (entry.speaker === "agent" && entry.text.length > 20) {
        return entry.text;
      }
    }
    return null;
  }

  /**
   * Mark a bookmark text as already saved (prevents reasoning layer from
   * re-extracting it during analysis). Called by server.js after instant bookmark.
   */
  markBookmarked(text) {
    const key = (text || "").slice(0, 60).toLowerCase();
    if (key) this.seenBookmarks.add(key);
    // Set cooldown: skip bookmark extraction for the next 10 seconds
    this.bookmarkCooldown = Date.now() + 10000;
  }

  /**
   * Analyze unprocessed transcript with Gemini 1.5 Flash (stable REST API).
   * Includes retry with exponential backoff for rate limits.
   * Returns { bookmarks, measurements, budgetItems } or null.
   */
  async analyze() {
    if (this.busy) return null;

    // Get un-analyzed merged entries, with 2-entry overlap for context
    const overlapStart = Math.max(0, this.lastAnalyzedCount - 2);
    const newEntries = this.mergedTranscript.slice(overlapStart);
    if (newEntries.length === 0) return null;

    // Need at least one substantial agent message in the NEW portion
    const strictNew = this.mergedTranscript.slice(this.lastAnalyzedCount);
    const hasAgent = strictNew.some((e) => e.speaker === "agent" && e.text.length > 15);
    if (!hasAgent) return null;

    this.busy = true;
    const prevCount = this.lastAnalyzedCount;
    this.lastAnalyzedCount = this.mergedTranscript.length;

    try {
      // Build clean transcript text from merged entries (with overlap for context)
      const transcriptText = newEntries
        .filter((e) => e.text.length > 5)
        .map((e) => `${e.speaker === "agent" ? "AGENT" : "USER"}: ${e.text}`)
        .join("\n\n");

      if (transcriptText.length < 50) return null;

      // Build dedup context
      let prevContext = "";
      if (this.seenBookmarks.size > 0) {
        prevContext += "\n\nALREADY EXTRACTED BOOKMARKS:\n- " + [...this.seenBookmarks].join("\n- ");
      }
      if (this.seenMeasurements.size > 0) {
        prevContext += "\n\nALREADY EXTRACTED MEASUREMENTS:\n- " + [...this.seenMeasurements].join("\n- ");
      }
      if (this.seenBudgetItems.size > 0) {
        prevContext += "\n\nALREADY EXTRACTED BUDGET ITEMS:\n- " + [...this.seenBudgetItems].join("\n- ");
      }

      const prompt = `${EXTRACTION_PROMPT}${prevContext}\n\nTRANSCRIPT:\n${transcriptText}`;

      console.log("[ReasoningLayer] Analyzing", newEntries.length, "merged entries,", transcriptText.length, "chars");

      // Retry with exponential backoff for rate limits
      let raw = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await this.ai.models.generateContent({
            model: REASONING_MODEL,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              temperature: 0.0,
              maxOutputTokens: 1024,
            },
          });
          raw = result?.response?.text?.() || result?.text || "";
          break; // Success
        } catch (apiErr) {
          const msg = apiErr.message || "";
          if ((msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) && attempt < 2) {
            const delay = (attempt + 1) * 5000; // 5s, 10s
            console.log(`[ReasoningLayer] Rate limited, retry ${attempt + 1} in ${delay}ms`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw apiErr; // Non-retryable or final attempt
        }
      }
      if (!raw) return null;

      // Clean and parse JSON
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("[ReasoningLayer] Bad JSON:", cleaned.slice(0, 300));
        return null;
      }

      const output = { bookmarks: [], measurements: [], budgetItems: [] };
      const inBookmarkCooldown = Date.now() < this.bookmarkCooldown;

      // Deduplicated bookmarks (skip during cooldown after instant bookmark)
      if (!inBookmarkCooldown) {
        for (const b of parsed.bookmarks || []) {
          const rec = (b.recommendation || "").trim();
          // Must be a real recommendation, not a fragment
          if (rec.length < 15) continue;
          if (rec.split(" ").length < 4) continue; // At least 4 words

          const key = rec.slice(0, 60).toLowerCase();
          if (!this.seenBookmarks.has(key)) {
            this.seenBookmarks.add(key);
            output.bookmarks.push(b);
          }
        }
      }

      // Deduplicated measurements
      for (const m of parsed.measurements || []) {
        const label = (m.label || "").trim();
        const value = (m.value || "").trim();
        if (label.length < 3 || value.length < 2) continue;
        // Must contain a number
        if (!/\d/.test(value)) continue;

        const key = label.toLowerCase();
        if (!this.seenMeasurements.has(key)) {
          this.seenMeasurements.add(key);
          output.measurements.push(m);
        }
      }

      // Budget items
      for (const item of parsed.budgetItems || []) {
        const name = (item.item || "").trim();
        const cost = Number(item.estimatedCost) || 0;
        if (name.length < 3 || cost <= 0) continue;

        const key = name.toLowerCase();
        if (!this.seenBudgetItems.has(key)) {
          this.seenBudgetItems.add(key);
          this.runningTotal += cost;
          output.budgetItems.push({
            item: name,
            estimatedCost: cost,
            runningTotal: this.runningTotal,
          });
        }
      }

      const hasContent =
        output.bookmarks.length > 0 ||
        output.measurements.length > 0 ||
        output.budgetItems.length > 0;

      if (hasContent) {
        console.log(
          "[ReasoningLayer] Extracted:",
          output.bookmarks.length, "bookmarks,",
          output.measurements.length, "measurements,",
          output.budgetItems.length, "budget items"
        );
      }

      return hasContent ? output : null;
    } catch (err) {
      console.error("[ReasoningLayer] Error:", err.message);
      this.lastAnalyzedCount = prevCount; // Roll back
      return null;
    } finally {
      this.busy = false;
    }
  }

  /** Reset for new session */
  reset() {
    this.mergedTranscript = [];
    this.lastAnalyzedCount = 0;
    this.busy = false;
    this.runningTotal = 0;
    this.bookmarkCooldown = 0;
    this.seenBookmarks.clear();
    this.seenMeasurements.clear();
    this.seenBudgetItems.clear();
  }
}

module.exports = { ReasoningLayer };
