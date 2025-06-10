terraform {
  required_version = ">= 1.5.0"
  
  # TODO: Add Remote State Backend after initial deployment works
  # backend "gcs" {
  #   bucket = "REPLACE_WITH_YOUR_PROJECT_ID-terraform-state"
  #   prefix = "fact-checker/state"
  # }
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}
