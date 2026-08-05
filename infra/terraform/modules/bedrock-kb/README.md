# bedrock-kb (Feature 014)

Provisions:

- S3 knowledge bucket (`knowledge/shared/`, `knowledge/tenants/{id}/`)
- **Amazon S3 Vectors** bucket + index (not OpenSearch Serverless — `aoss:*` is denied by account cost-guard)
- Bedrock Knowledge Base + shared S3 data source
- SSM params `/{project}-{env}/knowledge-base-id` and `…/knowledge-bucket`
- IAM: KB role + Lambda `Retrieve` / SSM read

## Apply

From `infra/terraform` (not the monorepo root):

```bash
npm run backend:bundle   # from repo root — refresh lambda zip if needed
cd infra/terraform
terraform workspace select dev
terraform apply -var-file=environments/dev.tfvars
```

Then sync corpus and start ingest:

```bash
AWS_PROFILE=codeplatoon ./scripts/knowledge-sync.sh
# StartIngestionJob via console/CLI using knowledge_base_id + data_source_id outputs
```

Disable with root `enable_bedrock_kb = false` if quotas block apply.
