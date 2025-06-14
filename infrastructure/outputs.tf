output "environment" {
  description = "Current environment (production or staging)"
  value       = local.environment
}

output "app_name" {
  description = "Application service name"
  value       = local.app_name
}

output "service_url" {
  description = "Cloud Run service URL"
  value       = var.deploy_phase == "app" ? module.fact_checker_app[0].service_url : null
}

output "region" {
  description = "GCP region"
  value       = var.region
}

output "deploy_phase" {
  description = "Current deployment phase"
  value       = var.deploy_phase
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository URL"
  value       = google_artifact_registry_repository.fact-checker-repo.name
}

output "resource_summary" {
  description = "Summary of created resources"
  value = {
    environment     = local.environment
    deploy_phase    = var.deploy_phase
    app_name       = local.app_name
    service_url    = var.deploy_phase == "app" ? module.fact_checker_app[0].service_url : null
    min_instances  = var.deploy_phase == "app" ? local.current_config.min_instances : null
    max_instances  = var.deploy_phase == "app" ? local.current_config.max_instances : null
    registry_repo  = google_artifact_registry_repository.fact-checker-repo.name
  }
}
