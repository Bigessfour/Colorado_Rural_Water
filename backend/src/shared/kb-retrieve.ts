/**
 * Feature 014 — Bedrock Knowledge Base Retrieve with tenant metadata filter.
 * Falls back to bundled colorado-ops markdown when KB id is unset / Retrieve fails.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

export interface KbSource {
  source: string;
  excerpt: string;
  uri?: string | null;
  score?: number;
}

export interface KbRetrieveResult {
  context: string;
  sources: KbSource[];
  mode: "bedrock-kb" | "local-corpus";
  knowledgeBaseId: string | null;
}

const agentRuntime = new BedrockAgentRuntimeClient({});
const ssm = new SSMClient({});

let cachedKbId: string | null | undefined;
let cachedBucket: string | null | undefined;

async function ssmString(name: string): Promise<string | null> {
  try {
    const res = await ssm.send(
      new GetParameterCommand({ Name: name, WithDecryption: false }),
    );
    return res.Parameter?.Value?.trim() || null;
  } catch {
    return null;
  }
}

export async function resolveKnowledgeBaseId(): Promise<string | null> {
  if (process.env.KNOWLEDGE_BASE_ID?.trim()) {
    return process.env.KNOWLEDGE_BASE_ID.trim();
  }
  if (cachedKbId !== undefined) return cachedKbId;
  const prefix = process.env.KNOWLEDGE_SSM_PREFIX?.trim();
  if (!prefix) {
    cachedKbId = null;
    return null;
  }
  cachedKbId = await ssmString(`${prefix}/knowledge-base-id`);
  return cachedKbId;
}

export async function resolveKnowledgeBucket(): Promise<string | null> {
  if (process.env.KNOWLEDGE_BUCKET?.trim()) {
    return process.env.KNOWLEDGE_BUCKET.trim();
  }
  if (cachedBucket !== undefined) return cachedBucket;
  const prefix = process.env.KNOWLEDGE_SSM_PREFIX?.trim();
  if (!prefix) {
    cachedBucket = null;
    return null;
  }
  cachedBucket = await ssmString(`${prefix}/knowledge-bucket`);
  return cachedBucket;
}

/** Non-negotiable filter: shared corpus OR this JWT tenant's SOPs. */
export function buildTenantRetrievalFilter(tenantId: string) {
  return {
    orAll: [
      {
        equals: {
          key: "scope",
          value: "shared",
        },
      },
      {
        equals: {
          key: "tenant_id",
          value: tenantId,
        },
      },
    ],
  };
}

function extractUrls(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s)>\]]+/);
  return m?.[0] ?? null;
}

function localKnowledgeDirs(): string[] {
  const envDir = process.env.KNOWLEDGE_LOCAL_DIR?.trim();
  const candidates = [
    envDir,
    join(process.cwd(), "knowledge"),
    join(__dirname, "knowledge"),
    join(__dirname, "..", "knowledge"),
    join(__dirname, "..", "..", "knowledge"),
  ].filter((d): d is string => Boolean(d));
  return candidates.filter((d) => existsSync(d));
}

function walkMarkdown(
  dir: string,
  acc: Array<{ path: string; text: string }>,
): void {
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const full = join(dir, name);
    if (name.endsWith(".md")) {
      try {
        acc.push({ path: full, text: readFileSync(full, "utf8") });
      } catch {
        /* skip */
      }
      continue;
    }
    // Recurse into subdirectories (e.g. colorado-ops/).
    try {
      walkMarkdown(full, acc);
    } catch {
      /* file or unreadable — skip */
    }
  }
}

function scoreDoc(question: string, text: string): number {
  const q = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);
  const hay = text.toLowerCase();
  let score = 0;
  for (const w of q) {
    if (hay.includes(w)) score += 1;
  }
  return score;
}

export function retrieveLocalCorpus(
  question: string,
  tenantId: string,
  k = 4,
): KbRetrieveResult {
  void tenantId; // local bundle is shared-only; tenant SOPs come from KB/S3
  const docs: Array<{ path: string; text: string }> = [];
  for (const dir of localKnowledgeDirs()) {
    walkMarkdown(dir, docs);
  }
  const ranked = docs
    .map((d) => ({ ...d, score: scoreDoc(question, d.text) }))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  // If nothing matched keywords, still return disclaimer + online sources + residual.
  const fallbackNames = [
    "00-disclaimer.md",
    "01-online-sources.md",
    "03-disinfectant-residual.md",
    "runbook.md",
    "alerts.md",
  ];
  const selected =
    ranked.length > 0
      ? ranked
      : docs
          .filter((d) => fallbackNames.some((n) => d.path.endsWith(n)))
          .slice(0, k);

  const sources: KbSource[] = selected.map((d) => {
    const base = d.path.split(/[/\\]/).pop() || d.path;
    return {
      source: base,
      excerpt: d.text.slice(0, 240),
      uri: extractUrls(d.text),
      score: "score" in d ? (d as { score: number }).score : 0,
    };
  });

  const context = selected
    .map((d) => {
      const base = d.path.split(/[/\\]/).pop() || d.path;
      return `[${base}]\n${d.text.slice(0, 1800)}`;
    })
    .join("\n\n---\n\n");

  return {
    context: context || "(no local knowledge files bundled)",
    sources,
    mode: "local-corpus",
    knowledgeBaseId: null,
  };
}

export async function retrieveKnowledge(params: {
  question: string;
  tenantId: string;
  k?: number;
}): Promise<KbRetrieveResult> {
  const k = params.k ?? 4;
  const kbId = await resolveKnowledgeBaseId();
  if (!kbId) {
    return retrieveLocalCorpus(params.question, params.tenantId, k);
  }

  try {
    const res = await agentRuntime.send(
      new RetrieveCommand({
        knowledgeBaseId: kbId,
        retrievalQuery: { text: params.question },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: k,
            filter: buildTenantRetrievalFilter(params.tenantId),
          },
        },
      }),
    );

    const results = res.retrievalResults ?? [];
    if (results.length === 0) {
      return retrieveLocalCorpus(params.question, params.tenantId, k);
    }

    const sources: KbSource[] = results.map((r) => {
      const text = r.content?.text ?? "";
      const loc = r.location?.s3Location?.uri || r.location?.webLocation?.url;
      const source =
        loc?.split("/").pop() ||
        (r.metadata?.["x-amz-bedrock-kb-source-uri"] as string) ||
        "knowledge";
      return {
        source: String(source),
        excerpt: text.slice(0, 240),
        uri: extractUrls(text) || loc || null,
        score: r.score,
      };
    });

    const context = results
      .map((r, i) => {
        const text = r.content?.text ?? "";
        const label = sources[i]?.source ?? `chunk-${i}`;
        return `[${label}]\n${text}`;
      })
      .join("\n\n---\n\n");

    return {
      context,
      sources,
      mode: "bedrock-kb",
      knowledgeBaseId: kbId,
    };
  } catch (err) {
    console.warn(
      "kb-retrieve: Bedrock Retrieve failed, using local corpus",
      err,
    );
    return retrieveLocalCorpus(params.question, params.tenantId, k);
  }
}
