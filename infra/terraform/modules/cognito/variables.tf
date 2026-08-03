variable "project_name" {
  type        = string
  description = "Short project slug used in resource names"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
}

variable "callback_urls" {
  type        = list(string)
  description = "OAuth callback URLs for the SPA client"
  default     = ["http://localhost:4200/"]
}

variable "logout_urls" {
  type        = list(string)
  description = "OAuth logout URLs for the SPA client"
  default     = ["http://localhost:4200/"]
}
