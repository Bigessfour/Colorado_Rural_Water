#!/usr/bin/env node
/**
 * JS RAG setup — no Python/venv required.
 * Verifies Node + optional ripgrep, creates .rag/, optional first index.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ragDir = path.join(repoRoot, '.rag');
const jsDir = path.join(repoRoot, 'rag', 'js');

if (!fs.existsSync(jsDir)) {
  console.error('Missing rag/js — repository is incomplete.');
  process.exit(1);
}

fs.mkdirSync(ragDir, { recursive: true });

const nodeV = process.versions.node;
const major = Number(nodeV.split('.')[0]);
if (major < 20) {
  console.error(`Node 20+ required for RAG (found v${nodeV}). Prefer Node 24 per .nvmrc.`);
  process.exit(1);
}

const rg = spawnSync('rg', ['--version'], { encoding: 'utf8' });
if (rg.status === 0) {
  console.log('ripgrep: ok —', (rg.stdout || '').split('\n')[0]);
} else {
  console.log('ripgrep: not found on PATH (optional; lexical search still works)');
}

console.log('RAG engine: js-local');
console.log('Repo root:', repoRoot);
console.log('Cache dir:', ragDir);
console.log('');
console.log('Next:');
console.log('  npm run rag:status');
console.log('  npm run rag:index          # optional, speeds MCP startup');
console.log('  npm run rag:query -- "How does staff admin login work?"');
