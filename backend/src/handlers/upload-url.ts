import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import { badRequest, forbidden, ok, unauthorized } from '../shared/http.js';

const s3 = new S3Client({});

/**
 * POST /uploads/presign — mint a tenant-scoped S3 PutObject URL.
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

  const bucket = process.env.UPLOAD_BUCKET;
  if (!bucket) {
    return badRequest('UPLOAD_BUCKET is not configured on this environment');
  }

  let filename = 'upload.csv';
  let contentType = 'text/csv';
  if (event.body) {
    try {
      const parsed = JSON.parse(event.body) as { filename?: string; contentType?: string };
      if (parsed.filename) filename = sanitizeFilename(parsed.filename);
      if (parsed.contentType) contentType = parsed.contentType;
    } catch {
      return badRequest('Body must be JSON with optional filename');
    }
  }

  const key = `tenants/${tenantId}/uploads/${Date.now()}-${filename}`;
  const expiresInSeconds = 900;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });

  return ok({
    bucket,
    key,
    uploadUrl,
    expiresInSeconds,
    headers: { 'Content-Type': contentType },
  });
};

function sanitizeFilename(name: string): string {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? 'upload.csv';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
  return cleaned || 'upload.csv';
}
