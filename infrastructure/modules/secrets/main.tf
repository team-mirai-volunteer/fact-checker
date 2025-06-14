resource "google_secret_manager_secret" "secrets" {
  for_each = var.secrets
  
  secret_id = "${var.environment}-${each.key}"
  
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "secret-accessor" {
  for_each = var.secrets
  
  secret_id = google_secret_manager_secret.secrets[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.service_account_email}"
}
