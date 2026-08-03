import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildReviewEmailBody,
  parseStepFeedbackBody,
  sessionExpiresAt,
  isSessionExpired,
} from '../shared/review.js';
import { MemoryReviewStore } from '../shared/review-store.js';
import { createReviewHandler, type ReviewMailer } from './review.js';
import type { AuthedEvent } from '../shared/apigw.js';

function event(partial: {
  method: string;
  path: string;
  body?: string;
  sessionId?: string;
  stepId?: string;
  sub?: string;
  email?: string;
}): AuthedEvent {
  return {
    version: '2.0',
    routeKey: `${partial.method} ${partial.path}`,
    rawPath: partial.path,
    rawQueryString: '',
    headers: {},
    requestContext: {
      accountId: '1',
      apiId: 'api',
      domainName: 'example',
      domainPrefix: 'example',
      http: {
        method: partial.method,
        path: partial.path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test',
      },
      requestId: 'req',
      routeKey: `${partial.method} ${partial.path}`,
      stage: '$default',
      time: '',
      timeEpoch: Date.now(),
      authorizer: {
        jwt: {
          claims: {
            sub: partial.sub ?? 'user-1',
            email: partial.email ?? 'kelly.review@example.com',
            'cognito:groups': ['operators'],
            'custom:tenant_id': 'town-demo',
          },
        },
      },
    },
    isBase64Encoded: false,
    body: partial.body,
    pathParameters:
      partial.sessionId || partial.stepId
        ? {
            ...(partial.sessionId ? { sessionId: partial.sessionId } : {}),
            ...(partial.stepId ? { stepId: partial.stepId } : {}),
          }
        : undefined,
  } as AuthedEvent;
}

describe('parseStepFeedbackBody', () => {
  it('requires comment for change / need_new', () => {
    const bad = parseStepFeedbackBody('dashboard', { rating: 'change' });
    assert.equal(bad.ok, false);

    const ok = parseStepFeedbackBody('dashboard', {
      rating: 'change',
      comment: 'Rename Confidence',
    });
    assert.equal(ok.ok, true);
  });

  it('allows skip without rating', () => {
    const ok = parseStepFeedbackBody('signin', { skipped: true });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.skipped, true);
  });
});

describe('review email builder', () => {
  it('includes ratings table', () => {
    const createdAt = '2026-08-01T00:00:00.000Z';
    const { subject, text } = buildReviewEmailBody({
      session: {
        sessionId: 'sess-1',
        reviewerUserId: 'u1',
        reviewerEmail: 'kelly@example.com',
        createdAt,
        expiresAt: sessionExpiresAt(new Date(createdAt)),
        status: 'completed',
        submittedAt: '2026-08-03T12:00:00.000Z',
      },
      steps: [
        {
          sessionId: 'sess-1',
          stepId: 'dashboard',
          rating: 'love',
          clarity: 5,
          comment: 'Clear',
          skipped: false,
          updatedAt: createdAt,
        },
      ],
    });
    assert.match(subject, /Kelly review submitted/);
    assert.match(text, /dashboard \| Love this \| 5 \| Clear/);
  });
});

describe('review handler', () => {
  it('creates session, saves step, submits with email', async () => {
    const store = new MemoryReviewStore();
    const sent: { to: string; subject: string; text: string }[] = [];
    const mailer: ReviewMailer = async (input) => {
      sent.push({ to: input.to, subject: input.subject, text: input.text });
    };

    process.env.REVIEW_NOTIFY_TO = 'steve@example.com';
    process.env.REVIEW_FROM_EMAIL = 'noreply@example.com';

    const handler = createReviewHandler({ store, mailer });

    const created = await handler(event({ method: 'POST', path: '/review/sessions' }));
    assert.equal(created.statusCode, 201);
    const createdBody = JSON.parse(created.body as string) as {
      session: { sessionId: string };
    };
    const sessionId = createdBody.session.sessionId;

    const step = await handler(
      event({
        method: 'PUT',
        path: `/review/sessions/${sessionId}/steps/dashboard`,
        sessionId,
        stepId: 'dashboard',
        body: JSON.stringify({
          rating: 'need_new',
          comment: 'Add GIS map',
          clarity: 4,
        }),
      }),
    );
    assert.equal(step.statusCode, 200);

    const submitted = await handler(
      event({
        method: 'POST',
        path: `/review/sessions/${sessionId}/submit`,
        sessionId,
      }),
    );
    assert.equal(submitted.statusCode, 200);
    const submitBody = JSON.parse(submitted.body as string) as {
      emailSent: boolean;
      session: { status: string };
    };
    assert.equal(submitBody.emailSent, true);
    assert.equal(submitBody.session.status, 'completed');
    assert.equal(sent.length, 1);
    assert.match(sent[0]!.text, /Need something new/);

    const again = await handler(
      event({
        method: 'POST',
        path: `/review/sessions/${sessionId}/submit`,
        sessionId,
      }),
    );
    assert.equal(again.statusCode, 400);
  });

  it('still completes when SES fails after mark', async () => {
    const store = new MemoryReviewStore();
    process.env.REVIEW_NOTIFY_TO = 'steve@example.com';
    process.env.REVIEW_FROM_EMAIL = 'noreply@example.com';
    const handler = createReviewHandler({
      store,
      mailer: async () => {
        throw new Error('SES down');
      },
    });
    const created = await handler(event({ method: 'POST', path: '/review/sessions' }));
    const sessionId = (JSON.parse(created.body as string) as { session: { sessionId: string } })
      .session.sessionId;
    const submitted = await handler(
      event({
        method: 'POST',
        path: `/review/sessions/${sessionId}/submit`,
        sessionId,
      }),
    );
    assert.equal(submitted.statusCode, 200);
    const body = JSON.parse(submitted.body as string) as {
      emailSent: boolean;
      emailSkippedReason?: string;
      session: { status: string };
    };
    assert.equal(body.emailSent, false);
    assert.equal(body.session.status, 'completed');
    assert.match(body.emailSkippedReason ?? '', /SES down/);
  });

  it('blocks other users from writing a session', async () => {
    const store = new MemoryReviewStore();
    const handler = createReviewHandler({ store, mailer: async () => undefined });
    const created = await handler(event({ method: 'POST', path: '/review/sessions' }));
    const sessionId = (JSON.parse(created.body) as { session: { sessionId: string } })
      .session.sessionId;

    const denied = await handler(
      event({
        method: 'PUT',
        path: `/review/sessions/${sessionId}/steps/signin`,
        sessionId,
        stepId: 'signin',
        sub: 'other-user',
        email: 'other@example.com',
        body: JSON.stringify({ rating: 'love' }),
      }),
    );
    assert.equal(denied.statusCode, 403);
  });

  it('detects expired sessions', () => {
    const past = {
      sessionId: 'x',
      reviewerUserId: 'u',
      reviewerEmail: 'a@b.c',
      createdAt: '2020-01-01T00:00:00.000Z',
      expiresAt: '2020-01-15T00:00:00.000Z',
      status: 'open' as const,
    };
    assert.equal(isSessionExpired(past, new Date('2026-08-03')), true);
  });
});
