/** Max rows for synchronous POST /ingest commit (API Gateway ~30s cap). */
export const SYNC_INGEST_MAX_ROWS = 250;

/** DynamoDB BatchWriteItem chunk size. */
export const INGEST_BATCH_WRITE_SIZE = 25;

/** DynamoDB BatchGetItem chunk size. */
export const INGEST_BATCH_GET_SIZE = 100;

/** Background job payload TTL in S3 (days). */
export const INGEST_JOB_PAYLOAD_TTL_DAYS = 7;

/** Idempotency record TTL (seconds). */
export const INGEST_IDEMPOTENCY_TTL_SEC = 7 * 24 * 3600;
