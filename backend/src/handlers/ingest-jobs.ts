import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import type { AuthedHandler } from "../shared/apigw.js";
import { parseAuthFromClaims, requireTenantId } from "../shared/auth.js";
import {
  createIngestIdempotencyStoreFromEnv,
  createIngestJobStoreFromEnv,
} from "../shared/dynamo-store.js";
import type { IngestJobRecord } from "../shared/ingest-job.js";
import { INGEST_IDEMPOTENCY_TTL_SEC } from "../shared/ingest-limits.js";
import {
  ingestRowCounts,
  runIngestCommit,
} from "../shared/ingest-run.js";
import {
  parseIngestContent,
  parseIngestRequestBody,
  type IngestRequestBody,
} from "../shared/ingest-request.js";
import {
  accepted,
  badRequest,
  forbidden,
  ok,
  unauthorized,
} from "../shared/http.js";

const s3 = new S3Client({});
const lambda = new LambdaClient({});

export function ingestJobPayloadKey(tenantId: string, jobId: string): string {
  return `tenants/${tenantId}/ingest-jobs/${jobId}.json`;
}

/**
 * POST /ingest/jobs — queue background import (large files).
 * GET /ingest/jobs/{jobId} — poll job status.
 */
export const handler: AuthedHandler = async (event) => {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims || typeof claims !== "object") {
    return unauthorized();
  }

  let tenantId: string;
  try {
    tenantId = requireTenantId(
      parseAuthFromClaims(claims as Record<string, unknown>),
    );
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : "Forbidden");
  }

  const method = event.requestContext.http.method;
  const path = event.rawPath ?? event.requestContext.http.path ?? "";
  const jobIdParam = event.pathParameters?.jobId
    ? decodeURIComponent(event.pathParameters.jobId).trim()
    : "";

  if (method === "GET" && jobIdParam) {
    return getJobStatus(tenantId, jobIdParam);
  }

  if (method === "POST" && /\/ingest\/jobs\/?$/.test(path)) {
    return createJob(tenantId, event.body);
  }

  return badRequest("Unknown ingest jobs route");
};

async function getJobStatus(tenantId: string, jobId: string) {
  const store = createIngestJobStoreFromEnv();
  const job = await store.getJob(tenantId, jobId);
  if (!job) {
    return badRequest("Import job not found");
  }
  return ok(formatJobResponse(job));
}

async function createJob(tenantId: string, bodyRaw: string | undefined) {
  if (!bodyRaw) {
    return badRequest("JSON body with csvText or excelBase64 is required");
  }

  const parsedBody = parseIngestRequestBody(bodyRaw);
  if (parsedBody.error) {
    return badRequest(parsedBody.error);
  }
  const body = parsedBody.body;
  if (body.dryRun) {
    return badRequest("dryRun is not supported on background jobs — use POST /ingest");
  }
  if (body.listSheets) {
    return badRequest("listSheets is not supported on background jobs");
  }

  const content = parseIngestContent(body);
  if (content.error) return badRequest(content.error);
  const result = content.result!;

  if (result.errors.length) {
    return badRequest(result.errors.join(" "), {
      mapping: result.mapping,
      warnings: result.warnings,
    });
  }

  const idempotencyKey = body.idempotencyKey?.trim();
  if (idempotencyKey) {
    try {
      const idem = createIngestIdempotencyStoreFromEnv();
      const cached = await idem.get(tenantId, idempotencyKey);
      if (cached?.result?.jobId) {
        const store = createIngestJobStoreFromEnv();
        const existing = await store.getJob(
          tenantId,
          String(cached.result.jobId),
        );
        if (existing) {
          return accepted(formatJobResponse(existing));
        }
      }
    } catch (idemErr) {
      console.warn(
        "ingest_job_idempotency_read_failed",
        idemErr instanceof Error ? idemErr.message : String(idemErr),
      );
    }
  }

  const bucket = process.env.UPLOAD_BUCKET;
  const workerName = process.env.INGEST_WORKER_FUNCTION;
  if (!bucket) {
    return badRequest("UPLOAD_BUCKET is not configured on this environment");
  }
  if (!workerName) {
    return badRequest(
      "Background import is not configured (INGEST_WORKER_FUNCTION missing)",
    );
  }

  const jobId = randomUUID();
  const now = new Date().toISOString();
  const payloadS3Key = ingestJobPayloadKey(tenantId, jobId);
  const payload: IngestRequestBody = {
    csvText: body.csvText,
    excelBase64: body.excelBase64,
    sheetName: body.sheetName,
    mergeArchive: body.mergeArchive,
    mapping: body.mapping,
    filename: body.filename,
  };

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: payloadS3Key,
      ContentType: "application/json",
      Body: JSON.stringify(payload),
    }),
  );

  const job: IngestJobRecord = {
    tenantId,
    jobId,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    rowCount: result.rows.length,
    payloadS3Key,
    idempotencyKey: idempotencyKey ?? null,
    filename: body.filename?.trim() || null,
    error: null,
    summary: null,
    lastIngest: null,
  };

  const store = createIngestJobStoreFromEnv();
  await store.putJob(job);

  if (idempotencyKey) {
    try {
      const idem = createIngestIdempotencyStoreFromEnv();
      await idem.put({
        tenantId,
        key: idempotencyKey,
        at: now,
        result: { jobId, status: "queued" },
        expiresAt: Math.floor(Date.now() / 1000) + INGEST_IDEMPOTENCY_TTL_SEC,
      });
    } catch (idemErr) {
      console.warn(
        "ingest_job_idempotency_write_failed",
        idemErr instanceof Error ? idemErr.message : String(idemErr),
      );
    }
  }

  await lambda.send(
    new InvokeCommand({
      FunctionName: workerName,
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify({ tenantId, jobId })),
    }),
  );

  return accepted(formatJobResponse(job));
}

