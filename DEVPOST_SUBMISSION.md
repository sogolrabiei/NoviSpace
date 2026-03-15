# NoviSpace: AI-Powered Spatial Design Consultant

## Inspiration

The inspiration for NoviSpace came from a simple observation: **interior design consultations are expensive, intimidating, and inaccessible to most people**. Traditional designers charge $100-300/hour, require in-person visits, and often push products that exceed your budget. Meanwhile, DIY homeowners struggle to visualize how furniture will fit in their space, make costly mistakes, and waste hours browsing endless product catalogs.

We asked ourselves: *What if you could walk through your home with your phone, have a natural conversation with an AI design expert, and get instant, personalized recommendations—all while staying within your budget?*

That's how NoviSpace was born.

## What It Does

NoviSpace is a **real-time, voice-first interior design consultation platform** powered by Google's Gemini AI. Here's how it works:

1. **Set Your Budget**: Choose a specific amount (e.g., $600 CAD) or a range (affordable, mid-range, high-end)
2. **Start the Consultation**: Turn on your camera and microphone
3. **Walk & Talk**: Show the AI your space while having a natural conversation
   - *"I need help with this living room corner"*
   - AI responds with voice: *"I can see the space between your sofa and kitchen cart. Let's add a bookshelf there—something 40-42 inches wide would work perfectly."*
4. **Bookmark Ideas**: Say *"save that"* or *"I love that"* to instantly bookmark recommendations
5. **Get Your Report**: After the call, receive a detailed report with:
   - All bookmarked product recommendations
   - Room measurements the AI captured
   - Budget breakdown
   - Direct shopping links to Amazon, Wayfair, IKEA, CB2, and Article

**Key Features**:
- ✅ **Natural interruptions**: Talk over the AI anytime (just like a real consultant)
- ✅ **Budget-aware**: AI tracks spending and suggests alternatives if you're over budget
- ✅ **Visual context**: AI sees your space via camera and references what it observes
- ✅ **Hands-free**: No typing, no clicking—just talk
- ✅ **Mobile-first**: Designed for walking through your home with your phone

## How We Built It

### **The Split-Brain Architecture Challenge**

The biggest technical challenge was building a system that could:
1. Have **natural, real-time voice conversations** (low latency, interruptible)
2. **Extract structured data** (bookmarks, measurements, budget items) from the conversation
3. Do both **without crashing** or creating duplicate/garbage data

Our solution: **Split-Brain Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                    User (Browser)                       │
│              Camera + Mic + Transcript UI               │
└────────────────────┬────────────────────────────────────┘
                     │ WebSocket
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Backend (Node.js + Express)                │
│                  WebSocket Server                       │
└─────┬───────────────────────────────────────────┬───────┘
      │                                           │
      ↓                                           ↓
