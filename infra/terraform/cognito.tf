# Cognito module — account 570912405222 (profile townofwiley)

module "cognito" {
  count  = var.enable_cognito ? 1 : 0
  source = "./modules/cognito"

  project_name = var.project_name
  environment  = var.environment
}

output "cognito_user_pool_id" {
  value       = try(module.cognito[0].user_pool_id, null)
  description = "Cognito user pool ID (null if enable_cognito=false)"
}

output "cognito_user_pool_arn" {
  value       = try(module.cognito[0].user_pool_arn, null)
  description = "Cognito user pool ARN"
}

output "cognito_spa_client_id" {
  value       = try(module.cognito[0].spa_client_id, null)
  description = "SPA client ID"
}

output "cognito_groups" {
  value       = try(module.cognito[0].group_names, null)
  description = "Role group names"
}
