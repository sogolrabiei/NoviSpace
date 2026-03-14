variable "project_id" {
  description = "Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "Google Cloud region for all resources"
  type        = string
  default     = "us-central1"
}

variable "gemini_api_key" {
  description = "Gemini API key for the Live API"
  type        = string
  sensitive   = true
}

variable "frontend_url" {
  description = "Frontend URL for CORS configuration. Leave empty to use auto-generated Cloud Run URL."
  type        = string
  default     = ""
}

variable "enable_session_logs" {
  description = "Whether to create a Cloud Storage bucket for session logs"
  type        = bool
  default     = false
}
