/**
 * Normalize / reject assistant text before CONV# persist and when listing history.
 * Keeps operators from seeing dry-run prompt echoes and sterile tenant-slug intros.
 */

/** True when a stored/generated assistant bubble should not be shown. */
export function isSterileAssistantText(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (!t) return true;
  if (/\bin tenant\b/i.test(t)) return true;
  if (/\bTENANT#/i.test(t)) return true;
  if (/\bfor your system\s*\([^)]*only\)/i.test(t)) return true;
  if (/\btenant\s+town-[a-z0-9-]+\b/i.test(t)) return true;
  if (/\(town-[a-z0-9-]+\s*only\)/i.test(t)) return true;
  if (/^(user|assistant|system)\s*:/im.test(t)) return true;
  if (/\n(?:user|assistant|system)\s*:/i.test(t) && t.length < 500) return true;
  if (/^i am the water saver assistant\b/i.test(t) && t.length < 180) return true;
  if (
    /^i'?m the water saver assistant for your system\b/i.test(t) &&
    t.length < 180
  ) {
    return true;
  }
  return false;
}

/**
 * Strip role-label echoes and refuse empty / sterile model output.
 * Returns fallback when the model dumped a prompt transcript.
 */
export function normalizeOutboundAssistantText(
  text: string | null | undefined,
  fallback: string,
): string {
  let t = (text ?? "").trim();
  if (!t) return fallback;

  // Full multi-turn transcript dump — never persist.
  const roleLines = (t.match(/^(?:user|assistant|system)\s*:/gim) ?? []).length;
  if (roleLines >= 2) return fallback;

  t = t.replace(/^(?:assistant)\s*:\s*/i, "").trim();
  if (!t || isSterileAssistantText(t)) return fallback;
  return t;
}

/** Filter CONV# rows returned to the SPA. */
export function filterConversationForClient<
  T extends { role: string; text: string },
>(messages: T[]): T[] {
  return messages.filter((m) => {
    const text = (m.text ?? "").trim();
    if (!text) return false;
    if (m.role === "assistant" && isSterileAssistantText(text)) return false;
    return true;
  });
}
