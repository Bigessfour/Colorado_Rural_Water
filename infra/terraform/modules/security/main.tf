# Security helpers for Assessment III (Feature 004).
# Secrets Manager placeholder for AI keys — values never in git.

variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "create_ai_secret_stub" {
  type        = bool
  default     = true
  description = "Create an empty Secrets Manager secret shell for Mem0/LangSmith names"
}

resource "aws_secretsmanager_secret" "ai_runtime" {
  count = var.create_ai_secret_stub ? 1 : 0

  name                    = "${var.project_name}-${var.environment}-ai-runtime"
  description             = "Water Saver AI runtime secrets (Mem0, LangSmith). Put values via CLI/Console — never commit."
  # Allow immediate recreate after terraform destroy (default 30-day recovery blocks re-apply).
  recovery_window_in_days = 0

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

output "ai_runtime_secret_arn" {
  value       = try(aws_secretsmanager_secret.ai_runtime[0].arn, null)
  description = "Secrets Manager ARN for AI keys (CI/docs consume this)"
}

output "ai_runtime_secret_name" {
  value       = try(aws_secretsmanager_secret.ai_runtime[0].name, null)
  description = "Secret name for runtime injection docs"
}
