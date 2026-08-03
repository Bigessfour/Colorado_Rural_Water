output "uploads_bucket_name" {
  value       = aws_s3_bucket.uploads.bucket
  description = "Tenant upload drop-zone bucket"
}

output "uploads_bucket_arn" {
  value = aws_s3_bucket.uploads.arn
}

output "data_table_name" {
  value       = aws_dynamodb_table.data.name
  description = "Single-table meter locations, readings, mappings"
}

output "data_table_arn" {
  value = aws_dynamodb_table.data.arn
}
