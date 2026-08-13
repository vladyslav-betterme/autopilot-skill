/**
 * The questions more than one script asks — asked in ONE place.
 *
 * Written after a review council found the shape this skill warns about most:
 * `discover.mjs` listed `notes/` as a memory home while `bootstrap.mjs` had its
 * own shorter list, so a project keeping its knowledge in `notes/` was told
 * «memoryHomes: [notes]» and then handed a second ledger at the root. Two
 * answers to one question, in the tool that teaches against it.
 */
import fs from 'node:fs';
import path from 'node:path';

/** 'file' | 'dir' | null, RESOLVING symlinks — the one question, asked one way.
 *  A dirent's isFile()/isDirectory() do not follow links and statSync does;
 *  mixing the two is how a symlinked home got its real files overwritten. */
export function statKind(abs) {
  try {
    const st = fs.statSync(abs);
    return st.isFile() ? 'file' : st.isDirectory() ? 'dir' : null;
  } catch {
    return null;
  }
}

/** Where durable knowledge lives in the wild. Order matters: most specific first. */
export const MEMORY_HOMES = [
  'CLAUDE.md', 'AGENTS.md', 'CONTRIBUTING.md',
  'docs/learnings', 'docs/decisions', 'docs/adr', 'docs/architecture', 'docs/notes', 'notes',
  'GOAL.md', 'TODO.md', 'ROADMAP.md',
  'CHANGELOG.md', 'docs/CHANGELOG.md',
];

/** Directories a ledger file could already be sitting in. Same list for the
 *  home election and for the «does this already exist» scan — if they differ,
 *  the script elects one place and checks another. */
export const LEDGER_ROOTS = ['.', 'docs', 'notes', '.github'];

/**
 * Every file under the ledger roots (and one level below them) whose NAME MEANS
 * one of `stems` — synonyms included, because the name is not the knowledge: a
 * project keeping `defect-patterns.md` already has a failures ledger.
 *
 * Case-insensitive on purpose: macOS filesystems are, so `changelog.md` and
 * `CHANGELOG.md` are the same file and a case-sensitive check invents a
 * conflict the OS then silently resolves.
 */
export function findExisting(root, ...stems) {
  const re = new RegExp(`^(${stems.join('|')})(s)?\\.md$`, 'i');
  const out = [];
  const scan = (rel, depth) => {
    const dir = path.join(root, rel);
    if (statKind(dir) !== 'dir') return; // a `docs` that is a FILE used to throw ENOTDIR
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // unreadable is not «absent», but it is also not a crash
    }
    for (const e of entries) {
      const kind = statKind(path.join(dir, e.name));
      if (kind === 'file' && re.test(e.name)) out.push(path.join(rel, e.name));
      else if (kind === 'dir' && depth > 0 && !e.name.startsWith('.') && e.name !== 'node_modules') {
        scan(path.join(rel, e.name), depth - 1);
      }
    }
  };
  for (const r of LEDGER_ROOTS) scan(r, 1);
  return out;
}
