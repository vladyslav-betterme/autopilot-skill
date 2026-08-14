/**
 * The questions more than one script asks — asked in ONE place.
 *
 * Written after a review council found the shape this skill warns about most:
 * `discover.mjs` listed `notes/` as a memory home while `bootstrap.mjs` had its
 * own shorter list, so a project keeping its knowledge in `notes/` was told
 * «memoryHomes: [notes]» and then handed a second ledger at the root. Two
 * answers to one question, in the tool that teaches against it.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** 'file' | 'dir' | null, RESOLVING symlinks — the one question, asked one way.
 *  A dirent's isFile()/isDirectory() do not follow links and statSync does;
 *  mixing the two is how a symlinked home got its real files overwritten. */
export function statKind(abs) {
  try {
    const st = fs.statSync(abs);
    return st.isFile() ? 'file' : st.isDirectory() ? 'dir' : null;
  } catch {
    return null;
  }
}

/** Where durable knowledge lives in the wild. Order matters: most specific first. */
export const MEMORY_HOMES = [
  'CLAUDE.md', 'AGENTS.md', 'CONTRIBUTING.md',
  'docs/learnings', 'docs/decisions', 'docs/adr', 'docs/architecture', 'docs/notes', 'notes',
  'GOAL.md', 'TODO.md', 'ROADMAP.md',
  'CHANGELOG.md', 'docs/CHANGELOG.md',
];

/** Directories a ledger file could already be sitting in. Same list for the
 *  home election and for the «does this already exist» scan — if they differ,
 *  the script elects one place and checks another. */
export const LEDGER_ROOTS = ['.', 'docs', 'notes', '.github'];

/**
 * Where the ledger itself can LIVE — the election list AND the search list.
 *
 * These were two lists answering one question: `bootstrap.mjs` elected a home
 * from `MEMORY_HOMES + docs + .` (so a repo with `docs/learnings/` got its
 * ledger there), while the runner searched `LEDGER_ROOTS`, which does not
 * include it. A critic reproduced the consequence: bootstrap announces a home,
 * the owner writes `STOP` where it said, and the loop never sees it.
 *
 * Most specific first: election takes the first that exists, the search takes
 * any. `LEDGER_ROOTS` above answers a DIFFERENT question — where to scan, one
 * level deep, for a knowledge file this project already keeps under another
 * name — and its depth-1 walk covers every entry here.
 */
export const LEDGER_HOMES = [
  'docs/learnings', 'docs/decisions', 'docs/adr', 'docs/architecture', 'docs/notes',
  'notes', 'docs', '.github', '.',
];

/** The file that halts an unattended run. One name, asked for in one place —
 *  a stop the loop has to REMEMBER to honour is not a stop. */
export const STOP_FILE = 'STOP';

/** ONE lock for every shape of iteration — a scheduled carrier firing while a
 *  human drives `loop.mjs` is two agents on one ledger, which is how a criterion
 *  gets marked met twice and landed once. Two lock names would be two answers
 *  to one question. */
export const LOCK_DIR = '.autopilot.lock';

/**
 * A directory entry by its EXACT name.
 *
 * `statKind` asks the filesystem, and macOS says `GOAL.md` is `goal.md`. A
 * critic reproduced the consequence: a project carrying its own root `GOAL.md`
 * had that file elected as this loop's ledger, so a `STOP` written where
 * bootstrap said to write it was ignored and the run's results were appended to
 * a file the project already owned.
 */
const hasExactly = (dir, name) => {
  try { return fs.readdirSync(dir).includes(name); } catch { return false; }
};
const present = (p) => { try { fs.lstatSync(p); return true; } catch { return false; } };

/**
 * This directory and its parents, up to the project boundary.
 *
 * A loop that runs its check from a workspace subdirectory used to see no
 * ledger and no STOP at all — `process.cwd()` was taken as the project and
 * nothing walked up. Bounded by `.git`, by $HOME and by twelve levels, so it
 * can never wander into a ledger that belongs to something else.
 */
/** The path as the filesystem really sees it. On macOS `/var` is a symlink to
 *  `/private/var`, so a home under a temp dir compares unequal to `os.homedir()`
 *  and the boundary below never fires — caught by re-running the reviewer's
 *  reproduction after «fixing» it. */
export const realPath = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };

