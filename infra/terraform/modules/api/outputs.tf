output "api_endpoint" {
  value       = aws_apigatewayv2_api.http.api_endpoint
  description = "HTTP API base URL"
}

output "health_url" {
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/health"
  description = "Public health check URL"
}

output "me_url" {
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/me"
  description = "Authenticated /me URL"
}

output "ingest_url" {
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/ingest"
  description = "POST /ingest (JWT)"
}

output "presign_url" {
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/uploads/presign"
  description = "POST /uploads/presign (JWT)"
}

output "alerts_url" {
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/alerts"
  description = "GET/POST /alerts (JWT)"
}

output "sources_url" {
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/sources"
  description = "GET/POST /sources and PUT/DELETE /sources/{sourceId} (JWT)"
}

output "ingest_sources_url" {
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/ingest/sources"
  description = "POST /ingest/sources (JWT)"
}

output "balance_url" {
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/balance"
  description = "GET /balance (JWT)"
}

output "meters_url" {
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/meters/{meterId}"
  description = "GET/PUT /meters/{meterId} history + metadata (JWT, C5)"
}

output "admin_tenants_url" {
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/admin/tenants"
  description = "GET/POST /admin/tenants (JWT, CRWA Admin D3 + I0 billing fields)"
}

output "admin_tenant_billing_url" {
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/admin/tenants/{tenantId}/billing"
  description = "GET billing + POST .../billing/{action} (JWT, CRWA Admin I1)"
}

output "billing_url" {
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/billing"
  description = "GET /billing municipality membership status (JWT, System Admin I2)"
}

output "admin_users_url" {
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/admin/users"
  description = "GET /admin/users (JWT, System Admin D2)"
}
