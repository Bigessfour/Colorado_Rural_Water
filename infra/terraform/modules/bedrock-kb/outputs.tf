output "knowledge_bucket_name" {
  value       = aws_s3_bucket.knowledge.bucket
  description = "S3 bucket for shared + per-tenant knowledge corpus"
}

output "knowledge_bucket_arn" {
  value = aws_s3_bucket.knowledge.arn
}

output "knowledge_base_id" {
  value       = aws_bedrockagent_knowledge_base.main.id
  description = "Bedrock Knowledge Base ID for Lambda Retrieve"
}

output "knowledge_base_arn" {
  value = aws_bedrockagent_knowledge_base.main.arn
}

output "data_source_id" {
  value       = aws_bedrockagent_data_source.shared.data_source_id
  description = "Shared corpus data source — sync after knowledge-sync.sh"
}

output "vector_bucket_name" {
  value       = aws_s3vectors_vector_bucket.kb.vector_bucket_name
  description = "S3 Vectors bucket backing the knowledge base"
}

output "vector_index_arn" {
  value = aws_s3vectors_index.kb.index_arn
}
