module "api" {
  count  = var.enable_api && var.enable_cognito ? 1 : 0
  source = "./modules/api"

  project_name                = var.project_name
  environment                 = var.environment
  cognito_user_pool_id        = module.cognito[0].user_pool_id
  cognito_user_pool_client_id = module.cognito[0].spa_client_id
  lambda_zip_path             = "${path.module}/build/api-handlers.zip"
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
