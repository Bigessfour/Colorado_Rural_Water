terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      # Latest from Terraform Registry MCP (hashicorp/aws) at scaffolding time: 6.57.1
      version = "~> 6.0"
    }
  }

  # Backend TBD — local state for early MVP; migrate to S3+DynamoDB before shared envs
}