function formatJobResponse(job: IngestJobRecord) {
  return {
    tenantId: job.tenantId,
    jobId: job.jobId,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    rowCount: job.rowCount,
    filename: job.filename,
    error: job.error,
    summary: job.summary,
    lastIngest: job.lastIngest,
    statusLine:
      job.status === "queued"
        ? "Import queued — we will process your file in the background."
        : job.status === "running"
          ? "Import running — this may take a minute for large files."
          : job.status === "succeeded"
            ? "Import finished successfully."
            : job.error ?? "Import failed.",
  };
}

/** Exported for unit tests (inline worker path). */
export async function processIngestJobInline(
  tenantId: string,
  jobId: string,
): Promise<IngestJobRecord> {
  const store = createIngestJobStoreFromEnv();
  const job = await store.getJob(tenantId, jobId);
  if (!job) {
    throw new Error(`Import job ${jobId} not found`);
  }
  if (job.status === "succeeded" || job.status === "failed") {
    return job;
  }

  await store.updateJob(tenantId, jobId, {
    status: "running",
    updatedAt: new Date().toISOString(),
  });

  const bucket = process.env.UPLOAD_BUCKET;
  if (!bucket) {
    throw new Error("UPLOAD_BUCKET is not configured");
  }

  const obj = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: job.payloadS3Key }),
  );
  const raw = await obj.Body?.transformToString();
  if (!raw) {
    throw new Error("Job payload missing in S3");
  }

  const body = JSON.parse(raw) as IngestRequestBody;
  const content = parseIngestContent(body);
  if (content.error || !content.result) {
    throw new Error(content.error ?? "Could not parse job payload");
  }
  const result = content.result;
  if (result.errors.length) {
    throw new Error(result.errors.join(" "));
  }

  const rowCounts = ingestRowCounts(result);
  const responseBody = await runIngestCommit({
    tenantId,
    result,
    rowCounts,
    filename: body.filename ?? job.filename,
  });

  const finished: IngestJobRecord = {
    ...job,
    status: "succeeded",
    updatedAt: new Date().toISOString(),
    error: null,
    summary: {
      locationsUpserted: responseBody.locationsUpserted,
      readingsWritten: responseBody.readingsWritten,
      metersTracked: responseBody.metersTracked,
      addressConflicts: responseBody.addressConflicts,
      warnings: responseBody.warnings,
    },
    lastIngest: responseBody.lastIngest,
  };
  await store.putJob(finished);

  if (job.idempotencyKey) {
    try {
      const idem = createIngestIdempotencyStoreFromEnv();
      await idem.put({
        tenantId,
        key: job.idempotencyKey,
        at: finished.updatedAt,
        result: {
          ...responseBody,
          jobId,
          status: "succeeded",
        } as Record<string, unknown>,
        expiresAt: Math.floor(Date.now() / 1000) + INGEST_IDEMPOTENCY_TTL_SEC,
      });
    } catch (idemErr) {
      console.warn(
        "ingest_job_idempotency_finalize_failed",
        idemErr instanceof Error ? idemErr.message : String(idemErr),
      );
    }
  }

  return finished;
}
