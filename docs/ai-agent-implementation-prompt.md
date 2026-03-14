# NoviSpace Live Agent - Complete Implementation Prompt

## Project Context
You are building **NoviSpace**, a real-time spatial design consultant web application for the Gemini Live Agent Challenge hackathon. This is a Live Agents category submission targeting the $25,000 Grand Prize and $10,000 Best of Live Agents prize.

**Deadline**: March 16, 2026 @ 8:00pm EDT

## Project Overview
NoviSpace is a web-based real-time spatial consultant that allows users to walk through their physical space with their device camera while an AI agent "sees" the room, understands architectural constraints, and provides interruptible, conversational design advice.

## Core Problem Statement
Traditional digital design tools are static and turn-based. Users living in environments with specific constraints (like Toronto high-rise condos with tricky angles or limited natural light) struggle to get dynamic, in-the-moment feedback on layout and material sourcing without expensive consultations.

## Target User
Homeowners and renters looking for immediate, professional-grade spatial reasoning without the friction of measuring tapes, static photo uploads, or expensive consultations.

---

## Technical Requirements

### Mandatory Technologies
1. **Gemini Live API** - For multimodal streaming (video + audio processing)
2. **Google GenAI SDK or ADK** - For agent development
3. **Google Cloud Services** - Backend must be hosted on Google Cloud
4. **WebRTC** - For capturing browser video/audio feed
5. **Google Cloud Run** - For hosting the web application container
6. **Google Cloud Storage** (optional) - For logging session data or saving inspiration boards

### Technology Stack
- **Frontend**: Launch UI template (Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui)
  - GitHub: https://github.com/launch-ui/launch-ui
  - Premium, clean, minimal design perfect for architectural aesthetic
  - Modern design system with dark mode support
  - Performance optimized and accessibility-first
- **Backend**: Node.js/Express or Python/FastAPI
- **Deployment**: Google Cloud Run
- **Infrastructure as Code**: Terraform (mandatory for bonus points)
- **Video/Audio**: WebRTC for browser capture
- **AI Integration**: Gemini Live API via Google GenAI SDK

---

## Core Features to Implement

### Feature 1: Real-Time Walkthrough (WebRTC + Gemini Live)
**Description**: User opens the web app, grants camera/microphone permissions, and pans around their room. The AI processes the live video feed to understand spatial volume, existing furniture, and lighting constraints.

**Implementation Requirements**:
- Browser-based camera and microphone access using WebRTC
- Real-time video streaming to Gemini Live API
- No manual camera adjustment tools (no white balance, exposure sliders, etc.)
- Raw, unedited feed to keep focus on spatial intelligence
- Visual feedback showing the agent is "seeing" the space

**Technical Details**:
- Use `navigator.mediaDevices.getUserMedia()` for camera/mic access
- Stream video frames to Gemini Live API
- Handle permissions gracefully with clear UI prompts
- Implement error handling for denied permissions or unsupported browsers

### Feature 2: Interruptible "Architectural" Voice
**Description**: The agent speaks naturally, offering design suggestions. Crucially, the user can interrupt the agent mid-sentence, and the agent instantly pivots its reasoning.

**Implementation Requirements**:
- Natural, conversational voice output
- Built-in interruptibility using Gemini Live API capabilities
- Agent speaks with authority of a seasoned architectural/design professional
- Instant response to user interruptions
- Context-aware conversation flow

**System Prompt Strategy**:
The agent must be grounded in architectural and product design principles. Create a comprehensive system prompt that:
- Establishes the agent as an experienced spatial design consultant
- Focuses on practical, actionable advice
- Considers architectural constraints (structural columns, lighting, dimensions)
- Suggests specific furniture dimensions and placement
- Maintains conversational, professional tone
- Handles interruptions gracefully and pivots reasoning
- Avoids generic chatbot responses

**Example System Prompt Elements**:
```
You are an expert spatial design consultant with 15+ years of experience in residential interior design and architecture. You specialize in helping homeowners optimize their living spaces, particularly in urban high-rise environments with unique constraints.

Your role is to:
- Analyze physical spaces in real-time through video
- Identify architectural constraints (columns, angles, lighting, dimensions)
- Provide specific, actionable design recommendations
- Suggest furniture pieces with specific dimensions
- Consider traffic flow and spatial functionality
- Adapt recommendations based on user preferences and interruptions

Communication style:
- Professional yet conversational
- Specific and practical (mention actual dimensions, materials)
- Acknowledge constraints before suggesting solutions
- Listen actively and pivot when interrupted
- Ask clarifying questions when needed

When analyzing a space, consider:
- Natural and artificial lighting
- Structural elements (columns, beams, angles)
- Room dimensions and proportions
- Traffic flow and accessibility
- Existing furniture and fixtures
- User's stated needs and preferences
```

