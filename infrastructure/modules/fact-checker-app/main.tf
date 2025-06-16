resource "google_service_account" "cloud-run-sa" {
  account_id   = "${var.app_name}-sa"
  display_name = "Service Account for ${var.app_name}"
}

resource "google_cloud_run_v2_service" "fact-checker" {
  name     = var.app_name
  location = var.region
  
  depends_on = [google_secret_manager_secret_iam_member.secret-accessor]
  
  labels = {
    environment = var.environment
    managed-by  = "terraform"
    version     = "v1-2"
    team        = "mirai"
  }
  
  template {
    service_account = google_service_account.cloud-run-sa.email
    
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }
    
    containers {
      image = var.container_image
      
      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
      }
      
      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }
      
      dynamic "env" {
        for_each = var.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
      
      ports {
        container_port = 8080
      }
      
      startup_probe {
        http_get {
          path = "/"
          port = 8080
        }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 3
      }
      
      liveness_probe {
        http_get {
          path = "/"
          port = 8080
        }
        initial_delay_seconds = 30
        timeout_seconds       = 5
        period_seconds        = 30
        failure_threshold     = 3
      }
    }
  }
  
  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

# IAM権限付与（Service AccountにSecret Manager アクセス権限）
resource "google_secret_manager_secret_iam_member" "secret-accessor" {
  for_each = var.secret_env_vars
  
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud-run-sa.email}"
  
  depends_on = [google_service_account.cloud-run-sa]
}

resource "google_cloud_run_service_iam_member" "public-access" {
  service  = google_cloud_run_v2_service.fact-checker.name
  location = google_cloud_run_v2_service.fact-checker.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
