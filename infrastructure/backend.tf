# infrastructure/backend.tf
terraform {
  cloud {
    organization = "fact-checker"

    workspaces {
      name = "fact-checker-fs"
    }
  }
}