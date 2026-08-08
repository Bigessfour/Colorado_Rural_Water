variable "dynamodb_table_name" {
  type        = string
  description = "Single-table DynamoDB name (tenant registry + profile)"
}

variable "demo_tenant_id" {
  type        = string
  description = "Tenant id for demo operator and Kelly review"
  default     = "town-wiley"
}

variable "demo_operator_email" {
  type        = string
  description = "Initial operator email on tenant profile"
  default     = "demo.operator@watersaver.local"
}

variable "kelly_review_email" {
  type        = string
  description = "Kelly review email on tenant profile metadata"
  default     = "kelly.review@watersaver.local"
}

variable "tenant_display_name" {
  type        = string
  default     = "Town of Wiley"
  description = "Display name for Dynamo tenant profile / registry"
}
