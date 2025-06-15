variable "environment" {
  description = "Environment name (production or staging)"
  type        = string
}

variable "service_account_email" {
  description = "Service account email for secret access"
  type        = string
}

variable "secrets" {
  description = "Map of secret names to create"
  type        = map(string)
}
