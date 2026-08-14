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

test('the last line of defence FIRES when detection is wrong', () => {
  // The previous version of this test pre-placed `changelog.md`, which the
  // detector DOES see — so `skipIf` fired and the write was never reached. The
  // whole suite stayed green with `flag: 'wx'` deleted: a guard with no failing
  // demonstration, in the repo that forbids exactly that.
  //
  // This layout is one the detector genuinely misses: the target NAME exists as
  // a symlink to a DIRECTORY, so the scan (which matches files) does not see a
  // `goal.md`, and only the `wx` flag stops the write. Remove `wx` and this
  // goes red with EISDIR, exit 1, taking the other four files with it.
  const d = tmp();
  fs.mkdirSync(path.join(d, 'docs'));
  fs.mkdirSync(path.join(d, 'vault'));
  fs.writeFileSync(path.join(d, 'vault', 'real.md'), '# real\n');
  fs.symlinkSync('../vault', path.join(d, 'docs', 'goal.md'));

  const out = run('bootstrap.mjs', d);
  assert.match(out, /left alone.*goal\.md \(already there\)/);
  assert.match(out, /created.*docs\/wins\.md/, 'the rest of the ledger must still be written');
  assert.equal(fs.readFileSync(path.join(d, 'vault', 'real.md'), 'utf8'), '# real\n');
});

test('the ledger goes where the project already keeps knowledge, not beside it', () => {
  // discover.mjs listed `notes` as a memory home while bootstrap had its own
  // shorter list, so a project keeping everything in notes/ was told
  // «memoryHomes: [notes]» and then handed a SECOND ledger at the repo root.
  // One list now, in lib.mjs — this test is what holds the two together.
  const d = tmp();
  fs.mkdirSync(path.join(d, 'notes'));
  fs.writeFileSync(path.join(d, 'notes', 'decisions.md'), '# real\n');
  const homes = JSON.parse(run('discover.mjs', d)).memoryHomes;
  const out = run('bootstrap.mjs', d);
  assert.ok(homes.includes('notes'), `discover said ${JSON.stringify(homes)}`);
  assert.match(out, /ledger home: notes/, out);
  assert.match(out, /left alone.*decisions\.md/);
  assert.equal(fs.existsSync(path.join(d, 'decisions.md')), false, 'second decisions home at the root');
  assert.equal(fs.readFileSync(path.join(d, 'notes', 'decisions.md'), 'utf8'), '# real\n');
});

test('a `docs` that is a FILE is not a crash', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'docs'), '# not a directory\n');
  const out = run('bootstrap.mjs', d);
  assert.match(out, /ledger home: \./);
  assert.ok(fs.existsSync(path.join(d, 'goal.md')));
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

// ── what a council reproduced, 2026-08-13 ────────────────────────────────────

test('FATAL WAS: `--install` built one comma-joined -s and installed NOTHING', () => {
  // The CLI parses -s as space-separated variadic and matches names by exact
  // equality, so `add repo -s a,b -y` matched zero skills and exited 1 — the
  // arming step of the loop, silently doing nothing. Verified against the real
  // installer both ways; asserted here on the argv, which needs no network.
  const out = run('skills.mjs', tmp(), ['--install', 'any', '--dry-run']);
  const lines = out.split('\n').filter((l) => l.startsWith('$ npx'));
  assert.ok(lines.length >= 2, out);
  for (const line of lines) {
    assert.ok(!/-s\s+\S*,/.test(line), `comma-joined -s installs nothing: ${line}`);
    const names = [...line.matchAll(/-s (\S+)/g)].map((m) => m[1]);
    assert.ok(names.length >= 1 && names.every((n) => !n.includes(',')), line);
  }
  assert.match(out, /nothing was installed/);
});

test('a flag is never taken as a tag, and an unknown tag is refused loudly', () => {
  // `--install --global any` used to read «--global» as the tag list: nothing
  // matched, nothing installed, exit 0 with a satisfied-looking epilogue.
  assert.throws(() => run('skills.mjs', tmp(), ['--install', '--global', 'any']), /refusing to install/);
  assert.throws(() => run('skills.mjs', tmp(), ['--install', 'nosuchtag']), /no skill carries/);
  assert.throws(() => run('skills.mjs', tmp(), ['--install', 'any', '--tags', 'react']), /pass the tags to --install/);
});

test('a package.json does not silence the check the project actually has', () => {
  // `nodeProject() ?? …` returned an object even with no check-shaped script,
  // so a repo with package.json + a real `check:` target reported checks: []
  // and the loop went to ask a human for a command it already had.
  const d = tmp();
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ dependencies: { a: '1' } }));
  fs.writeFileSync(path.join(d, 'Makefile'), 'check:\n\techo c\n');
  const out = JSON.parse(run('discover.mjs', d));
  assert.ok(out.project.checks.includes('make check'), JSON.stringify(out.project.checks));
});

test('a make VARIABLE is not a target — the check it prints must run', () => {
  // `check:=1` matched `^check:` and produced `make check`, which exits 2.
  const d = tmp();
  fs.writeFileSync(path.join(d, 'Makefile'), 'check:=1\nbuild:\n\techo hi\n');
  fs.writeFileSync(path.join(d, 'pyproject.toml'), '[tool.ruff]\n');
  const out = JSON.parse(run('discover.mjs', d));
  assert.ok(!out.project.checks.includes('make check'), JSON.stringify(out.project.checks));
});

test('deno without a lockfile still has a check', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'deno.json'), JSON.stringify({ tasks: { start: 'deno run main.ts' } }));
  assert.deepEqual(JSON.parse(run('discover.mjs', d)).project.checks, ['deno test -A']);
});

test('«no version control» never reads as «clean working tree»', () => {
  // Both used to print dirty:false, and the second one means no undo exists.
  const d = tmp();
  assert.equal(JSON.parse(run('discover.mjs', d)).signals.vcs, 'none');
  execFileSync('git', ['init', '-q'], { cwd: d });
  assert.equal(JSON.parse(run('discover.mjs', d)).signals.vcs, 'git');
});

test('a written skill reaches EVERY agent directory, not just the first', () => {
  // The link step ran only when the home was `.agents/skills`, so a project
  // with .claude + .codex got the skill in one harness and silence in the
  // other, while three docs claimed «every agent directory».
  const d = tmp();
  fs.mkdirSync(path.join(d, '.claude', 'skills'), { recursive: true });
  fs.mkdirSync(path.join(d, '.codex', 'skills'), { recursive: true });
  const out = newSkill(d, ['multi-home', '-d', DESC]);
  const written = ['.claude', '.codex'].map((a) => path.join(d, a, 'skills', 'multi-home', 'SKILL.md'));
  for (const f of written) assert.ok(fs.existsSync(f), `${f} missing\n${out}`);
});

