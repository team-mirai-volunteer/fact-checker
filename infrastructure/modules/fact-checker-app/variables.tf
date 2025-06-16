# =============================================================================
# Fact-Checker App モジュール変数定義
# =============================================================================
# このファイルの目的:
# - Cloud Run アプリケーションデプロイ用モジュールの入力変数を定義
# - main.tf から呼び出される際のパラメータを受け取る
# - アプリケーション固有の設定（スケーリング、リソース制限等）を管理
# - Google Secret Manager からの環境変数設定を制御
# =============================================================================

# Cloud Run サービス設定
variable "environment" {
  description = "Environment name (production or staging)"
  type        = string
}

variable "app_name" {
  description = "Application name"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "container_image" {
  description = "Container image URL"
  type        = string
}

# Cloud Run スケーリング設定
variable "min_instances" {
  description = "Minimum number of instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 10
}

# Cloud Run リソース制限
variable "cpu_limit" {
  description = "CPU limit"
  type        = string
  default     = "1"
}

variable "memory_limit" {
  description = "Memory limit"
  type        = string
  default     = "1Gi"
}

# 環境変数設定
variable "secret_env_vars" {
  description = "Map of environment variable names to secret references"
  type        = map(string)
  default     = {}
}

variable "env_vars" {
  description = "Map of environment variable names to values"
  type        = map(string)
  default     = {}
}