/**
 * Client-side filters for assistant conversation history.
 * Bad early dry-run / template rows still live in Dynamo; these keep the panel readable.
 */

export type HistoryChatMsg = {
  role: 'user' | 'assistant';
  text: string;
  createdAt?: string;
};

/** Assistant (or empty) bubbles that should never be shown to operators. */
export function isSterileAssistantText(text: string | null | undefined): boolean {
  const t = (text ?? '').trim();
  if (!t) return true;
  if (/\bin tenant\b/i.test(t)) return true;
  if (/\bTENANT#/i.test(t)) return true;
  if (/\bfor your system\s*\([^)]*only\)/i.test(t)) return true;
  if (/\btenant\s+town-[a-z0-9-]+\b/i.test(t)) return true;
  if (/\(town-[a-z0-9-]+\s*only\)/i.test(t)) return true;
  // Prompt / role echoes from early Bedrock dry-runs.
  if (/^(user|assistant|system)\s*:/im.test(t)) return true;
  if (/\n(?:user|assistant|system)\s*:/i.test(t) && t.length < 500) return true;
  // Very short generic intros (often stale template noise).
  if (/^i am the water saver assistant\b/i.test(t) && t.length < 180) return true;
  if (
    /^i'?m the water saver assistant for your system\b/i.test(t) &&
    t.length < 180
  ) {
    return true;
  }
  return false;
}

export function nearDuplicateHistoryText(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
  return norm(a) === norm(b);
}

/** Drop sterile tenant intros, empty bubbles, and consecutive near-duplicates. */
export function sanitizeHistory(msgs: HistoryChatMsg[]): HistoryChatMsg[] {
  const cleaned = msgs.filter((m) => {
    const text = (m.text ?? '').trim();
    if (!text) return false;
    if (m.role === 'assistant' && isSterileAssistantText(text)) return false;
    return true;
  });
  const out: HistoryChatMsg[] = [];
  for (const m of cleaned) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.role === 'assistant' &&
      m.role === 'assistant' &&
      nearDuplicateHistoryText(prev.text, m.text)
    ) {
      continue;
    }
    out.push(m);
  }
  return out;
}

function isNoisyTurn(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (isSterileAssistantText(t)) return true;
  if (/^(hi|hello|hey)\b/i.test(t)) return true;
  if (/\bhow can i (assist|help) you\b/i.test(t)) return true;
  if (/\bjust say (a )?(short )?hello\b/i.test(t)) return true;
  if (/^(user|assistant|system)\s*:/im.test(t)) return true;
  return false;
}

/**
 * Drop greeting / dry-run spam runs; keep the last `keep` turns.
 * If everything left is still noisy, return [] so the UI can inject a welcome.
 */
export function trimNoisyHistory(msgs: HistoryChatMsg[], keep = 8): HistoryChatMsg[] {
  const filtered = msgs.filter((m, i, arr) => {
    if (!isNoisyTurn(m.text || '')) return true;
    const prev = arr[i - 1];
    if (prev && isNoisyTurn(prev.text || '') && prev.role === m.role) return false;
    return true;
  });
  const sliced = filtered.slice(-Math.max(1, keep));
  const meaningful = sliced.filter((m) => !isNoisyTurn(m.text || ''));
  if (meaningful.length === 0) return [];
  return sliced;
}

/** Full client pipeline used after GET /agent (or Compose history). */
export function prepareHistoryForDisplay(msgs: HistoryChatMsg[]): HistoryChatMsg[] {
  return trimNoisyHistory(sanitizeHistory(msgs));
}
