#!/usr/bin/env node
/**
 * CLI: node rag/js/cli.mjs <index|index-incremental|query|status>
 */
import { buildIndex, buildIndexIncremental, statusReport } from './index-store.mjs';
import { formatHitsMarkdown, searchCodebase } from './search.mjs';
import { findRepoRoot } from './config.mjs';

function usage() {
  console.error(
    'Usage: node rag/js/cli.mjs <index|index-incremental|query|status> [query words...] [--limit N] [--path-prefix P]',
  );
  process.exit(1);
}

function main(argv) {
  const args = argv.slice(2);
  if (args.length === 0) {
    usage();
  }
  const command = args[0];
  findRepoRoot();

  if (command === 'index') {
    const manifest = buildIndex();
    console.error(
      `Done: ${manifest.file_count} files, ${manifest.chunk_count} chunks (js-local).`,
    );
    return 0;
  }

  if (command === 'index-incremental') {
    const manifest = buildIndexIncremental();
    console.error(
      `Done: ${manifest.file_count} files, ${manifest.chunk_count} chunks (js-local incremental).`,
    );
    return 0;
  }

  if (command === 'status') {
    console.log(statusReport());
    return 0;
  }

  if (command === 'query') {
    let limit = 8;
    let pathPrefix = '';
    /** @type {string[]} */
    const words = [];
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--limit' && args[i + 1]) {
        limit = Number(args[++i]) || 8;
        continue;
      }
      if (args[i] === '--path-prefix' && args[i + 1]) {
        pathPrefix = args[++i];
        continue;
      }
      words.push(args[i]);
    }
    const query = words.join(' ').trim();
    if (!query) {
      console.error('query text required');
      return 1;
    }
    const hits = searchCodebase(query, { limit, pathPrefix });
    process.stdout.write(formatHitsMarkdown(hits, query));
    return 0;
  }

  console.error(`Unknown command: ${command}`);
  usage();
  return 1;
}

process.exit(main(process.argv) ?? 0);
