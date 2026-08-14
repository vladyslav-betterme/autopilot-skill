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
import { findLedger, findStopFile, findUp, STOP_FILE } from './lib.mjs';

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
    note = (inline ?? argv[++i] ?? '').replace(/\s+/g, ' ').trim();
    // Collapsed, because raw newlines let one run FORGE a second ledger entry:
    // `--note $'ok\n- **prove** `npm run deploy` → 0'` wrote a line, byte-identical
    // in shape to a real one, for a command that never ran. The tool's own
    // premise, defeated through the flag the skill tells you to use.
    if (!note) die('--note wants text — what this run is evidence FOR');
  } else if (name === '--times') {
    const raw = inline ?? argv[++i];
    // /^\d+$/ and not Number(): `0x10` ran sixteen times and `1e3` ran a thousand.
    // Bounded: `--times 99999999999999999999` passes /^\d+$/ and loops forever.
    if (!/^\d+$/.test(raw ?? '') || Number(raw) < 1 || Number(raw) > 100) {
      die(`--times wants a whole number between 1 and 100, got «${raw}»`);
    }
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
/**
 * A check must be ONE simple command, and this is a WHITELIST because the
 * blacklist lost a grammar war.
 *
 * The three-separator regex missed a NEWLINE — the same separator as `;`, and
 * the way anyone writes a script longer than one line — plus `$(…)`, backticks
 * and `|| true`, which is the most common failure-swallowing idiom there is.
 * Five bodies, each recorded as `→ 0` for a check that exited 1. Meanwhile it
 * REFUSED `tsc --noEmit 2>&1` and `jest --testPathPattern "(unit|integration)"`,
 * which are honest single commands.
 *
 * So: strip what cannot lie, then refuse anything left that can compose.
 *   quoted text   — a `|` inside an argument is data
 *   redirections  — `2>&1`, `> file`: the status is unchanged
 *   `&&`          — propagates failure, which is the whole difference
 *   `|| exit …`   — the honest guard idiom a cross-model referee produced
 * What remains and still holds a newline, `;`, `|`, `&`, a backtick or `$(`
 * decides the status somewhere other than the command you named.
 */
function compoundProblem(script) {
  const s = String(script);
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      // Inside quotes everything is DATA. This is the whole fix: the previous
      // version stripped `'…'` before `"…"`, so an apostrophe inside a
      // double-quoted string paired across whatever sat between them and
      // deleted it — `echo "don't panic" ; false ; echo "we're green"` was
      // cleared and recorded as `→ 0` for a check that exited 1. A stage that
      // decides what the guard gets to SEE is forgeable by data; a scanner that
      // tracks quoting is not.
      if (quote === '"' && c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '\\') { i++; continue; }              // an escaped separator is data
    if (c === '\n') return 'a newline';
    if (c === ';') return '«;»';
    if (c === '`') return 'a backtick';
    if (c === '$' && s[i + 1] === '(') return '«$(…)»';
    // `cat <(tsc --noEmit)` hides a status exactly like a pipe does, and the
    // scanner had never heard of it.
    if ((c === '<' || c === '>') && s[i + 1] === '(') return `«${c}(…)» process substitution`;
    if (c === '|') {
      if (s[i + 1] === '|') {
        // `|| exit …` is the honest guard idiom; `|| true` is the commonest way
        // there is to swallow a failure.
        // `|| exit` is the honest guard idiom — but `|| exit 0` swallows the
        // failure exactly like `|| true`, one token longer, and the guard
        // admitted it BY NAME while its own message said it could not hide one.
        const tail = s.slice(i + 2);
        if (/^\s*exit\b/.test(tail) && !/^\s*exit\s+0*\s*($|[;&|])/.test(tail)) { i++; continue; }
        return '«||» followed by something that can succeed';
      }
      return '«|»';
    }
    if (c === '&') {
      if (s[i + 1] === '&') { i++; continue; }        // propagates failure
      if (/[>&]/.test(s[i - 1] ?? '')) continue;      // `2>&1`, `>&2` — a redirect
      return 'a background «&»';
    }
  }
  return quote ? `an unbalanced ${quote === '"' ? 'double' : 'single'} quote` : null;
}

/** The shell may be wrapped: `env sh -c '…'`, `nice`, `time`, `cross-env`. Find
 *  the shell wherever it is rather than only at argv[0]. */
const shellAt = cmd.findIndex((a) => SHELLS.has(path.basename(a)));
// The argument after `-c` SPECIFICALLY, not «the first thing without a dash».
// Bash options take values: `bash -O extglob -c '… | …'` handed the guard the
// string «extglob» and ran the pipe. `-lc` and friends are the same flag.
// `c` need not be LAST: `bash -cx '… | tail'` combines short options, and the
// previous pattern required the cluster to END in c, so the guard was never
// called at all. That is the same hole the round-4 fix closed for options that
// take VALUES, moved one inch.
const dashC = shellAt === -1 ? -1 : cmd.findIndex((a, i) => i > shellAt && /^-[a-zA-Z]*c[a-zA-Z]*$/.test(a));
const shellScript = dashC === -1 ? null : cmd[dashC + 1];
const shellProblem = shellScript ? compoundProblem(shellScript) : null;
if (shellProblem) {
  die(`refusing a compound shell check — ${shellProblem} decides the status, not your command:\n` +
    `  ${JSON.stringify(shellScript)}\n` +
    'A script joined by a newline, `;`, `|`, `&`, `$(…)` or `|| <something that succeeds>` exits with\n' +
    'SOMETHING ELSE\'S status. Run the check itself, or move the script into a file whose own exit\n' +
    'code is the answer. `&&`, redirections and `|| exit N` are fine — they cannot hide a failure.');
}