### Feature 3: Verified Cloud Infrastructure
**Description**: Backend serving the web application and managing API keys must be provably hosted on Google Cloud.

**Implementation Requirements**:
- Deploy backend to Google Cloud Run
- Secure API key management (use Google Secret Manager)
- Architecture must be clearly documented
- Provide screen recording proof of Google Cloud Console showing active deployment
- Include infrastructure-as-code (Terraform or Deployment Manager) for bonus points

**Security Considerations**:
- Never expose Gemini API keys in frontend code
- Use environment variables and Google Secret Manager
- Implement proper CORS policies
- Add rate limiting if needed

---

## User Flow (Happy Path)

1. **Launch**: User navigates to NoviSpace web app URL
2. **Connect**: User clicks "Start Live Consultation"
3. **Permissions**: Browser prompts for camera/mic access
4. **The Walkthrough**: User points camera at their space
5. **The Conversation**:
   - User: "I'm trying to figure out what to do with this wall."
   - Agent: "I can see it's quite narrow. With that structural column on the left, a floating shelf system would maximize your vertical storage without closing off the space."
   - User (Interrupting): "Actually, I want to put a TV there."
   - Agent: "Got it. In that case, a minimalist media console under 40 inches wide is your best bet to keep the walkway clear."
6. **Session End**: User ends the stream

---

## Application Architecture

### Frontend Components (Using Launch UI Template)
1. **Landing Page** (Customize Launch UI Hero Section)
   - Clear value proposition: "Your AI Spatial Design Consultant"
   - Prominent "Start Live Consultation" CTA button
   - Brief explanation of how it works (3-step process)
   - Modern, clean UI leveraging Launch UI's design system
   - Dark mode enabled for professional architectural aesthetic
   - Fully responsive across all devices

2. **Features Section** (Use Launch UI Features Component)
   - Real-time video analysis
   - Interruptible conversations
   - Professional design advice
   - Architectural expertise

3. **Camera Interface** (Custom Component with shadcn/ui)
   - Live video preview with clean borders
   - Visual indicator that agent is "seeing" the space
   - Microphone status indicator (muted/active)
   - End session button (prominent, accessible)
   - Minimal, distraction-free design
   - Use Launch UI's card components for layout

4. **Conversation Display** (Custom Component)
   - Real-time transcription of user speech (optional but nice)
   - Visual feedback when agent is speaking (animated indicator)
   - Indication when user can speak/interrupt
   - Clean typography using Launch UI's design tokens

### Backend Components
1. **API Server** (Node.js/Express or Python/FastAPI)
   - Handle WebRTC connections
   - Manage Gemini Live API integration
   - Secure API key handling
   - Session management
   - Error handling and logging

2. **Gemini Live Integration**
   - Initialize Gemini Live API connection
   - Stream video frames from frontend
   - Stream audio from frontend
   - Receive and relay agent responses
   - Handle interruptions

3. **Cloud Infrastructure**
   - Google Cloud Run deployment
   - Google Secret Manager for API keys
   - Google Cloud Storage (optional for session logs)
   - Proper IAM roles and permissions

---

## Hackathon Deliverables Checklist

### Required Submissions
- [ ] **Public Code Repository** (GitHub)
  - Complete source code
  - Comprehensive README with:
    - Project description
    - Setup instructions
    - Prerequisites
    - Environment variables needed
    - Deployment instructions
    - Architecture overview
  - Clear folder structure
  - Comments in code where necessary

- [ ] **Architecture Diagram**
  - Visual showing frontend → backend → Gemini Live API flow
  - Include Google Cloud services used
  - Show data flow (video/audio streams)
  - Clear and professional design
  - Add to repository and demo video

- [ ] **Google Cloud Deployment Proof**
  - Screen recording of Google Cloud Console
  - Show active Cloud Run deployment
  - Show relevant logs or metrics
  - Demonstrate backend is running on GCP
  - Keep recording separate from main demo

