terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  # S3 Vectors bucket names: lowercase, digits, hyphens; keep short.
  vector_bucket = substr(replace("${local.name_prefix}-kb-vectors", "_", "-"), 0, 63)
  index_name    = "ws-kb-index"
  # Titan Text Embeddings V2 — must match index dimension
  embedding_dim = 1024
  embedding_arn = "arn:aws:bedrock:${data.aws_region.current.region}::foundation-model/amazon.titan-embed-text-v2:0"
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ---------------------------------------------------------------------------
# S3 knowledge corpus (shared + per-tenant prefixes)
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "knowledge" {
  bucket = "${local.name_prefix}-knowledge-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${local.name_prefix}-knowledge"
  }
}

resource "aws_s3_bucket_public_access_block" "knowledge" {
  bucket = aws_s3_bucket.knowledge.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "knowledge" {
  bucket = aws_s3_bucket.knowledge.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "knowledge" {
  bucket = aws_s3_bucket.knowledge.id

  versioning_configuration {
    status = "Enabled"
  }
}

data "aws_iam_policy_document" "knowledge_tls" {
  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.knowledge.arn,
      "${aws_s3_bucket.knowledge.arn}/*",
    ]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "knowledge" {
  bucket = aws_s3_bucket.knowledge.id
  policy = data.aws_iam_policy_document.knowledge_tls.json
}

# ---------------------------------------------------------------------------
# S3 Vectors (AOSS is denied by account cost-guard — do not use aoss:*)
# ---------------------------------------------------------------------------

resource "aws_s3vectors_vector_bucket" "kb" {
  vector_bucket_name = local.vector_bucket

  tags = {
    Name = "${local.name_prefix}-kb-vectors"
  }
}

resource "aws_s3vectors_index" "kb" {
  vector_bucket_name = aws_s3vectors_vector_bucket.kb.vector_bucket_name
  index_name         = local.index_name
  data_type          = "float32"
  dimension          = local.embedding_dim
  distance_metric    = "cosine"

  # Required for Bedrock KB: chunk text exceeds the 2KB filterable metadata cap.
  # Keep scope/tenant_id filterable via *.metadata.json (not listed here).
  metadata_configuration {
    non_filterable_metadata_keys = [
      "AMAZON_BEDROCK_TEXT",
      "AMAZON_BEDROCK_METADATA",
    ]
  }

  tags = {
    Name = "${local.name_prefix}-kb-index"
  }
}

# ---------------------------------------------------------------------------
# Bedrock KB service role
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "kb_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["bedrock.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values = [
        "arn:aws:bedrock:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:knowledge-base/*",
      ]
    }
  }
}

resource "aws_iam_role" "kb" {
  name               = "${local.name_prefix}-bedrock-kb"
  assume_role_policy = data.aws_iam_policy_document.kb_assume.json
}

data "aws_iam_policy_document" "kb" {
  statement {
    sid = "S3KnowledgeRead"
    actions = [
      "s3:ListBucket",
    ]
    resources = [aws_s3_bucket.knowledge.arn]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }

  statement {
    sid = "S3KnowledgeObjects"
    actions = [
      "s3:GetObject",
    ]
    resources = ["${aws_s3_bucket.knowledge.arn}/*"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }

  statement {
    sid = "BedrockEmbed"
    actions = [
      "bedrock:InvokeModel",
    ]
    resources = [local.embedding_arn]
  }

  statement {
    sid = "S3VectorsIndexAccess"
    actions = [
      "s3vectors:PutVectors",
      "s3vectors:GetVectors",
      "s3vectors:DeleteVectors",
      "s3vectors:QueryVectors",
      "s3vectors:GetIndex",
    ]
    resources = [aws_s3vectors_index.kb.index_arn]
  }
}

resource "aws_iam_role_policy" "kb" {
  name   = "${local.name_prefix}-bedrock-kb"
  role   = aws_iam_role.kb.id
  policy = data.aws_iam_policy_document.kb.json
}

resource "aws_bedrockagent_knowledge_base" "main" {
  name     = "${local.name_prefix}-kb"
  role_arn = aws_iam_role.kb.arn

  knowledge_base_configuration {
    type = "VECTOR"
    vector_knowledge_base_configuration {
      embedding_model_arn = local.embedding_arn
      embedding_model_configuration {
        bedrock_embedding_model_configuration {
          dimensions          = local.embedding_dim
          embedding_data_type = "FLOAT32"
        }
      }
    }
  }

  storage_configuration {
    type = "S3_VECTORS"
    s3_vectors_configuration {
      index_arn = aws_s3vectors_index.kb.index_arn
    }
  }

  depends_on = [
    aws_iam_role_policy.kb,
  ]

  tags = {
    Name = "${local.name_prefix}-kb"
  }
}

resource "aws_bedrockagent_data_source" "shared" {
  name                 = "${local.name_prefix}-shared-docs"
  knowledge_base_id    = aws_bedrockagent_knowledge_base.main.id
  data_deletion_policy = "RETAIN"

  data_source_configuration {
    type = "S3"
    s3_configuration {
      bucket_arn         = aws_s3_bucket.knowledge.arn
      inclusion_prefixes = ["knowledge/shared/"]
    }
  }

  vector_ingestion_configuration {
    chunking_configuration {
      chunking_strategy = "FIXED_SIZE"
      fixed_size_chunking_configuration {
        max_tokens         = 300
        overlap_percentage = 20
      }
    }
  }
}

# ---------------------------------------------------------------------------
# Lambda Retrieve IAM (attached to existing API role)
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "lambda_retrieve" {
  statement {
    sid = "BedrockRetrieve"
    actions = [
      "bedrock:Retrieve",
      "bedrock:RetrieveAndGenerate",
    ]
    resources = [aws_bedrockagent_knowledge_base.main.arn]
  }

  statement {
    sid = "KnowledgeBucketRead"
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.knowledge.arn,
      "${aws_s3_bucket.knowledge.arn}/*",
    ]
  }
}

resource "aws_iam_role_policy" "lambda_retrieve" {
  name   = "${local.name_prefix}-lambda-kb-retrieve"
  role   = var.lambda_role_name
  policy = data.aws_iam_policy_document.lambda_retrieve.json
}

# Avoid circular TF deps with API Lambda env — agents resolve these at runtime.
resource "aws_ssm_parameter" "knowledge_base_id" {
  name  = "/${local.name_prefix}/knowledge-base-id"
  type  = "String"
  value = aws_bedrockagent_knowledge_base.main.id
}

resource "aws_ssm_parameter" "knowledge_bucket" {
  name  = "/${local.name_prefix}/knowledge-bucket"
  type  = "String"
  value = aws_s3_bucket.knowledge.bucket
}

data "aws_iam_policy_document" "lambda_ssm" {
  statement {
    sid = "ReadKnowledgeParams"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
    ]
    resources = [
      aws_ssm_parameter.knowledge_base_id.arn,
      aws_ssm_parameter.knowledge_bucket.arn,
    ]
  }
}

resource "aws_iam_role_policy" "lambda_ssm" {
  name   = "${local.name_prefix}-lambda-kb-ssm"
  role   = var.lambda_role_name
  policy = data.aws_iam_policy_document.lambda_ssm.json
}
