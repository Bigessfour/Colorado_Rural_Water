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
