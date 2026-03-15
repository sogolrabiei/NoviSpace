# Development Scripts

This directory contains utility scripts for development and debugging.

## Scripts

### `check-logs.ps1` (PowerShell)
Analyzes Google Cloud Run logs for the NoviSpace backend.

**Usage**:
```powershell
.\scripts\check-logs.ps1
```

**What it does**:
- Fetches last 500 log entries from Cloud Run
- Filters and displays errors, warnings, and important events
- Shows Gemini session events, WebSocket events, and session creation logs
- Provides a summary of audio/video data flow

**Requirements**:
- Google Cloud SDK installed
- Authenticated with `gcloud auth login`
- Access to the `novispace` GCP project

---

### `test-backend.js` (Node.js)
Quick integration test for the backend WebSocket + Gemini Live API.

**Usage**:
```bash
node scripts/test-backend.js
```

**What it does**:
- Connects to the backend WebSocket
- Starts a Gemini Live session
- Waits for audio/text response from the AI
- Reports success/failure

**Requirements**:
- `ws` package installed (`npm install ws`)
- Backend deployed and accessible

**Exit codes**:
- `0` = Success (got audio response)
- `1` = Failure (timeout or no audio)

---

## Notes

These scripts are for **development and debugging only** and are not part of the production application.
