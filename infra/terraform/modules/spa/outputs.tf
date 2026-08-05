output "spa_bucket_name" {
  value       = aws_s3_bucket.spa.bucket
  description = "Private S3 bucket for the Angular SPA static files"
}

output "spa_bucket_arn" {
  value = aws_s3_bucket.spa.arn
}

output "distribution_id" {
  value       = aws_cloudfront_distribution.spa.id
  description = "CloudFront distribution ID (for invalidations)"
}

output "distribution_domain_name" {
  value       = aws_cloudfront_distribution.spa.domain_name
  description = "CloudFront domain (e.g. dxxxx.cloudfront.net)"
}

output "spa_url" {
  value       = "https://${aws_cloudfront_distribution.spa.domain_name}"
  description = "HTTPS origin for the hosted SPA"
}
