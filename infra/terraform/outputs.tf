output "stack_name" {
  value       = "${var.project_name}-${var.environment}"
  description = "Logical stack name for this environment"
}

output "aws_account_id" {
  value       = data.aws_caller_identity.current.account_id
  description = "Account Terraform is authenticated against"
}

output "aws_region" {
  value       = data.aws_region.current.region
  description = "Active AWS region"
}

output "aws_caller_arn" {
  value       = data.aws_caller_identity.current.arn
  description = "Caller ARN (no secrets)"
}
