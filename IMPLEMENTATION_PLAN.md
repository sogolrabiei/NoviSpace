# NoviSpace — Feature Implementation Plan

## Selected Features & How They Connect

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER SESSION FLOW                            │
│                                                                     │
│  [Style Quiz] ──→ [Preference Profile] ──→ [Live Consultation] ──→ │
│       ↑                    ↑                       │                │
│       │                    │              ┌────────┼────────┐       │
│  past sessions        mood board          │        │        │       │
│                      preferences          ▼        ▼        ▼       │
│                                    [Transcript] [Bookmarks] [Measurements]
│                                         │        │          │       │
│                                         └────┬───┘          │       │
│                                              ▼              │       │
│                                     [Design Report] ◄──────┘       │
│                                         │    │                      │
│                                         ▼    ▼                      │
│                                  [Shopping  [Before/After            │
│                                   Links]    Renders]                │
│                                    ↑                                │
│                              [Budget Tracker]                       │
└─────────────────────────────────────────────────────────────────────┘
```

Every feature feeds into the others. The **Design Report** is the culmination — it pulls from transcript, bookmarks, measurements, budget, and preferences to generate a personalized, actionable deliverable.

---

## Data Layer (Required Foundation)

Before building any feature, we need persistence. Currently the app is stateless.

### Recommended: Firebase (Firestore + Auth + Storage)

**Why Firebase:**
- Free tier is generous (50K reads/day, 20K writes/day, 5GB storage)
- Real-time listeners for live transcript sync
- Auth for user identity (Google sign-in = 1 click for users)
- Cloud Storage for images (screenshots, mood boards, before/after renders)
- Already in the Google ecosystem (same as Gemini, Cloud Run)

**Data Model:**

```
users/
  {userId}/
    profile: { name, email, createdAt }
    preferences: { styles[], colors[], materials[], budgetDefault }
    quizResults: { completedAt, likedImages[], dislikedImages[], inferredStyle }

sessions/
  {sessionId}/
    userId: string
    startedAt: timestamp
    endedAt: timestamp
    status: "active" | "completed"
    budget: { type: "specific" | "descriptive", value: number | "affordable" | "mid-range" | "high-end" }
    transcript: [
      { speaker: "user" | "agent", text: string, timestamp: number }
    ]
    bookmarks: [
      { id, timestamp, frameBase64, recommendation, tags[] }
    ]
    measurements: [
      { id, label: "living room width", value: "3.2m", method: "ar_estimate" }
    ]
    moodBoard: {
      images: [{ url, source, addedBy: "user" | "agent", tags[] }]
    }
    report: {
      generatedAt: timestamp
      summary: string
      recommendations: [{ title, description, dimensions, priceRange, searchQuery, bookmarkRef? }]
      colorPalette: [{ hex, name }]
      shoppingList: [{ item, estimatedPrice, links: { amazon, wayfair, ikea } }]
      beforeAfterImages: [{ beforeBase64, afterUrl, description }]
      totalEstimatedCost: number
    }
```

**Effort:** 1-2 days to set up Firebase project, auth, and basic CRUD.

### Alternative: Supabase (PostgreSQL + Auth + Storage)
If you prefer SQL/open-source, Supabase is the equivalent. Same effort.

---

## Feature 1: Live Transcript + Chat Overlay + Conversation History

### What
- Real-time captions of both user speech and AI speech overlaid on the video
- Full conversation saved to database for future reference
- Users can revisit past consultations and read the full transcript

### Backend Changes

**1. Enable transcription in Gemini config** (`gemini-live.js`):
```javascript
config: {
  responseModalities: [Modality.AUDIO],
  outputAudioTranscription: {},   // ← Transcribes AI speech to text
  inputAudioTranscription: {},    // ← Transcribes user speech to text
  speechConfig: { ... },
  systemInstruction: { ... },
}
```

**2. Handle transcription events in `onmessage`:**
```javascript
onmessage: (msg) => {
  if (msg.serverContent) {
    const sc = msg.serverContent;

    // Existing: audio, text, interrupted, turnComplete
    // ...

    // NEW: Output transcription (AI's words as text)
    if (sc.outputTranscription && sc.outputTranscription.text) {
      onTranscript("agent", sc.outputTranscription.text);
    }

    // NEW: Input transcription (user's words as text)
    if (sc.inputTranscription && sc.inputTranscription.text) {
      onTranscript("user", sc.inputTranscription.text);
    }
  }
}
```

**3. Add `onTranscript` callback in `server.js`:**
```javascript
onTranscript: (speaker, text) => {
  // Send to frontend for live display
  ws.send(JSON.stringify({ type: "transcript", speaker, text }));

  // Accumulate for saving to DB at session end
  sessionTranscript.push({ speaker, text, timestamp: Date.now() });
}
```

**4. Save transcript to Firestore on session end:**
```javascript
case "end_session":
  // Save full transcript to Firestore
  await db.collection('sessions').doc(sessionId).update({
    transcript: sessionTranscript,
    endedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: "completed"
  });
  break;
