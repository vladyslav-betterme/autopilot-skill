import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * A DIFFERENTIAL ORACLE for the campaign's most expensive cause: **one question
 * answered by two implementations that diverge.**
 *
 * Five of twenty fatals were this shape, and four of them were the same
 * question — «where does this loop's state live?»:
 *
 *   R1  bootstrap elected a home from one list while the runner searched
 *       another, so a repo with `docs/learnings/` was told its ledger lived
 *       there and the runner never looked
 *   R2  the carrier baked one STOP path while the loop honoured nine
 *   R3  the carrier's paths were relative to cwd while `prove` walks up
 *   R4  the GitHub emitter ignored the shared set entirely
 *
 * Every one was «correct» in isolation. The property that catches all four is
 * not about any single script:
 *
 *   For every project layout: the home `bootstrap` ANNOUNCES is the home the
 *   runner FINDS, and a STOP written there halts the check AND the emitted
 *   carrier — from the project root and from a subdirectory alike.
 *
 * A new layout is a new row. A new consumer of the ledger is a new column.
 */

const SCRIPTS = path.resolve(import.meta.dirname, '..', 'skills', 'autopilot', 'scripts');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-oracle-'));
const run = (script, cwd, args = []) =>
  spawnSync('node', [path.join(SCRIPTS, script), ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** Layouts the wild actually produces. Each one only says how the project looks. */
const LAYOUTS = [
  { name: 'bare, no git', setup: () => {} },
  { name: 'a git repo', setup: (d) => fs.mkdirSync(path.join(d, '.git')) },
  { name: 'docs/ present', setup: (d) => fs.mkdirSync(path.join(d, 'docs')) },
  { name: 'notes/ present', setup: (d) => fs.mkdirSync(path.join(d, 'notes')) },
  { name: 'docs/learnings/ present', setup: (d) => fs.mkdirSync(path.join(d, 'docs', 'learnings'), { recursive: true }) },
  { name: 'docs/adr/ present', setup: (d) => fs.mkdirSync(path.join(d, 'docs', 'adr'), { recursive: true }) },
  { name: '.github/ present', setup: (d) => fs.mkdirSync(path.join(d, '.github')) },
  { name: 'git repo with docs/', setup: (d) => { fs.mkdirSync(path.join(d, '.git')); fs.mkdirSync(path.join(d, 'docs')); } },
  { name: 'a monorepo with packages', setup: (d) => { fs.mkdirSync(path.join(d, '.git')); fs.mkdirSync(path.join(d, 'docs')); fs.mkdirSync(path.join(d, 'packages', 'api'), { recursive: true }); } },
  { name: 'docs/ and notes/ both', setup: (d) => { fs.mkdirSync(path.join(d, 'docs')); fs.mkdirSync(path.join(d, 'notes')); } },
];

/** Does `prove.mjs` halt, run from `cwd`? 250 is «stopped, check not run». */
const halts = (cwd) => run('prove.mjs', cwd, ['--', 'true']).status === 250;

/** Does the carrier's emitted unit halt, run from `cwd`? */
function carrierHalts(cwd, projectRoot) {
  const plist = run('carrier.mjs', cwd, ['--agent', `echo RAN >> ${JSON.stringify(path.join(projectRoot, 'carrier-ran.txt'))}`, '--kind', 'launchd']);
  if (plist.status !== 0) return { ok: false, why: `carrier refused: ${plist.stderr.split('\n')[0]}` };
  const wrapper = plist.stdout.match(/<string>(cd [\s\S]*?)<\/string>/)?.[1]
    ?.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
  if (!wrapper) return { ok: false, why: 'no wrapper in the emitted plist' };
  fs.rmSync(path.join(projectRoot, 'carrier-ran.txt'), { force: true });
  spawnSync('/bin/sh', ['-c', wrapper], { cwd, encoding: 'utf8' });
  return { ok: !fs.existsSync(path.join(projectRoot, 'carrier-ran.txt')) };
}

test('the home bootstrap announces is the home every consumer uses', () => {
  const broken = [];
  for (const layout of LAYOUTS) {
    const d = tmp();
    layout.setup(d);
    const boot = run('bootstrap.mjs', d);
    if (boot.status !== 0) { broken.push(`${layout.name}: bootstrap exited ${boot.status}`); continue; }
    const announced = boot.stdout.match(/ledger home: (.+)/)?.[1]?.trim();
    if (!announced) { broken.push(`${layout.name}: bootstrap announced no home`); continue; }

    // 1. The announced home really holds the state file.
    if (!fs.existsSync(path.join(d, announced, 'goal.md'))) {
      broken.push(`${layout.name}: announced «${announced}» and there is no goal.md in it`);
      continue;
    }

    // 2. The runner refuses to record when it cannot see that home. `--record`
    //    resolves the ledger the way every consumer does, so this is the
    //    equivalence, asked through the tool rather than by reimplementing it.
    const rec = run('prove.mjs', d, ['--record', '--', 'true']);
    if (rec.status !== 0) broken.push(`${layout.name}: bootstrap said «${announced}», the runner said: ${rec.stderr.split('\n')[0]}`);
    else if (!fs.readFileSync(path.join(d, announced, 'goal.md'), 'utf8').includes('**prove**')) {
      broken.push(`${layout.name}: the runner recorded somewhere other than «${announced}»`);
    }

    // 3. A STOP in the announced home halts the check — from the root AND from
    //    a subdirectory, which is the normal shape in a monorepo.
    const sub = path.join(d, 'packages', 'api');
    fs.mkdirSync(sub, { recursive: true });
    fs.writeFileSync(path.join(d, announced, 'STOP'), 'halt\n');
    if (!halts(d)) broken.push(`${layout.name}: STOP in «${announced}» did not halt the check`);
    if (!halts(sub)) broken.push(`${layout.name}: STOP in «${announced}» did not halt the check from a subdirectory`);

    // 4. …and it halts the emitted carrier too, emitted from either place.
    for (const [where, from] of [['the root', d], ['a subdirectory', sub]]) {
      const r = carrierHalts(from, d);
      if (!r.ok) broken.push(`${layout.name}: the carrier emitted from ${where} ${r.why ?? 'ran the agent with STOP present'}`);
    }
    fs.rmSync(path.join(d, announced, 'STOP'));

    // 5. A STOP at the PROJECT ROOT halts too — SKILL.md says it may go there.
    fs.writeFileSync(path.join(d, 'STOP'), 'halt\n');
    if (!halts(d)) broken.push(`${layout.name}: STOP at the project root did not halt the check`);
    const r = carrierHalts(d, d);
    if (!r.ok) broken.push(`${layout.name}: STOP at the project root did not halt the carrier`);
  }
  assert.deepEqual(broken, [], `bootstrap and the runner disagree:\n  ${broken.join('\n  ')}`);
});

test('a project that owns a goal file is told, rather than quietly deadlocked', () => {
  // The runner needs the exact name `goal.md`; `findExisting` matches synonyms
  // and case-insensitively. A project with its own GOAL.md got «left alone» and
  // then an endless «no goal.md — run bootstrap.mjs first» from every check.
  const d = tmp();
  fs.writeFileSync(path.join(d, 'GOAL.md'), '# the project\'s own\n');
  const boot = run('bootstrap.mjs', d);
  assert.match(boot.stdout, /must be named exactly/, 'bootstrap did not say the state file is missing');
  const rec = run('prove.mjs', d, ['--record', '--', 'true']);
  assert.notEqual(rec.status, 0, 'the runner claimed to record into a ledger that has no goal.md');
});
