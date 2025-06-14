# Terraform Cloud バックエンド設定
terraform {
  cloud {
    organization = "fact-checker"

    workspaces {
      name = "fact-checker-fs"
    }
  }
}