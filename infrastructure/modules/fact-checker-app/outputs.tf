output "service_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.fact-checker.uri
}

output "service_account_email" {
  description = "Service account email"
  value       = google_service_account.cloud-run-sa.email
}

output "service_name" {
  description = "Cloud Run service name"
  value       = google_cloud_run_v2_service.fact-checker.name
}
