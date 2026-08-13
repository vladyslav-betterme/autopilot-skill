import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SCRIPTS = path.resolve(import.meta.dirname, '..', 'skills', 'autopilot', 'scripts');
const run = (script, cwd, args = [], input = '') =>
  execFileSync('node', [path.join(SCRIPTS, script), ...args], { cwd, encoding: 'utf8', input });

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

test('a bare project gets the whole ledger — goal, wins, failures, decisions, changelog', () => {
  const d = tmp();
  const out = run('bootstrap.mjs', d);
  // goal.md is what makes the loop resumable and wins.md is what makes a skill
  // get written; a ledger missing either is a loop that cannot finish or learn.
  // Asserted on DISK, at the home it printed — a script believed on its own
  // output is the exact failure this ledger exists to stop.
  const home = out.match(/ledger home: (.+)/)?.[1];
  assert.ok(home, out);
  for (const f of ['goal.md', 'wins.md', 'failures.md', 'decisions.md', 'changelog.md']) {
    assert.match(out, new RegExp(f.replace('.', '\\.')), `${f} was not created`);
    assert.ok(fs.existsSync(path.join(d, home, f)), `${f} is not on disk in ${home}`);
  }
});

test('an existing defect-patterns.md means NO second failures.md', () => {
  // Same knowledge, different word. The rename from defect-patterns to failures
  // would otherwise plant a second failures ledger in every repo that already
  // kept one — the exact defect this script exists to prevent, reintroduced by
  // a vocabulary change rather than by a path list.
  const d = tmp();
  fs.mkdirSync(path.join(d, 'docs'));
  fs.writeFileSync(path.join(d, 'docs', 'defect-patterns.md'), '# theirs\n');
  const out = run('bootstrap.mjs', d);
  assert.match(out, /left alone.*failures\.md/);
  assert.equal(fs.existsSync(path.join(d, 'docs', 'failures.md')), false, 'created a second failures home');
});

test('an existing goal file is left alone, and an existing backlog is pointed at', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'GOAL.md'), '# mine\n');
  fs.writeFileSync(path.join(d, 'TODO.md'), '- a thing\n');
  const out = run('bootstrap.mjs', d);
  assert.match(out, /left alone.*goal\.md/);
  assert.match(out, /backlog.*TODO\.md/i, 'a project with a backlog must be told to pick from it');
});

test('running twice creates nothing the second time', () => {
  const d = tmp();
  run('bootstrap.mjs', d);
  assert.match(run('bootstrap.mjs', d), /nothing to do/);
});

/**
 * Discovery decides what «done» means. A project with no check must SAY so —
 * silently reporting none is how a loop ends up stopping at the model's
 * satisfaction.
 */
test('discover finds the aggregate check and prefers it over the parts', () => {
  const d = tmp();
  fs.writeFileSync(
    path.join(d, 'package.json'),
    JSON.stringify({ scripts: { lint: 'x', test: 'y', build: 'z', verify: 'all' } }),
  );
  const out = JSON.parse(run('discover.mjs', d));
  assert.deepEqual(out.project.checks, ['npm run verify'], 'an all-in-one check beats a list that can drift');
});

test('discover reports NO check rather than inventing one', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ scripts: { dev: 'x' } }));
  const out = JSON.parse(run('discover.mjs', d));
  assert.deepEqual(out.project.checks, [], 'a made-up check is worse than an honest none');
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
  // Makefile with only `test:` produced a check that exits 2 — the skill's own
  // test says «a made-up check is worse than an honest none».
  const d = tmp();
  fs.writeFileSync(path.join(d, 'pyproject.toml'), '[tool.ruff]\n');
  fs.writeFileSync(path.join(d, 'Makefile'), 'test:\n\techo t\nfmt:\n\techo f\n');
  const out = JSON.parse(run('discover.mjs', d));
  assert.ok(out.project.checks.includes('make test'), `got ${JSON.stringify(out.project.checks)}`);
  assert.ok(!out.project.checks.includes('make check'), 'a target that does not exist is not a check');
});

test('one makeTarget for both branches — the same Makefile gives the same answer', () => {
  // The python and generic branches disagreed about the same file. Two
  // predicates for one question, in a skill whose top reference warns about it.
  const mk = 'test:\n\techo t\n';
  const py = tmp(); fs.writeFileSync(path.join(py, 'pyproject.toml'), ''); fs.writeFileSync(path.join(py, 'Makefile'), mk);
  const go = tmp(); fs.writeFileSync(path.join(go, 'go.mod'), 'module x\n'); fs.writeFileSync(path.join(go, 'Makefile'), mk);
  const check = (d) => JSON.parse(run('discover.mjs', d)).project.checks.find((g) => g.startsWith('make '));
  assert.equal(check(py), check(go), 'the same Makefile must yield the same make check in either branch');
});

// ── the loop has to work outside node and python ─────────────────────────────

