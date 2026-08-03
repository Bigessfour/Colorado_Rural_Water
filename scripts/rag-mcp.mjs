#!/usr/bin/env node
/**
 * stdio MCP server launcher for crwa-rag (JS local implementation).
 * Loads the server in-process (no child spawn) so Cursor MCP stdio handshake works.
 * Set CRWA_RAG_ROOT to point at this monorepo when launched from another cwd.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.CRWA_RAG_ROOT = process.env.CRWA_RAG_ROOT || repoRoot;

const entry = path.join(repoRoot, 'rag', 'js', 'mcp-server.mjs');
await import(pathToFileURL(entry).href);
