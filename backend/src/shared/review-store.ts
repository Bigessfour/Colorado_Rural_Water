import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  REVIEW_PARTITION_TENANT_ID,
  isReviewRating,
  isReviewStepId,
  reviewSessionSk,
  reviewStepSk,
  type ReviewSession,
  type ReviewStepFeedback,
} from './review.js';

function pk(): string {
  // Synthetic partition under TENANT#* IAM LeadingKeys (same pattern as TENANT#_registry).
  return `TENANT#${REVIEW_PARTITION_TENANT_ID}`;
}

export interface ReviewStore {
  putSession(session: ReviewSession): Promise<void>;
  getSession(sessionId: string): Promise<ReviewSession | null>;
  putStep(feedback: ReviewStepFeedback): Promise<void>;
  listSteps(sessionId: string): Promise<ReviewStepFeedback[]>;
  /** Conditional open → completed. Returns false if already completed / missing / wrong status. */
  markCompleted(sessionId: string, submittedAt: string): Promise<boolean>;
}

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export class DynamoReviewStore implements ReviewStore {
  constructor(private readonly tableName: string) {}

  async putSession(session: ReviewSession): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(),
          sk: reviewSessionSk(session.sessionId),
          entityType: 'review_session',
          ...session,
        },
        ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
      }),
    );
  }

  async getSession(sessionId: string): Promise<ReviewSession | null> {
    const res = await client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: pk(), sk: reviewSessionSk(sessionId) },
      }),
    );
    if (!res.Item) return null;
    return itemToSession(res.Item as Record<string, unknown>);
  }

  async putStep(feedback: ReviewStepFeedback): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(),
          sk: reviewStepSk(feedback.sessionId, feedback.stepId),
          entityType: 'review_step',
          ...feedback,
        },
      }),
    );
  }

  async listSteps(sessionId: string): Promise<ReviewStepFeedback[]> {
    const res = await client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: {
          ':pk': pk(),
          ':prefix': `SESSION#${sessionId}#STEP#`,
        },
      }),
    );
    const out: ReviewStepFeedback[] = [];
    for (const item of res.Items ?? []) {
      const step = itemToStep(item as Record<string, unknown>);
      if (step) out.push(step);
    }
    return out.sort((a, b) => a.stepId.localeCompare(b.stepId));
  }

  async markCompleted(sessionId: string, submittedAt: string): Promise<boolean> {
    try {
      await client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { pk: pk(), sk: reviewSessionSk(sessionId) },
          UpdateExpression: 'SET #status = :completed, submittedAt = :submittedAt',
          ConditionExpression: 'attribute_exists(pk) AND #status = :open',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':completed': 'completed',
            ':open': 'open',
            ':submittedAt': submittedAt,
          },
        }),
      );
      return true;
    } catch (err) {
      const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : '';
      if (name === 'ConditionalCheckFailedException') return false;
      throw err;
    }
  }
}

function itemToSession(item: Record<string, unknown>): ReviewSession | null {
  const sessionId = item.sessionId;
  const reviewerUserId = item.reviewerUserId;
  const reviewerEmail = item.reviewerEmail;
  const createdAt = item.createdAt;
  const expiresAt = item.expiresAt;
  const status = item.status;
  if (
    typeof sessionId !== 'string' ||
    typeof reviewerUserId !== 'string' ||
    typeof reviewerEmail !== 'string' ||
    typeof createdAt !== 'string' ||
    typeof expiresAt !== 'string' ||
    (status !== 'open' && status !== 'completed')
  ) {
    return null;
  }
  return {
    sessionId,
    reviewerUserId,
    reviewerEmail,
    createdAt,
    expiresAt,
    status,
    submittedAt: typeof item.submittedAt === 'string' ? item.submittedAt : undefined,
  };
}

function itemToStep(item: Record<string, unknown>): ReviewStepFeedback | null {
  const sessionId = item.sessionId;
  const stepId = item.stepId;
  if (typeof sessionId !== 'string' || !isReviewStepId(stepId)) return null;
  const rating =
    item.rating === null || item.rating === undefined
      ? null
      : isReviewRating(item.rating)
        ? item.rating
        : null;
  let clarity: number | null = null;
  if (typeof item.clarity === 'number' && Number.isInteger(item.clarity)) {
    clarity = item.clarity;
  }
  return {
    sessionId,
    stepId,
    rating,
    clarity,
    comment: typeof item.comment === 'string' ? item.comment : '',
    skipped: Boolean(item.skipped),
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
  };
}

export function createReviewStoreFromEnv(): ReviewStore {
  const table = process.env.DATA_TABLE;
  if (!table) {
    throw new Error('DATA_TABLE env is not configured');
  }
  return new DynamoReviewStore(table);
}

/** In-memory store for unit tests. */
export class MemoryReviewStore implements ReviewStore {
  sessions = new Map<string, ReviewSession>();
  steps = new Map<string, ReviewStepFeedback>();

  async putSession(session: ReviewSession): Promise<void> {
    if (this.sessions.has(session.sessionId)) {
      const err = new Error('ConditionalCheckFailed');
      (err as { name: string }).name = 'ConditionalCheckFailedException';
      throw err;
    }
    this.sessions.set(session.sessionId, { ...session });
  }

  async getSession(sessionId: string): Promise<ReviewSession | null> {
    const s = this.sessions.get(sessionId);
    return s ? { ...s } : null;
  }

  async putStep(feedback: ReviewStepFeedback): Promise<void> {
    this.steps.set(`${feedback.sessionId}#${feedback.stepId}`, { ...feedback });
  }

  async listSteps(sessionId: string): Promise<ReviewStepFeedback[]> {
    return [...this.steps.values()]
      .filter((s) => s.sessionId === sessionId)
      .map((s) => ({ ...s }))
      .sort((a, b) => a.stepId.localeCompare(b.stepId));
  }

  async markCompleted(sessionId: string, submittedAt: string): Promise<boolean> {
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== 'open') return false;
    this.sessions.set(sessionId, { ...s, status: 'completed', submittedAt });
    return true;
  }
}
