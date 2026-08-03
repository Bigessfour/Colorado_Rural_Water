#!/usr/bin/env node
/**
 * Water Saver codebase RAG MCP — official @modelcontextprotocol/sdk stdio transport.
 * Cursor loads this reliably; the previous hand-rolled Content-Length server stayed "loading".
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const repoRoot = process.env.CRWA_RAG_ROOT
  ? path.resolve(process.env.CRWA_RAG_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

process.env.CRWA_RAG_ROOT = repoRoot;

const ragJs = path.join(repoRoot, 'rag', 'js');
const { searchCodebase, formatHitsMarkdown } = await import(
  pathToFileURL(path.join(ragJs, 'search.mjs')).href
);
const { buildIndex, buildIndexIncremental, statusReport } = await import(
  pathToFileURL(path.join(ragJs, 'index-store.mjs')).href
);

const server = new McpServer({
  name: 'crwa-rag',
  version: '2.0.0',
});

server.registerTool(
  'search_codebase',
  {
    description:
      'Semantic/lexical search over the Water Saver codebase (frontend, backend, infra, docs). Use at the start of every agent turn.',
    inputSchema: {
      query: z.string().describe('Natural language or keyword query'),
      limit: z.number().optional().describe('Max hits (default 8)'),
      path_prefix: z.string().optional().describe('Optional repo-relative path filter'),
    },
  },
  async ({ query, limit, path_prefix }) => {
    const q = String(query || '').trim();
    if (!q) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    const hits = searchCodebase(q, {
      limit: Number(limit ?? 8) || 8,
      pathPrefix: path_prefix ? String(path_prefix) : '',
    });
    return { content: [{ type: 'text', text: formatHitsMarkdown(hits, q) }] };
  },
);

server.registerTool(
  'rag_status',
  {
    description: 'Report RAG index age, file/chunk counts, and stale hint.',
    inputSchema: {},
  },
  async () => ({ content: [{ type: 'text', text: statusReport() }] }),
);

server.registerTool(
  'refresh_index',
  {
    description:
      'Reindex the Water Saver codebase RAG. Default incremental. Call at end of every agent turn after code/docs changes.',
    inputSchema: {
      full: z.boolean().optional().describe('If true, force full rebuild'),
    },
  },
  async ({ full }) => {
    const manifest = full ? buildIndex() : buildIndexIncremental();
    const text = [
      full ? 'Full rebuild complete.' : 'Incremental refresh complete.',
      `files=${manifest.file_count}`,
      `chunks=${manifest.chunk_count}`,
      `indexed_at=${manifest.indexed_at}`,
      `added=${manifest.files_added ?? 'n/a'}`,
      `changed=${manifest.files_changed ?? 'n/a'}`,
      `removed=${manifest.files_removed ?? 'n/a'}`,
      `noop=${manifest.noop === true}`,
      '',
      statusReport(),
    ].join('\n');
    return { content: [{ type: 'text', text }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