test('a DANGLING symlink is a conflict, not an invitation', () => {
  // existsSync follows links, so a dangling one «did not exist», passed the
  // conflict check, and then made the symlink step throw EEXIST — after the
  // file had already been written. Half a skill, exit 1.
  const d = tmp();
  fs.mkdirSync(path.join(d, '.agents', 'skills'), { recursive: true });
  fs.mkdirSync(path.join(d, '.claude', 'skills'), { recursive: true });
  fs.symlinkSync('/nonexistent-target', path.join(d, '.claude', 'skills', 'ghost'));
  assert.throws(() => newSkill(d, ['ghost', '-d', DESC]), /already exists/);
  assert.equal(fs.existsSync(path.join(d, '.agents', 'skills', 'ghost')), false, 'a half-created skill');
});

test('an open but empty stdin is not a body — it is how a harness runs you', () => {
  // `!isTTY` meant «a body was piped»; a harness hands an open pipe with
  // nothing in it, the read threw EAGAIN, and the documented invocation died.
  const d = tmp();
  execFileSync('bash', ['-c',
    `node ${JSON.stringify(path.join(SCRIPTS, 'new-skill.mjs'))} pipe-harness -d ${JSON.stringify(DESC)} 0< <(sleep 1)`],
    { cwd: d, encoding: 'utf8' });
  assert.ok(fs.existsSync(path.join(d, '.agents', 'skills', 'pipe-harness', 'SKILL.md')));
});

test('a harvested body does not bring a second frontmatter block', () => {
  const d = tmp();
  newSkill(d, ['harvested', '-d', DESC], '---\nname: something-else\ndescription: theirs\n---\n\n# real body\n');
  const body = fs.readFileSync(path.join(d, '.agents', 'skills', 'harvested', 'SKILL.md'), 'utf8');
  assert.equal(body.match(/^---$/gm).length, 2, `two frontmatter blocks:\n${body}`);
  assert.match(body, /name: harvested/);
  assert.match(body, /# real body/);
});

test('the skill name is not the description that preceded it', () => {
  const d = tmp();
  newSkill(d, ['-d', DESC, 'after-the-flag']);
  assert.ok(fs.existsSync(path.join(d, '.agents', 'skills', 'after-the-flag', 'SKILL.md')));
});

/**
 * Prove — the one step of the loop a model could NARRATE.
 *
 * Everything else in an iteration leaves an artifact. «The check passed» was
 * output pasted by the same context that wanted it to have passed, and all
 * three lying forms survive being described honestly, because the description
 * is the trusted part. These pin the runner that reports instead.
 */
const prove = (cwd, args) => execFileSync('node', [path.join(SCRIPTS, 'prove.mjs'), ...args], { cwd, encoding: 'utf8' });
const proveStatus = (cwd, args) => {
  try { prove(cwd, args); return 0; } catch (err) { return err.status; }
};

test('the piped form reports 0 for a failing check; the runner reports the truth', () => {
  const d = tmp();
  // The incident itself, executed: six red deploys read as green locally.
  assert.equal(execFileSync('bash', ['-c', 'false | tail; echo $?'], { cwd: d, encoding: 'utf8' }).trim(), '0');
  assert.equal(proveStatus(d, ['--', 'false']), 1, 'the runner adopted the pipe\'s answer');
});

test('a check that disagrees with itself is flaky, and cannot mark a criterion met', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'flip.sh'), '#!/bin/bash\nn=$(cat n 2>/dev/null || echo 0)\necho $((n+1)) > n\nexit $((n % 2))\n', { mode: 0o755 });
  assert.equal(proveStatus(d, ['--times', '3', '--', './flip.sh']), 251);
});

test('STOP halts the loop BEFORE the check runs — not after', () => {
  // A stop the agent has to remember to honour is discipline wearing the
  // costume of a mechanism. Every iteration's Prove step passes through here.
  const d = tmp();
  // The home is ELECTED, never assumed — a bare directory has no docs/, so the
  // ledger lands at the root. Reading it back is the same discipline the runner
  // itself uses; hardcoding «docs» is how the first version of this test failed.
  const home = run('bootstrap.mjs', d).match(/ledger home: (.+)/)[1];
  fs.writeFileSync(path.join(d, home, 'STOP'), 'owner asked for a halt\n');
  assert.equal(proveStatus(d, ['--', 'touch', 'it-ran.txt']), 250);
  assert.equal(fs.existsSync(path.join(d, 'it-ran.txt')), false, 'the command ran anyway');
});

test('--record writes the number the run produced, including a failing one', () => {
  // A recorder that only records green is the narration it replaced.
  const d = tmp();
  const home = run('bootstrap.mjs', d).match(/ledger home: (.+)/)[1];
  proveStatus(d, ['--record', '--', 'false']);
  assert.match(fs.readFileSync(path.join(d, home, 'goal.md'), 'utf8'), /\*\*prove\*\* `false` → 1/);
});

/**
 * What the review council reproduced, and the fixes now pinned.
 *
 * Every test below stands for a finding that was demonstrated against a working
 * script — most of them FATAL, and all of them invisible to reading.
 */

test('a pipe inside the npm script is refused — argv cannot see it', () => {
  // `prove -- npm run verify` with "verify": "tsc | tail" recorded → 0 for a
  // failing check and printed «the number came from the run». npm runs scripts
  // through sh -c, so the pipe never appears in argv.
  const d = tmp();
  fs.writeFileSync(path.join(d, 'package.json'), '{"name":"x","scripts":{"verify":"node -e \\"process.exit(1)\\" | tail -1"}}');
  assert.throws(() => prove(d, ['--', 'npm', 'run', 'verify']), /the check itself is compound/);
});

test('the compound guard is a WHITELIST — it refuses what composes and allows what cannot lie', () => {
  // Round 3 refuted the three-separator regex from both sides at once: it missed
  // a NEWLINE (the same separator as `;`), `$(…)`, a backtick and `|| true` —
  // five bodies recorded `→ 0` for a check that exited 1 — while refusing
  // `tsc --noEmit 2>&1` and a quoted `|` inside a jest pattern.
  const d = tmp();
  const refuse = [
    'node -e "process.exit(1)"\necho artifact-checked',
    'echo checked $(node -e "process.exit(1)")',
    'echo checked `node -e "process.exit(1)"`',
    'node -e "process.exit(1)" || true',
    'node -e "process.exit(1)" | cat',
    'node -e "process.exit(1)"; echo done',
  ];
  for (const body of refuse) {
    fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ scripts: { verify: body } }));
    assert.throws(() => prove(d, ['--', 'npm', 'run', 'verify']), /the check itself is compound/, body);
  }
  const allow = ['true 2>&1', 'true --pattern "(unit|integration)"', 'true || exit 1', 'true && true'];
  for (const body of allow) {
    fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ scripts: { verify: body } }));
    assert.equal(proveStatus(d, ['--', 'npm', 'run', 'verify']), 0, body);
  }
  // …and && must still report a failure it propagates.
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ scripts: { verify: 'false && true' } }));
  assert.equal(proveStatus(d, ['--', 'npm', 'run', 'verify']), 1);
});

