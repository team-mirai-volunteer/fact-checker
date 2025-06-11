variable "app_name" {
  description = "Application name"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "container_image" {
  description = "Container image URL"
  type        = string
}

variable "min_instances" {
  description = "Minimum number of instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 10
}

variable "cpu_limit" {
  description = "CPU limit"
  type        = string
  default     = "1"
}

variable "memory_limit" {
  description = "Memory limit"
  type        = string
  default     = "1Gi"
}

variable "secret_env_vars" {
  description = "Map of environment variable names to secret references"
  type        = map(string)
  default     = {}
}

variable "env_vars" {
  description = "Map of environment variable names to values"
  type        = map(string)
  default     = {}
}
