#!/usr/bin/env node
/**
 * Run the check, and be the thing that reports the result.
 *
 * «Prove» was the one step in the loop that a model could NARRATE. Everything
 * else leaves an artifact — a file, a commit, a ledger line — but the evidence
 * for «the check passed» was output pasted by the same context that wanted it to
 * have passed.
 *
 *   node prove.mjs -- npm run verify           # runs it, prints the true exit code
 *   node prove.mjs --times 3 -- npm test       # a check that disagrees with itself is flaky
 *   node prove.mjs --record -- npm run verify  # writes the result into goal.md itself
 *
 * What it guarantees: the status it reports is the CHILD's, read by a process
 * that is not writing the summary. What it does NOT guarantee is that your
 * check is honest — see `hiddenPipe` below, which is the one dishonest shape it
 * can see from here, and the note that names the ones it cannot.
 *
 * Exit: the command's own code · 128+n on a signal · 250 stopped · 251 flaky · 2 misuse.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findLedgerHomes, findStopFile, findUp, STOP_FILE } from './lib.mjs';

const STOPPED = 250;
const FLAKY = 251;

const root = process.cwd();
const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
const die = (msg, code = 2) => { console.error(msg); process.exit(code); };

if (sep === -1 || sep === argv.length - 1) {
  die('usage: prove.mjs [--times N] [--record] [--note "what this proves"] -- <command> [args…]\n' +
    'The «--» is required: everything after it is the check, run exactly as given.');
}
const cmd = argv.slice(sep + 1);

/**
 * A strict parser, because the loose one disabled the guards in silence.
 *
 * `--times=3` was not `--times`, so it ran ONCE and the flakiness check could
 * never fire; `--recrod` was ignored and the run looked exactly like an honest
 * one that simply had nothing to record. Both reproduced by a critic. An
 * unknown flag is now the end of the run, not a shrug.
 */
let record = false;
let times = 1;
let note = null;
for (let i = 0; i < sep; i++) {
  const [name, inline] = argv[i].includes('=')
    ? [argv[i].slice(0, argv[i].indexOf('=')), argv[i].slice(argv[i].indexOf('=') + 1)]
    : [argv[i], null];
  if (name === '--record') {
    if (inline !== null) die('--record takes no value');
    record = true;
  } else if (name === '--note') {
    // Five identical `→ 0` lines cannot be told from a loop that is stuck: a
    // cold-start drill read the log and said a loop making progress and a loop
    // spinning look exactly the same. The note is what makes them differ.
    note = inline ?? argv[++i];
    if (!note) die('--note wants text — what this run is evidence FOR');
  } else if (name === '--times') {
    const raw = inline ?? argv[++i];
    // /^\d+$/ and not Number(): `0x10` ran sixteen times and `1e3` ran a thousand.
    if (!/^\d+$/.test(raw ?? '') || Number(raw) < 1) die(`--times wants a positive whole number, got «${raw}»`);
    times = Number(raw);
  } else {
    die(`unknown flag «${argv[i]}» — the flags are --times N, --record and --note "text".\n` +
      'Refusing rather than ignoring it: a silently dropped --record reads exactly like a run with nothing to record.');
  }
}

/**
 * A shell is what makes a check lie, so there is no shell.
 *
 * This alone is worth less than it looks, and a critic proved it: without a
 * shell, `['false','|','tail']` already reports 1, so refusing those tokens
 * only ever caught inputs that were already honest. It stays because it names
 * the mistake at the moment someone types it — but the guard that matters is
 * the next one.
 */
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh']);
/**
 * A COMPOUND shell script reports its LAST command's status, whatever happened
 * earlier — so if the program is a shell, its script is argv and gets read.
 *
 *   `|`  a pipe            — `tsc | tail` is tail's status
 *   `;`  a sequence        — `test -s dist/app.js; echo checked` is echo's, and echo always works
 *   `&`  a background job  — `a & b & wait` is wait's, which is 0
 *
 * `&&` and `||` are NOT here: they propagate failure, which is the whole
 * difference. Matching them was a false positive that refused an honest
 * `test -s README.md || exit 1`.
 *
 * There is deliberately NO check on the tokens of a non-shell command. Without
 * a shell, `['false','|','tail']` already exits 1 — the old token list could
 * only ever fire on inputs that were already honest, while refusing a perfectly
 * good `grep -Fq '|' README.md`. Both halves of that were found by reviewers:
 * one that the guard caught nothing real, one that it caught the wrong thing.
 */
const COMPOUND = /(^|[^|])\|([^|]|$)|;|(^|[^&])&([^&]|$)/;
const shellScript = SHELLS.has(path.basename(cmd[0] ?? ''))
  ? cmd.slice(1).find((a) => !a.startsWith('-'))
  : null;
if (shellScript && COMPOUND.test(shellScript)) {
  die(`refusing a compound shell check: ${JSON.stringify(shellScript)}\n` +
    'A script joined by `|`, `;` or `&` exits with its LAST command\'s status, so a failure\n' +
    'earlier in it is invisible. Run the check itself, or move the script into a file whose\n' +
    'own exit code is the answer (`&&` is fine — it propagates failure).');
}

/**
 * The lie where it actually lives: inside the script the check RESOLVES to.
 *
 * `prove.mjs -- npm run verify` was the invocation this skill recommends, and
 * with `"verify": "tsc | tail"` in package.json it recorded `→ 0` for a failing
 * check and printed «the number came from the run». npm runs its scripts
 * through `sh -c`, so the pipe is invisible from argv — it has to be read out
 * of the script itself.
 *
 * `&&` is deliberately allowed: it propagates failure, which is the whole
 * difference. What this CANNOT see is a pipe inside a shell script, a Makefile
 * target or a binary the check invokes — say so rather than implying coverage.
 */
