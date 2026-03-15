# NoviSpace — AI Spatial Design Consultant

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Run-4285F4?logo=google-cloud)](https://cloud.google.com/run)
[![Gemini API](https://img.shields.io/badge/Gemini-2.0%20Flash-8E75B2?logo=google)](https://ai.google.dev/gemini-api)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)

> **Real-time, voice-first interior design consultation powered by Google's Gemini Live API**

🏆 **Built for**: Gemini Live Agent Challenge — Live Agents Category  
🌐 **Live Demo**: [https://novispace.ca](https://novispace.ca)  
📹 **Demo Video**: [Watch on YouTube](#) <!-- Add your demo video link -->

---

## 🎯 What is NoviSpace?

NoviSpace is a web application that lets you **walk through your home with your phone**, have a **natural voice conversation** with an AI design consultant, and get **instant, personalized recommendations** — all while staying within your budget.

**The Problem**: Traditional interior design consultations cost $100-300/hour, require in-person visits, and are inaccessible to most homeowners.

**Our Solution**: An AI-powered design consultant that:
- 👁️ **Sees your space** through your camera in real-time
- 🗣️ **Talks naturally** with voice (fully interruptible)
- 📏 **Captures measurements** automatically
- 💰 **Tracks your budget** as you discuss options
- 🔖 **Bookmarks ideas** with voice commands ("save that!")
- 🛒 **Generates shopping links** to Amazon, Wayfair, IKEA, etc.

---

## Features

- **Live Video Analysis** — Point your camera and the AI observes your space in real-time
- **Natural Voice Conversation** — Talk naturally; the agent responds with specific, actionable design advice
- **Instant Interruption** — Cut in mid-sentence and the agent pivots immediately
- **Professional Spatial Intelligence** — Understands structural columns, lighting, traffic flow, and dimensions
- **Dark-Mode UI** — Clean, minimal, architectural aesthetic

---

## 🏗️ Architecture

### Split-Brain Design

NoviSpace uses a **split-brain architecture** to achieve both real-time conversational AI and structured data extraction:

```
┌─────────────────────────────────────────────────────────┐
│                    User (Browser)                       │
│              Camera + Mic + Transcript UI               │
└────────────────────┬────────────────────────────────────┘
                     │ WebSocket (video frames + audio)
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

**Why Split-Brain?**
- Gemini Live's native tool calling is unstable (causes session crashes)
- Separation allows the Interaction Layer to focus on conversation quality
- Reasoning Layer uses stable REST API with retry logic for data extraction
- Debounced analysis (8s) reduces API calls and improves accuracy

### Key Technical Innovations

1. **Transcript Fragment Merging**: Consecutive same-speaker fragments are merged before analysis to prevent extracting garbage data
2. **Instant Bookmark Detection**: User says "save that" → system immediately bookmarks the last agent message
3. **Client-Side Measurement Fallback**: If API fails, measurements are extracted from transcript using regex
4. **Smart Shopping Links**: Product names are extracted from conversational text for accurate search queries
5. **Mobile-First UI**: Video stays pinned while transcript scrolls independently

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons |
| Backend | Node.js, Express, WebSocket (`ws`) |
| AI | Gemini 2.0 Flash Live API via `@google/genai` |
| Infrastructure | Google Cloud Run, Secret Manager, Artifact Registry |
| IaC | Terraform |

---

## Project Structure

```
novispace/
├── frontend/                  # Next.js web application
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── consult/page.tsx   # Live consultation page
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles + CSS variables
│   ├── components/ui/         # shadcn/ui components
│   ├── lib/utils.ts           # Utility functions
│   ├── Dockerfile
│   └── package.json
├── backend/                   # Express + WebSocket server
│   ├── src/
│   │   ├── server.js          # Express + WS server
│   │   └── services/
│   │       └── gemini-live.js # Gemini Live API integration
│   ├── Dockerfile
│   └── package.json
├── infrastructure/
│   └── terraform/             # Full IaC for Google Cloud
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── README.md
├── docs/
└── README.md
```

---

## Prerequisites

- **Node.js** >= 20
- **npm** >= 10
- A **Gemini API key** (get one at [ai.google.dev](https://ai.google.dev))
- **Google Cloud** project with billing (for deployment)
- **Terraform** >= 1.5 (for infrastructure)
- **Docker** (for containerized deployment)

---

## Local Development

### 1. Backend

```bash
cd backend
npm install

# Create .env from example
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

npm run dev
```

The backend runs on `http://localhost:8080` with WebSocket at `ws://localhost:8080/ws`.

### 2. Frontend

```bash
cd frontend
npm install

# Create .env.local from example
cp .env.example .env.local
# Default WS_URL points to localhost:8080

npm run dev
```

The frontend runs on `http://localhost:3000`.

### 3. Usage

1. Open `http://localhost:3000`
2. Click **Start Live Consultation**
3. Allow camera and microphone access
4. Point your camera at any space and start talking
5. Interrupt the agent anytime — it pivots instantly

---

## Deployment to Google Cloud

### Option A: Terraform (Recommended)

```bash
cd infrastructure/terraform

# Copy and fill in your variables
cp terraform.tfvars.example terraform.tfvars

# Deploy infrastructure
terraform init
terraform plan
terraform apply
```

Then build and push Docker images — see `infrastructure/terraform/README.md` for details.

### Option B: Manual

```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Build and deploy backend
cd backend
gcloud run deploy novispace-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=your-key,CORS_ORIGIN=https://your-frontend-url"

# Build and deploy frontend
cd ../frontend
gcloud run deploy novispace-frontend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Gemini API key (required) | — |
| `PORT` | Server port | `8080` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket URL | `ws://localhost:8080/ws` |

---

## How It Works

1. **User opens the app** → lands on a clean, minimal homepage
2. **Clicks "Start Live Consultation"** → navigates to the consultation page
3. **Grants camera/mic permissions** → browser captures video + audio
4. **WebSocket connection established** → frontend connects to backend
5. **Backend creates Gemini Live session** → multimodal streaming begins
6. **Video frames sent at 1 fps** → Gemini "sees" the space
7. **Audio streamed continuously** → user speaks naturally
8. **Gemini responds with voice** → professional design advice in real-time
9. **User interrupts** → Gemini stops immediately and pivots
10. **Session ends** → all streams and connections closed cleanly

---

## 🐛 Troubleshooting

### Camera/Microphone Not Working
- Ensure you're using **HTTPS** (required for WebRTC)
- Check browser permissions (click the lock icon in the address bar)
- Try a different browser (Chrome/Edge work best)

### WebSocket Connection Fails
- Verify the backend URL in frontend `.env.local`
- For production, ensure you're using `wss://` (not `ws://`)
- Check CORS settings in backend environment variables

### API Rate Limits
- Free tier: 15 requests/minute for `gemini-2.0-flash`
- Upgrade to paid tier: ~$1-3/day for 100 sessions
- See [upgrade instructions](DEVPOST_SUBMISSION.md#how-to-upgrade-to-gemini-api-paid-tier)

### Session Not Saving
- Check browser localStorage isn't full
- Ensure you're on the same domain (no www vs non-www mismatch)

---

## 📚 Documentation

- [DevPost Submission](DEVPOST_SUBMISSION.md) - Full project write-up for hackathon judges
- [Architecture Details](docs/architecture.md) - Deep dive into the split-brain design
- [Infrastructure Setup](infrastructure/terraform/README.md) - Terraform deployment guide
- [Contributing Guidelines](CONTRIBUTING.md) - How to contribute
- [Security Policy](SECURITY.md) - Security best practices

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Google Gemini API](https://ai.google.dev/gemini-api)
- Deployed on [Google Cloud Run](https://cloud.google.com/run)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

---

## 📧 Contact

For questions or feedback about NoviSpace, please open a [GitHub Issue](../../issues).
