import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import { badRequest, forbidden, ok, unauthorized } from '../shared/http.js';

/**
 * Stub: returns a placeholder presigned upload contract.
 * Real implementation will mint S3 PutObject URLs under tenants/{tenantId}/uploads/.
 */
export const handler: AuthedHandler = async (event) => {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims || typeof claims !== 'object') {
    return unauthorized();
  }

  let tenantId: string;
  try {
    tenantId = requireTenantId(parseAuthFromClaims(claims as Record<string, unknown>));
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }

  let filename = 'upload.csv';
  if (event.body) {
    try {
      const parsed = JSON.parse(event.body) as { filename?: string };
      if (parsed.filename) filename = parsed.filename;
    } catch {
      return badRequest('Body must be JSON with optional filename');
    }
  }

  const key = `tenants/${tenantId}/uploads/${Date.now()}-${filename}`;

  return ok({
    stub: true,
    message: 'Presign not wired yet — Terraform + S3 module required',
    bucket: process.env.UPLOAD_BUCKET ?? 'water-saver-uploads-pending',
    key,
    expiresInSeconds: 900,
  });
};
