# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",              # Cloud Run API
    "artifactregistry.googleapis.com", # Artifact Registry API
    "cloudbuild.googleapis.com",       # Cloud Build API
    "secretmanager.googleapis.com",    # Secret Manager API
    "compute.googleapis.com",          # Compute Engine API
    "iam.googleapis.com"               # IAM API
  ])

  service            = each.key
  disable_on_destroy = false
}

