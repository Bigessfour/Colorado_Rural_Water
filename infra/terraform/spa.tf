# Angular SPA — private S3 + CloudFront (OAC). Default *.cloudfront.net HTTPS.

module "spa" {
  count  = var.enable_spa ? 1 : 0
  source = "./modules/spa"

  project_name = var.project_name
  environment  = var.environment
}

locals {
  spa_origin = var.enable_spa ? ["https://${module.spa[0].distribution_domain_name}"] : []

  browser_cors_origins = concat(
    ["http://localhost:4200", "http://localhost:8080"],
    local.spa_origin,
  )

  cognito_callback_urls = concat(
    ["http://localhost:4200/", "http://localhost:4200"],
    var.enable_spa ? [
      "https://${module.spa[0].distribution_domain_name}/",
      "https://${module.spa[0].distribution_domain_name}",
    ] : [],
  )

  cognito_logout_urls = local.cognito_callback_urls
}

output "spa_bucket_name" {
  value       = try(module.spa[0].spa_bucket_name, null)
  description = "S3 bucket for SPA static assets"
}

output "spa_cloudfront_domain" {
  value       = try(module.spa[0].distribution_domain_name, null)
  description = "CloudFront domain name"
}

output "spa_cloudfront_distribution_id" {
  value       = try(module.spa[0].distribution_id, null)
  description = "CloudFront distribution ID"
}

output "spa_url" {
  value       = try(module.spa[0].spa_url, null)
  description = "Public HTTPS URL for the Angular SPA"
}