┌─────────────────────┐              ┌──────────────────────┐
│ INTERACTION LAYER   │              │  REASONING LAYER     │
│  Gemini Live API    │              │  Gemini 2.0 Flash    │
│  (WebSocket)        │              │  (REST API)          │
├─────────────────────┤              ├──────────────────────┤
│ • Audio/video input │              │ • Analyzes transcript│
│ • Real-time voice   │              │ • Extracts bookmarks │
│ • Transcription     │              │ • Finds measurements │
│ • NO tool calling   │              │ • Tracks budget      │
│   (unstable)        │              │ • Deduplication      │
└─────────────────────┘              └──────────────────────┘
```

### **Tech Stack**

**Frontend**:
- **Next.js 14** (React framework)
- **TypeScript** (type safety)
- **TailwindCSS + shadcn/ui** (modern UI components)
- **WebRTC APIs** (camera/mic access)
- **WebSocket** (real-time communication)

**Backend**:
- **Node.js + Express** (server)
- **ws** (WebSocket library)
- **@google/genai** (Gemini SDK)
- **Google Cloud Run** (serverless deployment)

**AI Models**:
- **Gemini 2.5 Flash (Native Audio Preview)**: Interaction Layer
- **Gemini 2.0 Flash**: Reasoning Layer

**Infrastructure**:
- **Google Cloud Run**: Serverless container hosting
- **Artifact Registry**: Docker image storage
- **Secret Manager**: API key management
- **Cloud Build**: CI/CD pipeline
- **Terraform** (optional): Infrastructure as code

### **Key Implementation Details**

#### **1. Transcript Fragment Merging**
Gemini Live streams transcript in fragments like:
```
"I'd recommend"
"a bookshelf"
"about 40 inches"
```

The Reasoning Layer merges consecutive same-speaker fragments into coherent messages:
```
"I'd recommend a bookshelf about 40 inches"
```

This prevents the AI from extracting garbage like *"is approximately"* as a product recommendation.

#### **2. Instant Bookmark Detection**
When the user says *"save that"*, the backend:
1. Detects the keyword in the user's transcript
2. Retrieves the last agent message from the merged transcript
3. Strips conversational filler (*"Got it", "Sure!", "Yes, I can hear you!"*)
4. Extracts the first 1-2 complete sentences
5. Saves the bookmark immediately
6. Marks it in the Reasoning Layer's dedup set (prevents re-extraction)
7. Injects a `[SYSTEM]` message into Gemini Live for natural acknowledgment

#### **3. Debounced Analysis**
The Reasoning Layer doesn't analyze every single transcript fragment. Instead:
- Analysis is **debounced** (8 seconds after last activity)
- Includes **2-entry overlap** from the previous window (captures measurements spanning turn boundaries)
- Only runs if there's at least one substantial agent message (>15 chars)

This reduces API calls from ~50/session to ~10-15/session, avoiding rate limits.

#### **4. Client-Side Measurement Fallback**
If the Reasoning Layer API fails (rate limits, network issues), the report page extracts measurements directly from the transcript using regex:
- Pattern: `(\d+(?:\.\d+)?)\s*(feet|foot|inches|meters|cm)`
- Context detection: *"wall"*, *"ceiling"*, *"width"*, *"height"*, etc.
- Example: *"that wall is about 10 feet wide"* → `{ label: "wall width", value: "10 feet" }`

#### **5. Shopping Link Generation**
The report page uses `extractSearchQuery()` to derive concise product names from bookmark text:
- Input: *"Sticking to your $600 CAD budget, we could look at a more structured, industrial-style bookshelf."*
- Output: **"industrial bookshelf"**
- This becomes the search query for Amazon, Wayfair, IKEA, etc.

The function extracts:
- **Product type** (bookshelf, sofa, lamp, etc.)
- **Descriptors** (materials, colors, styles)
- **Max 3 descriptors** to keep queries focused

## Challenges We Faced

### **1. The Tool Calling Disaster**
**Problem**: Gemini Live's native tool calling feature (for bookmarks, measurements, budget tracking) was **completely unstable**. Sessions would randomly crash, tools would fire twice, or the AI would freeze mid-sentence.

**Solution**: We disabled tool calling entirely and built the **split-brain architecture**. The Interaction Layer focuses purely on conversation, while the Reasoning Layer extracts structured data asynchronously from the transcript. This separation made the system rock-solid.

### **2. Double Acknowledgments**
**Problem**: When a user said *"save that"*, the system would:
1. Detect the keyword → save bookmark → inject `[SYSTEM]` message
2. Gemini Live would respond: *"Okay, I've bookmarked that for you!"*
3. 3 seconds later, the Reasoning Layer would extract the same bookmark
4. Gemini Live would respond again: *"I've saved that recommendation to your report!"*

**Solution**: 
- Changed `injectContext(triggerResponse: false)` so the agent picks up the context naturally on its next turn (no forced response)
- Added `markBookmarked()` to the Reasoning Layer, which sets a 10-second cooldown and adds the text to a dedup set
- Increased analysis debounce to 8 seconds

### **3. Garbage Bookmark Text**
**Problem**: Bookmarks were showing fragments like:
- *"is approximately"*
- *"perhaps some woven baskets for concealed"*

**Root causes**:
- Transcript fragments weren't merged before extraction
- Instant bookmarks sliced at 200 characters (often mid-sentence)
- Reasoning Layer was copying raw transcript instead of rewriting as concise product descriptions

**Solutions**:
- Merged consecutive same-speaker transcript fragments
- Instant bookmarks now extract first 1-2 **complete sentences** and strip conversational filler
- Improved extraction prompt with explicit GOOD/BAD examples
- Shopping links use `extractSearchQuery()` to derive concise product names

### **4. Measurements Not Saving**
**Problem**: The report showed **0 measurements** even when the agent clearly stated dimensions.

**Root causes** (discovered via logs):
- **Every single Reasoning Layer API call was failing with HTTP 429** (rate limit exceeded)
- `gemini-2.0-flash` free tier quota was exhausted (limit: 0)
- Measurements spanning turn boundaries were lost (e.g., user says *"that wall"*, agent says *"about 10 feet"*)

**Solutions**:
- Added **retry with exponential backoff** (up to 3 attempts, 5s/10s delays)
- Increased analysis debounce to 8s (fewer API calls)
- Added **2-entry overlap** in analysis window (captures cross-turn measurements)
- Improved extraction prompt with explicit measurement examples
- Added **client-side fallback** extraction using regex (safety net if API fails)

### **5. Mobile UI Scrolling**
**Problem**: On mobile, the page would auto-scroll to the transcript, pushing the video out of view. Users couldn't see the video while talking.

**Root cause**: 
- Page wrapper used `min-h-screen` (page could be taller than viewport)
- Transcript auto-scroll used `scrollIntoView()` which scrolled the **entire page**

**Solution**:
- Changed wrapper to `h-screen max-h-screen overflow-hidden` (page never scrolls)
- Video area: `shrink-0` (never shrinks)
- Sidebar: `flex-1 min-h-0` (takes remaining space, scrolls internally)
- Auto-scroll: `el.parentElement.scrollTop = el.parentElement.scrollHeight` (scrolls only the transcript container)

### **6. Rate Limit Hell**
**Problem**: During testing, we hit Gemini API free-tier limits constantly. The Reasoning Layer would fail silently, and no data would be extracted.

**Solution**:
- Reduced API call frequency (8s debounce instead of 3s)
- Added retry logic with exponential backoff
- Built client-side fallback extraction for measurements
- Documented upgrade path to paid tier (costs ~$1-3/day for 100 sessions)

## What We Learned

1. **Real-time AI is hard**: Balancing latency, reliability, and structured data extraction requires careful architecture
2. **Don't trust beta features**: Gemini Live's tool calling looked perfect on paper but was unusable in production
3. **Separation of concerns wins**: The split-brain architecture turned an unstable mess into a reliable system
4. **Always have fallbacks**: Client-side measurement extraction saved us when the API hit rate limits
5. **Debouncing is your friend**: Reducing API calls from 50/session to 10-15/session made the system sustainable
6. **Mobile-first matters**: Most users will walk through their home with a phone, not a laptop

## What's Next for NoviSpace

- **3D Room Scanning**: Integrate LiDAR (iPhone Pro) for accurate room dimensions
- **AR Furniture Preview**: Show how recommended products would look in the user's space
- **Multi-Room Sessions**: Save measurements and recommendations across multiple rooms
- **Style Profile Persistence**: Use quiz results to personalize recommendations across sessions
- **Collaborative Mode**: Share reports with family members for feedback
- **Direct Purchase Integration**: Partner with retailers for one-click purchasing
- **Before/After Gallery**: Generate AI-rendered mockups of the redesigned space

---

**Try NoviSpace**: https://novispace.ca

**Built with**: Google Gemini AI, Next.js, Node.js, Google Cloud Run