```

### Frontend Changes

**1. Transcript panel component** (collapsible sidebar or bottom sheet):
```
┌──────────────────────────────────────┐
│ [Video Feed]                         │
│                                      │
│                                      │
│  ┌─ Transcript ──────────────────┐   │
│  │ You: I'm not sure about this  │   │
│  │      corner here              │   │
│  │ NoviSpace: That alcove is     │   │
│  │   actually a great opportunity│   │
│  │   for a reading nook. A 30"   │   │
│  │   wide armchair with...       │   │
│  └───────────────────────────────┘   │
└──────────────────────────────────────┘
```

**2. Past sessions page** (`/sessions`):
- List of all past consultations with date, duration, summary preview
- Click to view full transcript + report + bookmarks
- Search across past transcripts

### Effort: 2-3 days

---

## Feature 2: Post-Session Design Report + Shopping Links

### What
After a consultation ends, auto-generate a structured PDF-style report with:
- Session summary
- Design recommendations (with dimensions, materials, colors)
- Shopping list with links to Amazon, Wayfair, IKEA, Article, CB2
- Color palette
- Bookmarked screenshots with AI annotations
- Before/after renders (if generated)
- Total estimated cost (respecting budget)

### Backend: Report Generation Pipeline

**On session end, trigger report generation:**

```javascript
async function generateReport(sessionId) {
  const session = await db.collection('sessions').doc(sessionId).get();
  const { transcript, bookmarks, measurements, budget, moodBoard } = session.data();

  const prompt = `You are a design report writer. Based on this consultation transcript
and context, generate a structured JSON report.

TRANSCRIPT:
${transcript.map(t => `${t.speaker}: ${t.text}`).join('\n')}

BOOKMARKED IDEAS:
${bookmarks.map(b => `- ${b.recommendation}`).join('\n')}

MEASUREMENTS:
${measurements.map(m => `- ${m.label}: ${m.value}`).join('\n')}

BUDGET: ${budget.type === 'specific' ? '$' + budget.value : budget.value}

Generate JSON with this exact structure:
{
  "summary": "3-4 sentence overview of consultation",
  "recommendations": [
    {
      "title": "Reading Nook in Alcove",
      "description": "detailed description...",
      "dimensions": "30\" wide x 32\" deep",
      "material": "walnut frame, linen upholstery",
      "estimatedPrice": { "low": 400, "high": 800 },
      "searchQueries": {
        "amazon": "mid century accent chair walnut linen",
        "wayfair": "reading nook armchair 30 inch",
        "ikea": "POÄNG armchair"
      }
    }
  ],
  "colorPalette": [
    { "hex": "#DEB887", "name": "Warm Sand" }
  ],
  "styleKeywords": ["mid-century modern", "warm minimalism"],
  "totalEstimatedCost": { "low": 2400, "high": 5200 }
}`;

  const ai = new GoogleGenAI({ apiKey });
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  const report = JSON.parse(result.text);

  // Generate shopping links
  report.recommendations = report.recommendations.map(rec => ({
    ...rec,
    links: {
      amazon: `https://www.amazon.ca/s?k=${encodeURIComponent(rec.searchQueries.amazon)}`,
      wayfair: `https://www.wayfair.ca/keyword.html?keyword=${encodeURIComponent(rec.searchQueries.wayfair)}`,
      ikea: `https://www.ikea.com/ca/en/search/?q=${encodeURIComponent(rec.searchQueries.ikea)}`,
      cb2: `https://www.cb2.ca/search?query=${encodeURIComponent(rec.searchQueries.amazon)}`,
      article: `https://www.article.com/search?q=${encodeURIComponent(rec.searchQueries.amazon)}`,
    }
  }));

  // Save report
  await db.collection('sessions').doc(sessionId).update({ report });
  return report;
}
```

### Frontend: Report Page (`/report/[sessionId]`)

```
┌──────────────────────────────────────────────────┐
│ NoviSpace Design Report — March 14, 2026         │
│ Living Room Consultation                          │
├──────────────────────────────────────────────────┤
│                                                   │
│ ## Summary                                        │
│ Your 450 sq ft living room has great natural      │
│ light from the south-facing windows...            │
│                                                   │
│ ## Color Palette                                  │
│ [████] Warm Sand  [████] Soft Sage  [████] Cream │
│                                                   │
│ ## Recommendations                                │
│                                                   │
│ ### 1. Reading Nook in Alcove                     │
│ [📸 Bookmarked Screenshot]                        │
│ A 30" armchair in walnut with linen upholstery... │
│ Est: $400 - $800                                  │
│ 🛒 [Amazon] [Wayfair] [IKEA] [CB2] [Article]    │
│                                                   │
│ ### 2. Console Table Behind Sofa                  │
│ ...                                               │
│                                                   │
│ ## Before / After                                 │
│ [Before Photo] → [AI-Generated After]             │
│                                                   │
│ ## Shopping List                                   │
│ ┌─────────────────────┬──────────┬─────────────┐ │
│ │ Item                │ Est.     │ Links       │ │
│ ├─────────────────────┼──────────┼─────────────┤ │
│ │ Accent Chair        │ $400-800 │ 🛒 🛒 🛒   │ │
│ │ Console Table       │ $200-450 │ 🛒 🛒 🛒   │ │
│ │ Floor Lamp          │ $150-300 │ 🛒 🛒 🛒   │ │
│ ├─────────────────────┼──────────┼─────────────┤ │
│ │ TOTAL               │$2.4K-5.2K│             │ │
│ └─────────────────────┴──────────┴─────────────┘ │
│                                                   │
│ [Download PDF] [Share Link] [Email Report]        │
└──────────────────────────────────────────────────┘
```

### Effort: 3-4 days

---

## Feature 3: Mood Board + Design Style Quiz + Preference Engine

### What
A three-part preference system that gets smarter over time:

**Part A — Style Quiz (Pre-consultation):**
- Tinder-style swipe UI with curated design images
- Like / dislike / super-like
- Results: inferred style profile (e.g., "73% mid-century modern, 20% Scandinavian, 7% industrial")
- Stored in user profile for all future sessions

**Part B — Live Mood Board (During consultation):**
- When user says "I love that idea" or AI suggests a style, both can add inspiration images
- AI uses Gemini function calling to add images:
  ```
  Tool: add_to_mood_board
  Parameters: { query: "warm minimalist living room walnut", tags: ["warm", "minimalist"] }
  ```
- User can also add images from a search panel during the session

**Part C — Preference Engine (Across sessions):**
- Aggregates: quiz results + mood board likes + verbal preferences from transcripts + bookmarked ideas
- Before each new session, injects a preference summary into the system prompt:
  ```
  "This user prefers: mid-century modern with warm tones. They love walnut wood,
  linen/bouclé fabrics, and warm lighting. Budget tendency: mid-range.
  In past sessions they've bookmarked: reading nooks, statement lighting, floating shelves."
  ```

### Style Quiz Implementation

**Frontend: `/quiz` page**

```
┌────────────────────────────────────────┐
│         What's Your Style?             │
│                                        │
│   ┌──────────────────────────────┐     │
│   │                              │     │
│   │    [Design Image]            │     │
│   │                              │     │
│   │    "Mid-Century Living Room" │     │
│   │                              │     │
│   └──────────────────────────────┘     │
│                                        │
│      ✕ Nope      ♥ Love it            │
│                                        │
│   ────────────── 7/20 ──────────────   │
│                                        │
│   Your style so far:                   │
│   [████ Mid-Century 73%]               │
│   [██ Scandinavian 20%]                │
│   [█ Industrial 7%]                    │
└────────────────────────────────────────┘
```

**Quiz image set:** Curate 40-60 images across 8-10 styles:
- Mid-Century Modern, Scandinavian, Industrial, Bohemian, Minimalist, Coastal, Traditional, Art Deco, Japandi, Organic Modern

**Backend quiz scoring:**
```javascript
// Each image is tagged with style weights
const quizImages = [
  { id: "img_001", url: "...", styles: { "mid-century": 0.8, "minimalist": 0.3 } },
  { id: "img_002", url: "...", styles: { "scandinavian": 0.9, "japandi": 0.4 } },
  // ...
];

