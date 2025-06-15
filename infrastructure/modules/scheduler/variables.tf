variable "app_name" {
  description = "Application name"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "service_url" {
  description = "Cloud Run service URL"
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
}

variable "schedule" {
  description = "Cron schedule expression"
  type        = string
  default     = "0 */6 * * *"
}

variable "cron_secret" {
  description = "Secret for cron authentication"
  type        = string
}
