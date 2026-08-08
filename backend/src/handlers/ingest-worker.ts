import { processIngestJobInline } from "./ingest-jobs.js";
import { createIngestJobStoreFromEnv } from "../shared/dynamo-store.js";

export interface IngestWorkerEvent {
  tenantId: string;
  jobId: string;
}

/**
 * Async worker for POST /ingest/jobs — no API Gateway timeout.
 */
export const handler = async (event: IngestWorkerEvent): Promise<void> => {
  const tenantId = event?.tenantId?.trim();
  const jobId = event?.jobId?.trim();
  if (!tenantId || !jobId) {
    console.error("ingest_worker_missing_ids", JSON.stringify(event));
    return;
  }

  try {
    await processIngestJobInline(tenantId, jobId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      JSON.stringify({
        event: "ingest_worker_failed",
        tenantId,
        jobId,
        message,
      }),
    );
    try {
      const store = createIngestJobStoreFromEnv();
      await store.updateJob(tenantId, jobId, {
        status: "failed",
        error: message,
        updatedAt: new Date().toISOString(),
      });
    } catch (updateErr) {
      console.error(
        "ingest_worker_status_update_failed",
        updateErr instanceof Error ? updateErr.message : String(updateErr),
      );
    }
  }
};
