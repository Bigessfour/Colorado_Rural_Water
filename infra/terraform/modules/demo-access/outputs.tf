output "demo_tenant_id" {
  value       = var.demo_tenant_id
  description = "Seeded tenant id for demo + Kelly logins"
}

output "demo_operator_email" {
  value       = var.demo_operator_email
  description = "Demo operator email (provisioned by scripts/provision-demo-users.sh)"
}

output "kelly_review_email" {
  value       = var.kelly_review_email
  description = "Kelly review email (provisioned by scripts/provision-demo-users.sh)"
}
