/**
 * Hybrid search: ripgrep hits + lexical scoring over chunks.
 */
import { spawnSync } from 'node:child_process';
import { documentText } from './chunking.mjs';
import { loadChunks } from './index-store.mjs';
import { findRepoRoot } from './config.mjs';

/**
 * @typedef {{
 *   rank: number;
 *   path: string;
 *   startLine: number;
 *   endLine: number;
 *   score: number;
 *   snippet: string;
 *   language: string | null;
 *   symbol: string | null;
 * }} SearchHit
 */

/**
 * @param {string} query
 * @returns {string[]}
 */
function tokenize(query) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9_./-]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * @param {string} repoRoot
 * @param {string[]} tokens
 * @param {string | null} pathPrefix
 * @returns {Map<string, number>}
 */
function ripgrepFileBoosts(repoRoot, tokens, pathPrefix) {
  /** @type {Map<string, number>} */
  const boosts = new Map();
  if (tokens.length === 0) {
    return boosts;
  }

  // Prefer multi-word as alternating patterns; fall back to first token
  const pattern = tokens
    .slice(0, 6)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const args = [
    '--no-config',
    '-l',
    '-i',
    '--glob',
    '!node_modules',
    '--glob',
    '!dist',
    '--glob',
    '!.git',
    '--glob',
    '!.rag',
    '-e',
    pattern,
  ];
  if (pathPrefix) {
    args.push(pathPrefix.replace(/\\/g, '/'));
  } else {
    args.push('.');
  }

  const result = spawnSync('rg', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });

  if (result.status !== 0 && result.status !== 1) {
    // rg not installed or error — skip boosts
    return boosts;
  }

  const lines = (result.stdout || '')
    .split('\n')
    .map((l) => l.trim().replace(/^\.\//, ''))
    .filter(Boolean);

  for (const file of lines) {
    boosts.set(file.replace(/\\/g, '/'), 2.5);
  }
  return boosts;
}

/**
 * @param {import('./chunking.mjs').Chunk} chunk
 * @param {string[]} tokens
 * @param {Map<string, number>} rgBoosts
 */
function scoreChunk(chunk, tokens, rgBoosts) {
  const hay = `${chunk.path}\n${chunk.symbol || ''}\n${chunk.text}`.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (!hay.includes(token)) {
      continue;
    }
    // Count rough occurrences
    let idx = 0;
    let count = 0;
    while ((idx = hay.indexOf(token, idx)) !== -1) {
      count += 1;
      idx += token.length;
      if (count > 20) break;
    }
    score += Math.min(count, 8);

    if (chunk.path.toLowerCase().includes(token)) {
      score += 3;
    }
    if ((chunk.symbol || '').toLowerCase().includes(token)) {
      score += 4;
    }
  }

  // Path structure boosts for important trees
  if (chunk.path.startsWith('src/app/')) score += 0.4;
  if (chunk.path.startsWith('docs/')) score += 0.5;
  if (chunk.path.includes('.github/workflows/')) score += 0.6;
  if (chunk.path.includes('AGENTS.md') || chunk.path.includes('.instructions.md')) score += 0.8;

  score += rgBoosts.get(chunk.path) || 0;
  return score;
}

/**
 * @param {string} query
 * @param {{ limit?: number; pathPrefix?: string | null; repoRoot?: string }} [options]
 * @returns {SearchHit[]}
 */
export function searchCodebase(query, options = {}) {
  const limit = options.limit ?? 8;
  const pathPrefix = (options.pathPrefix || '').replace(/\\/g, '/').replace(/^\.\//, '');
  const root = options.repoRoot || findRepoRoot();
  const { chunks } = loadChunks(root);
  const tokens = tokenize(query);
  const rgBoosts = ripgrepFileBoosts(root, tokens, pathPrefix || null);

  /** @type {{ chunk: import('./chunking.mjs').Chunk; score: number }[]} */
  const scored = [];

  for (const chunk of chunks) {
    if (pathPrefix && !chunk.path.startsWith(pathPrefix)) {
      continue;
    }
    const score = scoreChunk(chunk, tokens, rgBoosts);
    if (score <= 0) {
      continue;
    }
    scored.push({ chunk, score });
  }

  scored.sort((a, b) => b.score - a.score || a.chunk.path.localeCompare(b.chunk.path));

  // Diversify: cap per-file hits
  /** @type {SearchHit[]} */
  const hits = [];
  /** @type {Map<string, number>} */
  const perFile = new Map();
  for (const { chunk, score } of scored) {
    const n = perFile.get(chunk.path) || 0;
    if (n >= 2) continue;
    perFile.set(chunk.path, n + 1);
    const maxScore = scored[0]?.score || 1;
    hits.push({
      rank: hits.length + 1,
      path: chunk.path,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      score: Math.round((score / maxScore) * 1000) / 1000,
      snippet: documentText(chunk).slice(0, 1800),
      language: chunk.language,
      symbol: chunk.symbol,
    });
    if (hits.length >= limit) break;
  }

  // If nothing matched tokens, return path-filename fuzzy matches
  if (hits.length === 0 && tokens.length > 0) {
    for (const chunk of chunks) {
      if (pathPrefix && !chunk.path.startsWith(pathPrefix)) continue;
      const pathLower = chunk.path.toLowerCase();
      if (tokens.some((t) => pathLower.includes(t))) {
        hits.push({
          rank: hits.length + 1,
          path: chunk.path,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          score: 0.2,
          snippet: documentText(chunk).slice(0, 1200),
          language: chunk.language,
          symbol: chunk.symbol,
        });
        if (hits.length >= limit) break;
      }
    }
  }

  return hits;
}

/**
 * @param {SearchHit[]} hits
 * @param {string} query
 */
export function formatHitsMarkdown(hits, query) {
  if (hits.length === 0) {
    return `No results for: ${query}\n`;
  }
  const lines = [`# RAG results (${hits.length} hits)`, `Query: ${query}`, ''];
  for (const hit of hits) {
    const loc = `${hit.path}:${hit.startLine}-${hit.endLine}`;
    const sym = hit.symbol ? ` (${hit.symbol})` : '';
    lines.push(`## ${hit.rank}. ${loc}${sym} (score ${hit.score})`);
    lines.push('');
    lines.push(hit.snippet);
    lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
