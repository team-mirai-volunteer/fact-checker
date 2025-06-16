terraform {
  required_version = ">= 1.5.0"
  
  backend "local" {
  }
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}