- [ ] **4-Minute Demo Video**
  - Problem statement (30 seconds)
  - Solution overview (30 seconds)
  - Live demonstration (2 minutes)
    - Show camera/mic permissions
    - Walk through actual space
    - Demonstrate real-time conversation
    - **Showcase interruption capability**
    - Show agent's spatial understanding
  - Technical architecture (30 seconds)
  - Closing/impact (30 seconds)
  - Must show actual working software (no mockups)

### Bonus Points
- [x] **Infrastructure as Code with Terraform** (MANDATORY)
  - Complete Terraform configuration in `infrastructure/terraform/`
  - All Google Cloud resources defined as code
  - Include in public repository
  - Comprehensive documentation in terraform/README.md
  - Example variables file for easy setup
  - This is REQUIRED for maximum points

- [ ] **Content Creation**
  - Blog post, podcast, or video about building with Gemini
  - Must mention created for #GeminiLiveAgentChallenge
  - Share on social media with hashtag

- [ ] **Google Developer Group**
  - Sign up for GDG
  - Provide link to public profile

---

## Implementation Steps

### Phase 1: Project Setup (Hour 1-2)
1. Initialize Git repository
2. Clone and set up Launch UI template:
   ```bash
   git clone https://github.com/launch-ui/launch-ui.git frontend
   cd frontend
   npm install
   ```
3. Set up project structure:
   ```
   novispace/
   ├── frontend/              # Launch UI template (Next.js 14)
   │   ├── app/
   │   ├── components/
   │   │   ├── ui/           # shadcn/ui components
   │   │   └── custom/       # Custom components for video/audio
   │   ├── lib/
   │   ├── public/
   │   └── package.json
   ├── backend/
   │   ├── src/
   │   │   ├── routes/
   │   │   ├── services/
   │   │   │   └── gemini-live.js
   │   │   └── utils/
   │   ├── Dockerfile
   │   └── package.json
   ├── infrastructure/
   │   └── terraform/
   │       ├── main.tf
   │       ├── variables.tf
   │       ├── outputs.tf
   │       └── README.md
   ├── docs/
   │   └── architecture-diagram.png
   └── README.md
   ```
4. Initialize backend (Node.js/Express or Python/FastAPI)
5. Set up Google Cloud project
6. Enable required APIs (Cloud Run, Secret Manager, Artifact Registry)
7. Install Terraform CLI

### Phase 2: Core Functionality (Hour 3-8)
1. **Frontend Development with Launch UI**
   - Customize Launch UI landing page for NoviSpace branding
   - Strip down unnecessary sections (keep Hero, Features, How It Works, FAQ)
   - Create custom camera/microphone access component
   - Build video preview component with shadcn/ui styling
   - Create WebRTC connection logic
   - Add conversation interface with minimal design
   - Implement error handling with Launch UI's design system
   - Leverage Launch UI's dark mode for professional aesthetic

2. **Backend Development**
   - Set up Express/FastAPI server
   - Implement Gemini Live API integration
   - Create WebSocket/WebRTC handling
   - Add session management
   - Implement error handling and logging
   - Secure API key management with Google Secret Manager
   - Create Dockerfile for containerization

3. **Integration**
   - Connect Next.js frontend to backend API
   - Test video/audio streaming
   - Verify Gemini Live API responses
   - Test interruption capability
   - Debug and refine
   - Ensure responsive design works on mobile

### Phase 3: System Prompt Engineering (Hour 9-10)
1. Craft comprehensive system prompt
2. Test with various scenarios
3. Refine based on agent responses
4. Ensure architectural expertise tone
5. Verify interruption handling

### Phase 4: Cloud Deployment (Hour 11-14)
1. Create Dockerfile for backend
2. Set up Google Cloud Run
3. Configure environment variables
4. Deploy to Cloud Run
5. Test deployed application
6. Record Google Cloud Console proof

### Phase 5: Infrastructure as Code with Terraform (Hour 15-16)
1. **Create Terraform Configuration Files**
   - `main.tf`: Define Google Cloud provider and resources
   - `variables.tf`: Define input variables (project ID, region, etc.)
   - `outputs.tf`: Define outputs (Cloud Run URLs, etc.)
   - `terraform.tfvars.example`: Example variables file

2. **Define Resources**
   - Google Cloud Run service for backend
   - Google Cloud Run service for frontend (Next.js)
   - Google Secret Manager secrets for API keys
   - Google Artifact Registry for Docker images
   - IAM roles and permissions
   - Cloud Storage bucket (optional, for session logs)

3. **Terraform Best Practices**
   - Use variables for all configurable values
   - Add proper resource dependencies
   - Include data sources for existing resources
   - Add comments explaining each resource
   - Use consistent naming conventions

