terraform {
  required_version = ">= 1.5.0"
  
  # Local State Backend (temporary solution)
  # TODO: Implement Remote State Backend after resolving authentication issues
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}
