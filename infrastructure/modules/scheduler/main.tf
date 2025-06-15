resource "google_service_account" "scheduler-sa" {
  account_id   = "${var.app_name}-cron-sa"
  display_name = "Service Account for ${var.app_name} Scheduler"
}

resource "google_cloud_run_service_iam_member" "scheduler-invoker" {
  service  = var.service_name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler-sa.email}"
}

resource "google_cloud_scheduler_job" "fact-checker-cron" {
  name             = "${var.app_name}-cron"
  description      = "Scheduled fact checking job for ${var.app_name}"
  schedule         = var.schedule
  time_zone        = "Asia/Tokyo"
  attempt_deadline = "320s"

  retry_config {
    retry_count = 3
  }

  http_target {
    http_method = "GET"
    uri         = "${var.service_url}/cron/fetch"
    
    headers = {
      "x-cron-secret" = var.cron_secret
    }
    
    oidc_token {
      service_account_email = google_service_account.scheduler-sa.email
    }
  }
}
