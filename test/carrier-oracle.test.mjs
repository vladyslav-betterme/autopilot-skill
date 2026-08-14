import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * ORACLES for the two grammars `carrier.mjs` emits but does not run.
 *
 * §7's second condition says every emitted grammar must be executed by its real
 * interpreter in the check, because that is where the defects that survive
 * rounds live. `--kind cron` was deleted for exactly this reason — nothing here
 * can run a crontab — and the two that remain are covered as follows:
 *
 *   the launchd plist  →  `plutil -lint`, and the wrapper is run under /bin/sh
 *                         (both in autopilot.test.mjs, both since round 2)
 *   the workflow YAML  →  parsed by a REAL YAML reader, here
 *   the cron schedule  →  EXPANDED and compared against the period asked for
 *
 * The schedule oracle exists because a step in a cron field means «every value
 * divisible by N», not «every N»: `--every 45m` fired at :00 and :45 — 48 paid
 * runs a day where 32 were asked for — under a header saying «every 45 min».
 * Asserting that the emitted STRING matched what the code produced said nothing
 * about when it fires. This expands it and measures the gaps.
 *
 * (The step syntax is deliberately not quoted anywhere in this comment: its two
 * characters end a block comment, and that has now broken three files in this
 * repo — twice in carrier.mjs and once here. The habit that catches it is
 * `node --check` on every .mjs after every edit, tests included.)
 */

const SCRIPTS = path.resolve(import.meta.dirname, '..', 'skills', 'autopilot', 'scripts');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'carrier-oracle-'));