const RUNNERS = new Set(['npm', 'pnpm', 'yarn', 'bun']);
function hiddenPipe() {
  if (!RUNNERS.has(path.basename(cmd[0] ?? ''))) return null;
  const rest = cmd.slice(1).filter((a) => !a.startsWith('-'));
  const entry = rest[0] === 'run' || rest[0] === 'run-script' ? rest[1] : rest[0];
  if (!entry) return null;
  // From CWD UP, because npm does: the same package.json with the same pipe,
  // run one directory down, used to be reported green.
  const pkgPath = findUp(root, 'package.json');
  let pkg;
  try { pkg = JSON.parse(fs.readFileSync(pkgPath ?? '', 'utf8')); } catch { return null; }
  const scripts = pkg?.scripts;
  if (!scripts) return null;
  // Follow the graph, not the one key. A reviewer walked past the single-key
  // version three ways: `"verify": "npm run inner"` with the pipe in `inner`,
  // a `preverify` lifecycle script, and the walk-up above — each of them a
  // sibling key in the very file this function had already parsed.
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    for (const key of [`pre${name}`, name, `post${name}`]) {
      const body = scripts[key];
      if (typeof body !== 'string') continue;
      if (COMPOUND.test(body)) return { script: key, body };
      for (const m of body.matchAll(/\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+|run-script\s+)?([\w:.-]+)/g)) queue.push(m[1]);
    }
  }
  return null;
}
const piped = hiddenPipe();
if (piped) {
  die(`the check itself is piped — its status is the LAST command's, not the check's.\n` +
    `  "${piped.script}": ${JSON.stringify(piped.body)}\n` +
    'Fix the script (drop the pipe, or redirect to a file), then run this again.\n' +
    'This is the shape that shipped six red deploys reading as green locally.');
}

/**
 * A stop the loop cannot forget, searched from here UP to the project root.
 *
 * It used to look only in `process.cwd()`, so `cd packages/api && prove …` —
 * the normal shape in a monorepo — ignored the STOP file with no message at
 * all, turning the one mechanism the human owns back into a request the loop
 * has to notice.
 */
const stopAt = findStopFile(root);
if (stopAt) {
  const why = (() => { try { return fs.readFileSync(stopAt, 'utf8').trim(); } catch { return ''; } })();
  console.error(`STOPPED by ${path.relative(root, stopAt) || STOP_FILE} — the check was NOT run.`);
  if (why) console.error(why);
  console.error('Write the state into the ledger, say where you stopped, and end the loop. Delete the file to resume.');
  process.exit(STOPPED);
}

/** Where a `--record` would go — resolved BEFORE the run, so a misconfigured
 *  destination is not discovered after the check has already cost its minutes. */
const homes = record ? findLedgerHomes(root) : [];
if (record && homes.length === 0) {
  die('--record: no goal.md in this project or its parents — run bootstrap.mjs first. Nothing was run.');
}
if (record && homes.length > 1) {
  die(`--record: more than one goal.md is in scope, and guessing is how a loop's results get\n` +
    `appended to a file the project already owned:\n${homes.map((h) => `  ${h}`).join('\n')}\n` +
    'Keep one, or run from the directory that owns the ledger. Nothing was run.');
}

const codes = [];
for (let i = 0; i < times; i++) {
  // stdio inherit: the human and the agent see the real output live, and the
  // status below is this process's own reading of the child — not a summary.
  const res = spawnSync(cmd[0], cmd.slice(1), { cwd: root, stdio: 'inherit' });
  if (res.error) die(`could not run «${cmd[0]}»: ${res.error.code ?? res.error.message}`, 2);
  // A signal kill has no exit code. Reporting `null` as 0 would be the lie in
  // its purest form; 128+n is the convention every shell already uses.
  codes.push(res.status === null ? 128 + (os.constants.signals[res.signal] ?? 0) : res.status);
  if (res.status === null) console.error(`(killed by ${res.signal})`);
}

/** The recorded line must be re-runnable. Joining argv with spaces turned a
 *  legitimate check into text that prove.mjs itself would refuse. */
const quote = (a) => (/^[\w@.,:=/+-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`);
const stamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const agreed = new Set(codes).size === 1;
const passed = agreed && codes[0] === 0;
const line = `- **prove** \`${cmd.map(quote).join(' ')}\` → ${codes.join(', ')}` +
  `${agreed ? '' : '  ← DISAGREED WITH ITSELF'}${times > 1 ? ` (${times} runs)` : ''}` +
  `${note ? ` — ${note}` : ''} · ${stamp}`;

console.log(`\n${line}`);

/**
 * Record, then decide. The verdict decides the exit code no matter what
 * happens here: a read-only `goal.md` used to throw straight past the flaky
 * branch, so a check that returned 0,1,0 exited 1 — «just red, retry» — and the
 * 98 the skill tells its reader to key on could not fire.
 */
let recordFailed = null;
if (record) {
  const target = path.join(homes[0], 'goal.md');
  try {
    const body = fs.readFileSync(target, 'utf8');
    fs.appendFileSync(target, (body.endsWith('\n') ? '' : '\n') + line + '\n');
    console.log(`recorded in ${path.relative(root, target)} — the number came from the run, not from the summary.`);
  } catch (err) {
    recordFailed = err.code ?? err.message;
    console.error(`RECORD FAILED (${recordFailed}): ${target} — the run happened, the evidence did not land.`);
  }
}

if (!agreed) {
  console.error('\nFLAKY: the same check returned different statuses. A criterion must not be marked met on this.');
  process.exit(FLAKY);
}
// A green run whose evidence did not land is the narration this script replaced.
if (passed && recordFailed) process.exit(2);
process.exit(codes[0]);