test('each ecosystem states its own check, and none is invented', () => {
  // «Universal» is not a claim you make in a description; it is one project per
  // ecosystem, actually asked.
  const cases = [
    [{ 'build.gradle': '' }, 'gradle check'],
    [{ 'build.gradle.kts': '', gradlew: '' }, './gradlew check'],
    [{ 'pom.xml': '<project/>' }, 'mvn -q verify'],
    [{ 'App.csproj': '<Project/>' }, 'dotnet test'],
    [{ Gemfile: 'source "x"', 'Rakefile': 'task :default' }, 'bundle exec rake'],
    [{ 'mix.exs': 'defmodule X' }, 'mix test'],
    [{ 'deno.json': JSON.stringify({ tasks: { check: 'deno lint' } }) }, 'deno task check'],
  ];
  for (const [files, expected] of cases) {
    const d = tmp();
    for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(d, name), body);
    const out = JSON.parse(run('discover.mjs', d));
    assert.ok(out.project.checks.includes(expected),
      `${Object.keys(files).join('+')} → ${JSON.stringify(out.project.checks)}, wanted ${expected}`);
  }
});

test('a justfile is read with the same predicate as a Makefile', () => {
  // The second recipe format is where «two answers to one question» comes back:
  // one target-detecting function, or two that disagree about the same file.
  const d = tmp();
  fs.writeFileSync(path.join(d, 'justfile'), 'fmt:\n  echo f\nci:\n  echo c\n');
  const out = JSON.parse(run('discover.mjs', d));
  assert.ok(out.project.checks.includes('just ci'), JSON.stringify(out.project.checks));
  assert.ok(!out.project.checks.some((c) => c.startsWith('just check')), 'invented a target it does not have');
});

test('no project at all reports no check — it does not guess', () => {
  const out = JSON.parse(run('discover.mjs', tmp()));
  assert.equal(out.project.kind, 'unknown');
  assert.deepEqual(out.project.checks, []);
});

// ── writing a skill from a win, and being able to use it in the same session ──

const newSkill = (d, args, input) => run('new-skill.mjs', d, args, input);
const DESC = 'Use when the deploy check reads green locally and red in CI — piped exit codes, tail, background wrappers.';

test('a written skill lands where the harness loads from, not just on disk', () => {
  // A skill nothing loads is the same failure as a guard that cannot fire, and
  // it is invisible: the file exists, so the work looks done.
  const d = tmp();
  fs.mkdirSync(path.join(d, '.claude'));
  const out = newSkill(d, ['piped-check', '-d', DESC]);
  const file = path.join(d, '.agents', 'skills', 'piped-check', 'SKILL.md');
  assert.ok(fs.existsSync(file), out);
  const body = fs.readFileSync(file, 'utf8');
  assert.match(body, /^---\nname: piped-check\ndescription:/, 'frontmatter is what makes it fire');
  assert.match(body, /piped exit codes/);
  const link = path.join(d, '.claude', 'skills', 'piped-check');
  assert.ok(fs.lstatSync(link).isSymbolicLink(), 'not linked into the agent directory');
  assert.equal(fs.realpathSync(link), fs.realpathSync(path.dirname(file)));
});

test('the body can come from the loop itself, over stdin', () => {
  const d = tmp();
  newSkill(d, ['from-stdin', '-d', DESC], '# from-stdin\n\nThe incident: it happened three times.\n');
  const body = fs.readFileSync(path.join(d, '.agents', 'skills', 'from-stdin', 'SKILL.md'), 'utf8');
  assert.match(body, /it happened three times/);
  assert.ok(!body.includes('What this does NOT cover'), 'the template overwrote the written body');
});

test('a name that already exists is refused, not merged into', () => {
  const d = tmp();
  newSkill(d, ['dup', '-d', DESC]);
  assert.throws(() => newSkill(d, ['dup', '-d', DESC]), /already exists/);
});

test('a description too short to trigger on is refused', () => {
  // The description IS the trigger. «Fixes things» installs a file nobody opens.
  assert.throws(() => newSkill(tmp(), ['weak', '-d', 'fixes things']), /description too short/);
  assert.throws(() => newSkill(tmp(), ['Bad Name', '-d', DESC]), /kebab-case/);
});

// ── the skill library ────────────────────────────────────────────────────────

test('the library refuses to install everything', () => {
  // Every installed skill costs context on every turn. «Install all» is how an
  // agent ends up with a hundred descriptions and a smaller window.
  assert.throws(() => run('skills.mjs', tmp(), ['--install']), /refusing to install everything/);
});

test('every catalogued skill is tagged, and no name is claimed twice', () => {
  const catalog = JSON.parse(run('skills.mjs', tmp(), ['--json']));
  const seen = new Map();
  for (const src of catalog) {
    assert.match(src.repo, /^[\w.-]+\/[\w.-]+$/, `${src.repo} is not an installable source`);
    for (const [name, tags, what] of src.skills) {
      assert.ok(tags.trim().length, `${name} has no tags — nothing can select it`);
      assert.ok(what.trim().length, `${name} has no description of what it is for`);
      assert.ok(!seen.has(name), `${name} is catalogued twice (${seen.get(name)} and ${src.repo})`);
      seen.set(name, src.repo);
    }
  }
  const anyTagged = catalog.flatMap((s) => s.skills).filter(([, t]) => t.split(' ').includes('any'));
  assert.ok(anyTagged.length >= 5, 'the always-useful set is what a bare project starts from');
});
