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
      Owner       = "assessment-iii"
      AwsAccount  = var.aws_account_id
      # Required for Code Platoon Assessment III cost/attribution
      Assessment-iii = var.assessment_tag
    }
  }
}
