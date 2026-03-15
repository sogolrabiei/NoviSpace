Product Requirements Document (PRD)
Project Name: NoviSpace – Live Agent Edition
Document Owner: VP of Product
Lead Engineer: Technical Lead
Target Hackathon Category: Live Agents 🗣️ (Google Cloud & Gemini)

1. Executive Summary
Objective: Build a web-based real-time spatial consultant that users can interact with via live video and audio. The application allows users to walk through their physical space with their device camera, while the AI "sees" the room, understands the architectural constraints, and provides interruptible, conversational design advice.
Hackathon Goal: Successfully deploy a working web application demonstrating the Gemini Live API natively streaming video/audio, hosted entirely on Google Cloud, to compete for the $25,000 Grand Prize.

2. Target Audience & Problem Statement
The Problem: Traditional digital design tools are static and turn-based. Users living in environments with specific constraints—like a typical Toronto high-rise condo with tricky angles or limited natural light—struggle to get dynamic, in-the-moment feedback on layout and material sourcing.

Target User: Homeowners and renters looking for immediate, professional-grade spatial reasoning without the friction of measuring tapes, static photo uploads, or expensive consultations.

3. Core Features & Technical Implementation
This section outlines the MVP requirements for the hackathon submission.

Feature 1: The Real-Time Walkthrough (WebRTC + Gemini Live)
Description: The user opens the web application, grants camera and microphone permissions, and pans around their room. The AI processes the live video feed to understand the spatial volume, existing furniture, and lighting constraints.

Design Note: To keep the focus strictly on the spatial intelligence and lower the engineering overhead for the weekend, the camera interface will utilize a raw, unedited feed. We will actively omit any manual camera adjustment tools like a white balance feature or exposure sliders from the web UI.

Tech Stack: Gemini Live API (via Google GenAI SDK or ADK) for processing the multimodal stream. WebRTC for capturing the browser's video/audio feed.

Feature 2: Interruptible "Architectural" Voice
Description: The agent speaks to the user naturally, offering suggestions (e.g., "The way the light hits that corner, a low-profile credenza would work beautifully"). Crucially, the user can interrupt the agent mid-sentence (e.g., "Wait, no, I need that corner for a desk"), and the agent instantly pivots its reasoning.

Tech Stack: The built-in interruptibility of the Gemini Live API.

Prompt Strategy: The system prompt must ground the agent in architectural and product design principles so it speaks with the authority of a seasoned professional, not a generic chatbot.

Feature 3: Verified Cloud Infrastructure
Description: To meet the strict judging criteria, the backend serving the web application and managing the API keys must be provably hosted on Google Cloud.

Tech Stack: Google Cloud Run for hosting the web-based product container, and Google Cloud Storage if we need to log any session data or save generated inspiration boards.

4. User Flow (The "Live" Happy Path)
Launch: User navigates to the Noviscent Spatial web app URL.

Connect: User clicks "Start Live Consultation." The browser prompts for camera/mic access.

The Walkthrough: User points their laptop or tablet camera at an empty corner.

The Conversation: * User: "I'm trying to figure out what to do with this wall."

Noviscent Agent: "I can see it's quite narrow. With that structural column on the left, a floating shelf system would maximize your vertical storage without closing off the space."

User (Interrupting): "Actually, I want to put a TV there."

Noviscent Agent: "Got it. In that case, a minimalist media console under 40 inches wide is your best bet to keep the walkway clear."

Session End: The user ends the stream.

5. Hackathon Deliverables Checklist
[ ] Public Code Repository: GitHub repo with spin-up instructions in the README.

[ ] Architecture Diagram: A clean visual showing the frontend web app connecting to Google Cloud Run and the Gemini Live API.

[ ] Cloud Deployment Proof: A short screen recording of the Google Cloud Console showing the active deployment.

[ ] Infrastructure as Code (Bonus): A simple Terraform or Deployment Manager script in the repo.

[ ] 4-Minute Demo Video: Highlighting the real-time, interruptible nature of the web application.