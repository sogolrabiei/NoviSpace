terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ─────────────────────────────────────────────
# Enable required Google Cloud APIs
# ─────────────────────────────────────────────

resource "google_project_service" "run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "secretmanager" {
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

# ─────────────────────────────────────────────
# Artifact Registry – Docker image repository
# ─────────────────────────────────────────────

resource "google_artifact_registry_repository" "novispace" {
  location      = var.region
  repository_id = "novispace"
  format        = "DOCKER"
  description   = "Docker images for NoviSpace application"

  depends_on = [google_project_service.artifactregistry]
}

# ─────────────────────────────────────────────
# Secret Manager – Gemini API Key
# ─────────────────────────────────────────────

resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "gemini-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "gemini_api_key_version" {
  secret      = google_secret_manager_secret.gemini_api_key.id
  secret_data = var.gemini_api_key
}

# ─────────────────────────────────────────────
# Service Account for Cloud Run
# ─────────────────────────────────────────────

resource "google_service_account" "novispace_backend" {
  account_id   = "novispace-backend"
  display_name = "NoviSpace Backend Service Account"
}

# Allow the service account to read the Gemini API key secret
resource "google_secret_manager_secret_iam_member" "backend_secret_access" {
  secret_id = google_secret_manager_secret.gemini_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.novispace_backend.email}"
}

# ─────────────────────────────────────────────
# Cloud Run – Backend Service
# ─────────────────────────────────────────────

resource "google_cloud_run_v2_service" "backend" {
  name     = "novispace-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.novispace_backend.email

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/novispace/backend:latest"

      ports {
        container_port = 8080
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "CORS_ORIGIN"
        value = var.frontend_url != "" ? var.frontend_url : "https://novispace-frontend-cdenlerfyq-uc.a.run.app"
      }

      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  depends_on = [
    google_project_service.run,
    google_secret_manager_secret_version.gemini_api_key_version,
    google_secret_manager_secret_iam_member.backend_secret_access,
  ]
}

# ─────────────────────────────────────────────
# Cloud Run – Frontend Service
# ─────────────────────────────────────────────

resource "google_cloud_run_v2_service" "frontend" {
  name     = "novispace-frontend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/novispace/frontend:latest"

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "NEXT_PUBLIC_WS_URL"
        value = replace(google_cloud_run_v2_service.backend.uri, "https://", "wss://")
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  depends_on = [google_project_service.run]
}

# ─────────────────────────────────────────────
# IAM – Allow unauthenticated access (public web app)
# ─────────────────────────────────────────────

resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  name     = google_cloud_run_v2_service.backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  name     = google_cloud_run_v2_service.frontend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ─────────────────────────────────────────────
# Cloud Storage – Session logs (optional)
# ─────────────────────────────────────────────

resource "google_storage_bucket" "session_logs" {
  count    = var.enable_session_logs ? 1 : 0
  name     = "${var.project_id}-novispace-sessions"
  location = var.region

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}

# ─────────────────────────────────────────────
# Data sources
# ─────────────────────────────────────────────

data "google_project" "current" {}