test('quoting is SCANNED, not stripped in stages', () => {
  // The stripper ran `'…'` before `"…"`, so an apostrophe inside a double-quoted
  // string paired across whatever sat between and deleted it:
  // `echo "don't panic" ; false ; echo "we're green"` was cleared and recorded
  // as → 0 for a check that exited 1. A stage that decides what the guard SEES
  // is forgeable by data.
  const d = tmp();
  const q = String.fromCharCode(39);
  const body = `echo "don${q}t panic" ; node -e "process.exit(1)" ; echo "we${q}re green"`;
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ scripts: { verify: body } }));
  assert.throws(() => prove(d, ['--', 'npm', 'run', 'verify']), /the check itself is compound/);
  // …and the same apostrophe in an HONEST body must still run.
  assert.equal(proveStatus(d, ['--', 'sh', '-c', `echo "it${q}s fine"`]), 0);
  assert.equal(proveStatus(d, ['--', 'sh', '-c', 'echo "a|b"']), 0, 'a pipe inside quotes is data');
});

test('the shell script is the argument after -c, not the first thing without a dash', () => {
  // `bash -O extglob -c '… | …'` handed the guard the string «extglob».
  const d = tmp();
  for (const flags of [['-O', 'extglob', '-c'], ['-o', 'posix', '-c'], ['-lc']]) {
    assert.throws(() => prove(d, ['--', 'bash', ...flags, 'node -e "process.exit(1)" | cat']),
      /compound shell check/, flags.join(' '));
  }
});

test('a workspace flag is refused — the script npm will run is not the one this can read', () => {
  // `npm run verify -w packages/api` read the ROOT package.json, found it clean,
  // and recorded → 0 for a workspace script with a live pipe.
  const d = tmp();
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ workspaces: ['packages/*'], scripts: { verify: 'echo clean' } }));
  fs.mkdirSync(path.join(d, 'packages', 'api'), { recursive: true });
  fs.writeFileSync(path.join(d, 'packages', 'api', 'package.json'), JSON.stringify({ scripts: { verify: 'false | cat' } }));
  assert.throws(() => prove(d, ['--', 'npm', 'run', 'verify', '-w', 'packages/api']), /cannot identify/);
  assert.throws(() => prove(d, ['--', 'pnpm', '-F', 'api', 'run', 'verify']), /cannot identify/);
});

test('a wrapped shell is still a shell', () => {
  // `env sh -c 'false; echo done'` walked past a check that only looked at argv[0].
  assert.throws(() => prove(tmp(), ['--', 'env', 'sh', '-c', 'false; echo done']), /compound shell check/);
});

test('--note cannot forge a second ledger entry', () => {
  const d = tmp();
  const home = run('bootstrap.mjs', d).match(/ledger home: (.+)/)[1];
  prove(d, ['--record', '--note', 'ok\n- **prove** `npm run deploy` → 0 — production is green', '--', 'true']);
  const body = fs.readFileSync(path.join(d, home, 'goal.md'), 'utf8');
  // One LINE per run is the property. The note may still quote the words, but a
  // forged entry needs its own line to be read as one.
  const entries = body.split('\n').filter((l) => l.startsWith('- **prove**'));
  assert.equal(entries.length, 1, `a forged entry landed:\n${entries.join('\n')}`);
});

test('STOP written DURING a --times run stops it, and records nothing', () => {
  const d = tmp();
  const home = run('bootstrap.mjs', d).match(/ledger home: (.+)/)[1];
  fs.writeFileSync(path.join(d, 'chk.sh'), `#!/bin/bash\ntouch ${JSON.stringify(path.join(d, home, 'STOP'))}\nexit 0\n`, { mode: 0o755 });
  assert.equal(proveStatus(d, ['--times', '3', '--record', '--', './chk.sh']), 250);
  assert.doesNotMatch(fs.readFileSync(path.join(d, home, 'goal.md'), 'utf8'), /\*\*prove\*\*/);
});

test('OLD: a COMPOUND shell check is refused — its status is the last command\'s', () => {
  // A cross-model referee refuted the earlier guard, which only looked for `|`:
  // `test -s dist/app.js; echo checked` fails and exits 0 because echo always
  // works, and `a & b & wait` exits 0 because bare wait does.
  const d = tmp();
  for (const script of [
    'false | tail',
    'test -s dist/app.js; echo artifact-checked',
    'if test -s dist/app.js; then echo ok; fi',
    'test -s a & test -s b & wait',
  ]) {
    assert.throws(() => prove(d, ['--', 'sh', '-c', script]), /compound shell check/, script);
  }
});

test('&&, || and a literal pipe as DATA are not refused', () => {
  // The other half of the same refutation: `test -s README.md || exit 1` is
  // honest and was refused, and so was `grep -Fq '|' file`, where the pipe is
  // grep's data. Without a shell there is nothing to walk around — the old
  // token list could only ever fire on inputs that were already honest.
  const d = tmp();
  fs.writeFileSync(path.join(d, 'README.md'), 'has a | in it\n');
  assert.equal(proveStatus(d, ['--', 'sh', '-c', 'test -s README.md || exit 1']), 0);
  assert.equal(proveStatus(d, ['--', 'grep', '-Fq', '|', 'README.md']), 0);
  assert.equal(proveStatus(d, ['--', 'sh', '-c', 'false && true']), 1, '&& must still report the failure');
});

test('STOP is found from a subdirectory — a monorepo check runs from one', () => {
  const d = tmp();
  const home = run('bootstrap.mjs', d).match(/ledger home: (.+)/)[1];
  fs.writeFileSync(path.join(d, home, 'STOP'), 'halt\n');
  fs.mkdirSync(path.join(d, 'packages', 'api'), { recursive: true });
  assert.equal(proveStatus(path.join(d, 'packages', 'api'), ['--', 'touch', 'ran.txt']), 250);
  assert.equal(fs.existsSync(path.join(d, 'packages', 'api', 'ran.txt')), false);
});

