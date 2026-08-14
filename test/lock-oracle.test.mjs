import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';

/**
 * A DIFFERENTIAL ORACLE for the one guard that decides whether TWO PAID AGENTS
 * run on one ledger: `.autopilot.lock`.
 *
 * Every other check in this repo asks the lock whether it is held. This one
 * measures, from outside, **how many processes believed they held it at the
 * same instant** — which is the only question that matters, and the one the
 * unit tests could not ask, because a single process taking a lock twice is
 * exactly the case that always worked.
 *
 * The defect it was written against: reclaiming a stale lock was `rmSync` then
 * `mkdirSync`, two syscalls, so a competitor's remove could land after the
 * winner's create and both walked away holding it. Measured before the fix: 1
 * contended start in 60 with two racers, 23 of 25 with sixty-four, and end to
 * end BOTH agents ran. The precondition is a stale lock — i.e. any previous run
 * that was SIGKILLed, which is the case the reclaim exists for in the first
 * place.
 *
 * Not covered: the clean-directory window between `mkdir` and the `pid` write.
 * It is real (see the wrapper parity test in `carrier-oracle`) and a reviewer
 * sweeping arrival offsets at 150 µs could not land it in either direction; it
 * is estimated at a few tens of microseconds. `takeLock` fails CLOSED there, so
 * the cost is a skipped iteration, not two agents.
 */

