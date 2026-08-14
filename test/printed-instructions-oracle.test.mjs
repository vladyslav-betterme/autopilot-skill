import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * An ORACLE over the one surface every script shares: **what it prints.**
 *
 * Three of this campaign's fatals were found by running a printed line
 * verbatim, and a reviewer following the documents as a stranger found seven
 * more of the same shape in one pass:
 *
 *   `usage: carrier.mjs … [--kind launchd|cron|github]`  — cron was deleted
 *   `next : node <skill>/scripts/skills.mjs`             — a placeholder
 *   `install: node skills.mjs --install any --dry-run`   — fails from the
 *                                                          directory the skill
 *                                                          tells you to run in
 *   `read /goal.md and say where it stands`              — no such file
 *
 * None is a bug in what the tool DOES. Every one is a bug in what it TELLS you
 * to do next, which for an unattended loop is the same thing: the next actor is
 * a model reading that line.
 *
 * So the property, over every script, in a project where each one succeeds:
 *
 *   no printed line contains an unsubstituted `<placeholder>`;
 *   every flag a `usage:` line offers is accepted by that script's own parser;
 *   every path a printed `node …` command names exists;
 *   every relative path a line names exists relative to the project.
 *
 * A new script is a new row. A new printed instruction is covered for free.
 */

const SCRIPTS = path.resolve(import.meta.dirname, '..', 'skills', 'autopilot', 'scripts');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'printed-'));

/** A project where every script has something real to say. */
function fixture() {
  const d = tmp();
  spawnSync('git', ['init', '-q', '.'], { cwd: d });
  fs.mkdirSync(path.join(d, 'docs'));
  fs.writeFileSync(path.join(d, 'package.json'), '{"name":"p","scripts":{"verify":"true"}}');
  spawnSync('node', [path.join(SCRIPTS, 'bootstrap.mjs')], { cwd: d, stdio: 'ignore' });
  return d;
}

const RUNS = [
  { script: 'discover.mjs', args: [] },
  { script: 'bootstrap.mjs', args: [] },
  { script: 'skills.mjs', args: [] },
  { script: 'skills.mjs', args: ['--install', 'any', '--dry-run'] },
  { script: 'tools.mjs', args: [] },
  { script: 'prove.mjs', args: ['--', 'true'] },
  { script: 'prove.mjs', args: [] },                       // the usage line
  { script: 'loop.mjs', args: [] },                        // the usage line
  { script: 'loop.mjs', args: ['--agent', 'true', '--sleep', '0', '--max', '1'] },
  { script: 'loop.mjs', args: ['--status'] },
  { script: 'carrier.mjs', args: [] },                     // the usage line
  { script: 'carrier.mjs', args: ['--agent', 'echo hi'] },
  { script: 'new-mcp.mjs', args: [] },                     // the usage line
  { script: 'new-mcp.mjs', args: ['probe', '-d', 'drives a probe through its own cli, long enough to pass'] },
  { script: 'new-skill.mjs', args: [] },                   // the usage line
  { script: 'new-skill.mjs', args: ['probe-skill', '-d', 'a description long enough to name the trigger words that summon it'] },
];

test('nothing any script prints is a placeholder, a dead path, or a flag it refuses', () => {
  const broken = [];
  for (const { script, args } of RUNS) {
    const d = fixture();
    const res = spawnSync('node', [path.join(SCRIPTS, script), ...args],
      { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const printed = `${res.stdout ?? ''}\n${res.stderr ?? ''}`;
    const where = `${script} ${args.join(' ')}`.trim();

    // 1. An unsubstituted placeholder OUTSIDE a usage line. In `usage: … <name>`
    //    it means «put a name here» and is correct; in «next: run this» it is a
    //    command nobody can run.
    for (const line of printed.split('\n')) {
      if (/^\s*usage:/.test(line) || /^\s*(e\.g\.|or)\b/.test(line)) continue;
      for (const m of line.matchAll(/<(skill|skills-root|path|your[^>]*)>/g)) {
        broken.push(`${where}: printed the placeholder «${m[0]}» — a terminal cannot expand it: ${line.trim()}`);
      }
    }

    // 2. Every flag a usage line offers must be one the parser accepts.
    for (const line of printed.split('\n').filter((l) => /^usage:/.test(l.trim()))) {
      for (const flag of line.match(/--[a-z][a-z-]*/g) ?? []) {
        // The flag ALONE. Passing it a value invents a second argument the
        // parser may reject for its own reasons — which is what this probe
        // reported the first time it ran, about two flags that are fine.
        const probe = spawnSync('node', [path.join(SCRIPTS, script), flag],
          { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        if (new RegExp(`unknown flag «${flag}»`).test(probe.stderr ?? '')) {
          broken.push(`${where}: usage offers ${flag}, and the parser answers «unknown flag»`);
        }
      }
      // …and every VALUE a usage line enumerates, for a flag that takes one.
      for (const alt of line.match(/--kind ([a-z|]+)/)?.[1]?.split('|') ?? []) {
        const probe = spawnSync('node', [path.join(SCRIPTS, script), '--agent', 'echo x', '--kind', alt],
          { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        if (/unknown --kind/.test(probe.stderr ?? '')) {
          broken.push(`${where}: usage offers --kind ${alt}, and the tool refuses it`);
        }
      }
    }

    // 3. Every path a printed `node …` command names must exist.
    for (const m of printed.matchAll(/node\s+(\S+\.mjs)/g)) {
      const target = path.resolve(d, m[1]);
      if (!fs.existsSync(target)) broken.push(`${where}: printed «node ${m[1]}», which does not exist from the project root`);
    }

    // 4. A bare «read <path>» must name something that is there.
    for (const m of printed.matchAll(/read ([\w./-]+\.md)\b/g)) {
      if (!fs.existsSync(path.resolve(d, m[1]))) broken.push(`${where}: printed «read ${m[1]}», which does not exist`);
    }
  }
  assert.deepEqual(broken, [], `a script printed an instruction that does not work:\n  ${broken.join('\n  ')}`);
});
