#!/usr/bin/env node
/**
 * Feature 014 — eval-set runner for the Cognito /agent RAG path.
 *
 * Runs backend/knowledge/eval-set.json against POST /agent and asserts
 * expect_any / forbid_any per case (matched against reply text + source
 * names/URIs/excerpts, case-insensitive).
 *
 * Usage:
 *   SMOKE_ID_TOKEN=<Cognito JWT> node scripts/agent-eval.mjs [BASE_URL]
 *   # BASE_URL default: https://uqujnhmk31.execute-api.us-east-1.amazonaws.com
 *
 * Quarterly refresh: run after knowledge-sync + KB ingest (docs/colorado-ops-refresh.md).
 * Nonzero exit on any failed case — suitable as an opt-in CI / smoke step.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE =
  process.argv[2] ||
  process.env.AGENT_EVAL_BASE ||
  "https://uqujnhmk31.execute-api.us-east-1.amazonaws.com";
const TOKEN = process.env.SMOKE_ID_TOKEN?.trim();

if (!TOKEN) {
  console.error(
    "agent-eval: set SMOKE_ID_TOKEN (Cognito JWT for the demo operator)",
  );
  process.exit(2);
}

const evalSet = JSON.parse(
  readFileSync(join(ROOT, "backend", "knowledge", "eval-set.json"), "utf8"),
);

function haystackFrom(body) {
  const parts = [body.reply ?? ""];
  for (const s of body.sources ?? []) {
    parts.push(s.source ?? "", s.uri ?? "", s.excerpt ?? "");
  }
  return parts.join("\n").toLowerCase();
}

async function runCase(c) {
  const res = await fetch(`${BASE}/agent`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ message: c.question }),
  });
  if (res.status === 429) {
    return {
      id: c.id,
      status: "skip",
      note: "rate limited (429) — rerun next hour",
    };
  }
  if (!res.ok) {
    return { id: c.id, status: "fail", note: `HTTP ${res.status}` };
  }
  const body = await res.json();
  const hay = haystackFrom(body);

  const expectAny = c.expect_any ?? [];
  const forbidAny = c.forbid_any ?? [];
  const expectHit =
    expectAny.length === 0 ||
    expectAny.some((t) => hay.includes(t.toLowerCase()));
  const forbidden = forbidAny.filter((t) => hay.includes(t.toLowerCase()));

  if (!expectHit) {
    return {
      id: c.id,
      status: "fail",
      note: `none of expect_any matched: [${expectAny.join(", ")}]`,
      replyHead: (body.reply ?? "").slice(0, 160),
    };
  }
  if (forbidden.length > 0) {
    return {
      id: c.id,
      status: "fail",
      note: `forbidden text present: [${forbidden.join(", ")}]`,
    };
  }
  return {
    id: c.id,
    status: "pass",
    note: `retrievalMode=${body.retrievalMode ?? "?"} tool=${body.tool ?? "none"} sources=${(body.sources ?? []).length}`,
  };
}

const results = [];
for (const c of evalSet.cases) {
  // Sequential with a small gap — stay well under the per-tenant hourly cap.
  results.push(await runCase(c));
  await new Promise((r) => setTimeout(r, 500));
}

let failed = 0;
for (const r of results) {
  const mark =
    r.status === "pass" ? "PASS" : r.status === "skip" ? "SKIP" : "FAIL";
  if (r.status === "fail") failed += 1;
  console.log(`${mark}  ${r.id.padEnd(22)} ${r.note}`);
  if (r.replyHead) console.log(`      reply: ${r.replyHead}`);
}
console.log(
  `\nagent-eval: ${results.length - failed}/${results.length} passing (base ${BASE})`,
);
process.exit(failed > 0 ? 1 : 0);
