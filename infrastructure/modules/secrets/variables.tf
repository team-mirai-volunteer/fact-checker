variable "environment" {
  description = "Environment name (production or staging)"
  type        = string
}


variable "secrets" {
  description = "Map of secret names to create"
  type        = map(string)
}

variable "secret_values" {
  description = "Map of secret names to their values (sensitive) - optional for manual setup"
  type        = map(string)
  default     = {}
  sensitive   = true
}