const LIB = path.resolve(import.meta.dirname, '..', 'skills', 'autopilot', 'scripts', 'lib.mjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'lock-oracle-'));

/** A pid that is certainly not running: spawn something and wait for it to die. */
function deadPid() {
  const r = spawnSync(process.execPath, ['-e', 'process.exit(0)']);
  return r.pid;
}

/** One racer: take the lock, and if it wins, record WHEN it held it.
 *
 *  The first version of this counted files: one per winner, over a 120 ms hold.
 *  That is not simultaneity. A racer that reclaims a genuinely stale lock after
 *  the previous holder EXITED is a legitimate handover, and it added a second
 *  file — so the oracle reported «2 processes held the lock at once» against a
 *  lock with zero temporal overlap, was red 2 runs in 11 on correct code, and
 *  inflated the number that motivated a fix. The property is an INTERVAL
 *  property; measure intervals. */
const RACER = (lib) => `
import { takeLock, releaseLock } from ${JSON.stringify(lib)};
import fs from 'node:fs';
const [dir, holders] = process.argv.slice(2);
if (takeLock(dir)) {
  const from = Date.now();
  await new Promise((r) => setTimeout(r, 120));
  fs.writeFileSync(holders + '/' + process.pid, from + ' ' + Date.now());
  releaseLock(dir);
}
`;

test('a stale lock is reclaimed by exactly one racer, never two', async () => {
  const root = tmp();
  const racer = path.join(root, 'racer.mjs');
  fs.writeFileSync(racer, RACER(LIB));

  const TRIALS = 8, RACERS = 8;
  const overlaps = [];
  for (let t = 0; t < TRIALS; t++) {
    const dir = path.join(root, `trial-${t}`);
    const lock = path.join(dir, '.autopilot.lock');
    const holders = path.join(dir, 'holders');
    fs.mkdirSync(lock, { recursive: true });
    fs.mkdirSync(holders, { recursive: true });
    fs.writeFileSync(path.join(lock, 'pid'), String(deadPid()));   // stale

    await Promise.all(Array.from({ length: RACERS }, () => new Promise((done) => {
      const c = spawn(process.execPath, [racer, lock, holders], { stdio: 'ignore' });
      c.on('close', done);
    })));

    // Sweep the timeline: how many holders were inside their hold AT ONCE?
    const events = fs.readdirSync(holders)
      .map((f) => fs.readFileSync(path.join(holders, f), 'utf8').split(' ').map(Number))
      .flatMap(([from, to]) => [[from, 1], [to, -1]])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let live = 0, peak = 0;
    for (const [, delta] of events) { live += delta; peak = Math.max(peak, live); }
    if (peak > 1) overlaps.push(`trial ${t}: ${peak} processes held the lock AT ONCE (${events.length / 2} winners over the trial)`);
  }
  assert.deepEqual(overlaps, [],
    `${RACERS} racers against a stale lock, ${TRIALS} trials — the lock is not mutually exclusive:\n  ${overlaps.join('\n  ')}`);
});

test('releasing a lock somebody else now holds is refused', async () => {
  // The operator is TOLD to delete a lock nothing is holding (loop.mjs prints
  // it). After that, an unconditional release from the first process strips the
  // lock from the second, which is mid-iteration and believes it is alone.
  const dir = tmp();
  const lock = path.join(dir, '.autopilot.lock');
  const { takeLock, releaseLock } = await import(LIB);

  assert.equal(takeLock(lock), true, 'first take failed');
  fs.rmSync(lock, { recursive: true });                    // the operator
  fs.mkdirSync(lock);
  fs.writeFileSync(path.join(lock, 'pid'), String(process.pid + 1));   // somebody else

  assert.equal(releaseLock(lock), false, 'it released a lock it did not hold');
  assert.ok(fs.existsSync(lock), 'the other holder’s lock was deleted from under it');

  // …and the holder can still release its own.
  fs.writeFileSync(path.join(lock, 'pid'), String(process.pid));
  assert.equal(releaseLock(lock), true);
  assert.equal(fs.existsSync(lock), false);
});

test('an EMPTY pid file is never «gone»; an EMPTY lock directory is not a life sentence', async () => {
  /**
   * These two states look alike and mean opposite things, and this test used to
   * assert the second one WRONGLY — pinning the defect in place.
   *
   * A lock is now built complete and moved into place in one `rename`, so it is
   * never observable without its pid. Therefore a lock DIRECTORY with no pid
   * file cannot be a taker mid-creation: it is residue from a crash or an older
   * version, and refusing it forever is «a daemon that reports success every
   * interval and never invokes the agent» — the exact failure the lock's own
   * comment warns about. `rename` onto an empty directory succeeds, so that
   * residue is recovered, and onto a non-empty one it fails, so a live lock is
   * never replaced.
   *
   * A pid FILE that is empty or unreadable is a different animal: the directory
   * is not empty, somebody wrote it, and we cannot say who. Fail CLOSED there —
   * one skipped iteration costs nothing, two agents cost money.
   */
  const { takeLock } = await import(LIB);

  const a = path.join(tmp(), '.autopilot.lock');
  fs.mkdirSync(a);
  fs.writeFileSync(path.join(a, 'pid'), '');
  assert.equal(takeLock(a), false, 'an empty pid read as «gone»');

  const b = path.join(tmp(), '.autopilot.lock');
  fs.mkdirSync(b);                                    // residue: no pid file at all
  assert.equal(takeLock(b), true, 'a pidless lock directory is unreclaimable — the loop can never run again');
  assert.equal(Number(fs.readFileSync(path.join(b, 'pid'), 'utf8')), process.pid);
});

test('under contention it returns a boolean — it does not throw into the caller', async () => {
  // `loop.mjs:161` is `if (!takeLock(lock))` with no try. A competitor's reclaim
  // landing between `mkdir` and the pid write threw ENOENT (and EINVAL) out of
  // takeLock six times in 40 trials, so the loop died on a stack trace instead
  // of printing «another iteration is running».
  const root = tmp();
  const racer = path.join(root, 'racer.mjs');
  fs.writeFileSync(racer, `
import { takeLock } from ${JSON.stringify(LIB)};
const [dir] = process.argv.slice(2);
const held = takeLock(dir);
if (typeof held !== 'boolean') { console.error('NOT A BOOLEAN: ' + String(held)); process.exit(9); }
`);
  const threw = [];
  for (let t = 0; t < 6; t++) {
    const dir = path.join(root, `t-${t}`);
    const lock = path.join(dir, '.autopilot.lock');
    fs.mkdirSync(lock, { recursive: true });
    fs.writeFileSync(path.join(lock, 'pid'), String(deadPid()));
    const results = await Promise.all(Array.from({ length: 8 }, () => new Promise((done) => {
      const c = spawn(process.execPath, [racer, lock], { stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      c.stderr.on('data', (d) => { err += d; });
      c.on('close', (code) => done({ code, err }));
    })));
    for (const r of results) if (r.code !== 0) threw.push(`trial ${t}: exit ${r.code} — ${r.err.split('\n')[0]}`);
  }
  assert.deepEqual(threw, [], `takeLock threw into its caller:\n  ${threw.join('\n  ')}`);
});
