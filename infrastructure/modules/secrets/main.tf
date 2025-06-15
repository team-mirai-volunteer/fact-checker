resource "google_secret_manager_secret" "secrets" {
  for_each = var.secrets
  
  secret_id = "${var.environment}-${each.key}"
  
  replication {
    auto {}
  }
}

# ダミー値で初期化（既存の値は上書きしない）
resource "google_secret_manager_secret_version" "dummy_versions" {
  for_each = var.secrets
  
  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = "CHANGE_ME_${each.key}"
  
  lifecycle {
    ignore_changes = [secret_data]  # 既存値は上書きしない
  }
}

# IAM権限付与はメインのmain.tfで実行
# （サービスアカウント作成後に実行するため）
