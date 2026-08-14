#!/usr/bin/env node
/**
 * The loop, as a process — the part that was doctrine and not a program.
 *
 * `carrier.mjs` emits a unit for a scheduler to run. This is the other shape:
 * one process that iterates now, in front of you, until something says stop.
 * The Ralph pattern (ralphloop.sh, Geoffrey Huntley) is the same idea, and the
 * difference is what counts as «stop»: a bare `while true` runs until the human
 * kills it, so the stopping condition is the human's patience. Here it is the
 * ledger.
 *
 *   node loop.mjs --agent "claude -p 'continue the autopilot loop; read docs/goal.md first'"
 *   node loop.mjs --agent "codex exec 'continue'" --max 20 --sleep 30
 *   node loop.mjs --status                      # what the last runs did
 *
 * It stops when — and each of these is written to the log with its reason:
 *   · a STOP file appears anywhere the loop honours one (the human's switch)
 *   · `--max` iterations have run (the default is 25, never «forever»)
 *   · nothing changed for `--thrash` iterations in a row: no commit, no ledger
 *     edit. §7 calls two of those thrash, not persistence.
 *   · the agent exits non-zero `--thrash` times in a row
 *
 * Every iteration appends one JSON line to `agent-logs/loop.jsonl`: number,
 * start, seconds, exit code, whether the ledger moved, whether HEAD moved.
 *
 * STEERING: if `<ledger home>/STEERING.md` exists it is read FRESH each
 * iteration and passed to the agent on stdin. Edit it mid-flight to
 * reprioritise without killing the run — a dial where STOP is a switch.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { findLedger, findStopFile, takeLock, LOCK_DIR, STOP_FILE } from './lib.mjs';

const root = process.cwd();
const argv = process.argv.slice(2);
const die = (msg, code = 2) => { console.error(msg); process.exitCode = code; };

const VALUE = new Set(['--agent', '--max', '--sleep', '--thrash']);
const opts = { max: 25, sleep: 15, thrash: 2, agent: null, status: false };
for (let i = 0; i < argv.length; i++) {
  const [name, inline] = argv[i].includes('=')
    ? [argv[i].slice(0, argv[i].indexOf('=')), argv[i].slice(argv[i].indexOf('=') + 1)]
    : [argv[i], null];
  if (name === '--status') { opts.status = true; continue; }
  if (!VALUE.has(name)) {
    die(`unknown flag «${argv[i]}» — --agent, --max, --sleep, --thrash, --status`);
    process.exit(2);
  }
  const value = inline ?? argv[++i];
  if (value === undefined) { die(`${name} wants a value`); process.exit(2); }
  if (name === '--agent') opts.agent = value;
  else {
    if (!/^\d+$/.test(value)) { die(`${name} wants a whole number, got «${value}»`); process.exit(2); }
    // `--thrash 0` stopped after one iteration and blamed «0 iterations with no
    // change» for an iteration that had changed something.
    if (name === '--thrash' && Number(value) < 1) { die('--thrash must be at least 1'); process.exit(2); }
    opts[name.slice(2)] = Number(value);
  }
}

const { homes: ledgerHomes, root: projectRoot } = findLedger(root);
// With the ledger, not with cwd: two loops started from different directories
// of one project wrote two logs, so `--status` in either place showed half the
// truth about a campaign they were BOTH driving.
const logFile = path.join(projectRoot, 'agent-logs', 'loop.jsonl');
let skippedRows = 0;
const readLog = () => {
  let raw;
  try { raw = fs.readFileSync(logFile, 'utf8'); } catch { return []; }
  skippedRows = 0;
  // Per LINE. One truncated row — the shape a kill mid-append leaves — used to
  // return [] for the whole file, so thirty iterations and five hours of agent
  // time reported as «no iterations recorded yet», exit 0.
  return raw.split('\n').filter(Boolean).flatMap((l) => {
    try {
      const row = JSON.parse(l);
      if (row && typeof row === 'object') return [row];
    } catch { /* fall through */ }
    skippedRows++;
    return [];
  });
};

