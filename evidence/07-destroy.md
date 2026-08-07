# Destroy evidence

- 2026-08-04T00:33:00Z local dry_run=true (Actions destroy unavailable until `destroy.yml` on default branch) — `terraform plan -destroy -var-file=environments/ci.tfvars.example` → Plan: 0 add, 0 change, **92 destroy**. Actor: local/`codeplatoon`. Stack left intact.
- 2026-08-06T23:11Z **hardened** destroy path: `force_destroy` on uploads/spa/knowledge S3; `scripts/empty-water-saver-buckets.sh`; `scripts/terraform-destroy.sh`; `scripts/destroy-residual-scan.sh`; updated `.github/workflows/destroy.yml` (account guard, empty buckets, 90m timeout, residual scan, `enable_spa`+`enable_bedrock_kb` in ci.tfvars.example).
- 2026-08-06T23:11Z dry run — `AWS_PROFILE=codeplatoon ./scripts/terraform-destroy.sh --dry-run` → Plan: 0 add, 0 change, **124 destroy** (includes SPA + Bedrock KB).
- 2026-08-06T23:11–23:16Z **real destroy** — `CONFIRM=destroy AWS_PROFILE=codeplatoon ./scripts/terraform-destroy.sh --destroy` → **Destroy complete!** Residual scan **PASS** (state bucket `water-saver-tf-state-388691194728` retained by design). Actor: local/`codeplatoon` / Steve.
