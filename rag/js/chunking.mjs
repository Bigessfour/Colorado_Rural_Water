/**
 * Split source files into overlapping chunks with line metadata.
 */
import { readFileSync } from 'node:fs';
import { CHUNK_LINES, CHUNK_OVERLAP, languageForPath, toRelPosix } from './config.mjs';

const EXPORT_RE =
  /^\s*(?:export\s+)?(?:default\s+)?(?:class|function|interface|type|const|enum)\s+(\w+)/m;

/**
 * @typedef {{
 *   path: string;
 *   startLine: number;
 *   endLine: number;
 *   language: string;
 *   text: string;
 *   symbol: string | null;
 *   id: string;
 * }} Chunk
 */

/**
 * @param {string} snippet
 */
function inferSymbol(snippet) {
  const match = EXPORT_RE.exec(snippet);
  return match ? match[1] : null;
}

/**
 * @param {string[]} lines
 * @param {string} path
 * @param {string} language
 * @returns {Chunk[]}
 */
function lineWindows(lines, path, language) {
  /** @type {Chunk[]} */
  const chunks = [];
  if (lines.length === 0) {
    return chunks;
  }
  const step = Math.max(1, CHUNK_LINES - CHUNK_OVERLAP);
  for (let startIdx = 0; startIdx < lines.length; startIdx += step) {
    const endIdx = Math.min(startIdx + CHUNK_LINES, lines.length);
    const snippet = lines.slice(startIdx, endIdx).join('');
    if (!snippet.trim()) {
      if (endIdx >= lines.length) break;
      continue;
    }
    const startLine = startIdx + 1;
    const endLine = endIdx;
    const text = snippet.replace(/\s+$/, '');
    const symbol = inferSymbol(text);
    chunks.push({
      path,
      startLine,
      endLine,
      language,
      text,
      symbol,
      id: `${path}:${startLine}:${endLine}`,
    });
    if (endIdx >= lines.length) {
      break;
    }
  }
  return chunks;
}

/**
 * @param {string[]} lines
 * @param {string} path
 * @param {string} language
 * @returns {Chunk[]}
 */
function markdownChunks(lines, path, language) {
  /** @type {number[]} */
  const headingIndices = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,4}\s+\S/.test(lines[i])) {
      headingIndices.push(i);
    }
  }
  if (headingIndices.length < 2) {
    return lineWindows(lines, path, language);
  }

  /** @type {Chunk[]} */
  const chunks = [];
  for (let h = 0; h < headingIndices.length; h++) {
    const startIdx = headingIndices[h];
    const endIdx = h + 1 < headingIndices.length ? headingIndices[h + 1] : lines.length;
    const snippet = lines.slice(startIdx, endIdx).join('');
    if (!snippet.trim()) continue;
    // Split long sections
    if (endIdx - startIdx > CHUNK_LINES * 2) {
      chunks.push(...lineWindows(lines.slice(startIdx, endIdx), path, language).map((c) => ({
        ...c,
        startLine: c.startLine + startIdx,
        endLine: c.endLine + startIdx,
        id: `${path}:${c.startLine + startIdx}:${c.endLine + startIdx}`,
      })));
    } else {
      const startLine = startIdx + 1;
      const endLine = endIdx;
      const text = snippet.replace(/\s+$/, '');
      chunks.push({
        path,
        startLine,
        endLine,
        language,
        text,
        symbol: null,
        id: `${path}:${startLine}:${endLine}`,
      });
    }
  }
  return chunks;
}

/**
 * @param {string} repoRoot
 * @param {string} absPath
 * @returns {Chunk[]}
 */
export function chunkFile(repoRoot, absPath) {
  let raw;
  try {
    raw = readFileSync(absPath, 'utf8');
  } catch {
    return [];
  }
  // Skip obvious binaries
  if (raw.includes('\u0000')) {
    return [];
  }

  const path = toRelPosix(repoRoot, absPath);
  const language = languageForPath(absPath);
  const lines = raw.split(/(?<=\n)/);

  if (language === 'markdown') {
    return markdownChunks(lines, path, language);
  }
  return lineWindows(lines, path, language);
}

/**
 * @param {Chunk} chunk
 */
export function documentText(chunk) {
  let header = `${chunk.path}:${chunk.startLine}-${chunk.endLine}`;
  if (chunk.symbol) {
    header = `${header} (${chunk.symbol})`;
  }
  return `${header}\n${chunk.text}`;
}
