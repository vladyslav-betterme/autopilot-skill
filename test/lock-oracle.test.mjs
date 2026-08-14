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

/** One racer: take the lock, and if it wins, announce it in its own file. */
const RACER = (lib) => `
import { takeLock } from ${JSON.stringify(lib)};
import fs from 'node:fs';
const [dir, holders] = process.argv.slice(2);
if (takeLock(dir)) {
  fs.writeFileSync(holders + '/' + process.pid, '');
  // Hold it long enough that a legitimate handover cannot be mistaken for an
  // overlap: nobody releases here, so two files means two simultaneous holders.
  await new Promise((r) => setTimeout(r, 120));
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

    const won = fs.readdirSync(holders);
    if (won.length !== 1) overlaps.push(`trial ${t}: ${won.length} processes held the lock at once`);
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

test('a lock whose pid file has not been written yet is not stolen', async () => {
  // The window between `mkdir` and the `pid` write. Failing CLOSED here costs
  // one skipped iteration; failing open costs two agents.
  const dir = tmp();
  const lock = path.join(dir, '.autopilot.lock');
  fs.mkdirSync(lock);
  const { takeLock } = await import(LIB);
  assert.equal(takeLock(lock), false);
  fs.writeFileSync(path.join(lock, 'pid'), '');
  assert.equal(takeLock(lock), false, 'an empty pid read as «gone»');
});
