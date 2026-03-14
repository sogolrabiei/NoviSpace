# NoviSpace — AI Spatial Design Consultant

> Real-time, interruptible design advice through live video and voice, powered by the Gemini Live API on Google Cloud.

NoviSpace is a web application that lets you walk through your physical space with your device camera while an AI agent **sees** the room, understands architectural constraints, and provides professional-grade spatial design advice — all in a natural, interruptible voice conversation.

**Hackathon**: Gemini Live Agent Challenge — Live Agents category

---

## Features

- **Live Video Analysis** — Point your camera and the AI observes your space in real-time
- **Natural Voice Conversation** — Talk naturally; the agent responds with specific, actionable design advice
- **Instant Interruption** — Cut in mid-sentence and the agent pivots immediately
- **Professional Spatial Intelligence** — Understands structural columns, lighting, traffic flow, and dimensions
- **Dark-Mode UI** — Clean, minimal, architectural aesthetic

---

## Architecture

```
┌──────────────┐     WebSocket      ┌──────────────────┐    Gemini Live API    ┌─────────┐
│   Frontend   │ ◄──────────────►  │   Backend        │ ◄──────────────────►  │ Gemini  │
│  (Next.js)   │   video frames    │  (Express + WS)  │   audio/video stream  │ 2.0     │
│  Cloud Run   │   + audio PCM     │  Cloud Run       │   + audio response    │ Flash   │
└──────────────┘                    └──────────────────┘                        └─────────┘
                                           │
                                    Secret Manager
                                    (Gemini API Key)
```

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

## License

MIT
