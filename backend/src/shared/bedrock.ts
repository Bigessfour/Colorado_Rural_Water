/**
 * Optional Bedrock helpers — cheapest model first (Nova Lite in us-east-2).
 * Never include cross-tenant data in prompts; caller must scope context.
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({});

/** Cheapest general text model with live access on townofwiley / us-east-2. */
export const DEFAULT_BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID?.trim() || 'amazon.nova-lite-v1:0';

export function bedrockEnabled(): boolean {
  return process.env.BEDROCK_ENABLED !== '0' && process.env.BEDROCK_ENABLED !== 'false';
}

export async function converseText(params: {
  system: string;
  user: string;
  maxTokens?: number;
  modelId?: string;
}): Promise<{ text: string; modelId: string } | null> {
  if (!bedrockEnabled()) return null;
  const modelId = params.modelId ?? DEFAULT_BEDROCK_MODEL_ID;
  try {
    const res = await client.send(
      new ConverseCommand({
        modelId,
        system: [{ text: params.system }],
        messages: [{ role: 'user', content: [{ text: params.user }] }],
        inferenceConfig: { maxTokens: params.maxTokens ?? 400, temperature: 0.2 },
      }),
    );
    const text = res.output?.message?.content
      ?.map((c) => ('text' in c && c.text ? c.text : ''))
      .join('')
      .trim();
    if (!text) return null;
    return { text, modelId };
  } catch {
    // Fall back to deterministic templates when model access / IAM fails.
    return null;
  }
}
