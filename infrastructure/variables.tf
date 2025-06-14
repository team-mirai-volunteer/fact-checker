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
  
  validation {
    condition     = var.min_instances >= 0 && var.min_instances <= 10
    error_message = "The min_instances value must be between 0 and 10."
  }
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 1
  
  validation {
    condition     = var.max_instances >= 1 && var.max_instances <= 100
    error_message = "The max_instances value must be between 1 and 100."
  }
}

variable "cpu_limit" {
  description = "CPU limit for Cloud Run instances"
  type        = string
  default     = "1"
  
  validation {
    condition     = contains(["1", "2", "4", "8"], var.cpu_limit)
    error_message = "The cpu_limit value must be one of: 1, 2, 4, 8."
  }
}

variable "memory_limit" {
  description = "Memory limit for Cloud Run instances"
  type        = string
  default     = "512Mi"
  
  validation {
    condition     = can(regex("^[0-9]+(Mi|Gi)$", var.memory_limit))
    error_message = "The memory_limit value must be in format like '512Mi' or '1Gi'."
  }
}

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "debug"
  
  validation {
    condition     = contains(["debug", "info", "warn", "error"], var.log_level)
    error_message = "The log_level value must be one of: debug, info, warn, error."
  }
}

variable "cron_schedule" {
  description = "Cron schedule for the scheduler"
  type        = string
  default     = "0 */2 * * *"
}
