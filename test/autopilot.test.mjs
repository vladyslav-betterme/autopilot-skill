import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SCRIPTS = path.resolve(import.meta.dirname, '..', 'skills', 'autopilot', 'scripts');
const run = (script, cwd) =>
  execFileSync('node', [path.join(SCRIPTS, script)], { cwd, encoding: 'utf8' });

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'autopilot-'));

/**
 * The bootstrap's ONE job is not creating files — it is not creating a SECOND
 * home for knowledge that already has one. The first version failed exactly
 * that on the repo it was written in: it made `decisions.md` beside an existing
 * `docs/agent/DECISIONS.md`, because it checked three hardcoded paths.
 */

test('an existing decisions file ANYWHERE in docs/ stops a second one', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, 'docs', 'agent'), { recursive: true });
  // Upper-case, pluralised, one level down — all three are how the miss happened.
  fs.writeFileSync(path.join(d, 'docs', 'agent', 'DECISIONS.md'), '# theirs\n');
  const out = run('bootstrap.mjs', d);
  assert.match(out, /left alone.*decisions\.md/);
  assert.equal(fs.existsSync(path.join(d, 'docs', 'decisions.md')), false, 'created a second decisions home');
});

test('an existing CHANGELOG is appended to, not duplicated', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'CHANGELOG.md'), '# theirs\n');
  const out = run('bootstrap.mjs', d);
  assert.match(out, /append to the existing/);
});

test('a bare project gets the full ledger', () => {
  const d = tmp();
  const out = run('bootstrap.mjs', d);
  for (const f of ['decisions.md', 'defect-patterns.md', 'changelog.md']) {
    assert.match(out, new RegExp(f.replace('.', '\\.')), `${f} was not created`);
  }
});

test('running twice creates nothing the second time', () => {
  const d = tmp();
  run('bootstrap.mjs', d);
  assert.match(run('bootstrap.mjs', d), /nothing to do/);
});

/**
 * Discovery decides what «done» means. A project with no gate must SAY so —
 * silently reporting none is how a loop ends up stopping at the model's
 * satisfaction.
 */
test('discover finds the aggregate gate and prefers it over the parts', () => {
  const d = tmp();
  fs.writeFileSync(
    path.join(d, 'package.json'),
    JSON.stringify({ scripts: { lint: 'x', test: 'y', build: 'z', verify: 'all' } }),
  );
  const out = JSON.parse(run('discover.mjs', d));
  assert.deepEqual(out.project.gates, ['npm run verify'], 'an all-in-one gate beats a list that can drift');
});

test('discover reports NO gate rather than inventing one', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ scripts: { dev: 'x' } }));
  const out = JSON.parse(run('discover.mjs', d));
  assert.deepEqual(out.project.gates, [], 'a made-up gate is worse than an honest none');
});

test('discover names the env files that might point at production', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'package.json'), '{}');
  fs.writeFileSync(path.join(d, '.env.local'), 'X=1\n');
  const out = JSON.parse(run('discover.mjs', d));
  assert.deepEqual(out.signals.envFilesPresent, ['.env.local']);
});

// ── the two findings a council reproduced, 2026-08-13 ────────────────────────

test('FATAL WAS: a SYMLINKED memory home had its real files overwritten', () => {
  // `has()` uses existsSync, which FOLLOWS a symlink, so docs/learnings -> vault
  // was elected as the home. The scan used a dirent's isDirectory(), which does
  // NOT follow, so it never looked inside — and the user's real decisions.md was
  // replaced by an empty template. Exit 0, output saying «created».
  // Worse: references/distillation.md RECOMMENDS this exact layout.
  const d = tmp();
  fs.mkdirSync(path.join(d, 'vault'));
  fs.mkdirSync(path.join(d, 'docs'));
  const real = '# MY REAL DECISIONS — DO NOT LOSE\n';
  fs.writeFileSync(path.join(d, 'vault', 'decisions.md'), real);
  fs.symlinkSync(path.join(d, 'vault'), path.join(d, 'docs', 'learnings'));

  run('bootstrap.mjs', d);
  assert.equal(fs.readFileSync(path.join(d, 'vault', 'decisions.md'), 'utf8'), real,
    'the real ledger was destroyed through the symlink');
});

test('FATAL WAS: a symlinked FILE too — a dirent is not a file either', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, 'vault')); fs.mkdirSync(path.join(d, 'docs'));
  const real = '# REAL\n';
  fs.writeFileSync(path.join(d, 'vault', 'decisions.md'), real);
  fs.symlinkSync(path.join(d, 'vault', 'decisions.md'), path.join(d, 'docs', 'decisions.md'));
  run('bootstrap.mjs', d);
  assert.equal(fs.readFileSync(path.join(d, 'vault', 'decisions.md'), 'utf8'), real);
});

test('the last line of defence holds even when detection is wrong', () => {
  // Detection WAS wrong, and being wrong there is unrecoverable. `wx` makes
  // «create only what is missing» true at the moment of writing, which is the
  // only place it can be checked cheaply. Simulated by pre-placing a file the
  // detector is blind to (an odd name it does not search for is not possible —
  // so use the real one and assert it is never rewritten).
  const d = tmp();
  fs.writeFileSync(path.join(d, 'changelog.md'), 'MINE\n');
  run('bootstrap.mjs', d);
  assert.equal(fs.readFileSync(path.join(d, 'changelog.md'), 'utf8'), 'MINE\n');
});

test('MAJOR WAS: a Python project got «make check» for a Makefile without one', () => {
  // The regex tested (check|lint|test); the pushed string was hardcoded. A
  // Makefile with only `test:` produced a gate that exits 2 — the skill's own
  // test says «a made-up gate is worse than an honest none».
  const d = tmp();
  fs.writeFileSync(path.join(d, 'pyproject.toml'), '[tool.ruff]\n');
  fs.writeFileSync(path.join(d, 'Makefile'), 'test:\n\techo t\nfmt:\n\techo f\n');
  const out = JSON.parse(run('discover.mjs', d));
  assert.ok(out.project.gates.includes('make test'), `got ${JSON.stringify(out.project.gates)}`);
  assert.ok(!out.project.gates.includes('make check'), 'a target that does not exist is not a gate');
});

test('one makeTarget for both branches — the same Makefile gives the same answer', () => {
  // The python and generic branches disagreed about the same file. Two
  // predicates for one question, in a skill whose top reference warns about it.
  const mk = 'test:\n\techo t\n';
  const py = tmp(); fs.writeFileSync(path.join(py, 'pyproject.toml'), ''); fs.writeFileSync(path.join(py, 'Makefile'), mk);
  const go = tmp(); fs.writeFileSync(path.join(go, 'go.mod'), 'module x\n'); fs.writeFileSync(path.join(go, 'Makefile'), mk);
  const gate = (d) => JSON.parse(run('discover.mjs', d)).project.gates.find((g) => g.startsWith('make '));
  assert.equal(gate(py), gate(go), 'the same Makefile must yield the same make gate in either branch');
});
