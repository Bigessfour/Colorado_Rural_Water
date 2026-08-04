data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

check "expected_account" {
  assert {
    condition     = data.aws_caller_identity.current.account_id == var.aws_account_id
    error_message = "Caller account ${data.aws_caller_identity.current.account_id} does not match locked Assessment III account ${var.aws_account_id}. Use profile codeplatoon."
  }
}
