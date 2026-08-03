variable "aws_account_id" {
  type        = string
  description = "Expected AWS account ID for Water Saver (must match caller identity)"
  default     = "570912405222"

  validation {
    condition     = var.aws_account_id == "570912405222"
    error_message = "Water Saver MVP is locked to AWS account 570912405222."
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region for the MVP stack"
  default     = "us-east-2"
}

variable "aws_profile" {
  type        = string
  description = "Named AWS CLI profile — use townofwiley for account 570912405222"
  default     = "townofwiley"
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
