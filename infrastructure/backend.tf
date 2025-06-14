# infrastructure/backend.tf
terraform {
  cloud {
    organization = "fact-checker"  # 手順1-1で作成したOrganization名

    workspaces {
      tags = ["fact-checker"]
    }
  }
}