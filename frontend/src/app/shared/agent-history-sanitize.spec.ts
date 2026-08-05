import { describe, expect, it } from 'vitest';
import {
  isSterileAssistantText,
  prepareHistoryForDisplay,
  sanitizeHistory,
  trimNoisyHistory,
} from './agent-history-sanitize';

describe('agent-history-sanitize', () => {
  it('flags for-your-system (town-wiley only) intros the old regex missed', () => {
    expect(
      isSterileAssistantText(
        'I am the Water Saver assistant for your system (town-wiley only).',
      ),
    ).toBe(true);
    expect(isSterileAssistantText('Helpful reply about chlorine residual.')).toBe(false);
  });

  it('sanitizeHistory drops sterile + empty + near-duplicates', () => {
    const out = sanitizeHistory([
      { role: 'assistant', text: 'I am the Water Saver assistant for your system (town-wiley only).' },
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: 'Hello there.' },
      { role: 'assistant', text: 'Hello there.' },
      { role: 'assistant', text: '   ' },
      { role: 'assistant', text: 'Solid Confidence means more history.' },
    ]);
    expect(out.map((m) => m.text)).toEqual([
      'hi',
      'Hello there.',
      'Solid Confidence means more history.',
    ]);
  });

  it('trimNoisyHistory clears hello spam so welcome can reinject', () => {
    const out = trimNoisyHistory([
      { role: 'user', text: 'just say a short hello' },
      { role: 'assistant', text: 'Hi — how can I assist you today?' },
      { role: 'user', text: 'hello' },
      { role: 'assistant', text: 'Hello!' },
    ]);
    expect(out).toEqual([]);
  });

  it('prepareHistoryForDisplay keeps a real thread', () => {
    const out = prepareHistoryForDisplay([
      {
        role: 'assistant',
        text: 'I am the Water Saver assistant for your system (town-wiley only).',
      },
      { role: 'user', text: 'What does Confidence mean?' },
      { role: 'assistant', text: 'Confidence is history depth, not a leak score.' },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]!.text).toMatch(/Confidence mean/);
  });

  it('prepareHistoryForDisplay empties all-sterile threads for welcome reinject', () => {
    const out = prepareHistoryForDisplay([
      {
        role: 'assistant',
        text: "I'm the Water Saver assistant for your system (town-wiley only).",
      },
      { role: 'assistant', text: 'user: hi\nassistant: hello' },
      { role: 'assistant', text: 'Stay in tenant town-wiley.' },
    ]);
    expect(out).toEqual([]);
  });

  it('does not flag place-named multi-line welcome as sterile', () => {
    const welcome =
      "Hi Demo — I'm the Water Saver assistant for Town of Wiley.\n\n" +
      'Ask about alerts, uploads, or Confidence.';
    expect(isSterileAssistantText(welcome)).toBe(false);
  });
});
