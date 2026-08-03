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
