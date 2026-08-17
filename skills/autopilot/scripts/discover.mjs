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
import { MEMORY_HOMES } from './lib.mjs';

const root = process.cwd();
const read = (p) => { try { return fs.readFileSync(path.join(root, p), 'utf8'); } catch { return null; } };
const has = (p) => fs.existsSync(path.join(root, p));
/**
 * git, with the repository's own executable configuration disabled.
 *
 * `.git/config` is data the project ships, and `core.fsmonitor` is a COMMAND
 * git runs — `git status` in a hostile checkout executed it, during discovery.
 * `core.pager`, `core.sshCommand` and `core.hooksPath` are the same shape.
 * These `-c` overrides win over the repo's config.
 */
const GIT_SAFE = ['-c', 'core.fsmonitor=', '-c', 'core.pager=cat', '-c', 'core.hooksPath=/dev/null',
  '-c', 'core.sshCommand=/bin/false', '-c', 'core.askPass=', '-c', 'protocol.ext.allow=never'];
const sh = (cmd, args) => {
  const argv = cmd === 'git' ? [...GIT_SAFE, ...args] : args;
  try { return execFileSync(cmd, argv, { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','ignore'] }).trim(); } catch { return null; }
};
const glob = (re) => { try { return fs.readdirSync(root).some((f) => re.test(f)); } catch { return false; } };

/** Checks in the order a human would run them: cheapest signal first. */
const CHECK_ORDER = ['verify', 'check', 'ci', 'lint', 'typecheck', 'type-check', 'test', 'build'];
/** An «all checks» script beats a list of individual ones: it is the project's
 *  own opinion about order and completeness, and it cannot drift from itself. */
const AGGREGATE = CHECK_ORDER.slice(0, 3);
const INDIVIDUAL = CHECK_ORDER.slice(3);
/** A recipe file has no «aggregate vs individual» split, but it must not invent
 *  a SECOND order for the same question — so it reads the one list above. */
const WANTED = CHECK_ORDER.filter((n) => !n.startsWith('type'));

/** One task map (npm scripts, deno tasks, composer scripts) → one check list. */
function fromTaskMap(tasks, prefix) {
  const aggregate = AGGREGATE.find((n) => tasks[n]);
  const individual = INDIVIDUAL.filter((n) => tasks[n]);
  if (!aggregate) {
    return { aggregateCheck: null, checks: individual.map((n) => `${prefix} ${n}`), allScripts: Object.keys(tasks) };
  }
  /**
   * An aggregate DELETED the test suite from the definition of done.
   *
   * In npm-land `check` very often means «type check»: SvelteKit's own
   * published manifest has `"check": "tsc && cd ./test/types && tsc"` beside a
   * real `test` script — and this returned `npm run check` alone, so every
   * iteration's definition of done was `tsc` and the tests never ran.
   *
   * Whether it covers them is READABLE: look in its body for the other script
   * names. What it does not mention, it does not run.
   */
  const body = String(tasks[aggregate] ?? '');
  /**
   * INVOKED, not merely mentioned. A word match called `test` covered by
   * `"check": "tsc && cd ./test/types && tsc"` — the script name appears, in a
   * PATH. The question is «does this run that script», so the pattern is a
   * runner calling it: `npm run test`, `pnpm test`, `run-s lint test`.
   */
  const invokes = (n) => new RegExp(
    `(?:npm|pnpm|yarn|bun)\\s+(?:run\\s+|run-script\\s+)?${n}\\b` +
    `|(?:run-[sp]|npm-run-all)\\b[^&|;]*\\b${n}\\b`,
  ).test(body);
  const uncovered = individual.filter((n) => !invokes(n));
  return {
    aggregateCheck: `${prefix} ${aggregate}`,
    checks: [`${prefix} ${aggregate}`, ...uncovered.map((n) => `${prefix} ${n}`)],
    aggregateCovers: individual.filter((n) => !uncovered.includes(n)).map((n) => `${prefix} ${n}`),
    aggregateOmits: uncovered.map((n) => `${prefix} ${n}`),
    allScripts: Object.keys(tasks),
  };
}

/** Files this script could not read, and why. A bare `catch { return null }`
 *  made «this manifest is broken» indistinguishable from «there is no manifest»:
 *  a package.json with a UTF-8 BOM — what PowerShell and Notepad write, and what
 *  npm itself handles fine — was reported as «unknown project, no check, no
 *  scripts», with nothing said. */
const unreadable = [];
const parse = (p) => {
  const raw = read(p);
  if (raw === null) return null;
  // A BOM is not a syntax error to npm, and `.jsonc` exists precisely to carry
  // comments — this file already claimed to read deno.jsonc.
  const cleaned = raw.replace(/^\uFEFF/, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  try { return JSON.parse(cleaned); } catch (err) {
    unreadable.push({ file: p, why: err.message.split('\n')[0] });
    return null;
  }
};

/** Is this command actually runnable here? A check naming a tool nobody has
 *  installed is red from iteration one for a reason that has nothing to do with
 *  the work — and this script used to emit `pytest -q` because a `tests/`
 *  directory existed, and `deno test -A` because a formatter config did. */
const onPath = (bin) => {
  try { execFileSync('command', ['-v', bin], { shell: '/bin/sh', stdio: 'ignore' }); return true; } catch { return false; }
};

/** The lockfile is the package manager, and BOTH the check line and the
 *  readiness block below need the answer. Asked once. */
const LOCKFILES = [['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'], ['bun.lockb', 'bun'], ['package-lock.json', 'npm']];
const lockfile = () => LOCKFILES.find(([f]) => has(f)) ?? null;
const packageManager = () => lockfile()?.[1] ?? 'npm';

function nodeProject() {
  const json = parse('package.json');
  if (!json) return null;
  const pm = packageManager();
  return { kind: 'node', packageManager: pm, ...fromTaskMap(json.scripts ?? {}, `${pm} run`) };
}

function denoProject() {
  const json = parse('deno.json') ?? parse('deno.jsonc');
  if (!json) return null;
  const fromTasks = fromTaskMap(json.tasks ?? {}, 'deno task');
  // `deno test -A` is only real if deno is installed AND something looks like a
  // Deno test. A `deno.json` holding nothing but a formatter width — or a
  // Supabase edge-function config — used to be enough to put a command for an
  // absent runtime into the definition of done.
  if (!fromTasks.checks.length && onPath('deno') && glob(/_test\.(ts|js|tsx|jsx)$/)) {
    fromTasks.checks.push('deno test -A');
  }
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
/**
 * DISCOVERY MUST NOT EXECUTE THE PROJECT. This runs before anyone has read it.
 *
 * Round 5 replaced a regex with `make -n <target>`, under the comment «-n runs
 * nothing». That is false: make expands `$(shell …)` while PARSING, so a
 * hostile Makefile ran a command during the FIRST thing SKILL.md tells the loop
 * to do, against a project nobody has looked at yet. Reproduced.
 *
 * There is no safe way to ask make what it defines — `-p`, `-n` and `--dry-run`
 * all parse, and parsing is execution. So this reads the text again, with the
 * regex's limits STATED rather than pretended away, and marks the answer
 * unverified. The first run of the check is the verification: if the target
 * does not exist, `make` exits 2 and `prove.mjs` reports it loudly, which is
 * the honest place for that to surface.
 */
function recipeTarget(file, wanted, runner) {
  if (!has(file)) return null;
  // What text-reading CAN exclude: a `define … endef` block (its lines are a
  // variable's value, and `make check` on one exits 2) and comments. What it
  // cannot: a false `ifeq`, or a target arriving through `include`. That is the
  // price of not executing the project, and `recipeUnverified` is where it is
  // paid out loud rather than hidden.
  const body = (read(file) ?? '')
    .replace(/^[ \t]*define\b[\s\S]*?^[ \t]*endef[ \t]*$/gm, '')
    .replace(/^[ \t]*#.*$/gm, '');
  // A rule may name several targets before the colon; `check:=1` is a variable
  // and `make check` on it exits 2, so an assignment does not count.
  const found = wanted.find((t) => new RegExp(`^[^\\S\\n]*(?:[\\w./-]+[ \\t]+)*${t}(?:[ \\t]+[\\w./-]+)*[ \\t]*:(?!:*=)`, 'm').test(body));
  if (!found) return null;
  recipeUnverified.push(`${runner} ${found}`);
  return found;
}
/** Recipe targets found by READING, never by running. A target inside a
 *  `define` block, a false `ifeq`, or one arriving through `include` is
 *  therefore a maybe — say so instead of implying it was checked. */
const recipeUnverified = [];
const makeCheck = () => { const t = recipeTarget('Makefile', WANTED, 'make'); return t ? `make ${t}` : null; };
const justCheck = () => { const t = recipeTarget('justfile', WANTED, 'just') ?? recipeTarget('Justfile', WANTED, 'just'); return t ? `just ${t}` : null; };

function pythonProject() {
  if (!has('pyproject.toml') && !has('setup.py') && !has('requirements.txt')) return null;
  const checks = [];
  const toml = read('pyproject.toml') ?? '';
  const recipe = makeCheck() ?? justCheck();
  if (recipe) checks.push(recipe);
  if (/\[tool\.ruff/.test(toml)) checks.push('ruff check .');
  if (/\[tool\.mypy/.test(toml)) checks.push('mypy .');
  // Declared, or installed and actually used. `has('tests')` alone emitted
  // `pytest -q` for a unittest project that had never heard of pytest.
  const declaresPytest = /pytest/.test(toml) || has('pytest.ini') || has('tox.ini') || /pytest/.test(read('requirements.txt') ?? '');
  // `python` does not exist on stock macOS or most current Linux distros, and a
  // check that cannot run is the invented-check defect wearing a fallback.
  if (declaresPytest && onPath('pytest')) checks.push('pytest -q');
  else if (declaresPytest && onPath('python3')) checks.push('python3 -m pytest -q');
  else if (declaresPytest && onPath('python')) checks.push('python -m pytest -q');
  else if ((has('tests') || has('test')) && onPath('pytest')) checks.push('pytest -q');
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
  // NO fallback for a Gemfile with neither spec/ nor a Rakefile. The one that
  // used to be here globbed `test/**/*_test.rb`, found nothing, required
  // nothing and exited 0 — a definition of done that could not fail, on every
  // iteration of every Jekyll site and every Ruby script. An honest «no check»
  // is the whole point of this file.
  if (has('Gemfile') && has('spec')) checks.push('bundle exec rspec');
  else if (has('Gemfile') && has('Rakefile')) checks.push('bundle exec rake');
  if (has('mix.exs')) checks.push('mix test');
  const composer = parse('composer.json');
  if (composer) checks.push(...fromTaskMap(composer.scripts ?? {}, 'composer run').checks);
  return checks.length ? { kind: 'generic', checks, allScripts: [] } : null;
}

/**
 * Every detector runs, and their checks are UNIONED.
 *
 * `??` alone was wrong: a package.json with no check-shaped script still
 * returns an object, so a repo carrying `package.json` + a Makefile with a real
 * `check:` target reported `checks: []` and sent the loop off to ask a human
 * for a command the project already had.
 */
const detected = [nodeProject(), denoProject(), pythonProject(), genericProject()].filter(Boolean);
const checks = [...new Set(detected.flatMap((d) => d.checks))];
const primary = detected.find((d) => d.checks.length) ?? detected[0];
const project = primary
  ? { ...primary, checks }
  /** No automatic check is a legitimate answer — for prose, research, ops and
   *  design work it is the NORMAL one. The skill then requires an acceptance
   *  check agreed with the human before the first iteration. What it must never
   *  do is invent one, or let the model judge its own work by default. */
  : { kind: 'unknown', checks: [], allScripts: [] };

/** Where durable knowledge already lives, if anywhere. Never invent a second
 *  home — and the ledger writer reads THIS list, not one of its own. */
const memoryHomes = MEMORY_HOMES.filter(has);

/** A tool this project's files ask for and this machine does not have. Without
 *  this, a justfile project reported «no check» and SKILL.md's flow then told
 *  the reader to agree an acceptance check — while `just check` sat in the repo.
 *  «Absent» and «I cannot run it here» are different answers. */
const missingTools = [
  ['just', has('justfile') || has('Justfile')],
  ['make', has('Makefile')],
  ['deno', has('deno.json') || has('deno.jsonc')],
  ['pytest', /pytest/.test(read('pyproject.toml') ?? '') || has('pytest.ini')],
  ['bundle', has('Gemfile')],
  ['cargo', has('Cargo.toml')],
  ['go', has('go.mod')],
].filter(([bin, declared]) => declared && !onPath(bin)).map(([bin]) => bin);

/** Guardrails a loop must not trip. Presence is a signal, not a rule. */
const signals = {
  hasCI: has('.github/workflows') || has('.gitlab-ci.yml') || has('.circleci'),
  hasGitHooks: has('.githooks') || has('.husky'),
  hasEnvExample: has('.env.example') || has('.env.sample'),
  /** A working environment that points at production is the single most
   *  dangerous thing a loop can meet, and it is never obvious. Worth ASKING. */
  envFilesPresent: ['.env', '.env.local', '.env.development'].filter(has),
  /** `dirty: false` used to mean BOTH «clean repo» and «not a repo at all» —
   *  and the second one is the dangerous one: no branch, no undo, and §8's
   *  «commit what is green» is impossible. Say which it is. */
  vcs: sh('git', ['rev-parse', '--is-inside-work-tree']) === 'true' ? 'git' : 'none',
  defaultBranch: sh('git', ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])?.split('/').pop() ?? null,
  remote: sh('git', ['remote', 'get-url', 'origin']),
  dirty: (sh('git', ['status', '--porcelain']) ?? '').length > 0,
};

/**
 * Is the WORKSHOP set up, or only the work?
 *
 * Every row here is a reason the project's own check goes red for a cause that
 * has nothing to do with the goal — and an unattended loop reads that red as its
 * own failure, then spends the campaign fixing code that was never broken. The
 * expensive one is the last: a loop that cannot commit does every iteration's
 * work and lands none of it, and `git commit` fails with a message nothing in
 * the ledger ever shows.
 *
 * Facts and a command, never a verdict, and NOTHING is executed here — the
 * commands are printed for whoever reads them to run, announced, in the order
 * they appear. Read-only is the whole contract of this script.
 */
const readiness = [];
{
  const pkg = parse('package.json');
  const declared = pkg ? Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).length : 0;
  const pm = packageManager();
  const mtime = (p) => { try { return fs.statSync(path.join(root, p)).mtimeMs; } catch { return null; } };
  if (declared && !has('node_modules')) {
    readiness.push({
      what: 'node dependencies are declared but not installed',
      evidence: `package.json declares ${declared}, node_modules is absent`,
      fix: lockfile() ? `${pm} ${pm === 'npm' ? 'ci' : 'install --frozen-lockfile'}` : `${pm} install`,
    });
  } else if (declared && lockfile()) {
    const lock = mtime(lockfile()[0]);
    const mods = mtime('node_modules');
    if (lock && mods && lock > mods) {
      readiness.push({
        what: 'node_modules is older than the lockfile',
        evidence: `${lockfile()[0]} changed after node_modules was last written`,
        fix: `${pm} ${pm === 'npm' ? 'ci' : 'install --frozen-lockfile'}`,
      });
    }
  }
  // No verdict on python: deps can live in conda, in a global install, or in a
  // venv somewhere else entirely. The FACTS, and the standard command.
  if ((has('requirements.txt') || has('pyproject.toml')) && !has('.venv') && !has('venv') && !process.env.VIRTUAL_ENV) {
    readiness.push({
      what: 'a python project with no virtualenv in it and none active',
      evidence: `${has('requirements.txt') ? 'requirements.txt' : 'pyproject.toml'} present, no .venv/ or venv/, $VIRTUAL_ENV unset — deps may still be global or in conda`,
      fix: has('requirements.txt') ? 'python3 -m venv .venv && .venv/bin/pip install -r requirements.txt' : null,
    });
  }
  /** KEY NAMES ONLY. A discovery step that printed the values of somebody's
   *  `.env` would put live credentials into the ledger, the transcript and any
   *  log the loop writes. */
  const keys = (text) => [...String(text ?? '').matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)].map((m) => m[1]);
  const example = ['.env.example', '.env.sample'].find(has);
  if (example && has('.env')) {
    const missing = keys(read(example)).filter((k) => !keys(read('.env')).includes(k));
    if (missing.length) {
      readiness.push({
        what: `.env is missing ${missing.length} key(s) that ${example} declares`,
        evidence: `names only, never values: ${missing.join(', ')}`,
        fix: null,
      });
    }
  } else if (example && !has('.env')) {
    readiness.push({ what: `${example} exists and .env does not`, evidence: 'nothing supplies the project\'s own configuration', fix: `cp ${example} .env  # then fill it in` });
  }
  /** A declared runtime nobody is running. `nvm use` on a project pinned to 18
   *  is the difference between a real failure and «this ecosystem changed». */
  const declaredNode = (read('.nvmrc') ?? '').trim()
    || (/^nodejs\s+(\S+)/m.exec(read('.tool-versions') ?? '') ?? [])[1]
    || pkg?.engines?.node || '';
  /**
   * A PIN, not a range. `engines: { node: ">=20.11" }` is satisfied by 22 and
   * this row claimed a mismatch on the repo that ships this script — a
   * readiness list whose first row is wrong is a list nobody reads. Deciding
   * whether an arbitrary semver range is satisfied needs a semver parser, and
   * this file has no dependencies, so it only speaks where the answer is
   * certain: a bare `18`, `20.11.0`, `v22` — what `.nvmrc` and `.tool-versions`
   * hold. Ranges are left to `npm`, which enforces them itself.
   */
  const pinned = /^v?\d+(\.\d+)*$/.test(declaredNode.trim()) ? declaredNode.trim().replace(/^v/, '') : '';
  const wantMajor = pinned.split('.')[0];
  const haveMajor = process.versions.node.split('.')[0];
  if (wantMajor && wantMajor !== haveMajor) {
    readiness.push({
      what: 'the node this ran under is not the node the project declares',
      evidence: `declared «${declaredNode.trim()}», running ${process.versions.node}`,
      fix: has('.nvmrc') ? 'nvm use' : null,
    });
  }
  if (signals.vcs === 'git') {
    const who = [sh('git', ['config', 'user.name']), sh('git', ['config', 'user.email'])];
    if (!who[0] || !who[1]) {
      readiness.push({
        what: 'git has no committer identity here — every commit this loop makes will FAIL',
        evidence: `user.name=${who[0] ?? 'unset'} user.email=${who[1] ?? 'unset'}`,
        fix: 'git config user.name "…" && git config user.email "…"',
      });
    }
  }
}

console.log(JSON.stringify({ root, project, memoryHomes, signals, readiness, unreadable, missingTools, recipeUnverified }, null, 2));
