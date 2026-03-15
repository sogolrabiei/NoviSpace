# NoviSpace Product Roadmap & Feature Ideas

## Part 1: Audio Quality Improvements (Immediate Fix)

### Root Cause of Scratchy/Noisy Audio
The current audio playback has **three main problems**:

1. **Chunk-by-chunk playback gaps** — Each PCM audio chunk from Gemini is played as a separate `AudioBufferSourceNode`. When one chunk ends and the next starts, there's a tiny gap (even ~1ms) that the ear perceives as a click/scratch.

2. **Deprecated `ScriptProcessorNode`** — The browser console already warns about this. `ScriptProcessorNode` runs on the main thread and can cause audio glitches under CPU load. The modern replacement is `AudioWorkletNode`.

3. **No audio buffering/smoothing** — Audio chunks arrive at varying intervals over WebSocket but are played immediately. Network jitter causes uneven playback = scratchy sound.

### Fix: Gapless Audio Playback with Buffering

**Implementation Plan:**

#### Step 1: Replace chunk-by-chunk playback with a continuous buffer queue
Instead of creating a new `AudioBufferSourceNode` per chunk, accumulate chunks into a ring buffer and schedule them with precise `start(time)` offsets so they play back-to-back with zero gaps.

```
Strategy:
- Maintain a `nextPlayTime` variable (AudioContext.currentTime-based)
- For each incoming chunk, create a buffer and schedule it at `nextPlayTime`
- Update `nextPlayTime += chunk.duration`
- If `nextPlayTime` falls behind `currentTime`, reset (avoid accumulating latency)
```

#### Step 2: Migrate from ScriptProcessorNode to AudioWorkletNode
- Create an `AudioWorkletProcessor` for mic capture
- Runs off the main thread = no UI jank = cleaner audio
- Chunk size: 256-512 samples (vs current 4096) for lower latency

#### Step 3: Add jitter buffer for incoming audio
- Buffer 2-3 chunks (~80-120ms) before starting playback
- This absorbs network jitter without noticeable latency
- If buffer runs dry, insert silence instead of clicking

#### Step 4: Enable Affective Dialog (Native Audio Feature)
The Gemini `gemini-2.5-flash-native-audio-preview-12-2025` model supports **affective dialog** — emotion-aware, natural-sounding speech. This requires:
```javascript
const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1alpha" } });
const config = {
  responseModalities: [Modality.AUDIO],
  enableAffectiveDialog: true,
  // ... rest of config
};
```

**Estimated effort:** 1-2 days for audio fixes, half-day for affective dialog.

---

## Part 2: Feature Ideas (15 Ideas, Ranked by Impact)

### Tier 1: High Impact — Wow Factor (Top 5 with Implementation Plans)

---

#### 1. Live Transcript + Chat Overlay
**What:** Show real-time text transcript of what the AI says and what the user says, overlaid on the video feed. Allows users to read back suggestions, copy text, and reference later.

**Why it stands out:** No competitor does real-time voice + transcript in the same view. Makes the conversation accessible and reference-able.

**Implementation Plan:**
1. Enable `outputAudioTranscription` and `inputAudioTranscription` in the Gemini config:
   ```javascript
   config: {
     responseModalities: [Modality.AUDIO],
     outputAudioTranscription: {},
     inputAudioTranscription: {},
   }
   ```
2. In the `onmessage` callback, handle `serverContent.outputTranscription` and `serverContent.inputTranscription`
3. Forward transcription events to the frontend via WebSocket (`type: "transcript"`)
4. Add a scrollable transcript panel on the consultation page (collapsible sidebar or bottom sheet)
5. Style with speaker labels ("You" / "NoviSpace") and timestamps

**Effort:** 1 day backend, 1 day frontend

---

#### 2. Post-Session Design Report with Shopping Links
**What:** After a consultation ends, generate a structured summary: design recommendations, suggested furniture with dimensions, color palette, and **shoppable links** (Amazon, Wayfair, IKEA, Article).

**Why it stands out:** Bridges the gap between "advice" and "action." Like Wayfair Decorify but powered by a live conversation, not just a photo upload. This is the #1 monetization opportunity (affiliate links).

**Implementation Plan:**
1. During the session, accumulate all text transcripts (user + AI) on the backend
2. When session ends, send the full transcript to Gemini (standard API, not Live) with a prompt:
   ```
   "Based on this design consultation transcript, generate a structured JSON report with:
   - summary (3-4 sentences)
   - recommendations[] (each with: title, description, dimensions, estimatedPrice, searchQuery)
   - colorPalette[] (hex codes + names)
   - styleKeywords[]"
   ```
3. Use the `searchQuery` field to generate links:
   - Amazon: `https://www.amazon.ca/s?k={encodeURIComponent(searchQuery)}`
   - Wayfair: `https://www.wayfair.ca/keyword.html?keyword={encodeURIComponent(searchQuery)}`
   - IKEA: `https://www.ikea.com/ca/en/search/?q={encodeURIComponent(searchQuery)}`
