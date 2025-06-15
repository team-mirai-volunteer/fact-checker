variable "environment" {
  description = "Environment name (production or staging)"
  type        = string
}


variable "secrets" {
  description = "Map of secret names to create"
  type        = map(string)
}

# secret_values変数は不要（手動設定のため）
