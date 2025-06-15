output "service_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.fact_checker.uri
}

output "service_account_email" {
  description = "Service account email"
  value       = google_service_account.cloud_run_sa.email
}

output "service_name" {
  description = "Cloud Run service name"
  value       = google_cloud_run_v2_service.fact_checker.name
}
