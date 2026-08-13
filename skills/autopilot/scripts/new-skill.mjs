#!/usr/bin/env node
/**
 * Write a skill from a win, and make it usable in THIS session.
 *
 * The loop distils: when a pattern in wins.md reaches three, it becomes a skill.
 * That is worth nothing if the skill lands somewhere nothing loads — the most
 * common way a rule gets written and then never followed. So this script writes
 * it into the shared skills home AND links it into every agent directory the
 * project has, the same layout `npx skills add` produces.
 *
 *   node new-skill.mjs <name> -d "<description, with the words that trigger it>"
 *   node new-skill.mjs <name> -d "..." < body.md      # body from stdin
 *
 * Never overwrites. Refuses a name that already exists anywhere it looks.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const argv = process.argv.slice(2);
const VALUE_FLAGS = ['-d', '--description'];
const flag = (...names) => {
  const i = argv.findIndex((a) => names.includes(a));
  return i === -1 ? null : argv[i + 1] ?? null;
};
/** The name is the first bare word that is not a FLAG'S VALUE — `-d "…" name`
 *  otherwise takes the description itself as the skill name. */
const name = argv.find((a, i) => !a.startsWith('-') && !VALUE_FLAGS.includes(argv[i - 1]));
const description = flag(...VALUE_FLAGS);

const die = (msg) => { console.error(msg); process.exit(2); };

if (!name || !description) {
  die('usage: new-skill.mjs <name> -d "<description naming its trigger words>" [< body.md]');
}
// A skill is addressed by its directory name; anything else breaks the loader.
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) die(`bad skill name «${name}» — lower-case kebab-case only`);
// The description IS the trigger. One that says what the skill is «about»
// instead of when to use it never fires, and an unfired skill is just a file.
if (description.length < 40) die('description too short — name the situations and the words that should summon it');

/** Where skills live here. `.agents/skills` is the shared home the installer
 *  uses; a project that only has `.claude/skills` keeps using that. */
const AGENT_DIRS = ['.claude/skills', '.codex/skills', '.gemini/skills', '.cursor/skills', '.opencode/skills'];
/** lstat, not existsSync: a DANGLING symlink «does not exist» to existsSync,
 *  passed the conflict check, and then made the symlink step throw EEXIST after
 *  the file had already been written — a half-created skill, exit 1. */
const exists = (p) => { try { fs.lstatSync(path.join(root, p)); return true; } catch { return false; } };
const home = exists('.agents/skills') ? '.agents/skills'
  : AGENT_DIRS.find(exists) ?? '.agents/skills';

const conflicts = ['.agents/skills', ...AGENT_DIRS].filter((d) => exists(path.join(d, name)));
if (conflicts.length) {
  die(`«${name}» already exists in ${conflicts.join(', ')} — extend it, or pick a different name.\n` +
    'A second skill for one job is the same defect as a second changelog.');
}

/**
 * A body only if one was actually piped in.
 *
 * `!isTTY` was not that question: a harness hands a subprocess an OPEN pipe
 * with nothing in it, and the read then throws EAGAIN and kills the run — the
 * documented invocation, dead inside any agent harness. Read defensively and
 * treat «nothing readable» as «no body».
 */
let body = '';
if (!process.stdin.isTTY) {
  try {
    body = fs.readFileSync(0, 'utf8').trim();
  } catch {
    body = '';
  }
}
// A harvested body often carries its own frontmatter; two blocks in one file
// makes the loader read the SECOND name and the skill answers to nothing.
body = body.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();

const TEMPLATE = `# ${name}

<!-- Written from a pattern that worked three times. Keep all three sections:
     an incident, not a principle; what it does NOT cover; how to check it. -->

## The incident

What went wrong, concretely, with the number or the output that made it real.
«Never trust a piped check» is forgettable — «\`… | tail\` reports tail's status,
and six deploys shipped red while every local run read as green» is not.

## What to do

The steps, in order. Commands where there are commands.

## What this does NOT cover

Every guard has an edge it cannot see. Writing it down is the difference between
a limitation and a lie.

## How to know it worked

The check that fails if the rule is broken.
`;

const dirHome = path.join(root, home);
const dir = path.join(root, home, name);
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'SKILL.md');
const front = `---\nname: ${name}\ndescription: >-\n  ${description.replace(/\s+/g, ' ').trim()}\n---\n\n`;

try {
  fs.writeFileSync(file, front + (body || TEMPLATE) + '\n', { flag: 'wx' });
} catch (err) {
  if ((err && err.code) === 'EEXIST') die(`${path.relative(root, file)} already exists — not overwriting.`);
  throw err;
}

/**
 * Link it where each agent actually loads from, so it is live now and not after
 *  someone remembers to copy it.
 *
 * This used to run only when the home was `.agents/skills`, so a project with
 * `.claude/skills` AND `.codex/skills` got the skill in one harness and silence
 * in the other — while three docs claimed «every agent directory».
 */
const linked = [];
for (const d of AGENT_DIRS) {
  if (path.join(root, d) === dirHome) continue; // it already lives there
  const parent = path.join(root, d);
  // Only into agent directories this project already uses, plus Claude Code's,
  // which is created if its `.claude` root is there.
  if (!exists(d) && !(d === '.claude/skills' && exists('.claude'))) continue;
  fs.mkdirSync(parent, { recursive: true });
  const link = path.join(parent, name);
  if (exists(path.join(d, name))) continue;
  try {
    fs.symlinkSync(path.relative(parent, dir), link);
    linked.push(path.join(d, name));
  } catch (err) {
    console.error(`could not link into ${d}: ${err.code ?? err.message} — copy it by hand.`);
  }
}

console.log(`created : ${path.relative(root, file)}`);
if (linked.length) console.log(`linked  : ${linked.join(', ')}`);
else console.log('linked  : nothing — this project has no other agent directory');
if (!body) console.log('body    : template — fill the four sections, they are the ones that make it fire');
console.log(`use now : read ${path.relative(root, file)} and follow it in this session.`);
console.log('          A harness that indexes skills at startup lists it after a restart; reading the');
console.log('          file works immediately, and that is the difference between written and used.');
console.log(`record  : add a line to wins.md — the pattern is now a skill, count it as distilled.`);
