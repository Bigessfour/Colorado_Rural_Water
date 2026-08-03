#!/usr/bin/env node
/**
 * Minimal stdio MCP server for crwa-rag (no external MCP SDK required).
 * Tools: search_codebase, rag_status
 */
import { createInterface } from 'node:readline';
import { findRepoRoot } from './config.mjs';
import { buildIndex, buildIndexIncremental, statusReport } from './index-store.mjs';
import { formatHitsMarkdown, searchCodebase } from './search.mjs';

const SERVER_NAME = 'crwa-rag';
const SERVER_VERSION = '1.0.0';
const PROTOCOL_VERSION = '2024-11-05';

/** @type {import('node:readline').Interface | null} */
let rl = null;

/**
 * @param {unknown} message
 */
function send(message) {
  const body = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`);
}

/**
 * Also support newline-delimited JSON (some clients).
 * @param {unknown} message
 */
function sendFlexible(message) {
  // Prefer Content-Length framing (MCP standard); also works if client uses NDJSON readers.
  send(message);
}

/**
 * @param {string} id
 * @param {unknown} result
 */
function respond(id, result) {
  sendFlexible({ jsonrpc: '2.0', id, result });
}

/**
 * @param {string | number | null} id
 * @param {number} code
 * @param {string} message
 */
function respondError(id, code, message) {
  sendFlexible({
    jsonrpc: '2.0',
    id,
    error: { code, message },
  });
}

const TOOLS = [
  {
    name: 'search_codebase',
    description:
      'Semantic/lexical search over the Colorado Rural Water (Water Saver) codebase (src, docs, CI, scripts, infrastructure). Use before broad grep. Returns ranked snippets with path:line ranges.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language or keyword query' },
        limit: { type: 'number', description: 'Max hits (default 8)', default: 8 },
        path_prefix: {
          type: 'string',
          description: 'Optional repo-relative path filter (e.g. src/app/auth/)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'rag_status',
    description: 'Report RAG index age, file/chunk counts, engine, and stale hint.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'refresh_index',
    description:
      'Reindex the Water Saver codebase RAG. Default incremental. Set full=true for a complete rebuild. Call at end of every agent turn after code/docs changes.',
    inputSchema: {
      type: 'object',
      properties: {
        full: {
          type: 'boolean',
          description: 'If true, full rebuild. Default false (incremental).',
          default: false,
        },
      },
    },
  },
];

/**
 * @param {string} name
 * @param {Record<string, unknown>} args
 */
function callTool(name, args) {
  findRepoRoot();
  if (name === 'search_codebase') {
    const query = String(args.query || '').trim();
    if (!query) {
      return 'query is required';
    }
    const limit = Number(args.limit ?? 8) || 8;
    const pathPrefix = args.path_prefix ? String(args.path_prefix) : '';
    const hits = searchCodebase(query, { limit, pathPrefix });
    return formatHitsMarkdown(hits, query);
  }
  if (name === 'rag_status') {
    return statusReport();
  }
  if (name === 'refresh_index') {
    const full = Boolean(args.full);
    const manifest = full ? buildIndex() : buildIndexIncremental();
    return [
      full ? 'Full rebuild complete.' : 'Incremental refresh complete.',
      `files=${manifest.file_count}`,
      `chunks=${manifest.chunk_count}`,
      `updated_at=${manifest.updated_at || manifest.built_at || 'unknown'}`,
    ].join(' ');
  }
  throw new Error(`Unknown tool: ${name}`);
}

/**
 * @param {Record<string, unknown>} msg
 */
function handleMessage(msg) {
  const method = msg.method;
  const id = msg.id ?? null;
  const params = /** @type {Record<string, unknown>} */ (msg.params || {});

  if (method === 'initialize') {
    respond(/** @type {string} */ (id), {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    });
    return;
  }

  if (method === 'notifications/initialized' || method === 'initialized') {
    return;
  }

  if (method === 'tools/list') {
    respond(/** @type {string} */ (id), { tools: TOOLS });
    return;
  }

  if (method === 'tools/call') {
    try {
      const name = String(params.name || '');
      const args = /** @type {Record<string, unknown>} */ (params.arguments || {});
      const text = callTool(name, args);
      respond(/** @type {string} */ (id), {
        content: [{ type: 'text', text }],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      respond(/** @type {string} */ (id), {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      });
    }
    return;
  }

  if (method === 'ping') {
    respond(/** @type {string} */ (id), {});
    return;
  }

  // Ignore unknown notifications (no id)
  if (id === null || id === undefined) {
    return;
  }

  respondError(/** @type {string} */ (id), -32601, `Method not found: ${method}`);
}

/**
 * Parse either Content-Length framed or NDJSON messages from stdin.
 */
function main() {
  // Warm repo root resolution early so first tool call is fast
  try {
    findRepoRoot();
  } catch (error) {
    console.error('[crwa-rag]', error instanceof Error ? error.message : error);
  }

  let buffer = Buffer.alloc(0);
  let mode = /** @type {'unknown' | 'framed' | 'ndjson'} */ ('unknown');

  process.stdin.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    // Detect framing
    if (mode === 'unknown') {
      const head = buffer.subarray(0, Math.min(buffer.length, 64)).toString('utf8');
      if (/^Content-Length:/i.test(head) || head.includes('\r\n')) {
        mode = 'framed';
      } else if (head.trimStart().startsWith('{')) {
        mode = 'ndjson';
      }
    }

    if (mode === 'framed' || (mode === 'unknown' && buffer.includes(Buffer.from('\r\n\r\n')))) {
      mode = 'framed';
      while (true) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) break;
        const header = buffer.subarray(0, headerEnd).toString('utf8');
        const match = /Content-Length:\s*(\d+)/i.exec(header);
        if (!match) {
          buffer = buffer.subarray(headerEnd + 4);
          continue;
        }
        const len = Number(match[1]);
        const bodyStart = headerEnd + 4;
        if (buffer.length < bodyStart + len) break;
        const body = buffer.subarray(bodyStart, bodyStart + len).toString('utf8');
        buffer = buffer.subarray(bodyStart + len);
        try {
          handleMessage(JSON.parse(body));
        } catch (error) {
          console.error('[crwa-rag] parse error', error);
        }
      }
      return;
    }

    // NDJSON: process complete lines
    mode = 'ndjson';
    const text = buffer.toString('utf8');
    const lines = text.split('\n');
    buffer = Buffer.from(lines.pop() || '', 'utf8');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        handleMessage(JSON.parse(trimmed));
      } catch (error) {
        console.error('[crwa-rag] ndjson parse error', error);
      }
    }
  });

  process.stdin.on('end', () => process.exit(0));
}

main();
