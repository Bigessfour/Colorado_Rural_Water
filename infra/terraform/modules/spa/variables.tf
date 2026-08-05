variable "project_name" {
  type        = string
  description = "Short project slug used in resource names"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
}
