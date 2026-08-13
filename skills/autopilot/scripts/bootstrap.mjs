#!/usr/bin/env node
/**
 * Create the ledger — once, in the project's OWN memory home.
 *
 * The rule this script exists to obey: never create a second home for a kind of
 * knowledge that already has one. A second CHANGELOG.md beside an existing one
 * is worse than no changelog, because now neither is authoritative. So it
 * DISCOVERS first, writes only what is missing, and never overwrites.
 *
 * Idempotent. Prints what it did and what it deliberately left alone.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const has = (p) => fs.existsSync(path.join(root, p));

/** 'file' | 'dir' | null, resolving symlinks — the one question, asked one way. */
function statKind(abs) {
  try {
    const st = fs.statSync(abs);
    return st.isFile() ? 'file' : st.isDirectory() ? 'dir' : null;
  } catch {
    return null;
  }
}

/** Where this project already keeps prose. First hit wins — do not spread. */
const HOME_CANDIDATES = ['docs/learnings', 'docs/decisions', 'docs', '.'];
const home = HOME_CANDIDATES.find(has) ?? 'docs';

/**
 * Does a file whose name means THIS already exist anywhere in the docs tree?
 *
 * The first version checked three hardcoded paths and, on the very repo it was
 * written in, created `decisions.md` next to an existing `docs/agent/DECISIONS.md`
 * — a second home for one kind of knowledge, which is the single thing this
 * script exists to prevent. It failed its own purpose on the first run.
 *
 * Case-insensitive on purpose: macOS filesystems are, so `changelog.md` and
 * `CHANGELOG.md` are the same file and a case-sensitive check invents a
 * conflict that the OS then silently resolves.
 */
function findExisting(stem) {
  const re = new RegExp(`^${stem}(s)?\\.md$`, 'i');
  const roots = ['.', 'docs'];
  const out = [];
  for (const r of roots) {
    const dir = path.join(root, r);
    if (!fs.existsSync(dir)) continue;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      // statSync FOLLOWS a symlink; a dirent's isFile()/isDirectory() do NOT.
      // That disagreement was a data-loss bug: `has()` (existsSync, follows)
      // elected `docs/learnings -> ../vault` as the home, while this scan
      // (dirent, does not follow) never looked inside it — so the user's real
      // decisions.md was overwritten with an empty template, exit 0, output
      // saying «created». Ask the filesystem the same question in both places.
      const kind = statKind(path.join(dir, e.name));
      if (kind === 'file' && re.test(e.name)) out.push(path.join(r, e.name));
      if (kind === 'dir' && r === 'docs') {
        const sub = path.join(dir, e.name);
        for (const f of fs.readdirSync(sub, { withFileTypes: true })) {
          if (statKind(path.join(sub, f.name)) === 'file' && re.test(f.name)) {
            out.push(path.join(r, e.name, f.name));
          }
        }
      }
    }
  }
  return out;
}

const EXISTING_CHANGELOG = findExisting('changelog')[0];

const FILES = [
  {
    name: 'decisions.md',
    skipIf: () => findExisting('decision').length > 0 || has('docs/adr'),
    body: `# Decisions

A choice and its cost. **Including the choice to do nothing** — «not changed,
accepted risk, because the cure costs more than the disease» is a decision, and
recording it stops the next session re-opening it as an unfinished chore.

Admission bar: someone could reasonably have decided the other way.

| date | decision | cost accepted | why not the alternative |
|---|---|---|---|
`,
  },
  {
    name: 'defect-patterns.md',
    skipIf: () => findExisting('defect-pattern').length > 0,
    body: `# Defect patterns

Failures classified by **CAUSE, not by file** — the file changes, the cause
repeats. Each entry: the shape, one reproduction, and the tell that you are
about to do it again.

Count **per subsystem**. A falling total hides a diverging file.

## The distribution

| Cause | Count | Trend |
|---|---:|---|

## Patterns
`,
  },
  {
    name: 'changelog.md',
    skipIf: () => Boolean(EXISTING_CHANGELOG),
    body: `# Changelog

What shipped, newest first. One line per landed change: what it does, and what
was wrong before.
`,
  },
];

const wrote = [];
const skipped = [];
fs.mkdirSync(path.join(root, home), { recursive: true });

for (const f of FILES) {
  if (f.skipIf()) {
    skipped.push(f.name);
    continue;
  }
  const target = path.join(root, home, f.name);
  // LAST LINE OF DEFENCE, and the one that would have prevented the data loss
  // on its own. Detection can be wrong — it was — but «create only what is
  // missing» is checkable at the moment of writing, where being wrong is
  // unrecoverable. `wx` fails if the path exists, through a symlink too.
  try {
    fs.writeFileSync(target, f.body, { flag: 'wx' });
    wrote.push(path.join(home, f.name));
  } catch (err) {
    if ((err && err.code) !== 'EEXIST') throw err;
    skipped.push(`${f.name} (already there)`);
  }
}

console.log(`ledger home: ${home}`);
if (wrote.length) console.log(`created    : ${wrote.join(', ')}`);
if (skipped.length) console.log(`left alone : ${skipped.join(', ')} — this project already has one`);
if (EXISTING_CHANGELOG) console.log(`changelog  : append to the existing ${EXISTING_CHANGELOG}`);
if (!wrote.length) console.log('nothing to do — the ledger already exists.');
