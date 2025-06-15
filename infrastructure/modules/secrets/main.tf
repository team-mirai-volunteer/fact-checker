resource "google_secret_manager_secret" "secrets" {
  for_each = var.secrets
  
  secret_id = "${var.environment}-${each.key}"
  
  replication {
    auto {}
  }
}

# IAM権限付与はメインのmain.tfで実行
# （サービスアカウント作成後に実行するため）
