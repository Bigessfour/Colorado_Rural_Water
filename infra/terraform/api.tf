module "storage" {
  count  = var.enable_storage ? 1 : 0
  source = "./modules/storage"

  project_name       = var.project_name
  environment        = var.environment
  cors_allow_origins = ["http://localhost:4200"]
}

module "api" {
  count  = var.enable_api && var.enable_cognito && var.enable_storage ? 1 : 0
  source = "./modules/api"

  project_name                = var.project_name
  environment                 = var.environment
  cognito_user_pool_id        = module.cognito[0].user_pool_id
  cognito_user_pool_client_id = module.cognito[0].spa_client_id
  lambda_zip_path             = "${path.module}/build/api-handlers.zip"
  uploads_bucket_name         = module.storage[0].uploads_bucket_name
  uploads_bucket_arn          = module.storage[0].uploads_bucket_arn
  data_table_name             = module.storage[0].data_table_name
  data_table_arn              = module.storage[0].data_table_arn
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

output "uploads_bucket" {
  value       = try(module.storage[0].uploads_bucket_name, null)
  description = "S3 uploads bucket"
}

output "data_table" {
  value       = try(module.storage[0].data_table_name, null)
  description = "DynamoDB data table"
}
