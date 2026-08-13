#!/usr/bin/env node
/**
 * What is this project, and what is its definition of «done»?
 *
 * The whole skill turns on this. An autonomous loop whose stopping condition is
 * the model's satisfaction will always stop; one whose stopping condition is a
 * command that exits 0 stops when the project says so. So the FIRST thing is to
 * find that command, and to be honest when there isn't one.
 *
 * «checks», not «gates»: the same loop drives work that has no test suite at
 * all, and the skill asks for an agreed acceptance check in that case. One word
 * for one idea — two names for one thing is the defect this skill warns about
 * most.
 *
 * Read-only. Prints JSON. Runs anywhere Node runs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const read = (p) => { try { return fs.readFileSync(path.join(root, p), 'utf8'); } catch { return null; } };
const has = (p) => fs.existsSync(path.join(root, p));
const sh = (cmd, args) => { try { return execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','ignore'] }).trim(); } catch { return null; } };
const glob = (re) => { try { return fs.readdirSync(root).some((f) => re.test(f)); } catch { return false; } };

/** Checks in the order a human would run them: cheapest signal first. */
const CHECK_ORDER = ['verify', 'check', 'ci', 'lint', 'typecheck', 'type-check', 'test', 'build'];
/** An «all checks» script beats a list of individual ones: it is the project's
 *  own opinion about order and completeness, and it cannot drift from itself. */
const AGGREGATE = CHECK_ORDER.slice(0, 3);
const INDIVIDUAL = CHECK_ORDER.slice(3);

/** One task map (npm scripts, deno tasks, composer scripts) → one check list. */
function fromTaskMap(tasks, prefix) {
  const aggregate = AGGREGATE.find((n) => tasks[n]);
  return {
    aggregateCheck: aggregate ? `${prefix} ${aggregate}` : null,
    checks: aggregate ? [`${prefix} ${aggregate}`] : INDIVIDUAL.filter((n) => tasks[n]).map((n) => `${prefix} ${n}`),
    allScripts: Object.keys(tasks),
  };
}

const parse = (p) => { const raw = read(p); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } };

function nodeProject() {
  const json = parse('package.json');
  if (!json) return null;
  const pm = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : has('bun.lockb') ? 'bun' : 'npm';
  return { kind: 'node', packageManager: pm, ...fromTaskMap(json.scripts ?? {}, `${pm} run`) };
}

function denoProject() {
  const json = parse('deno.json') ?? parse('deno.jsonc');
  if (!json) return null;
  const fromTasks = fromTaskMap(json.tasks ?? {}, 'deno task');
  // A project with no task named like a check still has `deno test`, which is
  // real and runnable — unlike a made-up one.
  if (!fromTasks.checks.length && has('deno.lock')) fromTasks.checks.push('deno test -A');
  return { kind: 'deno', ...fromTasks };
}

/**
 * The first target from `wanted` that the recipe file actually defines.
 *
 * Written once because it was written twice: the python branch tested
 * (check|lint|test) with a regex and then pushed the hardcoded string
 * `make check`, so a Makefile with only `test:` produced a check that exits 2 —
 * «a made-up check is worse than an honest none», which this skill's own test
 * says in as many words. The generic branch below did it correctly.
 */
function recipeTarget(file, wanted) {
  if (!has(file)) return null;
  const body = read(file) ?? '';
  return wanted.find((t) => new RegExp(`^${t}:`, 'm').test(body)) ?? null;
}
const WANTED = ['check', 'ci', 'verify', 'test', 'lint'];
const makeCheck = () => { const t = recipeTarget('Makefile', WANTED); return t ? `make ${t}` : null; };
const justCheck = () => { const t = recipeTarget('justfile', WANTED) ?? recipeTarget('Justfile', WANTED); return t ? `just ${t}` : null; };

function pythonProject() {
  if (!has('pyproject.toml') && !has('setup.py') && !has('requirements.txt')) return null;
  const checks = [];
  const toml = read('pyproject.toml') ?? '';
  const recipe = makeCheck() ?? justCheck();
  if (recipe) checks.push(recipe);
  if (/\[tool\.ruff/.test(toml)) checks.push('ruff check .');
  if (/\[tool\.mypy/.test(toml)) checks.push('mypy .');
  if (/pytest/.test(toml) || has('tests') || has('test')) checks.push('pytest -q');
  return { kind: 'python', checks, allScripts: [] };
}

/** Everything else that states its own check in a file the ecosystem defines. */
function genericProject() {
  const checks = [];
  const recipe = makeCheck() ?? justCheck();
  if (recipe) checks.push(recipe);
  if (has('Cargo.toml')) checks.push('cargo clippy -- -D warnings', 'cargo test');
  if (has('go.mod')) checks.push('go vet ./...', 'go test ./...');
  if (has('build.gradle') || has('build.gradle.kts')) checks.push(has('gradlew') ? './gradlew check' : 'gradle check');
  if (has('pom.xml')) checks.push('mvn -q verify');
  if (glob(/\.(sln|csproj|fsproj)$/)) checks.push('dotnet test');
  if (has('Gemfile')) checks.push(has('spec') ? 'bundle exec rspec' : has('Rakefile') ? 'bundle exec rake' : 'bundle exec ruby -Itest -e "Dir.glob(%q{test/**/*_test.rb}).each { |f| require File.expand_path(f) }"');
  if (has('mix.exs')) checks.push('mix test');
  const composer = parse('composer.json');
  if (composer) checks.push(...fromTaskMap(composer.scripts ?? {}, 'composer run').checks);
  return checks.length ? { kind: 'generic', checks, allScripts: [] } : null;
}

const project =
  nodeProject() ?? denoProject() ?? pythonProject() ?? genericProject() ??
  /** No automatic check is a legitimate answer — for prose, research, ops and
   *  design work it is the NORMAL one. The skill then requires an acceptance
   *  check agreed with the human before the first iteration. What it must never
   *  do is invent one, or let the model judge its own work by default. */
  { kind: 'unknown', checks: [], allScripts: [] };

/** Where durable knowledge already lives, if anywhere. Never invent a second home. */
const memoryHomes = [
  'CLAUDE.md', 'AGENTS.md', 'CONTRIBUTING.md',
  'docs/learnings', 'docs/decisions', 'docs/adr', 'docs/architecture', 'docs/notes', 'notes',
  'GOAL.md', 'TODO.md', 'ROADMAP.md',
  'CHANGELOG.md', 'docs/CHANGELOG.md',
].filter(has);

/** Guardrails a loop must not trip. Presence is a signal, not a rule. */
const signals = {
  hasCI: has('.github/workflows') || has('.gitlab-ci.yml') || has('.circleci'),
  hasGitHooks: has('.githooks') || has('.husky'),
  hasEnvExample: has('.env.example') || has('.env.sample'),
  /** A working environment that points at production is the single most
   *  dangerous thing a loop can meet, and it is never obvious. Worth ASKING. */
  envFilesPresent: ['.env', '.env.local', '.env.development'].filter(has),
  defaultBranch: sh('git', ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])?.split('/').pop() ?? null,
  remote: sh('git', ['remote', 'get-url', 'origin']),
  dirty: (sh('git', ['status', '--porcelain']) ?? '').length > 0,
};

console.log(JSON.stringify({ root, project, memoryHomes, signals }, null, 2));
