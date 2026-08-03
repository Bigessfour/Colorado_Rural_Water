output "user_pool_id" {
  value       = aws_cognito_user_pool.main.id
  description = "Cognito user pool ID"
}

output "user_pool_arn" {
  value       = aws_cognito_user_pool.main.arn
  description = "Cognito user pool ARN (API Gateway JWT authorizer)"
}

output "user_pool_endpoint" {
  value       = aws_cognito_user_pool.main.endpoint
  description = "Cognito IdP endpoint hostname"
}

output "spa_client_id" {
  value       = aws_cognito_user_pool_client.spa.id
  description = "SPA app client ID (public, no secret)"
}

output "group_names" {
  value = {
    operators     = aws_cognito_user_group.operators.name
    system_admins = aws_cognito_user_group.system_admins.name
    crwa_admins   = aws_cognito_user_group.crwa_admins.name
  }
  description = "Cognito group names aligned with backend AuthContext"
}
