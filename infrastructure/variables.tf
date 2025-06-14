variable "gcp_project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "branch_name" {
  description = "Git branch name for environment determination"
  type        = string
  default     = "staging"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "asia-northeast1"
}

variable "secrets" {
  description = "Map of secret names to create"
  type        = map(string)
  default = {
    "openai-api-key"      = "OpenAI API Key"
    "vector-store-id"     = "Vector Store ID"
    "slack-bot-token"     = "Slack Bot Token"
    "slack-signing-secret" = "Slack Signing Secret"
    "slack-channel-id"    = "Slack Channel ID"
    "x-app-key"           = "X App Key"
    "x-app-secret"        = "X App Secret"
    "x-access-token"      = "X Access Token"
    "x-access-secret"     = "X Access Secret"
    "x-bearer-token"      = "X Bearer Token"
    "cron-secret"         = "Cron Secret"
  }
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10
}

variable "cpu_limit" {
  description = "CPU limit for Cloud Run instances"
  type        = string
  default     = "1"
}

variable "memory_limit" {
  description = "Memory limit for Cloud Run instances"
  type        = string
  default     = "512Mi"
}

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "debug"
}

variable "cron_schedule" {
  description = "Cron schedule for the scheduler"
  type        = string
  default     = "0 */2 * * *"
}