const emit = (args, cwd = tmp()) => {
  const res = spawnSync('node', [path.join(SCRIPTS, 'carrier.mjs'), ...args],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { status: res.status, out: res.stdout ?? '', err: res.stderr ?? '' };
};

/** A real YAML reader, or null. Zero dependencies is a rule for the SKILL, not
 *  a reason to leave an emitted grammar unread — so this uses whatever the
 *  machine already has and says so when it has neither. */
function yamlReader() {
  const ruby = spawnSync('ruby', ['-ryaml', '-e', 'puts 1'], { stdio: 'ignore' });
  if (ruby.status === 0) {
    return (text) => {
      const f = path.join(tmp(), 'wf.yml');
      fs.writeFileSync(f, text);
      const r = spawnSync('ruby', ['-ryaml', '-rjson', '-e', 'puts YAML.safe_load(File.read(ARGV[0]), aliases: true).to_json', f], { encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`YAML did not parse: ${(r.stderr ?? '').split('\n')[0]}`);
      return JSON.parse(r.stdout);
    };
  }
  const py = spawnSync('python3', ['-c', 'import yaml'], { stdio: 'ignore' });
  if (py.status === 0) {
    return (text) => {
      const f = path.join(tmp(), 'wf.yml');
      fs.writeFileSync(f, text);
      const r = spawnSync('python3', ['-c', 'import yaml,json,sys;print(json.dumps(yaml.safe_load(open(sys.argv[1]))))', f], { encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`YAML did not parse: ${(r.stderr ?? '').trim().split('\n').pop()}`);
      return JSON.parse(r.stdout);
    };
  }
  return null;
}
const parseYaml = yamlReader();

test('the emitted workflow is read by a real YAML parser', { skip: parseYaml ? false : 'no ruby -ryaml and no python yaml on this machine' }, () => {
  // Round 4: `run: ${agent}` was a plain scalar, so « #» truncated the command
  // silently (a nightly --max-turns cap dropped), «fix issue #42» lost
  // everything after the hash, and a colon-space broke the file outright. The
  // structural assertion that replaced it could not see any of that; a parser
  // can.
  const agents = [
    'claude -p continue --max-turns 20 # nightly cap',
    "claude -p 'fix issue #42'",
    "claude -p 'fix: the bug'",
    'claude -p "100% done"',
    'claude -p go && echo done',
  ];
  for (const agent of agents) {
    const r = emit(['--agent', agent, '--kind', 'github']);
    assert.equal(r.status, 0, `emit failed for ${agent}: ${r.err.split('\n')[0]}`);
    const doc = parseYaml(r.out);
    const steps = doc.jobs.iterate.steps;
    const runStep = steps.find((s) => s.name === 'one iteration');
    assert.ok(runStep, `no agent step for ${JSON.stringify(agent)}`);
    assert.equal(runStep.run.trim(), agent, `YAML changed the command: ${JSON.stringify(runStep.run.trim())}`);
    // …and the switch that keeps it from running must still be wired to it.
    assert.match(String(runStep.if ?? ''), /steps\.stop\.outputs\.halted/, 'the agent step lost its gate');
    const stop = steps.find((s) => s.id === 'stop');
    assert.ok(stop && /halted=/.test(stop.run), 'the stop step stopped setting its output');
  }
});

test('the schedule fires at the period that was asked for', () => {
  /** Every minute of a week that this 5-field expression matches. */
  function fires(expr) {
    const [min, hour, dom, mon, dow] = expr.split(/\s+/);
    const match = (field, value, max) => field.split(',').some((part) => {
      if (part === '*') return true;
      const [range, stepRaw] = part.split('/');
      const step = stepRaw ? Number(stepRaw) : 1;
      if (range === '*') return value % step === 0;
      const [lo, hi] = range.split('-').map(Number);
      // `Number.isNaN(undefined)` is FALSE — undefined is not NaN, it is
      // undefined — so a single value like «0» took `high = undefined` and
      // `value <= undefined` is false. The expander said an hourly schedule
      // never fires, in the oracle that judges whether schedules fire.
      const high = Number.isFinite(hi) ? hi : lo;
      return value >= lo && value <= high && (value - lo) % step === 0;
    });
    const out = [];
    for (let m = 0; m < 7 * 24 * 60; m++) {
      const minute = m % 60;
      const h = Math.floor(m / 60) % 24;
      const day = Math.floor(m / 1440) % 7;
      if (match(min, minute, 59) && match(hour, h, 23) && match(dom, 1 + (day % 28), 31) && match(mon, 1, 12) && match(dow, day, 6)) out.push(m);
    }
    return out;
  }

  for (const [every, minutes] of [['20m', 20], ['30m', 30], ['1h', 60], ['2h', 120], ['6h', 360], ['12h', 720], ['1440m', 1440]]) {
    const r = emit(['--agent', 'x', '--kind', 'github', '--every', every]);
    assert.equal(r.status, 0, `${every} was refused: ${r.err.split('\n')[0]}`);
    const expr = r.out.split('\n').find((l) => l.includes('- cron:'))?.match(/'([^']+)'/)?.[1];
    assert.ok(expr, `no schedule emitted for ${every}`);
    const times = fires(expr);
    assert.ok(times.length > 1, `${every} → ${expr} fires ${times.length} times a week`);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    const wrong = gaps.filter((g) => g !== minutes);
    assert.deepEqual(wrong, [], `${every} → «${expr}» fires with gaps ${[...new Set(gaps)].join(', ')} minutes, not ${minutes}`);
  }
});

test('and a period it cannot express is refused rather than approximated', () => {
  // The other half: an expression that fires MORE often than asked is a cost
  // the owner did not approve, so «I cannot say that» is the only honest answer.
  for (const every of ['45m', '59m', '25m', '90m', '7h', '5h']) {
    const r = emit(['--agent', 'x', '--kind', 'github', '--every', every]);
    assert.equal(r.status, 2, `${every} was accepted and emitted «${r.out.split('\n').find((l) => l.includes('cron:'))?.trim()}»`);
  }
});

test('the emitted wrapper and takeLock agree about what «held» means', async () => {
  /**
   * The wrapper is the copy that runs unattended every interval for weeks, and
   * it was the copy that disagreed. `kill -0 "$(cat pid)"` returns non-zero for
   * an EMPTY argument and for EPERM alike, so it reclaimed in three states
   * `takeLock` correctly refuses — including a live process owned by another
   * user (pid 1 is launchd). Two agents on one ledger is what that buys.
   */
  const { takeLock, LOCK_DIR } = await import(path.join(SCRIPTS, 'lib.mjs'));
  const unxml = (v) => v.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

  const CASES = [
    ['no pid file yet', () => {}],
    ['an empty pid file', (lock) => fs.writeFileSync(path.join(lock, 'pid'), '')],
    ['a live process owned by someone else', (lock) => fs.writeFileSync(path.join(lock, 'pid'), '1')],
    ['a live process of our own', (lock) => fs.writeFileSync(path.join(lock, 'pid'), String(process.pid))],
  ];
  const disagree = [];
  for (const [name, seed] of CASES) {
    const d = tmp();
    // Emitted FROM the case directory, so the wrapper's own `cd` lands here.
    const r = emit(['--agent', 'echo AGENT-RAN', '--kind', 'launchd'], d);
    assert.equal(r.status, 0, r.err.split('\n')[0]);
    const wrapper = unxml(r.out.match(/<string>(cd [\s\S]*?)<\/string>/)?.[1] ?? '');
    assert.ok(/mkdir/.test(wrapper), 'no wrapper in the emitted plist');

    const lock = path.join(d, LOCK_DIR);
    fs.mkdirSync(lock);
    seed(lock);
    const lib = takeLock(lock);
    // The WHOLE wrapper, run by the interpreter launchd would use.
    const sh = spawnSync('/bin/sh', ['-c', wrapper], { cwd: d, encoding: 'utf8' });
    const wrapperRan = /AGENT-RAN/.test(sh.stdout ?? '');
    if (lib !== wrapperRan) {
      disagree.push(`${name}: lib.mjs ${lib ? 'took the lock' : 'refused'}, the wrapper ${wrapperRan ? 'STOLE it and RAN THE AGENT' : 'refused'}`);
    }
  }
  assert.deepEqual(disagree, [], `the unattended copy of the lock is not the tested one:\n  ${disagree.join('\n  ')}`);
});

test('a period cron cannot express in DAYS is refused too', () => {
  // The day field was left unguarded while the minute and hour fields were
  // checked: a day-of-month step divides nothing, because months are 28, 29, 30
  // or 31 days. «Every 28 days» fired 23 times a year instead of 13 — 1.8x the
  // invocations the operator approved, on the carrier that spends money.
  for (const every of ['2880', '4320', '40320']) {
    const r = emit(['--agent', 'x', '--kind', 'github', '--every', every]);
    assert.equal(r.status, 2,
      `--every ${every} minutes was accepted and emitted «${r.out.split('\n').find((l) => l.includes('cron:'))?.trim()}»`);
  }
  const day = emit(['--agent', 'x', '--kind', 'github', '--every', '1440']);
  assert.equal(day.status, 0, 'a daily schedule, which cron DOES express, was refused');
});
