terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

locals {
  name_prefix  = "${var.project_name}-${var.environment}"
  jwt_issuer   = "https://cognito-idp.${data.aws_region.current.region}.amazonaws.com/${var.cognito_user_pool_id}"
  jwt_audience = [var.cognito_user_pool_client_id]
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${local.name_prefix}-api-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_data" {
  statement {
    sid = "UploadsObjectAccess"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
    ]
    # Force tenant drop-zone prefix; app still scopes to tenants/{tenantId}/uploads/.
    resources = ["${var.uploads_bucket_arn}/tenants/*"]
  }

  statement {
    sid = "DynamoDataAccess"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
    ]
    resources = [var.data_table_arn]

    # Require partition keys under TENANT#… (app isolation still required for cross-tenant).
    condition {
      test     = "ForAllValues:StringLike"
      variable = "dynamodb:LeadingKeys"
      values   = ["TENANT#*"]
    }
  }
}

resource "aws_iam_role_policy" "lambda_data" {
  name   = "${local.name_prefix}-lambda-data"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_data.json
}

locals {
  lambda_env = {
    UPLOAD_BUCKET = var.uploads_bucket_name
    DATA_TABLE    = var.data_table_name
  }
}

resource "aws_lambda_function" "health" {
  function_name    = "${local.name_prefix}-health"
  role             = aws_iam_role.lambda.arn
  handler          = "health.handler"
  runtime          = "nodejs22.x"
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  timeout          = 10
}

resource "aws_lambda_function" "me" {
  function_name    = "${local.name_prefix}-me"
  role             = aws_iam_role.lambda.arn
  handler          = "me.handler"
  runtime          = "nodejs22.x"
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  timeout          = 10
}

