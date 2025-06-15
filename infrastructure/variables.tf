# =============================================================================
# Terraform ルート変数定義
# =============================================================================
# このファイルの目的:
# - Terraformのメイン設定で使用する変数を定義
# - GitHub Actions ワークフローから渡される値を受け取る
# - 全モジュールで共通して使用される設定値を管理
# - terraform plan/apply 実行時の入力パラメータとして機能
# =============================================================================

# 基盤設定
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

# Secret Manager 設定
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

# Cloud Run 設定
variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 1
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

# アプリケーション設定
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

# デプロイ制御
variable "deploy_phase" {
  description = "Deployment phase: base (infrastructure only) or app (full deployment)"
  type        = string
  default     = "app"
  
  validation {
    condition     = contains(["base", "app"], var.deploy_phase)
    error_message = "deploy_phase must be either 'base' or 'app'."
  }
}