if (opts.status) {
  const rows = readLog();
  if (!rows.length) { console.log('no iterations recorded yet.'); process.exitCode = 0; }
  else {
    for (const r of rows.slice(-20)) {
      console.log(`[${String(r.n).padStart(3, '0')}] ${r.started}  ${String(r.seconds).padStart(5)}s  ` +
        `exit=${String(r.exit ?? '-').padStart(4)}  ${r.ledgerMoved ? 'ledger' : '      '} ` +
        `${r.headMoved ? 'commit' : '      '}  ${r.stopped ? '■ ' + r.stopped : ''}`);
    }
    const spent = rows.reduce((a, r) => a + (r.seconds ?? 0), 0);
    console.log(`\n${rows.length} iterations · ${Math.round(spent / 60)} min of agent time · last: ${rows.at(-1).started}`);
    if (skippedRows) console.log(`${skippedRows} unreadable line(s) skipped — a run was killed mid-append.`);
  }
} else if (!opts.agent) {
  die('usage: loop.mjs --agent "<non-interactive agent command>" [--max 25] [--sleep 15] [--thrash 2]\n' +
    'e.g.  --agent "claude -p \'continue the autopilot loop; read docs/goal.md first\'"\n' +
    'The command must be NON-INTERACTIVE: nobody is there to answer a prompt.\n' +
    'See what past runs did with:  loop.mjs --status');
} else {
  await run();
}