test('two goal.md in scope: refuse to record rather than pick one', () => {
  // Guessing appended a loop's results to a file the project already owned.
  const d = tmp();
  fs.mkdirSync(path.join(d, 'docs'));
  run('bootstrap.mjs', d);
  fs.writeFileSync(path.join(d, 'goal.md'), '# the project\'s own\n');
  assert.throws(() => prove(d, ['--record', '--', 'true']), /more than one goal\.md/);
  assert.doesNotMatch(fs.readFileSync(path.join(d, 'goal.md'), 'utf8'), /\*\*prove\*\*/);
});

test('--times=3 is three runs, not a silently ignored flag', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'flip.sh'), '#!/bin/bash\nn=$(cat n 2>/dev/null || echo 0)\necho $((n+1)) > n\nexit $((n % 2))\n', { mode: 0o755 });
  assert.equal(proveStatus(d, ['--times=3', '--', './flip.sh']), 251);
});

test('a mistyped flag ends the run — an ignored --record reads like nothing to record', () => {
  assert.throws(() => prove(tmp(), ['--recrod', '--', 'true']), /unknown flag/);
});

test('a ledger that cannot be written does not swallow the flaky verdict', () => {
  const d = tmp();
  const home = run('bootstrap.mjs', d).match(/ledger home: (.+)/)[1];
  fs.writeFileSync(path.join(d, 'flip.sh'), '#!/bin/bash\nn=$(cat n 2>/dev/null || echo 0)\necho $((n+1)) > n\nexit $((n % 2))\n', { mode: 0o755 });
  fs.chmodSync(path.join(d, home, 'goal.md'), 0o444);
  assert.equal(proveStatus(d, ['--record', '--times', '3', '--', './flip.sh']), 251, 'the append threw past the flaky branch');
});

test('the ledger home bootstrap elects is the one the runner searches', () => {
  // They kept two lists: a repo with docs/learnings/ was told its ledger lived
  // there while the runner looked in four other places and found nothing — so a
  // STOP written exactly where bootstrap said was ignored.
  const d = tmp();
  fs.mkdirSync(path.join(d, 'docs', 'learnings'), { recursive: true });
  const home = run('bootstrap.mjs', d).match(/ledger home: (.+)/)[1];
  assert.equal(home, 'docs/learnings');
  fs.writeFileSync(path.join(d, home, 'STOP'), 'halt\n');
  assert.equal(proveStatus(d, ['--', 'true']), 250, `STOP in the elected home «${home}» was not seen`);
});

test('a config that does not parse is never rewritten', () => {
  // VS Code's mcp.json legally carries // comments; the parse error was
  // swallowed and the whole file replaced by a one-server object, exit 0.
  const d = tmp();
  const jsonc = '{\n  // a comment, legal here\n  "servers": {"github": {"type":"http","url":"https://x"}},\n  "inputs": []\n}\n';
  fs.mkdirSync(path.join(d, '.vscode'));
  fs.writeFileSync(path.join(d, '.vscode', 'mcp.json'), jsonc);
  assert.throws(() => run('new-mcp.mjs', d, ['ae', '-d', 'drives After Effects through aerender, a long enough description', '--config', '.vscode/mcp.json']), /not valid JSON/);
  assert.equal(fs.readFileSync(path.join(d, '.vscode', 'mcp.json'), 'utf8'), jsonc, 'their config was rewritten');
});

test('a fresh .vscode/mcp.json is registered under the key VS Code reads', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.vscode'));
  run('new-mcp.mjs', d, ['ae', '-d', 'drives After Effects through aerender, a long enough description', '--config', '.vscode/mcp.json']);
  const cfg = JSON.parse(fs.readFileSync(path.join(d, '.vscode', 'mcp.json'), 'utf8'));
  assert.ok(cfg.servers?.ae, `registered under ${Object.keys(cfg)} — VS Code reads «servers»`);
});

test('--dir outside the project is refused, not printed as if it worked', () => {
  const d = tmp();
  assert.throws(() => run('new-mcp.mjs', d, ['ae', '-d', 'drives After Effects through aerender, a long enough description', '--dir', '/opt/ae']), /must stay inside the project/);
});

test('the generated CLI does not truncate at the pipe buffer', () => {
  // execFileSync captures through a pipe, which is exactly the failing case:
  // process.exit dropped everything past 65536 bytes and still exited 0.
  const d = tmp();
  run('new-mcp.mjs', d, ['big', '-d', 'a server used to prove the CLI path does not lose output']);
  // 100 000, not 200 000: Linux caps a single argument at 128 KiB (MAX_ARG_STRLEN)
  // and spawnSync raises E2BIG — which macOS does not. Anything past the 64 KiB
  // pipe buffer proves the point.
  const payload = 'x'.repeat(100000);
  const out = execFileSync('node', ['tools/big-mcp/server.mjs', '--call', 'ping', JSON.stringify({ text: payload })],
    { cwd: d, encoding: 'utf8', maxBuffer: 1024 * 1024 });
  assert.ok(out.length > 65536, `truncated to ${out.length} bytes — the pipe buffer won`);
});

test('a config it cannot read is reported as UNKNOWN, never as absent', () => {
  // A trailing comma read as «no MCP here», and the ladder then says «write
  // one» — a false absence produced by the tool built to prevent them.
  const d = tmp();
  fs.writeFileSync(path.join(d, '.mcp.json'), '{"mcpServers": {"a": {"command":"x"},}}');
  const out = toolsJson(d);
  assert.equal(out.servers.length, 0);
  assert.match(JSON.stringify(out.unreadable), /not valid JSON/);
});

test('a server map that is an array does not become servers named 0 and 1', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, '.mcp.json'), '{"servers":[{"name":"a"},{"name":"b"}]}');
  const out = toolsJson(d);
  assert.deepEqual(out.servers.map((s) => s.name), []);
  assert.match(JSON.stringify(out.unreadable), /array/);
});

test('an unknown flag to tools.mjs is an error — «--cost» must not read as measured', () => {
  assert.throws(() => execFileSync('node', [path.join(SCRIPTS, 'tools.mjs'), '--cost'],
    { cwd: tmp(), encoding: 'utf8', env: { ...process.env, HOME: tmp() } }), /unknown flag/);
});

/**
 * Round 2 — what a re-review of the FIXES reproduced.
 *
 * «After fixing what review found, review again» is in the skill because fixes
 * are where self-inflicted defects live. That round found four more fatals, in
 * the previous round's repairs. Every one of them is below.
 */