4. **Test Infrastructure Deployment**
   ```bash
   cd infrastructure/terraform
   terraform init
   terraform plan
   terraform apply
   ```

5. **Document Terraform Usage**
   - Add infrastructure/terraform/README.md
   - Include prerequisites (Terraform version, gcloud CLI)
   - Document all variables and their purposes
   - Provide step-by-step deployment instructions
   - Add troubleshooting section
   - Include cleanup instructions (`terraform destroy`)

### Phase 6: Documentation & Demo (Hour 17-20)
1. **README Documentation**
   - Project overview
   - Setup instructions
   - Architecture explanation
   - Deployment guide
   - Environment variables
   - Troubleshooting

2. **Architecture Diagram**
   - Create professional diagram
   - Show all components and data flow
   - Export high-quality image

3. **Demo Video**
   - Script the demo
   - Record live walkthrough
   - Edit for clarity and pacing
   - Add captions/annotations
   - Keep under 4 minutes
   - Export high-quality video

4. **Cloud Deployment Proof**
   - Record Google Cloud Console
   - Show active deployments
   - Show logs/metrics

### Phase 7: Testing & Polish (Hour 21-24)
1. End-to-end testing
2. Cross-browser testing
3. Mobile responsiveness check
4. Performance optimization
5. Bug fixes
6. Final code cleanup
7. Repository organization
8. Submission preparation

---

## Judging Criteria Alignment

### Innovation & Multimodal User Experience (40%)
**How to Excel**:
- Seamless video + audio integration
- Natural, interruptible conversations
- Agent feels like a real design consultant
- Distinct professional persona/voice
- Live, context-aware experience (not turn-based)
- Smooth user flow with minimal friction

**Implementation Focus**:
- Prioritize UX polish
- Make interruptions feel natural
- Ensure agent maintains context
- Create professional, authoritative voice
- Minimize latency in responses

### Technical Implementation & Agent Architecture (30%)
**How to Excel**:
- Effective use of Google GenAI SDK/ADK
- Robust Google Cloud hosting
- Sound agent logic and reasoning
- Graceful error handling
- Grounded responses (avoid hallucinations)
- Clean, maintainable code

**Implementation Focus**:
- Follow best practices
- Implement comprehensive error handling
- Use grounding techniques in prompts
- Document architecture clearly
- Write clean, commented code
- Demonstrate technical sophistication

### Demo & Presentation (30%)
**How to Excel**:
- Clear problem definition
- Compelling solution presentation
- Professional architecture diagram
- Visual proof of Cloud deployment
- Actual working software demonstration
- Engaging, well-paced video

**Implementation Focus**:
- Script demo carefully
- Show real-time capabilities
- Highlight interruption feature
- Demonstrate spatial understanding
- Keep video concise and engaging
- Professional production quality

---

## Key Success Factors

### Must-Have Features
1. ✅ Real-time video streaming from browser
2. ✅ Live audio conversation with agent
3. ✅ Interruptible agent responses
4. ✅ Spatial understanding and design advice
5. ✅ Google Cloud hosting
6. ✅ Working demo under 4 minutes
7. ✅ Public GitHub repository
8. ✅ Architecture diagram
9. ✅ Cloud deployment proof

### Nice-to-Have Features
- Session history/logs
- Multiple room analysis
- Design inspiration board generation
- Furniture product recommendations with links
- Room dimension estimation
- Before/after visualization suggestions
- Multi-language support

### Critical Differentiators
1. **Interruption Quality**: Make interruptions feel completely natural
2. **Spatial Intelligence**: Agent must demonstrate real understanding of space
3. **Professional Persona**: Speak like an experienced designer, not a chatbot
4. **Visual Polish**: Modern, professional UI that inspires confidence
5. **Technical Robustness**: Handle errors gracefully, never crash

---

## Common Pitfalls to Avoid

1. **Don't**: Hardcode API keys in frontend
   **Do**: Use backend proxy with Secret Manager

2. **Don't**: Create turn-based chat interface
   **Do**: Build truly live, interruptible experience

3. **Don't**: Use generic chatbot language
   **Do**: Craft professional, expert system prompt

4. **Don't**: Ignore error handling
   **Do**: Handle all edge cases gracefully

5. **Don't**: Overcomplicate the MVP
   **Do**: Focus on core features that demonstrate value

6. **Don't**: Skip the architecture diagram
   **Do**: Create clear, professional visualization

