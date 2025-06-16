# =============================================================================
# Secrets モジュール変数定義
# =============================================================================
# このファイルの目的:
# - Google Secret Manager でのシークレット作成用モジュールの入力変数を定義
# - main.tf から呼び出される際のパラメータを受け取る
# - 環境別（production/staging）でのシークレット名前空間を管理
# - アプリケーションで使用する各種API キー・トークンのシークレット定義を制御
# 注意: 実際のシークレット値は手動設定が必要（Terraformでは管理しない）
# =============================================================================

# 環境設定
variable "environment" {
  description = "Environment name (production or staging)"
  type        = string
}


# Secret Manager 設定
variable "secrets" {
  description = "Map of secret names to create"
  type        = map(string)
}

# secret_values変数は不要（手動設定のため）