test('the pipe is found through delegation, a lifecycle script, and from a subdirectory', () => {
  // Three ways past the single-key version, each a sibling key in the very
  // package.json the guard had already parsed — or that file one level up,
  // which npm walks to and the runner did not.
  const d = tmp();
  fs.mkdirSync(path.join(d, 'src'));
  for (const [pkg, cwd] of [
    ['{"scripts":{"verify":"npm run inner","inner":"false | cat"}}', d],
    ['{"scripts":{"preverify":"false | cat","verify":"true"}}', d],
    ['{"scripts":{"verify":"false | cat"}}', path.join(d, 'src')],
  ]) {
    fs.writeFileSync(path.join(d, 'package.json'), pkg);
    assert.throws(() => prove(cwd, ['--', 'npm', 'run', 'verify']), /the check itself is compound/, pkg);
  }
});

test('the walk-up stops BELOW $HOME — the loop never writes into a personal file', () => {
  // `notes` is a ledger home. $HOME was pushed before the boundary check, so a
  // project without .git under the home directory elected ~/notes/goal.md and
  // appended the run's result to the owner's file.
  const home = tmp();
  fs.mkdirSync(path.join(home, 'notes'));
  const personal = path.join(home, 'notes', 'goal.md');
  const body = '# MY PERSONAL GOALS\n- learn guitar\n';
  fs.writeFileSync(personal, body);
  const project = path.join(home, 'scratch', 'thing');
  fs.mkdirSync(project, { recursive: true });
  let status = 0;
  try {
    execFileSync('node', [path.join(SCRIPTS, 'prove.mjs'), '--record', '--', 'true'],
      { cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home } });
  } catch (err) { status = err.status; }
  assert.equal(status, 2, 'it adopted a ledger it does not own');
  assert.equal(fs.readFileSync(personal, 'utf8'), body);
});

test('containment is checked on the REAL path — a symlink is not an escape hatch', () => {
  const d = tmp();
  const outside = tmp();
  const proj = path.join(d, 'proj');
  fs.mkdirSync(proj);
  fs.symlinkSync(outside, path.join(proj, 'tools'));
  const desc = 'drives a thing through its own cli, long enough to pass';
  assert.throws(() => run('new-mcp.mjs', proj, ['thing', '-d', desc, '--dir', 'tools/thing-mcp']), /must stay inside the project/);
  assert.deepEqual(fs.readdirSync(outside), [], 'it wrote outside the project');

  const proj2 = path.join(d, 'proj2');
  fs.mkdirSync(proj2);
  const real = path.join(d, 'REAL-CONFIG.json');
  const cfg = '{"importantOtherSettings":{"keep":"me"},"mcpServers":{}}\n';
  fs.writeFileSync(real, cfg);
  fs.symlinkSync(real, path.join(proj2, '.mcp.json'));
  assert.throws(() => run('new-mcp.mjs', proj2, ['thing', '-d', desc]), /must stay inside the project/);
  assert.equal(fs.readFileSync(real, 'utf8'), cfg, 'a file outside the project was rewritten');
});

test('a failed registration leaves no scaffold, so the retry is a retry', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, '.mcp.json'), '{"mcpServers":{"existing":{"command":"node"}}}\n', { mode: 0o444 });
  const desc = 'drives a thing through its own cli, long enough to pass';
  assert.throws(() => run('new-mcp.mjs', d, ['thing', '-d', desc]), /could not write/);
  assert.equal(fs.existsSync(path.join(d, 'tools', 'thing-mcp', 'server.mjs')), false, 'a half-built scaffold survived');
  fs.chmodSync(path.join(d, '.mcp.json'), 0o644);
  run('new-mcp.mjs', d, ['thing', '-d', desc]);
  const cfg = JSON.parse(fs.readFileSync(path.join(d, '.mcp.json'), 'utf8'));
  assert.ok(cfg.mcpServers.thing && cfg.mcpServers.existing, 'the retry lost the existing server');
});

test('a bad server map in ~/.claude.json is UNKNOWN, never invented servers', () => {
  // The guarded reader and the unguarded one disagreed: an array there became
  // servers named 0 and 1, a string one per character, and `unreadable: []`.
  const home = tmp();
  fs.writeFileSync(path.join(home, '.claude.json'), '{"mcpServers":["alpha","beta"]}');
  const out = JSON.parse(execFileSync('node', [path.join(SCRIPTS, 'tools.mjs'), '--json'],
    { cwd: tmp(), encoding: 'utf8', env: { ...process.env, HOME: home } }));
  assert.deepEqual(out.servers.map((s) => s.name), []);
  assert.match(JSON.stringify(out.unreadable), /array/);
});

test('a large inventory survives the pipe — the same fatal, in a sibling script', () => {
  const d = tmp();
  const servers = Object.fromEntries(Array.from({ length: 1500 }, (_, i) => [`server-${i}`, { command: 'node', args: ['x.mjs'] }]));
  fs.writeFileSync(path.join(d, '.mcp.json'), JSON.stringify({ mcpServers: servers }));
  const out = execFileSync('node', [path.join(SCRIPTS, 'tools.mjs'), '--json'],
    { cwd: d, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, env: { ...process.env, HOME: tmp() } });
  assert.ok(out.length > 65536, `truncated to ${out.length}`);
  assert.equal(JSON.parse(out).servers.length, 1500, 'the JSON did not survive the pipe');
});

test('bootstrap says so when the state file cannot be created under its own name', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'GOAL.md'), '# my own goals\n');
  assert.match(run('bootstrap.mjs', d), /must be named exactly/);
});

test('bootstrap names the ledgers already deeper in the tree', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, 'packages', 'api'), { recursive: true });
  fs.writeFileSync(path.join(d, 'packages', 'api', 'goal.md'), '# theirs\n');
  assert.match(run('bootstrap.mjs', d), /already exists deeper in this tree/);
});

test('an ABSOLUTE --dir inside the project writes where it says', () => {
  // Round 1 «fixed» --dir /opt/x by refusing paths that resolve OUTSIDE. The
  // root cause was two functions answering one question: the check used
  // path.resolve, the write used path.join. An absolute --dir INSIDE the
  // project passed the check and wrote to a doubled path, registered an arg
  // that does not exist, and printed four false lines, exit 0.
  const d = tmp();
  const abs = path.join(d, 'tools', 'ae-mcp');
  run('new-mcp.mjs', d, ['ae', '-d', 'drives After Effects renders, the CLI was not enough', '--dir', abs]);
  assert.ok(fs.existsSync(path.join(abs, 'server.mjs')), 'the file is not where it said');
  const args = JSON.parse(fs.readFileSync(path.join(d, '.mcp.json'), 'utf8')).mcpServers.ae.args;
  assert.ok(fs.existsSync(path.resolve(d, args[0])), `registered ${args[0]}, which does not exist`);
});

