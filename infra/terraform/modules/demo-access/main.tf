terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

locals {
  tenant_created_at  = "2026-01-01T00:00:00.000Z"
  tenant_pilot_until = "2026-04-01T00:00:00.000Z"

  tenant_profile = {
    tenantId           = { S = var.demo_tenant_id }
    displayName        = { S = var.tenant_display_name }
    createdAt          = { S = local.tenant_created_at }
    createdByUserId    = { S = "terraform-demo-access" }
    createdByEmail     = { S = var.kelly_review_email }
    initialUserEmail   = { S = var.demo_operator_email }
    billingStatus      = { S = "pilot" }
    billingMode        = { S = "pilot" }
    planCode           = { S = "meters_301_750" }
    meterCountEstimate = { N = "305" }
    paymentProvider    = { S = "none" }
    pilotExpiresAt     = { S = local.tenant_pilot_until }
    billingNotes       = { S = "Seeded by terraform demo-access module for Kelly review + CRWA roll-up." }
    mapTown            = { S = "Wiley" }
    mapCenterLat       = { N = "38.1542" }
    mapCenterLng       = { N = "-102.7199" }
    mapZoom            = { N = "13" }
    entityType         = { S = "tenant_profile" }
    pk                 = { S = "TENANT#${var.demo_tenant_id}" }
    sk                 = { S = "META#profile" }
  }

  tenant_registry = merge(local.tenant_profile, {
    entityType = { S = "tenant_registry" }
    pk         = { S = "TENANT#_registry" }
    sk         = { S = "TENANT#${var.demo_tenant_id}" }
  })
}

# Upsert seed rows (PutItem without condition). aws_dynamodb_table_item Create fails with
# ConditionalCheckFailedException when admin/onboarding already wrote the same pk/sk.
resource "terraform_data" "tenant_profile" {
  input = sha256(jsonencode(local.tenant_profile))

  provisioner "local-exec" {
    interpreter = ["bash", "-ec"]
    command     = <<-EOT
      ITEM="$(mktemp)"
      trap 'rm -f "$ITEM"' EXIT
      echo '${base64encode(jsonencode(local.tenant_profile))}' | base64 -d >"$ITEM"
      aws dynamodb put-item \
        --table-name '${var.dynamodb_table_name}' \
        --item "file://$ITEM"
    EOT
  }
}

resource "terraform_data" "tenant_registry" {
  input = sha256(jsonencode(local.tenant_registry))

  provisioner "local-exec" {
    interpreter = ["bash", "-ec"]
    command     = <<-EOT
      ITEM="$(mktemp)"
      trap 'rm -f "$ITEM"' EXIT
      echo '${base64encode(jsonencode(local.tenant_registry))}' | base64 -d >"$ITEM"
      aws dynamodb put-item \
        --table-name '${var.dynamodb_table_name}' \
        --item "file://$ITEM"
    EOT
  }

  depends_on = [terraform_data.tenant_profile]
}
