variable "project_name" {
  type        = string
  description = "Short project slug used in resource names"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
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
  description = "Path to zip containing Lambda handler bundles"
}

variable "cors_allow_origins" {
  type        = list(string)
  description = "Allowed CORS origins for the HTTP API"
  default     = ["http://localhost:4200"]
}

variable "uploads_bucket_name" {
  type        = string
  description = "S3 uploads bucket name (from storage module)"
}

variable "uploads_bucket_arn" {
  type        = string
  description = "S3 uploads bucket ARN (from storage module)"
}

variable "data_table_name" {
  type        = string
  description = "DynamoDB data table name (from storage module)"
}

variable "data_table_arn" {
  type        = string
  description = "DynamoDB data table ARN (from storage module)"
}

variable "cognito_user_pool_arn" {
  type        = string
  description = "Cognito user pool ARN for AdminCreateUser / group APIs (D2/D3)"
}

variable "review_notify_to" {
  type        = string
  description = "F5: email that receives Kelly review summary (Steve). Empty = store-only submit."
  default     = ""
}

variable "review_from_email" {
  type        = string
  description = "F5: SES From address for review summary. Empty = store-only submit."
  default     = ""
}

variable "bedrock_guardrail_id" {
  type        = string
  description = "Optional Bedrock Guardrail ID for agent Converse (Feature 014). Empty = off."
  default     = ""
}

variable "bedrock_guardrail_version" {
  type        = string
  description = "Bedrock Guardrail version when guardrail id is set"
  default     = "DRAFT"
}
