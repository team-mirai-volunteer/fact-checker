# =============================================================================
# Cloud Scheduler モジュール変数定義
# =============================================================================
# このファイルの目的:
# - Cloud Scheduler ジョブ作成用モジュールの入力変数を定義
# - main.tf から呼び出される際のパラメータを受け取る
# - 定期実行スケジュール（cron式）とターゲットURL設定を管理
# - Cloud Run サービスへのHTTPリクエスト認証設定を制御
# =============================================================================

# Cloud Scheduler 設定
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

# スケジュール設定
variable "schedule" {
  description = "Cron schedule expression"
  type        = string
  default     = "0 */6 * * *"
}

# 認証設定
variable "cron_secret" {
  description = "Secret for cron authentication"
  type        = string
}
