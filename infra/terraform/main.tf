# Module wiring lives here once Cognito / storage / API modules are implemented (A3–A5, B2).

# module "cognito" {
#   source       = "./modules/cognito"
#   project_name = var.project_name
#   environment  = var.environment
# }
#
# module "storage" {
#   source       = "./modules/storage"
#   project_name = var.project_name
#   environment  = var.environment
# }
#
# module "api" {
#   source                = "./modules/api"
#   project_name          = var.project_name
#   environment           = var.environment
#   cognito_user_pool_arn = module.cognito.user_pool_arn
#   upload_bucket_name    = module.storage.upload_bucket_name
# }
