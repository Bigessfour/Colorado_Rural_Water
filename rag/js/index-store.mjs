/**
 * Build / load optional on-disk chunk index + manifest.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chunkFile, documentText } from './chunking.mjs';
import {
  INDEX_VERSION,
  contentHash,
  findRepoRoot,
  indexPath,
  manifestPath,
  ragDir,
  toRelPosix,
} from './config.mjs';
import { discoverIndexFiles } from './discover.mjs';

/**
 * @typedef {import('./chunking.mjs').Chunk & { hash?: string }} StoredChunk
 */

/**
 * @returns {string | null}
 */
function gitHead(repoRoot) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * @param {string} [repoRoot]
 */
export function buildIndex(repoRoot) {
  const root = repoRoot || findRepoRoot();
  mkdirSync(ragDir(root), { recursive: true });

  const files = discoverIndexFiles(root);
  /** @type {StoredChunk[]} */
  const chunks = [];
  /** @type {Record<string, string>} */
  const fileHashes = {};

  for (const abs of files) {
    const rel = toRelPosix(root, abs);
    let raw = '';
    try {
      raw = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    fileHashes[rel] = contentHash(raw);
    for (const chunk of chunkFile(root, abs)) {
      chunks.push({ ...chunk, hash: fileHashes[rel] });
    }
  }

  const payload = {
    version: INDEX_VERSION,
    indexedAt: new Date().toISOString(),
    gitHead: gitHead(root),
    fileCount: files.length,
    chunkCount: chunks.length,
    chunks,
  };

  writeFileSync(indexPath(root), JSON.stringify(payload), 'utf8');

  const manifest = {
    version: INDEX_VERSION,
    indexed_at: payload.indexedAt,
    git_head: payload.gitHead,
    engine: 'js-local',
    file_count: files.length,
    chunk_count: chunks.length,
    files: fileHashes,
  };
  writeFileSync(manifestPath(root), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return manifest;
}

/**
 * Incremental rebuild using content hashes from manifest.
 * @param {string} [repoRoot]
 */
export function buildIndexIncremental(repoRoot) {
  const root = repoRoot || findRepoRoot();
  const previous = loadManifest(root);
  const manifest = buildIndex(root);

  let changed = 0;
  let added = 0;
  let removed = 0;
  const prevFiles = previous?.files || {};
  const nextFiles = manifest.files || {};
  for (const [rel, hash] of Object.entries(nextFiles)) {
    if (!(rel in prevFiles)) added += 1;
    else if (prevFiles[rel] !== hash) changed += 1;
  }
  for (const rel of Object.keys(prevFiles)) {
    if (!(rel in nextFiles)) removed += 1;
  }

  return {
    ...manifest,
    files_added: added,
    files_changed: changed,
    files_removed: removed,
    noop: added === 0 && changed === 0 && removed === 0,
  };
}

/**
 * Load persisted chunks, or build in-memory on the fly.
 * @param {string} [repoRoot]
 * @param {{ forceRebuild?: boolean }} [opts]
 */
export function loadChunks(repoRoot, opts = {}) {
  const root = repoRoot || findRepoRoot();
  const path = indexPath(root);

  if (!opts.forceRebuild && existsSync(path)) {
    try {
      const data = JSON.parse(readFileSync(path, 'utf8'));
      if (data?.version === INDEX_VERSION && Array.isArray(data.chunks)) {
        return {
          root,
          chunks: data.chunks,
          fromDisk: true,
          indexedAt: data.indexedAt,
          gitHead: data.gitHead,
          fileCount: data.fileCount,
        };
      }
    } catch {
      /* rebuild */
    }
  }

  const files = discoverIndexFiles(root);
  /** @type {StoredChunk[]} */
  const chunks = [];
  for (const abs of files) {
    chunks.push(...chunkFile(root, abs));
  }
  return {
    root,
    chunks,
    fromDisk: false,
    indexedAt: new Date().toISOString(),
    gitHead: gitHead(root),
    fileCount: files.length,
  };
}

/**
 * @param {string} [repoRoot]
 */
export function loadManifest(repoRoot) {
  const root = repoRoot || findRepoRoot();
  const path = manifestPath(root);
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * @param {string} [repoRoot]
 */
export function statusReport(repoRoot) {
  const root = repoRoot || findRepoRoot();
  const manifest = loadManifest(root);
  const head = gitHead(root);
  const files = discoverIndexFiles(root);

  if (!manifest) {
    return [
      'RAG index status',
      '  engine: js-local',
      '  index: missing (search still works in-memory)',
      `  discoverable_files: ${files.length}`,
      '  note: run npm run rag:index for faster startup',
      '  status: ok (JS local)',
    ].join('\n');
  }

  const stale = Boolean(head && manifest.git_head && head !== manifest.git_head);
  return [
    'RAG index status',
    '  engine: js-local',
    `  status: ok (JS local)`,
    `  indexed_at: ${manifest.indexed_at}`,
    `  git_head: ${manifest.git_head ?? 'unknown'}`,
    `  files: ${manifest.file_count}`,
    `  chunks: ${manifest.chunk_count}`,
    `  discoverable_files_now: ${files.length}`,
    `  stale: ${stale}`,
    stale
      ? `  note: Index built at ${(manifest.git_head || '').slice(0, 8)}, HEAD is ${(head || '').slice(0, 8)} — run npm run rag:index:incremental`
      : '  note: Index is up to date with git HEAD (or HEAD unknown)',
  ].join('\n');
}

export { documentText };
