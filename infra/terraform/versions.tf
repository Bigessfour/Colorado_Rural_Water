terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Remote state: copy backend.tf.example → backend.tf after creating the S3 bucket
  # (see infra/README.md). Until then, local state is used.
}