7. **Don't**: Record demo with bugs
   **Do**: Test thoroughly before recording

8. **Don't**: Exceed 4-minute video limit
   **Do**: Edit ruthlessly for clarity and pace

---

## Environment Variables Needed

```env
# Backend .env
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLOUD_PROJECT=your_project_id
PORT=8080
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-url.com

# Frontend .env
VITE_API_URL=https://your-backend-url.run.app
VITE_WS_URL=wss://your-backend-url.run.app
```

---

## Testing Checklist

### Functional Testing
- [ ] Camera access works on first try
- [ ] Microphone access works on first try
- [ ] Video streams to backend successfully
- [ ] Audio streams to backend successfully
- [ ] Agent responds to spatial queries
- [ ] Interruptions work mid-sentence
- [ ] Agent maintains context after interruption
- [ ] Session ends cleanly
- [ ] Error messages are clear and helpful

### Cross-Browser Testing
- [ ] Chrome (primary target)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Mobile Testing
- [ ] iOS Safari
- [ ] Android Chrome

### Performance Testing
- [ ] Video stream latency < 500ms
- [ ] Audio response latency < 1s
- [ ] No memory leaks during long sessions
- [ ] Graceful degradation on slow connections

---

## Submission Preparation

### GitHub Repository
1. Clean up code and remove debug statements
2. Add comprehensive README
3. Include LICENSE file
4. Add .gitignore (exclude node_modules, .env, etc.)
5. Organize folder structure
6. Add architecture diagram to repo
7. Include setup and deployment instructions
8. Add troubleshooting section

### Devpost Submission
1. Project title: "NoviSpace - Live Spatial Design Consultant"
2. Tagline: "Real-time architectural advice through live video and voice"
3. Description: Comprehensive overview with features and tech stack
4. Upload demo video (< 4 minutes)
5. Upload architecture diagram
6. Upload Cloud deployment proof
7. Link to GitHub repository
8. List all technologies used
9. Describe challenges and learnings
10. Submit before deadline!

---

## Final Pre-Submission Checklist

- [ ] All code committed and pushed to GitHub
- [ ] README is comprehensive and accurate
- [ ] Architecture diagram is clear and professional
- [ ] Demo video is under 4 minutes
- [ ] Demo video shows working software
- [ ] Cloud deployment proof recorded
- [ ] Application is deployed and accessible
- [ ] All environment variables documented
- [ ] Setup instructions tested by someone else
- [ ] No API keys exposed in code
- [ ] Infrastructure as code included (bonus)
- [ ] All deliverables uploaded to Devpost
- [ ] Submission completed before deadline

---

## Resources & References

### Google Cloud Documentation
- [Gemini Live API Documentation](https://ai.google.dev/gemini-api/docs/live)
- [Google GenAI SDK](https://ai.google.dev/gemini-api/docs/sdks)
- [Google Cloud Run](https://cloud.google.com/run/docs)
- [Google Secret Manager](https://cloud.google.com/secret-manager/docs)

### WebRTC Resources
- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [getUserMedia Documentation](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

### Frontend Libraries
- [React Documentation](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)

---

## Success Metrics

### Technical Metrics
- Application loads in < 3 seconds
- Video stream latency < 500ms
- Agent response time < 1 second
- 99% uptime during judging period
- Zero critical bugs in demo

### User Experience Metrics
- Intuitive UI requiring no instructions
- Natural conversation flow
- Smooth interruption handling
- Professional, authoritative agent persona
- Clear value proposition

### Hackathon Metrics
- All required deliverables submitted
- Submission before deadline
- Working demo video
- Clear architecture documentation
- Provable Google Cloud deployment

---

## Post-Hackathon Considerations

If you want to continue development after the hackathon:
- Add user authentication
- Implement session history
- Add furniture product database integration
- Create shareable design reports
- Add AR visualization features
- Implement room measurement tools
- Add multi-user collaboration
- Create mobile native apps

---

## Good Luck!

Remember: Focus on delivering a **working, polished MVP** that demonstrates the core value proposition. It's better to have fewer features that work flawlessly than many features that are buggy. The judges want to see real-time, interruptible, spatially-aware conversations that break the "text box" paradigm.

**Prioritize**:
1. Working live video/audio integration
2. Natural, interruptible conversations
3. Professional agent persona
4. Clean, modern UI
5. Solid Google Cloud deployment
6. Compelling demo video

You have 3 days. Stay focused, test frequently, and ship something amazing! 🚀
