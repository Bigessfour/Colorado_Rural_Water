/**
 * Walk the repo and collect indexable files.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { EXCLUDE_DIR_NAMES, shouldIndexFile, toRelPosix } from './config.mjs';

const ALLOWED_DOT_DIRS = new Set(['.github', '.cursor']);

/**
 * @param {string} repoRoot
 * @returns {string[]} absolute paths, sorted
 */
export function discoverIndexFiles(repoRoot) {
  /** @type {string[]} */
  const found = [];

  /**
   * @param {string} dir
   * @param {boolean} allowDotEntries — true only for repo root (to enter .github / .cursor)
   */
  function walk(dir, allowDotEntries = false) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const name = ent.name;

      if (EXCLUDE_DIR_NAMES.has(name)) {
        continue;
      }

      // Skip iCloud conflict copies
      if (/\s[23]\./.test(name) || name.endsWith(' 2') || name.endsWith(' 3')) {
        continue;
      }

      if (name.startsWith('.')) {
        if (name === '.instructions.md' && ent.isFile()) {
          // allow
        } else if (allowDotEntries && ALLOWED_DOT_DIRS.has(name) && ent.isDirectory()) {
          // allow enter
        } else {
          continue;
        }
      }

      const abs = join(dir, name);
      if (ent.isDirectory()) {
        walk(abs, false);
      } else if (ent.isFile() || ent.isSymbolicLink?.()) {
        try {
          if (statSync(abs).isFile() && shouldIndexFile(repoRoot, abs)) {
            found.push(abs);
          }
        } catch {
          /* ignore */
        }
      }
    }
  }

  walk(repoRoot, true);

  const uniq = [...new Set(found)];
  uniq.sort((a, b) => toRelPosix(repoRoot, a).localeCompare(toRelPosix(repoRoot, b)));
  return uniq;
}
