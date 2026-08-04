provider "aws" {
  region = var.aws_region
  # Empty profile → default credential chain (CI env keys / instance role).
  # Local: set aws_profile = "codeplatoon" in environments/dev.tfvars
  profile = var.aws_profile != "" ? var.aws_profile : null

  # Hard guard: refuse to run against any other account
  allowed_account_ids = [var.aws_account_id]

  default_tags {
    tags = {
      Project        = "water-saver"
      Environment    = var.environment
      ManagedBy      = "terraform"
      Owner          = "assessment-iii"
      AwsAccount     = var.aws_account_id
      Assessment-iii = var.assessment_tag
    }
  }
}