export function projectDirs(start) {
  const dirs = [];
  const homeRaw = os.homedir();
  // An EMPTY $HOME made `realPath('')` return the cwd, so `dir === home` matched
  // on iteration 0 for every project and the walk returned NOTHING — and every
  // consumer reads nothing as «I looked and there was none»: no STOP, no ledger,
  // and the piped-check guard silently off. Fail closed, not open.
  const home = homeRaw ? realPath(homeRaw) : null;
  let dir = realPath(start);
  // 40, not 12: at 13 directories below a repo root the STOP silently vanished
  // and the check ran green. The $HOME and `.git` boundaries do the real work;
  // this is only a runaway guard, and walking forty directories costs nothing.
  for (let i = 0; i < 40; i++) {
    // The directory you are STANDING IN is always scanned, even if it is $HOME:
    // the defect this boundary exists for was wandering UP into `~/notes`, not
    // reading the project someone is actually in. A dotfiles repo, a notes
    // vault, «run the loop on my home directory» — all elected a ledger that
    // the runner could then never see, and a STOP that never halted anything.
    dirs.push(dir);
    if (hasExactly(dir, '.git')) break;
    const up = path.dirname(dir);
    if (up === dir || up === home) break;
    dir = up;
  }
  return dirs;
}

/** The STOP file, searched the same way — but ANY hit halts. A stop that is
 *  missed is fatal and a stop that is over-eager costs one deletion, so this is
 *  deliberately the more sensitive of the two searches. `lstat`, because a
 *  broken symlink named STOP is a stop file that `existsSync` calls absent. */
export function findStopFile(start) {
  for (const dir of projectDirs(start)) {
    for (const r of LEDGER_HOMES) {
      const p = path.join(dir, r, STOP_FILE);
      if (present(p)) return p;
    }
  }
  return null;
}

/**
 * Every file under the ledger roots (and one level below them) whose NAME MEANS
 * one of `stems` — synonyms included, because the name is not the knowledge: a
 * project keeping `defect-patterns.md` already has a failures ledger.
 *
 * Case-insensitive on purpose: macOS filesystems are, so `changelog.md` and
 * `CHANGELOG.md` are the same file and a case-sensitive check invents a
 * conflict the OS then silently resolves.
 */
export function findExisting(root, ...stems) {
  const re = new RegExp(`^(${stems.join('|')})(s)?\\.md$`, 'i');
  const out = [];
  const scan = (rel, depth) => {
    const dir = path.join(root, rel);
    if (statKind(dir) !== 'dir') return; // a `docs` that is a FILE used to throw ENOTDIR
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // unreadable is not «absent», but it is also not a crash
    }
    for (const e of entries) {
      const kind = statKind(path.join(dir, e.name));
      if (kind === 'file' && re.test(e.name)) out.push(path.join(rel, e.name));
      else if (kind === 'dir' && depth > 0 && !e.name.startsWith('.') && e.name !== 'node_modules') {
        scan(path.join(rel, e.name), depth - 1);
      }
    }
  };
  for (const r of LEDGER_ROOTS) scan(r, 1);
  return out;
}

/** The nearest `name` at or above `start`, within the project boundary — the
 *  same walk the ledger uses. `npm` walks up to find package.json and the
 *  runner did not, so the same file with the same pipe, run one directory
 *  down, was reported green. */
export function findUp(start, name) {
  for (const dir of projectDirs(start)) {
    if (hasExactly(dir, name)) return path.join(dir, name);
  }
  return null;
}

/** Is this a map of servers, or something that only looks like one?
 *
 *  Asked in ONE place because the READER was hardened and the WRITER one file
 *  over was not: `{"mcpServers":["legacy"]}` made `new-mcp` print «registered»
 *  and exit 0 while `JSON.stringify` silently dropped the named property it had
 *  set on an array — and `{"mcpServers":"see ./servers.d"}` crashed with a raw
 *  TypeError. `tools.mjs` refused both, in the same commit. */
export function serverMapProblem(map) {
  if (map === undefined || map === null) return null;
  if (Array.isArray(map)) return 'an array';
  if (typeof map !== 'object') return typeof map;
  return null;
}

/**
 * The ledger home(s) AND the project directory they were found in — ONE walk,
 * ONE function, because this question has cost this repo five fatals.
 *
 * It was two functions for a while: `findLedgerHomes` returned only the homes,
 * `findLedger` returned the homes and the root, and three scripts used the
 * first while one used the second. Nothing was broken YET — and «two answers
 * to one question, not yet diverged» is precisely the state every one of those
 * five fatals was in the day before it diverged. An oracle written to catch
 * that shape could not even demonstrate itself against this file, because
 * patching one function left the other one right. That was the tell.
 *
 * Returns MORE THAN ONE home when the answer is genuinely ambiguous — a project
 * with its own `goal.md` beside the elected home. Callers must refuse rather
 * than pick: guessing is what wrote a loop's results into somebody's own file.
 */