async function run() {
  const homes = ledgerHomes;
  if (!homes.length) {
    die('no goal.md in this project or its parents — run bootstrap.mjs and write the goal first.\n' +
      'A loop whose stopping condition is not written down is a while-true with a nicer name.');
    return;
  }
  if (homes.length > 1) {
    die(`more than one goal.md is in scope:\n${homes.map((h) => `  ${h}`).join('\n')}\nKeep one.`);
    return;
  }
  const ledger = homes[0];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** One lock for every shape of iteration — a carrier firing while you drive
   *  the loop by hand is two agents on one ledger, which is how a criterion
   *  gets marked met twice and landed once. */
  // At the PROJECT, not at cwd — see `findLedger`. Two loops started from
  // different directories of one project each took their own lock and drove the
  // same goal.md, which is the thing this lock exists to prevent.
  const lock = path.join(projectRoot, LOCK_DIR);
  if (!takeLock(lock)) {
    die(`${LOCK_DIR} is held in ${projectRoot} — another iteration is running.\n` +
      'If nothing is, delete it; a lock whose process is gone is reclaimed automatically.');
    return;
  }
  const release = () => { try { fs.rmSync(lock, { recursive: true }); } catch { /* gone */ } };
  process.on('exit', release);

  /**
   * Signals, and why the loop had to become asynchronous to honour them.
   *
   * `run()` was fully synchronous — `spawnSync` plus a blocking sleep — so these
   * handlers never got a turn, while REGISTERING them had already removed
   * Node's default terminate action. Ctrl-C therefore killed the child and the
   * loop immediately started a fresh PAID agent; only SIGKILL stopped it, and
   * SIGKILL left the lock, which silently disabled the carrier forever.
   */
  let child = null;
  let stopping = null;
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      stopping = sig;
      if (child) child.kill('SIGTERM');
      console.log(`\n■ ${sig} — stopping after this iteration. The agent was asked to stop too.`);
    });
  }

  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const sig = () => {
    // What «nothing changed» means, without asking the model: the ledger's own
    // bytes, and whether a commit landed. Both are things the iteration DID,
    // not things it said.
    // CONTENT, not mtime: `touch docs/goal.md` bought twenty-five paid
    // iterations while nothing changed — and this skill's own doctrine tells
    // the agent to write the ledger every iteration, so «the file was touched»
    // cannot mean «work happened». Guarded per file: a broken .md symlink in
    // the ledger home threw out of `sig()` and lost an iteration that had
    // already been paid for.
    let led = '';
    try {
      for (const f of fs.readdirSync(ledger).filter((x) => x.endsWith('.md')).sort()) {
        try { led += `${f}:${fs.readFileSync(path.join(ledger, f), 'utf8').length}:${hash(fs.readFileSync(path.join(ledger, f), 'utf8'))}|`; } catch { led += `${f}:unreadable|`; }
      }
    } catch { led = 'ledger-unreadable'; }
    let head = '';
    try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* not a repo */ }
    return { led, head };
  };

  let quiet = 0;
  let failures = 0;
  let instant = 0;
  // Computed ONCE. `n <= readLog().length + max` re-read a log that every
  // iteration appends to, so the bound moved with the counter and `--max 3`
  // ran forever — a loop with no stopping condition, in the file whose whole
  // subject is stopping conditions. Found by running it, not by reading it.
  const first = readLog().length + 1;
  const last = first + opts.max - 1;
  for (let n = first; n <= last; n++) {
    const stop = findStopFile(root);
    if (stop) {
      const why = (() => { try { return fs.readFileSync(stop, 'utf8').trim(); } catch { return ''; } })();
      console.log(`\n■ STOPPED by ${path.relative(root, stop) || STOP_FILE}${why ? ` — ${why}` : ''}`);
      append({ n, stopped: 'STOP file' });
      return;
    }

    const steerFile = path.join(ledger, 'STEERING.md');
    const steer = (() => { try { return fs.readFileSync(steerFile, 'utf8').trim(); } catch { return ''; } })();
    const before = sig();
    const started = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    console.log(`\n▶ [${String(n).padStart(3, '0')}] ${started}${steer ? '  (steering: ' + steer.split('\n')[0].slice(0, 60) + ')' : ''}`);

    const t0 = Date.now();
    // A shell, deliberately: `--agent` is a command line a human wrote, quoting
    // and all. Note what that means — the exit code recorded below is the LAST
    // command's if you pass a compound one. This is not the check (`prove.mjs`
    // is), it is the agent's own status.
    child = spawn('/bin/sh', ['-c', opts.agent], { cwd: projectRoot, stdio: [steer ? 'pipe' : 'inherit', 'inherit', 'inherit'] });
    if (steer) { child.stdin.end(steer); }
    const exit = await new Promise((resolve) => {
      child.on('error', (err) => resolve(`spawn failed: ${err.code ?? err.message}`));
      child.on('close', (code, signal) => resolve(signal ? 128 + (os.constants.signals[signal] ?? 15) : code));
    });
    child = null;
    const seconds = Math.round((Date.now() - t0) / 1000);
    const after = sig();
    const ledgerMoved = before.led !== after.led;
    const headMoved = Boolean(before.head) && before.head !== after.head;
    append({ n, started, seconds, exit, ledgerMoved, headMoved });
    console.log(`  ${seconds}s · exit ${exit} · ${ledgerMoved ? 'ledger moved' : 'ledger UNCHANGED'} · ${headMoved ? 'commit landed' : 'no commit'}`);

    quiet = ledgerMoved || headMoved ? 0 : quiet + 1;
    failures = exit === 0 ? 0 : failures + 1;
    instant = seconds === 0 ? instant + 1 : 0;
    if (stopping) {
      append({ n, stopped: `signal ${stopping}` });
      process.exitCode = 130;
      return;
    }
    // FAILURES FIRST. A broken agent usually changes nothing either, so both
    // counters crossed in the same iteration and thrash always won — «a wrong
    // premise, not persistence» was printed at an unauthenticated CLI, a typo'd
    // command and a rate limit alike. The fault was the command line.
    if (failures >= opts.thrash) {
      console.log(`\n■ The agent exited non-zero ${failures} times in a row (last: ${exit}).\n` +
        '  That is the COMMAND failing, not the work. Check it by hand before spending more.');
      append({ n, stopped: 'agent failing' });
      process.exitCode = 4;
      return;
    }
    if (instant >= 5) {
      console.log(`\n■ ${instant} iterations returned in under a second. An agent that returns\n` +
        '  immediately is not doing the work — a backgrounded command, or one that exits at once.');
      append({ n, stopped: 'agent returning instantly' });
      process.exitCode = 5;
      return;
    }
    if (quiet >= opts.thrash) {
      console.log(`\n■ THRASH: ${quiet} iterations with no commit and no ledger change.\n` +
        '  §7: that is a wrong premise, not persistence. Say what is blocking, and what you need.');
      append({ n, stopped: 'thrash' });
      process.exitCode = 3;
      return;
    }
    if (opts.sleep) await sleep(opts.sleep * 1000);
  }
  console.log(`\n■ --max reached. The goal is not the counter: read ${path.relative(root, ledger)}/goal.md and say where it stands.`);
  append({ n: readLog().length + 1, stopped: 'max iterations' });
}

/** Cheap and sufficient: this only ever answers «did these bytes change». */
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function append(row) {
  // Every row carries a timestamp, including the terminal one — `--status`
  // printed «last: undefined» because the row that says WHY the loop ended had
  // no `started`, and that is the row a human most wants dated.
  const started = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  fs.appendFileSync(logFile, JSON.stringify({ started, seconds: 0, exit: null, ...row }) + '\n');
}
