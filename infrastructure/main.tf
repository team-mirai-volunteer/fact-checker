
locals {
  environment = var.branch_name == "main" ? "production" : "staging"
  
  env_suffix = local.environment == "production" ? "prod" : "dev"
  app_name   = "x-fact-checker-${local.env_suffix}"

  # 環境別設定: 保守性向上のため固定値として定義
  environment_config = {
    production = {
      min_instances = 1
      max_instances = 20
      cpu_limit     = "2"
      memory_limit  = "1Gi"
      schedule      = "0 9-21 * * *"
      log_level     = "info"
    }
    staging = {
      # staging環境設定: 開発・テスト用に最適化
      min_instances = 0          # コスト削減: 未使用時は0インスタンス
      max_instances = 5          # リソース制限: 過剰使用防止
      cpu_limit     = "1"        # 低CPU: テスト用途に十分
      memory_limit  = "512Mi"    # 低メモリ: コスト効率重視
      schedule      = "0 10-17 * * 1-5"  # 平日営業時間のみ実行
      log_level     = "debug"    # 詳細ログ: 開発・デバッグ用
    }
  }
  
  current_config = local.environment_config[local.environment]
  
  common_labels = {
    environment = local.environment
    application = "fact-checker"
    managed-by  = "terraform"
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.region
}

# Docker イメージ用 Artifact Registry リポジトリ
resource "google_artifact_registry_repository" "fact-checker-repo" {
  location      = var.region
  repository_id = "fact-checker-repo"
  description   = "Fact Checker Docker Repository"
  format        = "DOCKER"

  labels = local.common_labels
}

# Secrets作成
module "secrets" {
  source = "./modules/secrets"
  
  environment = local.environment
  secrets     = var.secrets
}

# アプリケーション作成
module "fact_checker_app" {
  source = "./modules/fact-checker-app"
  
  depends_on = [module.secrets]  # Secretsの作成完了を待つ
  
  environment      = local.environment
  app_name         = local.app_name
  region           = var.region
  container_image  = "${var.region}-docker.pkg.dev/${var.gcp_project_id}/fact-checker-repo/${local.app_name}:latest"
  min_instances    = local.current_config.min_instances
  max_instances    = local.current_config.max_instances
  cpu_limit        = local.current_config.cpu_limit
  memory_limit     = local.current_config.memory_limit
  env_vars = {
    ENV = local.environment == "production" ? "prod" : "dev"
  }
  secret_env_vars  = {
    OPENAI_API_KEY      = module.secrets.secret_versions["openai-api-key"]
    VECTOR_STORE_ID     = module.secrets.secret_versions["vector-store-id"]
    SLACK_BOT_TOKEN     = module.secrets.secret_versions["slack-bot-token"]
    SLACK_SIGNING_SECRET = module.secrets.secret_versions["slack-signing-secret"]
    SLACK_CHANNEL_ID    = module.secrets.secret_versions["slack-channel-id"]
    X_APP_KEY           = module.secrets.secret_versions["x-app-key"]
    X_APP_SECRET        = module.secrets.secret_versions["x-app-secret"]
    X_ACCESS_TOKEN      = module.secrets.secret_versions["x-access-token"]
    X_ACCESS_SECRET     = module.secrets.secret_versions["x-access-secret"]
    X_BEARER_TOKEN      = module.secrets.secret_versions["x-bearer-token"]
    CRON_SECRET         = module.secrets.secret_versions["cron-secret"]
  }
}

# IAM権限付与はfact-checker-appモジュール内で実行

module "scheduler" {
  source = "./modules/scheduler"
  
  depends_on = [module.secrets, module.fact_checker_app]
  
  app_name        = local.app_name
  region          = var.region
  service_url     = module.fact_checker_app.service_url
  service_name    = module.fact_checker_app.service_name
  schedule        = local.current_config.schedule
  cron_secret     = module.secrets.secret_versions["cron-secret"]
}
