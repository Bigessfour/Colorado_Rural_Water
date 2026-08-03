# Suggested IAM additions for user `copilot` (Water Saver deploys)

Attach to `arn:aws:iam::570912405222:user/copilot` (or a role it can assume).

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CognitoWaterSaver",
      "Effect": "Allow",
      "Action": [
        "cognito-idp:CreateUserPool",
        "cognito-idp:DeleteUserPool",
        "cognito-idp:DescribeUserPool",
        "cognito-idp:UpdateUserPool",
        "cognito-idp:SetUserPoolMfaConfig",
        "cognito-idp:GetUserPoolMfaConfig",
        "cognito-idp:ListUserPools",
        "cognito-idp:TagResource",
        "cognito-idp:UntagResource",
        "cognito-idp:ListTagsForResource",
        "cognito-idp:CreateUserPoolClient",
        "cognito-idp:DeleteUserPoolClient",
        "cognito-idp:DescribeUserPoolClient",
        "cognito-idp:UpdateUserPoolClient",
        "cognito-idp:CreateGroup",
        "cognito-idp:DeleteGroup",
        "cognito-idp:GetGroup",
        "cognito-idp:ListGroups",
        "cognito-idp:UpdateGroup",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminDeleteUser",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminAddUserToGroup",
        "cognito-idp:AdminRemoveUserFromGroup"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ApiLambdaWaterSaver",
      "Effect": "Allow",
      "Action": [
        "apigateway:*",
        "lambda:*",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:PassRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:TagRole",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

Tighten `Resource` ARNs once the stack is stable. Until `GetGroup` / `SetUserPoolMfaConfig` / `TagResource` are allowed, use:

- `provider "aws" { alias = "no_default_tags" }` for Cognito
- `mfa_configuration = "OFF"`
- `terraform apply -refresh=false` when group refresh fails
