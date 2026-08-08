import type { IngestCommitSummary } from "./ingest.js";
import type { LastIngestRecord } from "./last-ingest.js";

export type IngestJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface IngestJobRecord {
  tenantId: string;
  jobId: string;
  status: IngestJobStatus;
  createdAt: string;
  updatedAt: string;
  rowCount: number;
  payloadS3Key: string;
  idempotencyKey?: string | null;
  filename?: string | null;
  error?: string | null;
  summary?: IngestCommitSummary | null;
  lastIngest?: LastIngestRecord | null;
}

export interface IngestJobStore {
  putJob(job: IngestJobRecord): Promise<void>;
  getJob(tenantId: string, jobId: string): Promise<IngestJobRecord | null>;
  updateJob(
    tenantId: string,
    jobId: string,
    patch: Partial<
      Pick<
        IngestJobRecord,
        "status" | "updatedAt" | "error" | "summary" | "lastIngest"
      >
    >,
  ): Promise<void>;
}

export interface IngestIdempotencyRecord {
  tenantId: string;
  key: string;
  at: string;
  result: Record<string, unknown>;
  expiresAt: number;
}

export interface IngestIdempotencyStore {
  get(
    tenantId: string,
    key: string,
  ): Promise<IngestIdempotencyRecord | null>;
  put(record: IngestIdempotencyRecord): Promise<void>;
}
