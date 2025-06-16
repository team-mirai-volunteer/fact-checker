output "secret_versions" {
  description = "Map of secret names to their secret IDs for Cloud Run"
  value = {
    for k, v in google_secret_manager_secret.secrets : k => v.secret_id
  }
}
