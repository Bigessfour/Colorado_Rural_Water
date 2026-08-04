import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims, requireTenantId } from '../shared/auth.js';
import { createOnboardingStoreFromEnv, createTenantStoreFromEnv } from '../shared/dynamo-store.js';
import { badRequest, forbidden, json, ok, unauthorized } from '../shared/http.js';
import {
  emptyOnboardingIntake,
  isOnboardingComplete,
  mergeOnboardingIntake,
} from '../shared/onboarding-intake.js';

/**
 * GET /onboarding — tenant-scoped intake profile (creates empty shell if missing).
 * PUT /onboarding — merge fields; ?complete=1 marks intake done.
 */
export const handler: AuthedHandler = async (event) => {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims || typeof claims !== 'object') {
    return unauthorized();
  }

  const auth = parseAuthFromClaims(claims as Record<string, unknown>);
  let tenantId: string;
  try {
    tenantId = requireTenantId(auth);
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : 'Forbidden');
  }

  const method = event.requestContext.http.method;
  const store = createOnboardingStoreFromEnv();
  const tenantStore = createTenantStoreFromEnv();

  if (method === 'GET') {
    const [intake, profile] = await Promise.all([
      store.getOnboardingIntake(tenantId),
      tenantStore.getTenantProfile(tenantId),
    ]);
    const data = intake ?? emptyOnboardingIntake(tenantId);
    if (!data.systemName && profile?.displayName) {
      data.systemName = profile.displayName;
    }
    if (!data.mapTown && profile?.mapTown) {
      data.mapTown = profile.mapTown;
    }
    if (data.meterCountEstimate == null && profile?.meterCountEstimate != null) {
      data.meterCountEstimate = profile.meterCountEstimate;
    }
    return ok({
      tenantId,
      intake: data,
      complete: isOnboardingComplete(data),
      displayName: profile?.displayName ?? null,
    });
  }

  if (method === 'PUT') {
    if (!event.body) {
      return badRequest('Body must be JSON');
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body) as Record<string, unknown>;
    } catch {
      return badRequest('Body must be JSON');
    }

    const markComplete =
      event.queryStringParameters?.complete === '1' ||
      event.queryStringParameters?.complete === 'true' ||
      body.complete === true;

    const existing = await store.getOnboardingIntake(tenantId);
    const merged = mergeOnboardingIntake(existing, tenantId, body, markComplete);
    if (!merged.ok) {
      return badRequest(merged.error);
    }

    await store.putOnboardingIntake(merged.intake);
    return ok({
      tenantId,
      intake: merged.intake,
      complete: isOnboardingComplete(merged.intake),
      message: markComplete ? 'Onboarding intake completed' : 'Onboarding intake saved',
    });
  }

  return json(405, { error: 'Method not allowed' });
};
