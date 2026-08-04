# Remote state for Feature 004 (S3 + native lockfile).
# Local: export AWS_PROFILE=codeplatoon (or rely on provider profile).
# CI: uses AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY — do not set profile here.
#
# Bootstrap (once per account):
#   See infra/README.md § Remote state
# Workspaces: terraform workspace select|new dev

terraform {
  backend "s3" {
    bucket       = "water-saver-tf-state-388691194728"
    key          = "water-saver/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
