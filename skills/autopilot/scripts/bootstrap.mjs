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
const HOME_CANDIDATES = ['docs/learnings', 'docs/decisions', 'docs/notes', 'docs', '.'];
const home = HOME_CANDIDATES.find(has) ?? 'docs';

/**
 * Does a file whose name MEANS this already exist anywhere in the docs tree?
 *
 * Takes every synonym, because the name is not the knowledge: a project that
 * keeps `defect-patterns.md` already has a failures ledger, and creating
 * `failures.md` beside it is exactly the second home this script exists to
 * prevent. The first version checked three hardcoded paths and made
 * `decisions.md` next to an existing `docs/agent/DECISIONS.md` — it failed its
 * own purpose on the first run.
 *
 * Case-insensitive on purpose: macOS filesystems are, so `changelog.md` and
 * `CHANGELOG.md` are the same file and a case-sensitive check invents a
 * conflict that the OS then silently resolves.
 */
function findExisting(...stems) {
  const re = new RegExp(`^(${stems.join('|')})(s)?\\.md$`, 'i');
  const roots = ['.', 'docs'];
  const out = [];
  for (const r of roots) {
    const dir = path.join(root, r);
    if (!fs.existsSync(dir)) continue;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      // statSync FOLLOWS a symlink; a dirent's isFile()/isDirectory() do NOT.
      // That disagreement was a data-loss bug: `has()` (existsSync, follows)
      // elected `docs/learnings -> ../vault` as the home, while this scan
      // (dirent, does not follow) never looked inside it — so a real
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
const EXISTING_BACKLOG = findExisting('todo', 'roadmap', 'backlog')[0];

const FILES = [
  {
    name: 'goal.md',
    skipIf: () => findExisting('goal', 'objective').length > 0,
    body: `# Goal

The loop runs until every criterion below is met AND verified by someone who did
not do the work. This file is the loop's state: a fresh session resumes from
here without re-deriving the plan.

## The goal, in one falsifiable sentence

<!-- «Make X better» cannot be falsified. «No path spends money without an
     explicit tap, and each guarantee is held by a type or a failing test» can. -->

## Done-criteria

Each one must be checkable by someone who is not the author.

| # | criterion | how it is checked | met? | evidence |
|---|---|---|---|---|
| 1 |  |  | no |  |

## Iteration log

One line per landed iteration: which criterion moved, and what proves it. Two in
a row with nothing moved is thrash — stop and report what is blocking.
`,
  },
  {
    name: 'wins.md',
    skipIf: () => findExisting('win', 'playbook').length > 0,
    body: `# Wins

What worked, and **how many times**. Not a diary: an entry earns its place when
it is a pattern you would repeat on a different task.

**At three, it graduates into a skill of its own** — write it with
\`scripts/new-skill.mjs\` and use it immediately. The count is the mechanism.

| pattern | times | last seen | evidence it worked |
|---|---:|---|---|
`,
  },
  {
    name: 'failures.md',
    skipIf: () => findExisting('failure', 'defect-pattern', 'postmortem').length > 0,
    body: `# Failures

Classified by **CAUSE, not by file or task** — the task changes, the cause
repeats. Each entry: the shape, one reproduction, and the tell that you are
about to do it again.

Count **per area**. A falling total hides one area getting worse.

## The distribution

| Cause | Count | Trend |
|---|---:|---|

## Patterns
`,
  },
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
if (EXISTING_BACKLOG) console.log(`backlog    : this project already tracks work in ${EXISTING_BACKLOG} — pick from it`);
if (!wrote.length) console.log('nothing to do — the ledger already exists.');
console.log('next       : node <skill>/scripts/skills.mjs   — the skill library, then pick what this project needs');
