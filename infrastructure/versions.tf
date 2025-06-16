terraform {
  required_version = ">= 1.6.0"
  
  # Remote State Backend として Terraform Cloud を使用
  # 設定は backend.tf で定義
  # Workspace変数設定後のテスト
  
  backend "local" {
  }
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}
