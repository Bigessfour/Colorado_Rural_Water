#!/usr/bin/env node
/** PrimeNG MCP launcher — ensures local @primeng/mcp install, then starts stdio server. */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(repoRoot, 'mcp/primeng/node_modules/@primeng/mcp/dist/index.js');

function ensureInstalled() {
  if (fs.existsSync(entry)) {
    return;
  }
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const mcpDir = path.join(repoRoot, 'mcp/primeng');
  fs.mkdirSync(mcpDir, { recursive: true });
  if (!fs.existsSync(path.join(mcpDir, 'package.json'))) {
    spawnSync(npm, ['init', '-y'], { cwd: mcpDir, stdio: 'inherit' });
  }
  const result = spawnSync(npm, ['install', '@primeng/mcp@22'], {
    cwd: mcpDir,
    stdio: 'inherit',
  });
  if (result.status !== 0 || !fs.existsSync(entry)) {
    console.error('PrimeNG MCP install failed. Run: npm run mcp:primeng:install');
    process.exit(1);
  }
}

ensureInstalled();

const child = spawn(process.execPath, [entry], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 1));
