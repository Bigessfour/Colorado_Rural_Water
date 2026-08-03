/** F5 — Kelly Review mode: guided walkthrough + structured feedback. */

export const REVIEW_PARTITION_TENANT_ID = '_review';

export const REVIEW_SESSION_TTL_DAYS = 14;

export const REVIEW_STEP_IDS = [
  'signin',
  'dashboard',
  'upload_mapper',
  'alerts',
  'sources_balance',
  'meter_inventory',
  'ack_history_export',
  'crwa_admin',
  'overall',
] as const;

export type ReviewStepId = (typeof REVIEW_STEP_IDS)[number];

export type ReviewRating = 'love' | 'dont_need' | 'change' | 'need_new';

export type ReviewSessionStatus = 'open' | 'completed';

export interface ReviewSession {
  sessionId: string;
  reviewerUserId: string;
  reviewerEmail: string;
  createdAt: string;
  expiresAt: string;
  status: ReviewSessionStatus;
  submittedAt?: string;
}

export interface ReviewStepFeedback {
  sessionId: string;
  stepId: ReviewStepId;
  rating: ReviewRating | null;
  clarity: number | null;
  comment: string;
  skipped: boolean;
  updatedAt: string;
}

export function isReviewStepId(value: unknown): value is ReviewStepId {
  return typeof value === 'string' && (REVIEW_STEP_IDS as readonly string[]).includes(value);
}

export function isReviewRating(value: unknown): value is ReviewRating {
  return (
    value === 'love' ||
    value === 'dont_need' ||
    value === 'change' ||
    value === 'need_new'
  );
}

export function reviewSessionSk(sessionId: string): string {
  return `SESSION#${sessionId}`;
}

export function reviewStepSk(sessionId: string, stepId: ReviewStepId): string {
  return `SESSION#${sessionId}#STEP#${stepId}`;
}

export function sessionExpiresAt(createdAt: Date = new Date()): string {
  const d = new Date(createdAt);
  d.setUTCDate(d.getUTCDate() + REVIEW_SESSION_TTL_DAYS);
  return d.toISOString();
}

export function isSessionExpired(session: ReviewSession, now: Date = new Date()): boolean {
  return now.getTime() > Date.parse(session.expiresAt);
}

export function ratingLabel(rating: ReviewRating | null): string {
  switch (rating) {
    case 'love':
      return 'Love this';
    case 'dont_need':
      return "Don't need this";
    case 'change':
      return 'Change this';
    case 'need_new':
      return 'Need something new';
    default:
      return '(none)';
  }
}

export function parseStepFeedbackBody(
  stepId: ReviewStepId,
  body: unknown,
):
  | { ok: true; rating: ReviewRating | null; clarity: number | null; comment: string; skipped: boolean }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body must be a JSON object' };
  }
  const raw = body as Record<string, unknown>;
  const skipped = Boolean(raw.skipped);

  let rating: ReviewRating | null = null;
  if (raw.rating !== undefined && raw.rating !== null && raw.rating !== '') {
    if (!isReviewRating(raw.rating)) {
      return { ok: false, error: 'rating must be love | dont_need | change | need_new' };
    }
    rating = raw.rating;
  }

  let clarity: number | null = null;
  if (raw.clarity !== undefined && raw.clarity !== null && raw.clarity !== '') {
    const n = Number(raw.clarity);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return { ok: false, error: 'clarity must be an integer 1–5' };
    }
    clarity = n;
  }

  const comment = typeof raw.comment === 'string' ? raw.comment.trim() : '';
  if (comment.length > 4000) {
    return { ok: false, error: 'comment must be 4000 characters or fewer' };
  }

  if (!skipped) {
    if (
      (rating === 'change' || rating === 'need_new') &&
      comment.length === 0
    ) {
      return {
        ok: false,
        error: 'A short comment is required for Change this / Need something new',
      };
    }
  }

  // stepId is path-validated; keep for call-site clarity
  void stepId;

  return { ok: true, rating, clarity, comment, skipped };
}

export function buildReviewEmailBody(input: {
  session: ReviewSession;
  steps: ReviewStepFeedback[];
}): { subject: string; text: string } {
  const { session, steps } = input;
  const byId = new Map(steps.map((s) => [s.stepId, s]));
  const date = (session.submittedAt ?? new Date().toISOString()).slice(0, 10);

  const lines: string[] = [
    'Kelly Review — Water Saver',
    `Session: ${session.sessionId}`,
    `Reviewer: ${session.reviewerEmail}`,
    `Submitted: ${session.submittedAt ?? '(pending)'}`,
    '',
    'Summary',
    '-------',
  ];

  const skipped: string[] = [];
  const needNew: string[] = [];

  for (const id of REVIEW_STEP_IDS) {
    const step = byId.get(id);
    if (!step) {
      lines.push(`${id} | (no response) | - |`);
      continue;
    }
    if (step.skipped) skipped.push(id);
    if (step.rating === 'need_new' && step.comment) {
      needNew.push(`${id}: ${step.comment}`);
    }
    const clarity = step.clarity == null ? '-' : String(step.clarity);
    const comment = step.comment.replace(/\s+/g, ' ').slice(0, 200);
    lines.push(
      `${id} | ${ratingLabel(step.rating)} | ${clarity} | ${comment || (step.skipped ? '(skipped)' : '')}`,
    );
  }

  lines.push('');
  lines.push(`Skipped: ${skipped.length ? skipped.join(', ') : 'none'}`);
  lines.push('');
  lines.push('Overall / need_new themes:');
  if (needNew.length) {
    for (const t of needNew) lines.push(`- ${t}`);
  } else {
    const overall = byId.get('overall');
    if (overall?.comment) lines.push(`- ${overall.comment}`);
    else lines.push('- (none)');
  }

  return {
    subject: `Water Saver — Kelly review submitted (${date})`,
    text: lines.join('\n'),
  };
}
