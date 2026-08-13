#!/usr/bin/env node
/**
 * What is this project, and what is its definition of «done»?
 *
 * The whole skill turns on this. An autonomous loop whose stopping condition is
 * the model's satisfaction will always stop; one whose stopping condition is a
 * command that exits 0 stops when the project says so. So the FIRST thing is to
 * find that command, and to be honest when there isn't one.
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

/** Gates in the order a human would run them: cheapest signal first. */
const GATE_ORDER = ['verify', 'check', 'ci', 'lint', 'typecheck', 'type-check', 'test', 'build'];

function nodeProject() {
  const pkg = read('package.json');
  if (!pkg) return null;
  let json; try { json = JSON.parse(pkg); } catch { return null; }
  const scripts = json.scripts ?? {};
  // An «all gates» script beats a list of individual ones: it is the project's
  // own opinion about order and completeness, and it cannot drift from itself.
  const aggregate = GATE_ORDER.slice(0, 3).find((n) => scripts[n]);
  const individual = GATE_ORDER.slice(3).filter((n) => scripts[n]);
  const pm = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : has('bun.lockb') ? 'bun' : 'npm';
  return {
    kind: 'node',
    packageManager: pm,
    aggregateGate: aggregate ? `${pm} run ${aggregate}` : null,
    gates: aggregate ? [`${pm} run ${aggregate}`] : individual.map((n) => `${pm} run ${n}`),
    allScripts: Object.keys(scripts),
  };
}

/**
 * The first `make` target from `wanted` that the Makefile actually defines.
 *
 * Written once because it was written twice: the python branch tested
 * (check|lint|test) with a regex and then pushed the hardcoded string
 * `make check`, so a Makefile with only `test:` produced a gate that exits 2 —
 * «a made-up gate is worse than an honest none», which this skill's own test
 * says in as many words. The generic branch ten lines below did it correctly.
 */
function makeTarget(wanted) {
  if (!has('Makefile')) return null;
  const mk = read('Makefile') ?? '';
  return wanted.find((t) => new RegExp(`^${t}:`, 'm').test(mk)) ?? null;
}

function pythonProject() {
  if (!has('pyproject.toml') && !has('setup.py') && !has('requirements.txt')) return null;
  const gates = [];
  const toml = read('pyproject.toml') ?? '';
  const mk = makeTarget(['check', 'ci', 'verify', 'lint', 'test']);
  if (mk) gates.push(`make ${mk}`);
  if (/\[tool\.ruff/.test(toml)) gates.push('ruff check .');
  if (/\[tool\.mypy/.test(toml)) gates.push('mypy .');
  if (/pytest/.test(toml) || has('tests') || has('test')) gates.push('pytest -q');
  return { kind: 'python', gates, allScripts: [] };
}

function genericProject() {
  const gates = [];
  const mk = makeTarget(['check', 'ci', 'verify', 'test', 'lint']);
  if (mk) gates.push(`make ${mk}`);
  if (has('Cargo.toml')) gates.push('cargo clippy -- -D warnings', 'cargo test');
  if (has('go.mod')) gates.push('go vet ./...', 'go test ./...');
  return gates.length ? { kind: 'generic', gates, allScripts: [] } : null;
}

const project = nodeProject() ?? pythonProject() ?? genericProject() ?? { kind: 'unknown', gates: [], allScripts: [] };

/** Where durable knowledge already lives, if anywhere. Never invent a second home. */
const memoryHomes = [
  'CLAUDE.md', 'AGENTS.md', 'CONTRIBUTING.md',
  'docs/learnings', 'docs/decisions', 'docs/adr', 'docs/architecture',
  'CHANGELOG.md', 'docs/CHANGELOG.md',
].filter(has);

/** Guardrails a loop must not trip. Presence is a signal, not a rule. */
const signals = {
  hasCI: has('.github/workflows') || has('.gitlab-ci.yml') || has('.circleci'),
  hasGitHooks: has('.githooks') || has('.husky'),
  hasEnvExample: has('.env.example') || has('.env.sample'),
  /** A dev environment that points at production is the single most dangerous
   *  thing a loop can meet, and it is never obvious. Worth ASKING about. */
  envFilesPresent: ['.env', '.env.local', '.env.development'].filter(has),
  defaultBranch: sh('git', ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])?.split('/').pop() ?? null,
  remote: sh('git', ['remote', 'get-url', 'origin']),
  dirty: (sh('git', ['status', '--porcelain']) ?? '').length > 0,
};

console.log(JSON.stringify({ root, project, memoryHomes, signals }, null, 2));
