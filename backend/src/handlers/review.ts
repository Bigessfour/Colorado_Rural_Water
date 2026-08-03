import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { randomUUID } from 'node:crypto';
import type { AuthedHandler } from '../shared/apigw.js';
import { parseAuthFromClaims } from '../shared/auth.js';
import { badRequest, forbidden, json, ok, unauthorized } from '../shared/http.js';
import {
  buildReviewEmailBody,
  isReviewStepId,
  isSessionExpired,
  parseStepFeedbackBody,
  sessionExpiresAt,
  type ReviewSession,
  type ReviewStepFeedback,
} from '../shared/review.js';
import {
  createReviewStoreFromEnv,
  type ReviewStore,
} from '../shared/review-store.js';

/**
 * F5 Kelly Review API:
 *   POST /review/sessions
 *   GET  /review/sessions/{sessionId}
 *   PUT  /review/sessions/{sessionId}/steps/{stepId}
 *   POST /review/sessions/{sessionId}/submit
 *
 * Feedback lives under TENANT#_review (not municipal TENANT# data).
 */

export type ReviewMailer = (input: {
  to: string;
  from: string;
  subject: string;
  text: string;
}) => Promise<void>;

export function createSesMailer(): ReviewMailer {
  const client = new SESClient({});
  return async ({ to, from, subject, text }) => {
    await client.send(
      new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Text: { Data: text, Charset: 'UTF-8' } },
        },
      }),
    );
  };
}

export function createReviewHandler(deps?: {
  store?: ReviewStore;
  mailer?: ReviewMailer;
}): AuthedHandler {
  const getStore = () => deps?.store ?? createReviewStoreFromEnv();
  const mailer = deps?.mailer ?? createSesMailer();

  return async (event) => {
    try {
      const claims = event.requestContext.authorizer?.jwt?.claims;
      if (!claims || typeof claims !== 'object') {
        return unauthorized();
      }

      const auth = parseAuthFromClaims(claims as Record<string, unknown>);
      if (!auth.userId || !auth.email) {
        return unauthorized('Missing user identity on token');
      }

      const method = event.requestContext.http.method;
      const path = event.rawPath ?? event.requestContext.http.path ?? '';
      const sessionIdParam = event.pathParameters?.sessionId
        ? decodeURIComponent(event.pathParameters.sessionId).trim()
        : '';
      const stepIdParam = event.pathParameters?.stepId
        ? decodeURIComponent(event.pathParameters.stepId).trim()
        : '';

      const store = getStore();

      if (method === 'POST' && /\/review\/sessions\/?$/.test(path)) {
        return createSession(auth.userId, auth.email, store);
      }

      if (method === 'GET' && sessionIdParam && !stepIdParam && !path.endsWith('/submit')) {
        return getSession(auth.userId, sessionIdParam, store);
      }

      if (method === 'PUT' && sessionIdParam && stepIdParam) {
        return putStep(auth.userId, sessionIdParam, stepIdParam, event.body, store);
      }

      if (method === 'POST' && sessionIdParam && path.endsWith('/submit')) {
        return submitSession(auth.userId, sessionIdParam, store, mailer);
      }

      return badRequest('Unknown review route');
    } catch (err) {
      console.error(
        JSON.stringify({
          level: 'error',
          type: 'REVIEW_HANDLER_ERROR',
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          requestId: event.requestContext.requestId,
          path: event.rawPath ?? event.requestContext.http.path,
          at: new Date().toISOString(),
        }),
      );
      throw err;
    }
  };
}

export const handler: AuthedHandler = createReviewHandler();

async function createSession(userId: string, email: string, store: ReviewStore) {
  const now = new Date();
  const session: ReviewSession = {
    sessionId: randomUUID(),
    reviewerUserId: userId,
    reviewerEmail: email,
    createdAt: now.toISOString(),
    expiresAt: sessionExpiresAt(now),
    status: 'open',
  };
  await store.putSession(session);
  return json(201, { session });
}

async function getSession(userId: string, sessionId: string, store: ReviewStore) {
  const session = await store.getSession(sessionId);
  if (!session) return badRequest('Review session not found');
  if (session.reviewerUserId !== userId) {
    return forbidden('This review session belongs to another user');
  }
  const steps = await store.listSteps(sessionId);
  return ok({ session, steps });
}

async function putStep(
  userId: string,
  sessionId: string,
  stepIdRaw: string,
  bodyRaw: string | undefined,
  store: ReviewStore,
) {
  if (!isReviewStepId(stepIdRaw)) {
    return badRequest('Unknown stepId');
  }
  const session = await store.getSession(sessionId);
  if (!session) return badRequest('Review session not found');
  if (session.reviewerUserId !== userId) {
    return forbidden('This review session belongs to another user');
  }
  if (session.status === 'completed') {
    return badRequest('Review already submitted');
  }
  if (isSessionExpired(session)) {
    return badRequest('Review session has expired');
  }

  if (!bodyRaw) return badRequest('JSON body is required');
  let body: unknown;
  try {
    body = JSON.parse(bodyRaw);
  } catch {
    return badRequest('Body must be JSON');
  }

  const parsed = parseStepFeedbackBody(stepIdRaw, body);
  if (!parsed.ok) return badRequest(parsed.error);

  const feedback: ReviewStepFeedback = {
    sessionId,
    stepId: stepIdRaw,
    rating: parsed.rating,
    clarity: parsed.clarity,
    comment: parsed.comment,
    skipped: parsed.skipped,
    updatedAt: new Date().toISOString(),
  };
  await store.putStep(feedback);
  return ok({ step: feedback });
}

async function submitSession(
  userId: string,
  sessionId: string,
  store: ReviewStore,
  mailer: ReviewMailer,
) {
  const session = await store.getSession(sessionId);
  if (!session) return badRequest('Review session not found');
  if (session.reviewerUserId !== userId) {
    return forbidden('This review session belongs to another user');
  }
  if (session.status === 'completed') {
    return badRequest('Review already submitted');
  }
  if (isSessionExpired(session)) {
    return badRequest('Review session has expired');
  }

  const steps = await store.listSteps(sessionId);
  const submittedAt = new Date().toISOString();

  // Mark complete first so parallel submits cannot both send mail.
  const marked = await store.markCompleted(sessionId, submittedAt);
  if (!marked) {
    return badRequest('Review already submitted');
  }

  const completed: ReviewSession = { ...session, status: 'completed', submittedAt };
  const email = buildReviewEmailBody({ session: completed, steps });

  const notifyTo = (process.env.REVIEW_NOTIFY_TO ?? '').trim();
  const notifyFrom = (process.env.REVIEW_FROM_EMAIL ?? '').trim();
  let emailSent = false;
  let emailSkippedReason: string | undefined;
  let emailError: string | undefined;

  if (notifyTo && notifyFrom) {
    try {
      await mailer({
        to: notifyTo,
        from: notifyFrom,
        subject: email.subject,
        text: email.text,
      });
      emailSent = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : 'SES send failed';
      emailSkippedReason = `Review saved, but email failed: ${emailError}`;
    }
  } else {
    emailSkippedReason =
      'REVIEW_NOTIFY_TO / REVIEW_FROM_EMAIL not configured — feedback stored only';
  }

  return ok({
    session: completed,
    steps,
    emailSent,
    emailSkippedReason,
    summaryText: email.text,
  });
}
