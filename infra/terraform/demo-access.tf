# town-wiley Dynamo registry/profile seed + post-apply Cognito/SPA bootstrap (see terraform-apply.yml).
# Cognito demo/Kelly users stay in scripts/provision-demo-users.sh (idempotent; preserves Kelly creds).

locals {
  demo_access_enabled = var.enable_demo_access && var.enable_storage
}

module "demo_access" {
  count  = local.demo_access_enabled ? 1 : 0
  source = "./modules/demo-access"

  dynamodb_table_name = module.storage[0].data_table_name
  demo_tenant_id      = var.demo_tenant_id
  demo_operator_email = var.demo_operator_email
  kelly_review_email  = var.kelly_review_email
  tenant_display_name = var.demo_tenant_display_name
}

output "demo_access_enabled" {
  value       = local.demo_access_enabled
  description = "True when town-wiley Dynamo seed was applied"
}

output "demo_operator_email" {
  value       = var.demo_operator_email
  description = "Demo operator login email"
}

output "kelly_review_email" {
  value       = var.kelly_review_email
  description = "Kelly review login email"
}
