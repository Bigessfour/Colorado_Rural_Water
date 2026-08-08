#!/usr/bin/env node
/**
 * Bundle Lambda handlers into infra/terraform/build/api-handlers.zip
 */
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
  cpSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import * as esbuild from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const backend = join(root, "backend");
const outDir = join(root, "infra/terraform/build/api-bundle");
const zipPath = join(root, "infra/terraform/build/api-handlers.zip");

const entryPoints = {
  health: join(backend, "src/handlers/health.ts"),
  me: join(backend, "src/handlers/me.ts"),
  "upload-url": join(backend, "src/handlers/upload-url.ts"),
  ingest: join(backend, "src/handlers/ingest.ts"),
  "ingest-jobs": join(backend, "src/handlers/ingest-jobs.ts"),
  "ingest-worker": join(backend, "src/handlers/ingest-worker.ts"),
  "ingest-sources": join(backend, "src/handlers/ingest-sources.ts"),
  "s3-ingest": join(backend, "src/handlers/s3-ingest.ts"),
  alerts: join(backend, "src/handlers/alerts.ts"),
  sources: join(backend, "src/handlers/sources.ts"),
  balance: join(backend, "src/handlers/balance.ts"),
  meters: join(backend, "src/handlers/meters.ts"),
  admin: join(backend, "src/handlers/admin.ts"),
  agent: join(backend, "src/handlers/agent.ts"),
  review: join(backend, "src/handlers/review.ts"),
  onboarding: join(backend, "src/handlers/onboarding.ts"),
  reports: join(backend, "src/handlers/reports.ts"),
};

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints,
  outdir: outDir,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: false,
  nodePaths: [join(backend, "node_modules")],
  // Keep AWS SDK out of the zip — available in Node 22 Lambda runtime via layer?
  // Actually AWS SDK v3 is NOT in the runtime by default for nodejs18+. Bundle it.
  external: [],
});

// Feature 014 — bundle curated knowledge for local-corpus fallback when KB unset.
const knowledgeSrc = join(backend, "knowledge");
const knowledgeDest = join(outDir, "knowledge");
if (existsSync(knowledgeSrc)) {
  cpSync(knowledgeSrc, knowledgeDest, { recursive: true });
}

if (existsSync(zipPath)) rmSync(zipPath);
execSync(`cd "${outDir}" && zip -qr "${zipPath}" .`);
const size = readFileSync(zipPath).length;
writeFileSync(
  join(root, "infra/terraform/build/.bundle-meta.json"),
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      bytes: size,
      entries: Object.keys(entryPoints),
      knowledgeBundled: existsSync(knowledgeDest),
    },
    null,
    2,
  ),
);
console.log(`Wrote ${zipPath} (${size} bytes)`);
