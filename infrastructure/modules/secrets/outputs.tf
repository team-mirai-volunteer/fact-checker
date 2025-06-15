output "secret_ids" {
  description = "Map of secret names to their full resource IDs"
  value = {
    for k, v in google_secret_manager_secret.secrets : k => v.secret_id
  }
}

output "secret_versions" {
  description = "Map of secret names to their latest version references"
  value = {
    for k, v in google_secret_manager_secret.secrets : k => "${v.secret_id}:latest"
  }
}
