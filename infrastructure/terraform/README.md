# NoviSpace – Terraform Infrastructure

Provisions all Google Cloud resources needed to run NoviSpace.

## Resources Created

| Resource | Purpose |
|----------|---------|
| Artifact Registry | Docker image repository |
| Cloud Run (backend) | WebSocket server + Gemini Live API proxy |
| Cloud Run (frontend) | Next.js web application |
| Secret Manager | Stores Gemini API key securely |
| Service Account | Backend identity with secret access |
| Cloud Storage (optional) | Session log storage |

## Prerequisites

- [Terraform >= 1.5](https://developer.hashicorp.com/terraform/install)
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
- A GCP project with billing enabled
- A Gemini API key

## Quick Start

```bash
# 1. Authenticate
gcloud auth application-default login

# 2. Copy and fill in variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# 3. Initialize and deploy
terraform init
terraform plan
terraform apply
```

## Build & Push Docker Images

After Terraform creates the Artifact Registry, push your images:

```bash
# Configure Docker for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Backend
cd ../../backend
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT/novispace/backend:latest .
docker push us-central1-docker.pkg.dev/YOUR_PROJECT/novispace/backend:latest

# Frontend (set WS_URL at build time)
cd ../frontend
docker build \
  --build-arg NEXT_PUBLIC_WS_URL=wss://YOUR_BACKEND_URL/ws \
  -t us-central1-docker.pkg.dev/YOUR_PROJECT/novispace/frontend:latest .
docker push us-central1-docker.pkg.dev/YOUR_PROJECT/novispace/frontend:latest
```

Then redeploy Cloud Run services to pick up the new images:

```bash
terraform apply
```

## Variables

| Name | Description | Default |
|------|-------------|---------|
| `project_id` | GCP project ID | (required) |
| `region` | GCP region | `us-central1` |
| `gemini_api_key` | Gemini API key | (required, sensitive) |
| `frontend_url` | Frontend URL for CORS | auto-generated |
| `enable_session_logs` | Create Cloud Storage bucket | `false` |

## Outputs

| Name | Description |
|------|-------------|
| `backend_url` | Backend Cloud Run URL |
| `frontend_url` | Frontend Cloud Run URL |
| `backend_ws_url` | WebSocket URL for the backend |
| `artifact_registry` | Artifact Registry path |

## Cleanup

```bash
terraform destroy
```