4. Create a new `/report/[sessionId]` page to display the report
5. Store reports in a lightweight database (Firebase, Supabase, or just Cloud Storage JSON)
6. Email the report link to the user (optional, requires email input)

**Effort:** 2-3 days

---

#### 3. Pinterest-Style Mood Board Generation
**What:** During or after a consultation, when the user agrees with a suggestion (e.g., "I love the mid-century modern idea"), generate a visual mood board with curated images for that aesthetic.

**Why it stands out:** No one combines live voice consultation with instant mood board generation. This is a designer workflow automated in real-time.

**Implementation Plan:**
1. Use Gemini's function calling to detect when user expresses preference agreement:
   - Define a tool: `generate_mood_board(style: string, room_type: string, keywords: string[])`
   - When the AI detects agreement, it calls this function
2. Backend receives the function call, uses Google Custom Search API (or Unsplash/Pexels API) to find images matching the style keywords
3. Alternatively, use Gemini's image generation capabilities to create a custom mood board collage
4. Send the mood board as a message to the frontend for display
5. Allow users to save/download/share mood boards
6. Optional: Add Pinterest API integration to create a board directly on the user's Pinterest account

**Effort:** 3-4 days

---

#### 4. Smart Screenshot & Annotation
**What:** The AI can "take a screenshot" of what it sees and annotate it — drawing arrows, circles, dimension lines — to visually show what it means by "that corner would be perfect for a reading nook."

**Why it stands out:** Transforms voice-only advice into visual, actionable guidance. No AI design tool currently does real-time annotation on a live video feed.

**Implementation Plan:**
1. Add a Gemini function tool: `capture_and_annotate(description: string, annotations: [{type: "arrow"|"circle"|"text", position: {x,y}, label: string}])`
2. When AI calls this tool, backend captures the latest video frame
3. Use HTML Canvas or a library like `fabric.js` to draw annotations on the frame
4. Send the annotated image to the frontend for display in an overlay/gallery
5. Users can save annotated screenshots to their report

**Effort:** 3-4 days

---

#### 5. Proactive Audio + Smart Silence
**What:** Enable Gemini's proactive audio mode so the AI intelligently decides when to speak vs. stay silent. If the user is just panning the camera without talking, the AI stays quiet until it sees something worth commenting on — then proactively speaks up.

**Why it stands out:** Most AI assistants either talk too much or wait to be asked. Proactive audio makes the experience feel like walking through a space with a real designer who naturally comments on things.

**Implementation Plan:**
1. Enable proactive audio in config (requires `v1alpha` API):
   ```javascript
   const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1alpha" } });
   config: {
     responseModalities: [Modality.AUDIO],
     proactivity: { proactiveAudio: true },
     enableAffectiveDialog: true,
   }
   ```
2. Update system prompt to instruct the AI on when to proactively speak:
   - "When you notice something interesting in the video feed, speak up naturally"
   - "If the user is silently panning, comment on architectural features you observe"
   - "Don't comment on every frame — wait for meaningful changes"
3. No frontend changes needed — audio playback works the same

**Effort:** 0.5 day

---

### Tier 2: Medium Impact — Solid Features

---

#### 6. Before/After Visualization
**What:** Take a snapshot of the current room, then use AI image generation (Gemini + Imagen) to create a "redesigned" version of the same photo showing the AI's suggestions applied.

**Why it stands out:** This is what competitors like REimagineHome and RoomGPT do, but here it's integrated into a live conversation — the AI suggests changes, then shows you what it would look like.

**Effort:** 3-5 days (requires Imagen API integration)

---

#### 7. Multi-Room Session Memory
**What:** Allow users to walk through multiple rooms in one session. The AI remembers what it said about the living room when you move to the kitchen, maintaining design continuity (e.g., "Since we went with warm oak tones in the living room, let's carry that into the kitchen island").

**Effort:** 1-2 days (context management in system prompt + session state)

---

#### 8. Design Style Quiz (Pre-Consultation)
**What:** Before starting the live session, users take a quick visual quiz (swipe left/right on design images) to help the AI understand their aesthetic preferences before seeing the space.

**Effort:** 2-3 days (new frontend page + session context injection)

---

#### 9. Measurement Helper with AR Overlay
**What:** Guide users to use their phone camera to estimate room dimensions using reference objects (e.g., "Hold a standard credit card against the wall so I can gauge scale"). Display measurement overlay on video.

**Effort:** 3-5 days (computer vision + overlay rendering)

---

#### 10. Voice-Activated Screenshots ("Save That")
**What:** When the user says "save that" or "bookmark this idea," the AI captures the current frame + the last recommendation into a saved gallery accessible after the session.

**Effort:** 1-2 days (keyword detection + frame capture)

---