resource "aws_lambda_function" "upload_url" {
  function_name    = "${local.name_prefix}-upload-url"
  role             = aws_iam_role.lambda.arn
  handler          = "upload-url.handler"
  runtime          = "nodejs22.x"
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  timeout          = 15
  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "ingest" {
  function_name    = "${local.name_prefix}-ingest"
  role             = aws_iam_role.lambda.arn
  handler          = "ingest.handler"
  runtime          = "nodejs22.x"
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  timeout          = 60
  memory_size      = 512
  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "s3_ingest" {
  function_name    = "${local.name_prefix}-s3-ingest"
  role             = aws_iam_role.lambda.arn
  handler          = "s3-ingest.handler"
  runtime          = "nodejs22.x"
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  timeout          = 120
  memory_size      = 512
  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "alerts" {
  function_name    = "${local.name_prefix}-alerts"
  role             = aws_iam_role.lambda.arn
  handler          = "alerts.handler"
  runtime          = "nodejs22.x"
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  timeout          = 30
  memory_size      = 512
  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "sources" {
  function_name    = "${local.name_prefix}-sources"
  role             = aws_iam_role.lambda.arn
  handler          = "sources.handler"
  runtime          = "nodejs22.x"
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  timeout          = 20
  memory_size      = 256
  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "ingest_sources" {
  function_name    = "${local.name_prefix}-ingest-sources"
  role             = aws_iam_role.lambda.arn
  handler          = "ingest-sources.handler"
  runtime          = "nodejs22.x"
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  timeout          = 60
  memory_size      = 512
  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "balance" {
  function_name    = "${local.name_prefix}-balance"
  role             = aws_iam_role.lambda.arn
  handler          = "balance.handler"
  runtime          = "nodejs22.x"
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  timeout          = 30
  memory_size      = 512
  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "meters" {
  function_name    = "${local.name_prefix}-meters"
  role             = aws_iam_role.lambda.arn
  handler          = "meters.handler"
  runtime          = "nodejs22.x"
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  timeout          = 20
  memory_size      = 256
  environment {
    variables = local.lambda_env
  }
}

resource "aws_apigatewayv2_api" "http" {
  name          = "${local.name_prefix}-http"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["authorization", "content-type"]
    allow_methods = ["DELETE", "GET", "OPTIONS", "POST", "PUT"]
    allow_origins = var.cors_allow_origins
    max_age       = 300
  }
}

resource "aws_apigatewayv2_authorizer" "cognito_jwt" {
  api_id           = aws_apigatewayv2_api.http.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${local.name_prefix}-jwt"

  jwt_configuration {
    audience = local.jwt_audience
    issuer   = local.jwt_issuer
  }
}

resource "aws_apigatewayv2_integration" "health" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.health.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "me" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.me.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "upload_url" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.upload_url.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "ingest" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.ingest.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "alerts" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.alerts.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "sources" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.sources.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "ingest_sources" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.ingest_sources.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "balance" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.balance.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "meters" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.meters.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "health" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.health.id}"
}

resource "aws_apigatewayv2_route" "me" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "GET /me"
  target             = "integrations/${aws_apigatewayv2_integration.me.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "upload_url" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "POST /uploads/presign"
  target             = "integrations/${aws_apigatewayv2_integration.upload_url.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "ingest" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "POST /ingest"
  target             = "integrations/${aws_apigatewayv2_integration.ingest.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "alerts_get" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "GET /alerts"
  target             = "integrations/${aws_apigatewayv2_integration.alerts.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "alerts_post" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "POST /alerts"
  target             = "integrations/${aws_apigatewayv2_integration.alerts.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "sources_get" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "GET /sources"
  target             = "integrations/${aws_apigatewayv2_integration.sources.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "sources_post" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "POST /sources"
  target             = "integrations/${aws_apigatewayv2_integration.sources.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "sources_put" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "PUT /sources/{sourceId}"
  target             = "integrations/${aws_apigatewayv2_integration.sources.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "sources_delete" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "DELETE /sources/{sourceId}"
  target             = "integrations/${aws_apigatewayv2_integration.sources.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "ingest_sources" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "POST /ingest/sources"
  target             = "integrations/${aws_apigatewayv2_integration.ingest_sources.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "balance_get" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "GET /balance"
  target             = "integrations/${aws_apigatewayv2_integration.balance.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "balance_thresholds_put" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "PUT /balance/thresholds"
  target             = "integrations/${aws_apigatewayv2_integration.balance.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "meters_get" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "GET /meters/{meterId}"
  target             = "integrations/${aws_apigatewayv2_integration.meters.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "health_apigw" {
  statement_id  = "AllowAPIGatewayInvokeHealth"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "me_apigw" {
  statement_id  = "AllowAPIGatewayInvokeMe"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.me.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "upload_url_apigw" {
  statement_id  = "AllowAPIGatewayInvokeUploadUrl"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.upload_url.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "ingest_apigw" {
  statement_id  = "AllowAPIGatewayInvokeIngest"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ingest.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "alerts_apigw" {
  statement_id  = "AllowAPIGatewayInvokeAlerts"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.alerts.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "sources_apigw" {
  statement_id  = "AllowAPIGatewayInvokeSources"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sources.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "ingest_sources_apigw" {
  statement_id  = "AllowAPIGatewayInvokeIngestSources"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ingest_sources.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "balance_apigw" {
  statement_id  = "AllowAPIGatewayInvokeBalance"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.balance.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "meters_apigw" {
  statement_id  = "AllowAPIGatewayInvokeMeters"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.meters.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "s3_ingest" {
  statement_id   = "AllowS3InvokeIngest"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.s3_ingest.function_name
  principal      = "s3.amazonaws.com"
  source_arn     = var.uploads_bucket_arn
  source_account = data.aws_caller_identity.current.account_id
}

resource "aws_s3_bucket_notification" "uploads" {
  bucket = var.uploads_bucket_name

  lambda_function {
    lambda_function_arn = aws_lambda_function.s3_ingest.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "tenants/"
  }

  depends_on = [aws_lambda_permission.s3_ingest]
}