export function findLedger(start) {
  for (const dir of projectDirs(start)) {
    const hits = LEDGER_HOMES.map((r) => path.join(dir, r)).filter((d) => hasExactly(d, 'goal.md'));
    if (hits.length) return { homes: hits, root: dir };
  }
  return { homes: [], root: realPath(start) };
}

/**
 * Take `dir` as a lock, reclaiming it from a holder that is gone.
 *
 * Without the PID check, one SIGKILL — the only signal that could stop the
 * synchronous loop — left the lock forever, and the carrier's wrapper is
 * `mkdir … || exit 0`: a daemon that reports success every interval and never
 * invokes the agent, which is the exact failure its own comment warns about.
 */
const pidIn = (dir) => Number((() => {
  try { return fs.readFileSync(path.join(dir, 'pid'), 'utf8'); } catch { return ''; }
})().trim());

/** Alive, or belongs to somebody we may not signal — both mean «not gone». */
function holderLives(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch (err) { return err.code === 'EPERM'; }
}

/** A synchronous pause. The claim below must be verified AFTER any racer has
 *  had time to write its own pid, and `takeLock` has no async caller. */
function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const CLAIM_SETTLE_MS = 50;

export function takeLock(dir) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let created = false;
    try {
      fs.mkdirSync(dir);
      created = true;
    } catch {
      const pid = pidIn(dir);
      if (!pid) return false;              // mid-creation, or an empty pid: fail CLOSED
      if (holderLives(pid)) return false;  // a real holder, possibly another user's
      /**
       * The holder is gone. Move the stale directory aside — `rename` is one
       * atomic step, so only one process can move any given instance of it —
       * and then CHECK WHAT WE MOVED. Deciding «this pid is dead» and removing
       * the directory are two steps, and in between a competitor can have
       * reclaimed and created its own live lock at the same path: without this
       * check we then delete a FRESH lock, which is how eight racers produced
       * three to six simultaneous holders in the oracle.
       */
      const aside = `${dir}.stale-${process.pid}-${attempt}`;
      try { fs.renameSync(dir, aside); } catch { continue; }
      const moved = pidIn(aside);
      if (moved !== pid || holderLives(moved)) {
        try { fs.renameSync(aside, dir); } catch { /* somebody took the name; it is theirs */ }
        continue;
      }
      try { fs.rmSync(aside, { recursive: true, force: true }); } catch { /* it is out of the way */ }
      continue;
    }
    if (created) {
      fs.writeFileSync(path.join(dir, 'pid'), String(process.pid));
      /**
       * THE CLAIM IS NOT THE DIRECTORY, IT IS THE PID FILE.
       *
       * Every path above ends with the winner writing its pid here, so if two
       * processes both believed they created the lock, the file ends up naming
       * exactly ONE of them. Wait for any racer to have written, then read it
       * back: whoever is not named lost, and says so. That turns every residual
       * race — and there are residual races, because «is it stale» and «remove
       * it» cannot be made one syscall — into at most one holder, which is the
       * only property that matters (two agents on one ledger is what a second
       * holder buys).
       */
      pause(CLAIM_SETTLE_MS);
      if (pidIn(dir) !== process.pid) return false;
      return true;
    }
  }
  return false;
}

/**
 * Release ONLY what we still hold.
 *
 * An unconditional delete stripped the lock from a process that had legitimately
 * taken it after an operator cleared a stale one — `loop.mjs` prints that
 * instruction itself — so a third process could then acquire it while the second
 * was mid-iteration.
 */
export function releaseLock(dir) {
  try {
    if (Number(fs.readFileSync(path.join(dir, 'pid'), 'utf8').trim()) !== process.pid) return false;
    fs.rmSync(dir, { recursive: true });
    return true;
  } catch { return false; }
}

/**
 * Is this ledger file safe to APPEND to?
 *
 * `findLedger` accepts a directory because it contains an entry named
 * `goal.md`, and `appendFileSync` follows a symlink. A repository shipping
 * `docs/goal.md -> ../../../.zshrc` therefore had the loop's own records
 * written outside the project — and because a record is
 * «- **prove** `<command>` → 0», sourcing that file RAN the backticked command.
 * `bootstrap.mjs` refuses through a link with `flag: 'wx'` and `findStopFile`
 * uses `lstat`; this one path did neither.
 */
export function ledgerWritable(file, root) {
  let st;
  try { st = fs.lstatSync(file); } catch { return 'is not there'; }
  if (st.isSymbolicLink()) {
    const target = realPath(file);
    const inside = target === realPath(root) || target.startsWith(realPath(root) + path.sep);
    return inside ? null : `is a symlink pointing outside the project, at ${target}`;
  }
  if (!st.isFile()) return 'is not a regular file';
  return null;
}

