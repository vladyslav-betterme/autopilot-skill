import fs from 'node:fs';
import path from 'node:path';
import { LEDGER_HOMES, statKind, findExisting as scanFor } from './lib.mjs';

const root = process.cwd();
const has = (p) => fs.existsSync(path.join(root, p));

/**
 * Where this project already keeps prose. Taken from the SAME list discovery
 * prints as `memoryHomes`, directories only — a council found the two lists had
 * drifted, so a project keeping everything in `notes/` was told «memoryHomes:
 * [notes]» and then handed a second ledger at the repo root.
 */
// The election reads the SAME list the runner searches (`LEDGER_HOMES`). It
// used to have its own, so a repo with `docs/learnings/` was told its ledger
// lived there while `prove.mjs` looked in four other places and found nothing —
// a STOP file written exactly where this script said to write it, ignored.
const home = LEDGER_HOMES.find((p) => statKind(path.join(root, p)) === 'dir') ?? 'docs';

/** Does a file whose name MEANS this already exist? Synonyms included, because
 *  the name is not the knowledge. One scanner, shared with discovery. */
const findExisting = (...stems) => scanFor(root, ...stems);

/** The loop's STATE file has one name. `findExisting` matches synonyms and
 *  case-insensitively — right for «do not plant a second changelog», wrong as a
 *  silent skip here, because the runner needs the exact name `goal.md`. A
 *  project with its own `GOAL.md` used to get «left alone» and then an endless
 *  «no goal.md — run bootstrap.mjs first» from every check. */
const EXISTING_GOALISH = findExisting('goal', 'objective')[0];
const EXISTING_CHANGELOG = findExisting('changelog')[0];

/** Other `goal.md` files further down — a monorepo already carrying one per
 *  package got a third at the root, silently, from the script whose stated one
 *  job is not creating a second home for knowledge that already has one. */
function deepGoals(rel = '.', depth = 3) {
  const out = [];
  if (depth < 0) return out;
  let entries = [];
  try { entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const child = path.join(rel, e.name);
    if (e.isDirectory()) out.push(...deepGoals(child, depth - 1));
    else if (e.name === 'goal.md') out.push(child);
  }
  return out;
}
const OTHER_GOALS = deepGoals().filter((p) => path.dirname(p) !== home && path.dirname(p) !== '.');
const EXISTING_BACKLOG = findExisting('todo', 'roadmap', 'backlog')[0];

const FILES = [
  {
    name: 'goal.md',
    skipIf: () => findExisting('goal', 'objective').length > 0,
    body: `# Goal

The loop runs until every criterion below is met AND verified by someone who did
not do the work. This file is the loop's state: a fresh session resumes from
here without re-deriving the plan.

## Fixed state — written once, at bootstrap

A resume that has to re-derive these has not resumed. Fill them before
iteration one.

| | |
|---|---|
| check command | <!-- the exact command, or the agreed acceptance check --> |
| baseline | <!-- its output BEFORE the first iteration: a failure that predates you is not yours --> |
| points at production? | <!-- asked and answered, not assumed --> |
| version control | <!-- git branch, or «none» — and where the copy of the inputs lives --> |
| skills installed | <!-- what was added for this project, and why --> |
| tools reachable | <!-- the MCP servers / plugins / CLIs this loop CALLED ONCE and saw work, what it had to build, and what is parked on a human login --> |

## The goal, in one falsifiable sentence

<!-- «Make X better» cannot be falsified. «No path spends money without an
     explicit tap, and each guarantee is held by a type or a failing test» can.
     If the goal was not given, the first iteration's ONLY output is a proposed
     goal and the question for the human — never a criterion you wrote and then
     satisfied yourself. -->

## Done-criteria

Each one must be checkable by someone who is not the author.

| # | criterion | how it is checked | met? | evidence |
|---|---|---|---|---|
| 1 |  |  | no |  |

## Parked

A criterion blocked on a decision only the human can make: both options, both
costs, and what the loop did instead. The loop stops when every REMAINING
criterion is parked — not at the first block.

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
try {
  fs.mkdirSync(path.join(root, home), { recursive: true });
} catch (err) {
  console.error(`cannot use «${home}» as the ledger home: ${err.code ?? err.message}.\n` +
    'Point the loop at a writable directory, or fix that path — nothing was written.');
  process.exit(1);
}

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
    if ((err && err.code) === 'EEXIST') { skipped.push(`${f.name} (already there)`); continue; }
    console.error(`cannot write ${path.join(home, f.name)}: ${err.code ?? err.message}`);
    process.exit(1);
  }
}

console.log(`ledger home: ${home}`);
if (EXISTING_GOALISH && path.basename(EXISTING_GOALISH) !== 'goal.md') {
  console.log(`ATTENTION : this project already has ${EXISTING_GOALISH}, so no goal.md was created —`);
  console.log(`            but the loop's state file must be named exactly «goal.md». Until one exists,`);
  console.log(`            every check will refuse with «no goal.md». Rename it, or add a goal.md beside it.`);
}
if (OTHER_GOALS.length) {
  console.log(`ATTENTION : goal.md already exists deeper in this tree: ${OTHER_GOALS.join(', ')}`);
  console.log(`            If those are the real ledgers, run the loop from there instead of here.`);
}
if (wrote.length) console.log(`created    : ${wrote.join(', ')}`);
if (skipped.length) console.log(`left alone : ${skipped.join(', ')} — this project already has one`);
if (EXISTING_CHANGELOG) console.log(`changelog  : append to the existing ${EXISTING_CHANGELOG}`);
if (EXISTING_BACKLOG) console.log(`backlog    : this project already tracks work in ${EXISTING_BACKLOG} — pick from it`);
if (!wrote.length) console.log('nothing to do — the ledger already exists.');
console.log('next       : node <skill>/scripts/skills.mjs   — the skill library, then pick what this project needs');
