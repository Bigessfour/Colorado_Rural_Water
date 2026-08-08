variable "aws_account_id" {
  type        = string
  description = "Expected AWS account ID (must match caller identity)"
  default     = "388691194728"

  validation {
    condition     = var.aws_account_id == "388691194728"
    error_message = "Assessment III Water Saver is locked to Code Platoon AWS account 388691194728."
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region for the Assessment III stack"
  default     = "us-east-1"
}

variable "aws_profile" {
  type        = string
  description = "Optional named AWS CLI profile for local use (codeplatoon). Leave empty in CI so env credentials are used."
  default     = ""
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
  default     = "dev"
}

variable "project_name" {
  type        = string
  description = "Short project slug used in resource names"
  default     = "water-saver"
}

variable "assessment_tag" {
  type        = string
  description = "Required Assessment III resource tag key value"
  default     = "true"
}

variable "enable_cognito" {
  type        = bool
  description = "When true, provision the Cognito user pool module"
  default     = true
}

variable "enable_api" {
  type        = bool
  description = "Provision HTTP API + Lambdas"
  default     = true
}

variable "enable_storage" {
  type        = bool
  description = "Provision S3 uploads bucket + DynamoDB data table"
  default     = true
}

variable "enable_spa" {
  type        = bool
  description = "Provision private S3 + CloudFront for the Angular SPA"
  default     = true
}

variable "enable_bedrock_kb" {
  type        = bool
  description = "Feature 014: Bedrock Knowledge Base + S3 Vectors + knowledge S3 bucket"
  default     = true
}

variable "review_notify_to" {
  type        = string
  description = "F5 Kelly Review: email that receives the submitted summary"
  default     = ""
}

variable "review_from_email" {
  type        = string
  description = "F5 Kelly Review: SES From address (must be verified)"
  default     = ""
}

variable "enable_demo_access" {
  type        = bool
  description = "Seed town-wiley Dynamo tenant registry/profile after apply (Cognito users via provision-demo-users.sh)"
  default     = true
}

variable "demo_tenant_id" {
  type        = string
  description = "Tenant id for demo operator and Kelly review users"
  default     = "town-wiley"
}

variable "demo_tenant_display_name" {
  type        = string
  description = "Display name seeded in Dynamo for demo tenant"
  default     = "Town of Wiley"
}

variable "demo_operator_email" {
  type        = string
  description = "Cognito email for Assessment demo operator"
  default     = "demo.operator@watersaver.local"
}

variable "kelly_review_email" {
  type        = string
  description = "Cognito email for Kelly guided review"
  default     = "kelly.review@watersaver.local"
}