test('a server map that is an array or a string is refused, not «registered»', () => {
  // `next[key][name] = …` on an array sets a named property that JSON.stringify
  // silently drops: «registered», exit 0, nothing registered. On a string it
  // threw, outside the try that removes the scaffold.
  for (const bad of ['{"mcpServers":["legacy"],"other":"keep me"}', '{"mcpServers":"see ./servers.d","note":"keep"}']) {
    const d = tmp();
    fs.writeFileSync(path.join(d, '.mcp.json'), bad);
    assert.throws(() => run('new-mcp.mjs', d, ['ae', '-d', 'drives After Effects renders, the CLI was not enough']), /not an object of servers/, bad);
    assert.equal(fs.readFileSync(path.join(d, '.mcp.json'), 'utf8'), bad, 'their config changed');
    assert.equal(fs.existsSync(path.join(d, 'tools')), false, 'a scaffold was left behind');
  }
});

test('a hardlinked config is refused — realpath cannot see a second name', () => {
  const d = tmp();
  const outside = path.join(tmp(), 'important.json');
  const body = '{"mcpServers":{"prod":{"command":"real"}},"secret":"outside"}\n';
  fs.writeFileSync(outside, body);
  fs.linkSync(outside, path.join(d, '.mcp.json'));
  assert.throws(() => run('new-mcp.mjs', d, ['ae', '-d', 'drives After Effects renders, the CLI was not enough']), /links/);
  assert.equal(fs.readFileSync(outside, 'utf8'), body);
});

test('«constructor» is not already registered in an empty config', () => {
  // The name regex admits it and `config[key][name]` found Object.prototype's.
  const d = tmp();
  fs.writeFileSync(path.join(d, '.mcp.json'), '{"mcpServers":{"other":{"command":"node"}}}');
  run('new-mcp.mjs', d, ['constructor', '-d', 'a server whose name is inherited from Object.prototype']);
  assert.ok(JSON.parse(fs.readFileSync(path.join(d, '.mcp.json'), 'utf8')).mcpServers.constructor.args);
});

/**
 * The loop as a PROCESS — the part that was doctrine and not a program.
 *
 * A bare `while true` stops when the human's patience does. These pin the four
 * stopping conditions that make this a loop with a stopping condition.
 */
