#!/usr/bin/env node
/**
 * Run JS codebase RAG CLI (npm run rag:index, rag:query, etc.).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(repoRoot, 'rag', 'js', 'cli.mjs');
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/rag-run.mjs <index|index-incremental|query|status> …');
  process.exit(1);
}

const result = spawnSync(process.execPath, [cli, ...args], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    CRWA_RAG_ROOT: process.env.CRWA_RAG_ROOT || repoRoot,
  },
});

process.exit(result.status ?? 1);
