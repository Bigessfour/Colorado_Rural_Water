provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  # Hard guard: refuse to run against any other account
  allowed_account_ids = [var.aws_account_id]

  default_tags {
    tags = {
      Project     = "water-saver"
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "crwa-pilot"
      AwsAccount  = var.aws_account_id
    }
  }
}

# Cognito create requires cognito-idp:TagResource when tags are present.
# IAM user `copilot` currently lacks TagResource — use an untagged provider alias.
provider "aws" {
  alias               = "no_default_tags"
  region              = var.aws_region
  profile             = var.aws_profile
  allowed_account_ids = [var.aws_account_id]
}
