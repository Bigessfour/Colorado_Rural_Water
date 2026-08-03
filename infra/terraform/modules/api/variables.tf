variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "cognito_user_pool_id" {
  type        = string
  description = "Cognito user pool ID for JWT issuer"
}

variable "cognito_user_pool_client_id" {
  type        = string
  description = "SPA app client ID (JWT audience)"
}

variable "lambda_zip_path" {
  type        = string
  description = "Path to zip containing health/me Lambda bundles"
}

variable "cors_allow_origins" {
  type    = list(string)
  default = ["http://localhost:4200"]
}