function calculateStyleProfile(liked, disliked) {
  const scores = {};
  for (const img of liked) {
    for (const [style, weight] of Object.entries(img.styles)) {
      scores[style] = (scores[style] || 0) + weight;
    }
  }
  for (const img of disliked) {
    for (const [style, weight] of Object.entries(img.styles)) {
      scores[style] = (scores[style] || 0) - weight * 0.5;
    }
  }
  // Normalize to percentages
  const total = Object.values(scores).reduce((a, b) => a + Math.max(0, b), 0);
  return Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [k, Math.max(0, Math.round(v / total * 100))])
  );
}
```

### Mood Board Function Calling

**Gemini tool definition** (added to session config):
```javascript
tools: [{
  functionDeclarations: [{
    name: "add_to_mood_board",
    description: "Add an inspiration image to the session mood board when the user expresses interest in a style or idea",
    parameters: {
      type: "object",
      properties: {
        searchQuery: { type: "string", description: "Search query for finding inspiration images" },
        style: { type: "string", description: "Design style category" },
        description: { type: "string", description: "Why this was added to the mood board" }
      },
      required: ["searchQuery", "description"]
    }
  }]
}]
```

**Backend handles the function call:**
```javascript
if (msg.toolCall) {
  const fn = msg.toolCall.functionCalls[0];
  if (fn.name === "add_to_mood_board") {
    const images = await searchImages(fn.args.searchQuery); // Unsplash/Pexels API
    // Save to session mood board
    await addToMoodBoard(sessionId, images[0], fn.args);
    // Send to frontend
    ws.send(JSON.stringify({ type: "mood_board_update", image: images[0], description: fn.args.description }));
    // Respond to Gemini
    session.sendToolResponse({ functionResponses: [{ name: "add_to_mood_board", response: { success: true } }] });
  }
}
```

### Effort: 5-7 days total (quiz: 2d, mood board: 2-3d, preference engine: 1-2d)

---

## Feature 6: Before/After Visualization

### What
Capture a "before" snapshot from the live video, then use AI image generation to create an "after" version showing the AI's recommendations applied.

### How It Works

**Trigger:** Either voice-activated ("Show me what that would look like") or button in the UI.

**Pipeline:**
1. Capture current video frame as "before" image
2. Collect the most recent recommendation context from transcript
3. Send to Gemini's image generation API (or Imagen) with a prompt:
   ```
   "Take this room photo and redesign it with these changes:
   - Add a walnut accent chair in the right corner
   - Replace the overhead light with a warm arc floor lamp
   - Add floating shelves on the left wall
   Keep the room layout the same. Photorealistic result."
   ```
4. Display before/after side-by-side on the frontend
5. Save both to the session for the report

**Gemini tool definition:**
```javascript
{
  name: "generate_before_after",
  description: "Generate a before/after visualization of the current space with suggested changes applied",
  parameters: {
    type: "object",
    properties: {
      changes: { type: "string", description: "Detailed description of design changes to apply" },
      style: { type: "string", description: "Target design style" }
    },
    required: ["changes"]
  }
}
```

**Backend handler:**
```javascript
if (fn.name === "generate_before_after") {
  const currentFrame = latestVideoFrame; // Store the most recent frame from sendVideo
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",  // or gemini-2.5-flash with image generation
    contents: [
      { role: "user", parts: [
        { inlineData: { data: currentFrame, mimeType: "image/jpeg" } },
        { text: `Redesign this room: ${fn.args.changes}. Style: ${fn.args.style || 'as discussed'}. Keep room dimensions and layout identical. Photorealistic result.` }
      ]}
    ],
    config: { responseModalities: ["IMAGE", "TEXT"] }
  });

  const afterImage = result.candidates[0].content.parts.find(p => p.inlineData);
  // Save and send to frontend
  ws.send(JSON.stringify({
    type: "before_after",
    before: currentFrame,
    after: afterImage.inlineData.data,
    description: fn.args.changes
  }));
}
```

### Frontend: Before/After Viewer
- Split-screen slider (drag to reveal before/after)
- Gallery of all before/after pairs from the session
- Included in final report

### Effort: 3-4 days

---

## Feature 9: Measurement Helper with AR Overlay

### What
Help users estimate room dimensions using their camera. The AI guides the user through the process and uses reference objects for scale calibration.

### Approach: AI-Guided Estimation (not full AR SDK)

Full ARKit/ARCore requires native apps. For a **web-based** solution, we use a simpler but effective approach:

**Method 1: Reference Object Calibration**
1. AI asks: "Can you hold a standard credit card (3.37" x 2.13") against the wall?"
2. User shows the card, AI identifies it in the video frame
3. Using the card's known dimensions as reference, estimate wall/object dimensions
4. AI says: "Based on the reference, that wall looks about 3.2 meters wide"

**Method 2: Guided Walk Measurement**
1. AI asks: "Stand against one wall. Now walk to the other wall. I'll count your steps."
2. Using average stride length (~2.5 feet), estimate distance
3. More accurate: ask user their height, calculate stride from that

**Method 3: Door Frame Reference**
1. Standard interior doors are 80" tall x 32" or 36" wide
2. AI identifies the door in the frame and uses it as a scale reference
3. This can be done automatically since doors appear in most room videos

### Gemini Tool:
```javascript
{
  name: "record_measurement",
  description: "Record a room measurement estimated from the video feed",
  parameters: {
    type: "object",
    properties: {
      label: { type: "string", description: "What was measured, e.g., 'living room width'" },
      value: { type: "string", description: "Estimated measurement, e.g., '3.2m' or '10.5ft'" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      method: { type: "string", description: "How it was measured: reference_object, step_count, door_reference, user_provided" }
    },
    required: ["label", "value", "method"]
  }
}
```

### System Prompt Addition:
```
When discussing furniture placement or room layout:
1. If you haven't yet, ask the user about room dimensions
2. Offer to estimate dimensions using reference objects visible in the frame
3. Look for doors (standard 80" tall), windows, or common objects for scale
4. Record all measurements using the record_measurement tool
5. Use recorded measurements when recommending furniture dimensions
```

### Frontend:
- Show a "Measurements" badge/panel during session listing recorded dimensions
- User can manually correct/enter dimensions too
- Measurements feed into the report and shopping recommendations

### Effort: 2-3 days

---

## Feature 10: Voice-Activated Screenshots / Bookmarks

### What
When the user says "save that," "bookmark this," or "I love that idea," the system captures:
- The current video frame
- The AI's most recent recommendation text
- A timestamp
- Tags from the AI about what the recommendation was about

These bookmarks feed directly into the post-session report and shopping links.

### Implementation

**Gemini Tool:**
```javascript
{
  name: "bookmark_idea",
  description: "Save/bookmark the current idea when the user expresses strong interest or explicitly asks to save something. Call this when you hear 'save that', 'bookmark this', 'I love that', 'remember that', 'let's do that', or similar.",
  parameters: {
    type: "object",
    properties: {
      recommendation: { type: "string", description: "The specific recommendation being bookmarked" },
      category: { type: "string", enum: ["furniture", "color", "layout", "lighting", "storage", "decor", "other"] },
      tags: { type: "array", items: { type: "string" }, description: "Relevant tags" },
      estimatedPrice: { type: "string", description: "Rough price range if applicable" }
    },
    required: ["recommendation", "category"]
  }
}
```

**Backend handler:**
```javascript
if (fn.name === "bookmark_idea") {
  const bookmark = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    frameBase64: latestVideoFrame,
    recommendation: fn.args.recommendation,
    category: fn.args.category,
    tags: fn.args.tags || [],
    estimatedPrice: fn.args.estimatedPrice
  };

  sessionBookmarks.push(bookmark);
  ws.send(JSON.stringify({ type: "bookmark_saved", bookmark }));

  // AI should confirm naturally (the tool response triggers this)
  session.sendToolResponse({
    functionResponses: [{ name: "bookmark_idea", response: { saved: true, bookmarkId: bookmark.id } }]
  });
}
```

**Frontend:**
- Brief toast notification: "💾 Idea saved!"
- Bookmarks panel shows thumbnails + recommendation text
- Each bookmark appears in the final report with shopping links

### Effort: 1-2 days

---

## Feature 12: Budget Tracker

### What
User sets a budget at the start (specific amount or descriptive: "affordable" / "mid-range" / "high-end"). The AI tracks running costs as it makes recommendations and adjusts suggestions to stay within budget.

### Implementation

**Budget input UI** (shown before or at start of consultation):
```
┌──────────────────────────────────────┐
│ What's your budget for this project? │
│                                      │
│ ○ Affordable (under $2,000)          │
│ ○ Mid-Range ($2,000 - $5,000)        │
│ ● High-End ($5,000 - $15,000)       │
│ ○ Custom: $[________]               │
│                                      │
│           [Start Consultation]       │
└──────────────────────────────────────┘
```

**System prompt injection:**
```
USER BUDGET: ${budget.type === 'specific' ? '$' + budget.value : budget.value}
Budget ranges: affordable = under $2,000 CAD, mid-range = $2,000-$5,000 CAD, high-end = $5,000-$15,000 CAD

Rules:
- Always recommend items within the stated budget
- Track a running total of your recommendations
- If approaching the budget limit, mention it: "We're at about $3,200 of your $5,000 budget"
- For 'affordable', prioritize IKEA, thrift finds, and DIY options
- For 'mid-range', mix IKEA with Article, CB2, West Elm
- For 'high-end', recommend Design Within Reach, RH, custom pieces
- Use the update_budget_tracker tool after each recommendation
```

**Gemini Tool:**
```javascript
{
  name: "update_budget_tracker",
  description: "Update the running budget total after making a recommendation. Call this after each furniture or decor recommendation.",
  parameters: {
    type: "object",
    properties: {
      item: { type: "string" },
      estimatedCost: { type: "number", description: "Midpoint estimate in CAD" },
      runningTotal: { type: "number", description: "Running total of all recommendations so far" },
      budgetRemaining: { type: "number", description: "How much budget is left" }
    },
    required: ["item", "estimatedCost", "runningTotal"]
  }
}
```

**Frontend:**
- Small budget indicator in the consultation UI (like a progress bar)
- Shows: "Budget: $2,850 / $5,000 (43% remaining)"
- Color changes: green → yellow → red as budget fills up
- Included in the final report shopping list

### Effort: 1-2 days

---

## Implementation Order (Phased)

### Phase 0: Foundation (3-4 days)
1. **Fix audio quality** (gapless playback + jitter buffer) — P0
2. **Set up Firebase** (auth, Firestore, storage) — required for everything
3. **Enable affective dialog + proactive audio** — free Gemini upgrade
4. **Add Gemini function calling infrastructure** — needed by 5 of 7 features

### Phase 1: Core Features (5-7 days)
5. **Live transcript + chat overlay** — foundation for report
6. **Voice-activated bookmarks** — quick win, feeds report
7. **Budget tracker** — quick win, shapes all recommendations

### Phase 2: Report & Shopping (3-4 days)
8. **Post-session design report** — pulls from transcript + bookmarks + budget + measurements
9. **Shopping links generation** — integrated into report

### Phase 3: Visual Features (5-7 days)
10. **Before/after visualization** — image generation pipeline
11. **Measurement helper** — guided estimation with reference objects

### Phase 4: Preferences & Mood Board (5-7 days)
12. **Design style quiz** — pre-consultation
13. **Live mood board** — during consultation
14. **Preference engine** — cross-session learning

### Total Estimated Effort: 21-29 days

---

## Technical Architecture After All Features

```
Frontend (Next.js)          Backend (Node.js)          External Services
─────────────────          ──────────────────          ─────────────────
/                          Express server              Gemini Live API
/quiz                      WebSocket handler           Gemini Text API
/consult                   ├─ Audio streaming          Gemini Image Gen
  ├─ Video feed            ├─ Transcript relay         Firebase Auth
  ├─ Transcript panel      ├─ Bookmark handler         Firestore DB
  ├─ Mood board panel      ├─ Budget tracker           Cloud Storage
  ├─ Budget indicator      ├─ Measurement recorder     Unsplash/Pexels API
  └─ Bookmark toast        ├─ Mood board search        (Shopping affiliate)
/report/[id]               └─ Before/after gen
  ├─ Summary               Report generator
  ├─ Recommendations       Session manager
  ├─ Shopping list          Firebase admin SDK
  ├─ Before/after
  ├─ Color palette
  └─ Download/share
/sessions (history)
/settings (preferences)
```
