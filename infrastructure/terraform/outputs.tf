output "backend_url" {
  description = "URL of the NoviSpace backend Cloud Run service"
  value       = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  description = "URL of the NoviSpace frontend Cloud Run service"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "backend_ws_url" {
  description = "WebSocket URL for the backend (replace https with wss)"
  value       = replace(google_cloud_run_v2_service.backend.uri, "https://", "wss://")
}

output "artifact_registry" {
  description = "Artifact Registry repository path for Docker images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/novispace"
}
