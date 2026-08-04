# Water Saver — operator runbook (demo corpus for RAG bootstrap)

## Watch vs Actionable
- **Watch**: unusual but not urgent; Thin Confidence never means dig-now.
- **Actionable**: stronger signal when Confidence is Solid+; still verify on site.

## CSV column mapping tips
Common messy headers: `Acct #`, `Service Addr`, `Cur Read`, `Read Dt`.
Map to: account_id, service_address, reading, reading_date.

## Water balance
Produced (In) − Billed (Out) = Unaccounted. One-sided data → status `insufficient`.

## Tenant isolation
Every question and memory is scoped to the authenticated municipality (`tenant_id`).
Never discuss another town's meters or customers.
