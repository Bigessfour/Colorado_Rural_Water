variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "lambda_role_name" {
  type        = string
  description = "API Lambda IAM role name — gains bedrock:Retrieve on this KB"
}