const loop = (cwd, args) => execFileSync('node', [path.join(SCRIPTS, 'loop.mjs'), ...args],
  { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const loopStatus = (cwd, args) => { try { loop(cwd, args); return 0; } catch (err) { return err.status; } };
const looped = (cwd) => {
  const d = cwd ?? tmp();
  fs.mkdirSync(path.join(d, 'docs'), { recursive: true });
  run('bootstrap.mjs', d);
  return d;
};

test('nothing changed twice running is THRASH, not persistence', () => {
  const d = looped();
  assert.equal(loopStatus(d, ['--agent', 'echo working hard', '--sleep', '0', '--max', '10']), 3);
  const log = fs.readFileSync(path.join(d, 'agent-logs', 'loop.jsonl'), 'utf8');
  assert.match(log, /"stopped":"thrash"/);
});

test('--max is exact — the bound must not move with the counter', () => {
  // `n <= readLog().length + max` re-read a log every iteration appends to, so
  // --max 3 ran forever: a loop with no stopping condition, in the file whose
  // whole subject is stopping conditions.
  const d = looped();
  loopStatus(d, ['--agent', 'date >> docs/goal.md', '--sleep', '0', '--max', '3']);
  const rows = fs.readFileSync(path.join(d, 'agent-logs', 'loop.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(rows.filter((r) => r.exit !== null).length, 3, 'ran a different number of iterations than asked');
});

test('a STOP file ends the loop between iterations', () => {
  const d = looped();
  fs.writeFileSync(path.join(d, 'docs', 'STOP'), 'owner asked\n');
  const out = loop(d, ['--agent', 'date >> docs/goal.md', '--sleep', '0', '--max', '5']);
  assert.match(out, /STOPPED by docs\/STOP/);
  assert.doesNotMatch(out, /▶/, 'it ran an iteration anyway');
});

test('an agent that keeps failing is stopped, not retried until the budget is gone', () => {
  const d = looped();
  assert.equal(loopStatus(d, ['--agent', 'date >> docs/goal.md; exit 7', '--sleep', '0', '--max', '9']), 4);
});

test('STEERING.md reaches the agent, read fresh every iteration', () => {
  const d = looped();
  fs.writeFileSync(path.join(d, 'docs', 'STEERING.md'), 'focus on criterion 3 only\n');
  loopStatus(d, ['--agent', 'cat >> got.txt; date >> docs/goal.md', '--sleep', '0', '--max', '2']);
  assert.match(fs.readFileSync(path.join(d, 'got.txt'), 'utf8'), /criterion 3/);
});

test('two loops cannot share one ledger', () => {
  const d = looped();
  fs.mkdirSync(path.join(d, '.autopilot.lock'));
  const out = (() => { try { return loop(d, ['--agent', 'echo x', '--sleep', '0']); } catch (err) { return err.stderr; } })();
  assert.match(out, /another iteration is running/);
});

test('the loop refuses to run without a goal', () => {
  const d = tmp();
  const out = (() => { try { return loop(d, ['--agent', 'echo x']); } catch (err) { return err.stderr; } })();
  assert.match(out, /no goal\.md/);
});

/**
 * The carrier — what runs the loop when the window is closed.
 *
 * These execute the emitted wrapper rather than reading it. The first version
 * joined its steps with `&&`, which reads correctly and is silently inert: with
 * STOP absent the test returns 1, the chain short-circuits, and the carrier
 * exits 0 having never invoked the agent. A daemon reporting success every
 * thirty minutes and doing nothing is the worst shape this repo has produced.
 */
const carrierWrapper = (cwd, args) => {
  // `--kind launchd` explicitly: the default follows the PLATFORM, so on Linux
  // this emitted a crontab line, the plist regex matched nothing, and three
  // tests died on «Cannot read properties of null» — green on the author's mac,
  // red in CI. The wrapper itself is plain sh and is what these tests are about.
  const plist = execFileSync('node', [path.join(SCRIPTS, 'carrier.mjs'), ...args, '--kind', 'launchd'],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return plist.match(/<string>(cd [\s\S]*?)<\/string>/)[1]
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
};

test('the emitted wrapper actually invokes the agent', () => {
  const d = tmp();
  run('bootstrap.mjs', d);
  const wrapper = carrierWrapper(d, ['--agent', 'echo ran >> agent-logs/proof.txt']);
  execFileSync('/bin/sh', ['-c', wrapper], { cwd: d });
  assert.equal(fs.readFileSync(path.join(d, 'agent-logs', 'proof.txt'), 'utf8').trim(), 'ran');
});

test('STOP halts the carrier too — otherwise stopping the loop leaves a daemon iterating', () => {
  const d = tmp();
  const home = run('bootstrap.mjs', d).match(/ledger home: (.+)/)[1];
  const wrapper = carrierWrapper(d, ['--agent', 'echo ran >> agent-logs/proof.txt']);
  fs.writeFileSync(path.join(d, home, 'STOP'), 'halt\n');
  execFileSync('/bin/sh', ['-c', wrapper], { cwd: d });
  assert.equal(fs.existsSync(path.join(d, 'agent-logs', 'proof.txt')), false, 'the agent ran with STOP present');
  assert.equal(fs.existsSync(path.join(d, '.autopilot.lock')), false, 'the lock leaked');
});

test('the carrier honours every STOP path the loop does, not one baked-in string', () => {
  // It baked ONE literal path into a daemon while prove.mjs accepts nine. A
  // reviewer wrote STOP at the project root, watched the loop stop, and watched
  // the carrier keep invoking the agent — under a banner saying «the same file».
  const d = tmp();
  fs.mkdirSync(path.join(d, 'docs'));
  run('bootstrap.mjs', d); // elects docs/
  fs.writeFileSync(path.join(d, 'STOP'), 'halt\n'); // the human writes it at the root
  assert.equal(proveStatus(d, ['--', 'true']), 250, 'the loop did not stop');
  const wrapper = carrierWrapper(d, ['--agent', 'echo ran >> agent-logs/proof.txt']);
  execFileSync('/bin/sh', ['-c', wrapper], { cwd: d });
  assert.equal(fs.existsSync(path.join(d, 'agent-logs', 'proof.txt')), false, 'the carrier ran on regardless');
});

test('the carrier honours a STOP found by the WALK, not one relative to cwd', () => {
  // Emitted from packages/api, the unit watched packages/api/docs/STOP while the
  // loop honoured docs/STOP two levels up — and the banner PRINTED ../../docs/STOP
  // as the project's stop path while watching none of it.
  const d = tmp();
  fs.mkdirSync(path.join(d, '.git'));
  fs.mkdirSync(path.join(d, 'docs'));
  run('bootstrap.mjs', d);
  fs.writeFileSync(path.join(d, 'docs', 'STOP'), 'halt\n');
  const sub = path.join(d, 'packages', 'api');
  fs.mkdirSync(sub, { recursive: true });
  assert.equal(proveStatus(sub, ['--', 'true']), 250, 'the loop did not stop');
  const wrapper = carrierWrapper(sub, ['--agent', `echo ran >> ${JSON.stringify(path.join(d, 'ran.txt'))}`]);
  execFileSync('/bin/sh', ['-c', wrapper], { cwd: sub });
  assert.equal(fs.existsSync(path.join(d, 'ran.txt')), false, 'the carrier ran with a STOP two levels up');
});

test('an hourly interval is an hourly cron, not one that fires every minute', () => {
  // `--every 2h` emitted a step-1 minute field: 720 agent invocations a day
  // instead of 12, under a header saying «every 120 min».
  const d = tmp();
  const cron = (every) => execFileSync('node', [path.join(SCRIPTS, 'carrier.mjs'), '--agent', 'x', '--kind', 'cron', '--every', every],
    { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').find((l) => /^[*0-9]/.test(l));
  assert.match(cron('30m'), /^\*\/30 \* \* \* \*/);
  assert.match(cron('2h'), /^0 \*\/2 \* \* \*/);
  assert.match(cron('6h'), /^0 \*\/6 \* \* \*/);
});

test('a walk that finds nothing must not mean «no STOP, no ledger, no guard»', () => {
  // With HOME empty, realPath('') returned the cwd, the walk broke on iteration
  // 0 and returned []. Every consumer read that as «I looked and found none»:
  // a STOP present did not halt, and a piped npm check recorded → 0.
  const d = tmp();
  run('bootstrap.mjs', d);
  fs.writeFileSync(path.join(d, 'STOP'), 'halt\n');
  let status = 0;
  try {
    execFileSync('node', [path.join(SCRIPTS, 'prove.mjs'), '--', 'echo', 'X'],
      { cwd: d, encoding: 'utf8', env: { ...process.env, HOME: '' } });
  } catch (err) { status = err.status; }
  assert.equal(status, 250, 'an empty HOME turned the stop off');
});

test('the project you are STANDING IN is scanned, even when it is $HOME', () => {
  // A dotfiles repo or a notes vault: bootstrap elected `notes`, announced it,
  // and the runner could then never see the ledger it had just created.
  const home = tmp();
  fs.mkdirSync(path.join(home, 'notes'));
  const out = execFileSync('node', [path.join(SCRIPTS, 'bootstrap.mjs')],
    { cwd: home, encoding: 'utf8', env: { ...process.env, HOME: home } });
  const ledger = out.match(/ledger home: (.+)/)[1];
  fs.writeFileSync(path.join(home, ledger, 'STOP'), 'halt\n');
  let status = 0;
  try {
    execFileSync('node', [path.join(SCRIPTS, 'prove.mjs'), '--', 'echo', 'X'],
      { cwd: home, encoding: 'utf8', env: { ...process.env, HOME: home } });
  } catch (err) { status = err.status; }
  assert.equal(status, 250, `bootstrap said «${ledger}» and the runner could not see it`);
});

test('a run that overlaps the previous one does nothing — two loops share one ledger', () => {
  const d = tmp();
  run('bootstrap.mjs', d);
  const wrapper = carrierWrapper(d, ['--agent', 'echo ran >> agent-logs/proof.txt']);
  // ONE lock name for every shape of iteration: a scheduled carrier firing
  // while a human drives loop.mjs is two agents on one ledger.
  fs.mkdirSync(path.join(d, '.autopilot.lock'));
  execFileSync('/bin/sh', ['-c', wrapper], { cwd: d });
  assert.equal(fs.existsSync(path.join(d, 'agent-logs', 'proof.txt')), false, 'a second agent started on the same ledger');
});

test('the cron form is ONE command line — a crontab entry cannot wrap', () => {
  const d = tmp();
  const out = execFileSync('node', [path.join(SCRIPTS, 'carrier.mjs'), '--agent', 'echo hi', '--kind', 'cron'],
    { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const schedule = out.split('\n').filter((l) => /^[*\d]/.test(l));
  assert.equal(schedule.length, 1, `a crontab entry split across lines:\n${out}`);
});

test('the plist is loadable, not merely well-shaped', { skip: process.platform !== 'darwin' }, () => {
  const d = tmp();
  const plist = execFileSync('node', [path.join(SCRIPTS, 'carrier.mjs'), '--agent', 'echo hi'],
    { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  fs.writeFileSync(path.join(d, 'job.plist'), plist);
  execFileSync('plutil', ['-lint', path.join(d, 'job.plist')]); // throws on a malformed plist
});

test('the carrier arms nothing by itself', () => {
  // A skill that quietly installs a background agent has made the decision that
  // was not its to make: every run of it spends money on a schedule.
  const d = tmp();
  const before = fs.readdirSync(d);
  execFileSync('node', [path.join(SCRIPTS, 'carrier.mjs'), '--agent', 'echo hi'],
    { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  assert.deepEqual(fs.readdirSync(d), before, 'it wrote something into the project');
});

/**
 * Reach — the tools half. The loop stalls at capability in two ways that look
 * identical from inside: it decides a thing is impossible when it is already
 * configured, or it writes a second answer to a question something already
 * answers. Both are checked here, plus the one that made `new-mcp.mjs` exist at
 * all: a server written mid-run is useless to the session that wrote it unless
 * the same handlers are callable without a restart.
 */

/** HOME is redirected: `tools.mjs` reads `~/.claude.json`, `~/.codex/…` and the
 *  plugin list, so a test that did not isolate it would assert against whatever
 *  the machine running it happens to have installed. */
const toolsJson = (cwd) => JSON.parse(
  execFileSync('node', [path.join(SCRIPTS, 'tools.mjs'), '--json'],
    { cwd, encoding: 'utf8', env: { ...process.env, HOME: fs.mkdtempSync(path.join(os.tmpdir(), 'home-')) } }),
);

test('MCP servers are found under every key a harness uses, not just one', () => {
  // VS Code says `servers`, everyone else says `mcpServers`. A reader that knows
  // one key reports «no MCP here» in an editor full of them — a false absence,
  // which is the input to «I must build it».
  const d = tmp();
  fs.writeFileSync(path.join(d, '.mcp.json'), JSON.stringify({ mcpServers: { alpha: { command: 'node', args: ['a.mjs'] } } }));
  fs.mkdirSync(path.join(d, '.vscode'));
  fs.writeFileSync(path.join(d, '.vscode', 'mcp.json'), JSON.stringify({ servers: { beta: { url: 'https://example.test/mcp' } } }));
  const found = toolsJson(d).servers.map((s) => s.name);
  assert.deepEqual(found.sort(), ['alpha', 'beta']);
});

test('tools.mjs never claims to know what only a live session knows', () => {
  // The failure this prevents is confident silence: a config file is a claim
  // about disk, and a server that fails to launch reads exactly like «no such
  // tool». If the script stops saying so, it becomes the thing it warns about.
  const out = toolsJson(tmp());
  assert.ok(out.blind.length >= 3, JSON.stringify(out.blind));
  assert.match(out.blind.join(' '), /connector/i);
});

test('a scaffolded server answers a real MCP handshake — and says nothing to a notification', () => {
  const d = tmp();
  const made = run('new-mcp.mjs', d, ['after-effects', '-d', 'drives After Effects through aerender because no public server does']);
  assert.match(made, /created   : tools\/after-effects-mcp\/server\.mjs/);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(d, '.mcp.json'), 'utf8')).mcpServers['after-effects'],
    { type: 'stdio', command: 'node', args: ['tools/after-effects-mcp/server.mjs'] },
  );

  const wire = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {} } },
    { jsonrpc: '2.0', method: 'notifications/initialized' }, // no id: answering this hangs real clients
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'ping', arguments: { text: 'hi' } } },
  ].map((m) => JSON.stringify(m)).join('\n') + '\n';
  const replies = execFileSync('node', ['tools/after-effects-mcp/server.mjs'], { cwd: d, encoding: 'utf8', input: wire })
    .trim().split('\n').map((l) => JSON.parse(l));

  assert.equal(replies.length, 3, `the notification was answered:\n${JSON.stringify(replies, null, 2)}`);
  assert.equal(replies.find((r) => r.id === 1).result.capabilities.tools !== undefined, true);
  assert.deepEqual(replies.find((r) => r.id === 2).result.tools.map((t) => t.name), ['ping']);
  assert.match(replies.find((r) => r.id === 3).result.content[0].text, /alive: hi/);
});

test('the same handlers run from the command line — the session that wrote it is not made to wait', () => {
  // An MCP config is read at STARTUP. Without this path the loop writes a server
  // it cannot call, reports progress, and stalls until a restart it will not get.
  const d = tmp();
  run('new-mcp.mjs', d, ['ae', '-d', 'drives After Effects through aerender because no public server does']);
  const out = execFileSync('node', ['tools/ae-mcp/server.mjs', '--call', 'ping', '{"text":"now"}'], { cwd: d, encoding: 'utf8' });
  assert.match(out, /alive: now/);
});

test('a second server for a job one already does is refused', () => {
  const d = tmp();
  const args = ['dupe', '-d', 'drives the same thing the first one drives, which is the point'];
  run('new-mcp.mjs', d, args);
  assert.throws(() => run('new-mcp.mjs', d, args), /already registered/);
});

test('a TOML config is refused BEFORE it is overwritten with JSON', () => {
  // Codex keeps its servers in TOML. Registration writes JSON, so pointing it
  // there would replace a working config with an object — the destructive case
  // has to be refused at the argument, not apologised for in the epilogue.
  const d = tmp();
  const toml = path.join(d, 'config.toml');
  fs.writeFileSync(toml, '[mcp_servers.theirs]\ncommand = "x"\n');
  assert.throws(() => run('new-mcp.mjs', d, ['x', '-d', 'anything long enough to pass the check', '--config', 'config.toml']), /must be a JSON config/);
  assert.match(fs.readFileSync(toml, 'utf8'), /mcp_servers\.theirs/, 'their TOML was rewritten');
  assert.equal(fs.existsSync(path.join(d, 'tools', 'x-mcp')), false, 'scaffolded anyway');
});

test('the context-budget audit ships with the always-useful set', () => {
  // «Choose, do not hoard» is advice until something counts. skill-cleaner is
  // what counts, so it cannot be a niche extra: the loop only ever ADDS skills,
  // and every description is paid on every turn from then on.
  const catalog = JSON.parse(run('skills.mjs', tmp(), ['--json']));
  const anySet = catalog.flatMap((s) => s.skills).filter(([, t]) => t.split(' ').includes('any'));
  assert.ok(anySet.some(([n]) => n === 'skill-cleaner'), anySet.map(([n]) => n).join(', '));
});