### Tier 3: Nice to Have — Future Roadmap

---

#### 11. Collaborative Sessions
**What:** Invite a partner/roommate to join the same session. Both see the video feed and can talk to the AI simultaneously.

**Effort:** 5-7 days (multi-client WebSocket + audio mixing)

---

#### 12. Budget Tracker
**What:** As the AI suggests items, it tracks a running cost estimate. Users can set a budget, and the AI adjusts recommendations to stay within it.

**Effort:** 2-3 days (function calling + state management)

---

#### 13. Seasonal/Trend Recommendations
**What:** AI references current design trends, seasonal collections, and upcoming styles (e.g., "Bouclé is having a moment right now — a bouclé accent chair in that corner would be very current").

**Effort:** 1 day (system prompt enhancement + periodic trend data injection)

---

#### 14. 3D Floor Plan Generation
**What:** After scanning a room, generate a basic 2D/3D floor plan with furniture placement suggestions using the measurements estimated from the video.

**Effort:** 5-7 days (significant engineering, possibly use Planner5D API)

---

#### 15. Designer Marketplace Integration
**What:** If a user wants professional help beyond AI, connect them with a local interior designer. NoviSpace takes a referral fee.

**Effort:** 2-3 weeks (marketplace features, payment, scheduling)

---

## Part 3: Cloudflare DNS Setup for novispace.noviscent.ca

### What You Need to Do

Since your frontend is hosted on **Google Cloud Run** and you want to reach it via `novispace.noviscent.ca`, you need to set up a CNAME record in Cloudflare and configure Cloud Run with a custom domain.

### Step-by-Step Instructions

#### Step 1: Add CNAME Record in Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select the `noviscent.ca` domain
3. Go to **DNS** → **Records**
4. Click **Add Record**
5. Set:
   - **Type:** `CNAME`
   - **Name:** `novispace`
   - **Target:** `ghs.googlehosted.com`
   - **Proxy status:** **DNS only (grey cloud)** — **IMPORTANT: Turn OFF the orange cloud proxy**
   - **TTL:** Auto

> **Why DNS only?** Cloud Run needs to verify the domain via DNS challenge, and Cloudflare's proxy can interfere with Google's domain verification and SSL certificate provisioning.

#### Step 2: Map Custom Domain in Cloud Run

Run these commands:

```bash
# Map the custom domain to the frontend service
gcloud beta run domain-mappings create \
  --service=novispace-frontend \
  --domain=novispace.noviscent.ca \
  --region=us-central1 \
  --project=novispace
```

Or do it via the Cloud Console:
1. Go to [Cloud Run](https://console.cloud.google.com/run)
2. Click on `novispace-frontend`
3. Go to **Integrations** or **Custom Domains** tab
4. Click **Add Mapping**
5. Enter `novispace.noviscent.ca`
6. Google will show you DNS records to verify — the CNAME to `ghs.googlehosted.com` should satisfy this

#### Step 3: Wait for SSL Certificate

Google will automatically provision an SSL certificate for `novispace.noviscent.ca`. This can take **15-30 minutes** (sometimes up to 24 hours).

#### Step 4: (Optional) Re-enable Cloudflare Proxy

After the SSL cert is provisioned and the domain is verified, you can optionally turn on the Cloudflare proxy (orange cloud) for:
- DDoS protection
- CDN caching of static assets
- Cloudflare Web Analytics

**However**, if you enable the proxy, you need to set the SSL/TLS mode in Cloudflare to **Full (strict)** to avoid redirect loops.

#### Step 5: Update Backend CORS

Once the frontend is accessible at `novispace.noviscent.ca`, update the backend's `CORS_ORIGIN` to include the new domain:

Update `infrastructure/terraform/main.tf`:
```hcl
env {
  name  = "CORS_ORIGIN"
  value = "https://novispace.noviscent.ca"
}
```

Also update the frontend's WebSocket URL logic to handle the new domain.

---

## Summary: Recommended Implementation Order

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| **P0** | Audio quality fix (gapless playback + jitter buffer) | 1-2 days | Fixes core UX issue |
| **P0** | Enable affective dialog + proactive audio | 0.5 day | Free quality upgrade |
| **P1** | Live transcript overlay | 1-2 days | Accessibility + reference |
| **P1** | Post-session design report with shopping links | 2-3 days | Monetization + wow factor |
| **P1** | Custom domain (novispace.noviscent.ca) | 1 hour | Professionalism |
| **P2** | Pinterest-style mood board generation | 3-4 days | Visual wow factor |
| **P2** | Smart screenshot + annotation | 3-4 days | Unique differentiator |
| **P2** | Before/after visualization | 3-5 days | Competitor parity |
| **P3** | Design style quiz | 2-3 days | Better personalization |
| **P3** | Voice-activated screenshots | 1-2 days | Convenience |
| **P3** | Multi-room memory | 1-2 days | Conversation quality |
