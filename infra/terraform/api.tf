module "storage" {
  count  = var.enable_storage ? 1 : 0
  source = "./modules/storage"

  project_name       = var.project_name
  environment        = var.environment
  cors_allow_origins = ["http://localhost:4200", "http://localhost:8080"]
}

module "security" {
  source = "./modules/security"

  project_name = var.project_name
  environment  = var.environment
}

module "api" {
  count  = var.enable_api && var.enable_cognito && var.enable_storage ? 1 : 0
  source = "./modules/api"

  project_name                = var.project_name
  environment                 = var.environment
  cognito_user_pool_id        = module.cognito[0].user_pool_id
  cognito_user_pool_client_id = module.cognito[0].spa_client_id
  cognito_user_pool_arn       = module.cognito[0].user_pool_arn
  lambda_zip_path             = "${path.module}/build/api-handlers.zip"
  uploads_bucket_name         = module.storage[0].uploads_bucket_name
  uploads_bucket_arn          = module.storage[0].uploads_bucket_arn
  data_table_name             = module.storage[0].data_table_name
  data_table_arn              = module.storage[0].data_table_arn
  review_notify_to            = var.review_notify_to
  review_from_email           = var.review_from_email
}

output "api_endpoint" {
  value       = try(module.api[0].api_endpoint, null)
  description = "HTTP API endpoint"
}

output "api_health_url" {
  value       = try(module.api[0].health_url, null)
  description = "GET /health"
}

output "api_me_url" {
  value       = try(module.api[0].me_url, null)
  description = "GET /me (JWT)"
}

output "api_ingest_url" {
  value       = try(module.api[0].ingest_url, null)
  description = "POST /ingest (JWT)"
}

output "api_sources_url" {
  value       = try(module.api[0].sources_url, null)
  description = "GET/POST /sources (JWT)"
}

output "api_ingest_sources_url" {
  value       = try(module.api[0].ingest_sources_url, null)
  description = "POST /ingest/sources (JWT)"
}

output "api_balance_url" {
  value       = try(module.api[0].balance_url, null)
  description = "GET /balance (JWT)"
}

output "api_admin_tenants_url" {
  value       = try(module.api[0].admin_tenants_url, null)
  description = "GET/POST /admin/tenants (JWT, CRWA Admin)"
}

output "api_admin_tenant_billing_url" {
  value       = try(module.api[0].admin_tenant_billing_url, null)
  description = "GET/POST admin tenant billing (JWT, CRWA Admin I1)"
}

output "api_billing_url" {
  value       = try(module.api[0].billing_url, null)
  description = "GET /billing (JWT, System Admin I2)"
}

output "api_admin_users_url" {
  value       = try(module.api[0].admin_users_url, null)
  description = "GET /admin/users + POST /admin/users/invite (JWT)"
}

output "api_admin_rollup_url" {
  value       = try(module.api[0].admin_rollup_url, null)
  description = "GET /admin/rollup (JWT, CRWA Admin D4)"
}

output "api_agent_url" {
  value       = try(module.api[0].agent_url, null)
  description = "GET/POST /agent (JWT, Epic E)"
}

output "api_review_sessions_url" {
  value       = try(module.api[0].review_sessions_url, null)
  description = "POST /review/sessions (JWT, F5 Kelly Review)"
}

output "uploads_bucket" {
  value       = try(module.storage[0].uploads_bucket_name, null)
  description = "S3 uploads bucket"
}

output "data_table" {
  value       = try(module.storage[0].data_table_name, null)
  description = "DynamoDB data table"
}

output "ai_runtime_secret_arn" {
  value       = module.security.ai_runtime_secret_arn
  description = "Secrets Manager ARN for AI keys (CI/docs)"
}

output "ai_runtime_secret_name" {
  value       = module.security.ai_runtime_secret_name
  description = "Secrets Manager name for AI runtime"
}

output "assessment_tag" {
  value       = var.assessment_tag
  description = "Assessment-iii tag value applied via default_tags"
}