/**
 * The lie where it actually lives: inside the script the check RESOLVES to.
 *
 * `prove.mjs -- npm run verify` is the invocation this skill recommends, and
 * with `"verify": "tsc | tail"` in package.json it recorded `→ 0` for a failing
 * check. npm runs its scripts through `sh -c`, so the pipe is invisible from
 * argv — it has to be read out of the script itself.
 *
 * What this CANNOT see is a pipe inside a shell script, a Makefile target or a
 * binary the check invokes — say so rather than implying coverage.
 */
const RUNNERS = new Set(['npm', 'pnpm', 'yarn', 'bun']);

/**
 * The layers NEST, and each guard used to see only its own layer.
 *
 *   `sh -c 'npm run verify'`   — the scanner cleared it (no separator) and the
 *                                script guard never ran, because argv[0] was sh
 *   `"verify": "sh -c '… | tail'"` — the script guard scanned the body, treated
 *                                the quoted text as data, and that data was a
 *                                shell script whose pipe decided the status
 *
 * So both directions recurse, with a depth bound: a shell script that invokes a
 * runner is handed to the script guard, and a script body that invokes a shell
 * has its quoted script scanned.
 */
function shellScriptIn(tokens) {
  const at = tokens.findIndex((a) => SHELLS.has(path.basename(a)));
  if (at === -1) return null;
  const ci = tokens.findIndex((a, i) => i > at && /^-[a-zA-Z]*c[a-zA-Z]*$/.test(a));
  return ci === -1 ? null : tokens[ci + 1] ?? null;
}
/** Split on whitespace, honouring quotes — enough to see «npm run x» inside a
 *  shell script, which is all this needs to decide whether to recurse. */
function words(text) {
  return String(text).match(/(?:[^\s'"]+|'[^']*'|"[^"]*")+/g)?.map((w) => w.replace(/^['"]|['"]$/g, '')) ?? [];
}
/** A workspace flag means npm will read a package.json this cannot identify —
 *  `npm run verify -w packages/api` resolved the ROOT script and cleared a file
 *  npm never reads. Refusing beats clearing the wrong one. */
const WORKSPACE_FLAGS = /^(-w|--workspace|--workspaces|-F|--filter|--prefix|-C|--dir)($|=)/;
function hiddenPipe(tokens, depth) {
  if (depth > 3) return null;
  // A shell in front of the runner is not a hiding place: scan what it runs.
  if (SHELLS.has(path.basename(tokens[0] ?? ''))) {
    const inner = shellScriptIn(tokens);
    return inner ? hiddenPipe(words(inner), depth + 1) : null;
  }
  if (!RUNNERS.has(path.basename(tokens[0] ?? ''))) return null;
  const cmd = tokens; // the rest of this function reads `cmd`
  const ws = cmd.slice(1).find((a) => WORKSPACE_FLAGS.test(a));
  if (ws) {
    die(`«${ws}» points the check at a package this runner cannot identify, so it cannot read that\n` +
      'script to see whether it pipes — and the one it CAN read is a different package\'s.\n' +
      'Run the check from that package\'s own directory instead.');
  }
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
  // Follow the graph, not the one key: `"verify": "npm run inner"` with the pipe
  // in `inner`, and `pre`/`post` lifecycle scripts, are each a sibling key in
  // the very file this function has already parsed.
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    for (const key of [`pre${name}`, name, `post${name}`]) {
      const body = scripts[key];
      if (typeof body !== 'string') continue;
      const problem = compoundProblem(body);
      if (problem) return { script: key, body, problem };
      // A body that hands a script to a shell: scan THAT, or the pipe inside a
      // quoted `sh -c "…"` is «data» to the scanner and decides the status.
      const nested = shellScriptIn(words(body));
      if (nested) {
        const inner = compoundProblem(nested);
        if (inner) return { script: key, body, problem: `${inner}, inside a nested shell` };
        const deeper = hiddenPipe(words(nested), depth + 1);
        if (deeper) return deeper;
      }
      // Flags are not script names: `npm run --silent inner` captured «--silent»
      // and the real script was never queued.
      for (const m of body.matchAll(/\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+|run-script\s+)?((?:--?[\w-]+(?:=\S+)?\s+)*)([\w:.@-]+)/g)) queue.push(m[2]);
    }
  }
  return null;
}
const piped = hiddenPipe(cmd, 0);
if (piped) {
  die(`the check itself is compound — ${piped.problem} decides its status, not the command it names.\n` +
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
const homes = record ? findLedger(root).homes : [];
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
  // Re-checked EVERY run. It was read once, before the loop, so a STOP written
  // during a slow `--times 3` was ignored for the remaining runs and for the
  // append — and `--times` is used precisely when a check is slow.
  if (i > 0 && findStopFile(root)) {
    console.error(`STOPPED mid-run after ${i} of ${times} — nothing was recorded.`);
    process.exit(STOPPED);
  }
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
const quote = (a) => (/^[\w@.,:=/+-]+$/.test(a) ? a : `'${a.replace(/\s+/g, ' ').replace(/'/g, `'\\''`)}'`);
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

console.log(`prove: ${stopAt ? 'stopped' : !agreed ? 'flaky' : 'exit ' + codes[0]}`);
if (!agreed) {
  console.error('\nFLAKY: the same check returned different statuses. A criterion must not be marked met on this.');
  process.exit(FLAKY);
}
// A green run whose evidence did not land is the narration this script replaced.
if (passed && recordFailed) process.exit(2);
process.exit(codes[0]);
