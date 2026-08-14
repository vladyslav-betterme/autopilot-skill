#!/usr/bin/env node
/**
 * The carrier — what runs the loop when the window is closed.
 *
 * §5b is honest that a self-scheduled wakeup lives inside the session: close the
 * window and it is gone. That is a timer in a conversation, not autonomy. This
 * emits the unit that outlives it, for the three carriers a machine actually
 * has, and then **stops**: arming a job that spends tokens unattended is §6's
 * «spending money», so the install command is printed for a human to run and is
 * never run here. A skill that quietly installs a background agent has made the
 * decision that was not its to make.
 *
 *   node carrier.mjs --agent "claude -p 'continue the autopilot loop'"
 *   node carrier.mjs --agent "codex exec 'continue'" --every 15m
 *   node carrier.mjs --agent "…" --kind github > .github/workflows/autopilot.yml
 *
 * Before using this at all, check the rung above it: **if your harness already
 * has a scheduler, use that** — Claude Code's own scheduled agents, a cloud
 * runner, an existing CI cron. This is rung four of the ladder, not rung one.
 *
 * Prints to stdout. Writes nothing, installs nothing, needs no dependencies.
 */
import path from 'node:path';
import { findLedger, projectDirs, LEDGER_HOMES, LOCK_DIR, STOP_FILE } from './lib.mjs';

const root = process.cwd();
/** This file's own path, so the install line it prints can be pasted. It said
 *  `node <skill>/scripts/carrier.mjs`, and a terminal cannot expand that. */
const selfPath = (() => {
  const abs = new URL(import.meta.url).pathname;
  const rel = path.relative(root, abs);
  return rel && !rel.startsWith('../..') ? rel : abs;
})();
const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(name);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  // `--every --kind github` silently scheduled every 30 minutes: the value was
  // missing, the fallback applied, and nobody was told. A money knob may not
  // ignore a malformed value in a file that refuses them everywhere else.
  if (v === undefined || v.startsWith('--')) {
    console.error(`${name} needs a value.`);
    process.exit(2);
  }
  return v;
};
const die = (msg) => { console.error(msg); process.exit(2); };

const agent = flag('--agent');
if (!agent) {
  die('usage: carrier.mjs --agent "<headless agent command>" [--every 30m] [--kind launchd|github]\n' +
    'e.g.  --agent "claude -p \'continue the autopilot loop; read docs/goal.md first\'"\n' +
    'The command must be NON-INTERACTIVE: a carrier cannot answer a prompt.');
}

/** Minutes, from `30m` / `2h` / a bare number. Sub-minute is not a schedule,
 *  it is a fork bomb with a nice name. */
const everyRaw = flag('--every', '30m');
const m = /^(\d+)\s*(m|min|h|hour)?$/i.exec(everyRaw.trim());
if (!m) die(`--every wants 30m, 2h or a number of minutes — got «${everyRaw}»`);
const minutes = Number(m[1]) * (/^h/i.test(m[2] ?? 'm') ? 60 : 1);
if (minutes < 1) die('--every must be at least 1 minute');

const kind = flag('--kind', process.platform === 'darwin' ? 'launchd' : 'github');
/** Two checkouts both called «api» produced one label and one install path in
 *  ~/Library/LaunchAgents: arming the second silently overwrote the first's
 *  plist, launchctl refused the duplicate label, and the job that kept firing
 *  was the FIRST project's — on its repo, with its agent command, while the
 *  operator believed they had armed the second. */
const label = `autopilot.${path.basename(root).replace(/[^a-zA-Z0-9.-]/g, '-')}-${
  (() => { let h = 5381; for (const ch of root) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); })()}`;
// The unit's STOP path is written once, into a file that will run for weeks —
// so an ambiguous ledger is resolved by the human now, not by a guess baked
// into a daemon.
const found = findLedger(root);
const ledgers = found.homes;
/**
 * The PROJECT, not the directory the carrier happened to be run from.
 *
 * The STOP paths were made absolute and project-walked one round ago; the `cd`
 * and the lock two lines below were left cwd-relative. Emitted from
 * `packages/api`, the unit locked `packages/api/.autopilot.lock` while the loop
 * locks the project's — so both agents ran, concurrently, every interval, under
 * a banner promising an overlap lock. The log directory went to the same wrong
 * place, so `--status` read a file the carrier never wrote.
 */
const project = found.homes.length ? found.root : root;
if (ledgers.length > 1) {
  die(`more than one goal.md is in scope, and the emitted unit can only watch one:\n` +
    `${ledgers.map((l) => `  ${path.relative(root, l) || '.'}`).join('\n')}\n` +
    'Keep one, or run this from the directory that owns the ledger.');
}
/**
 * The carrier must watch EVERY path the loop's own stop honours, not one.
 *
 * It baked a single literal path into a daemon while `prove.mjs` accepts nine.
 * A reviewer wrote `STOP` at the project root — exactly where SKILL.md says it
 * may go — and watched the loop stop while the carrier went on invoking the
 * agent every interval, forever, under a banner reading «the same file that
 * stops the loop». It was not the same file.
 */
// ABSOLUTE, and from the same walk `prove.mjs` uses. Nine paths relative to
// cwd are the right set only when the carrier is emitted from the ledger's own
// directory: emitted from `packages/api`, the unit watched `packages/api/docs/STOP`
// while the loop honoured `docs/STOP` two levels up — and the banner even
// PRINTED `../../docs/STOP` as the project's stop path while watching none of it.
const stopPaths = projectDirs(root).flatMap((d) => LEDGER_HOMES.map((h) => path.join(d, h, STOP_FILE)));
const stopPath = ledgers.length ? path.join(ledgers[0], STOP_FILE) : path.join(root, STOP_FILE);
const logDir = 'agent-logs';

/**
 * A minute-field schedule is only correct below an hour. Above it the old
 * expression put a step-1 wildcard in the MINUTE field for anything an hour or
 * longer, so `--every 2h` asked for 720 agent invocations a day instead of 12,
 * under a header reading «every 120 min». §6 approves a cost; that delivered
 * sixty times it. (The old expression is not quoted here: it contains the
 * characters that end a block comment, which is its own small lesson.)
 */
/**
 * GitHub Actions schedules ARE cron expressions, so the expression builder
 * stays even though the crontab EMITTER is gone. The cut was the crontab
 * command line — shell escaping, `%` becoming a newline, an almost-empty PATH,
 * everything on one line — not these five fields.
 *
 * A step in a cron field means «every value of the field divisible by N», not
 * «every N». For a non-divisor it wraps: a 45-minute step fires at :00 and :45
 * — 45 minutes, then 15 — so 48 paid invocations a day where 32 were asked for,
 * under a header saying «every 45 min». cron cannot say what --every means
 * here, so it says so instead of guessing.
 *
 * (Written without the step syntax itself: those two characters END a block
 * comment, and this is the SECOND time that broke this file. The first time is
 * noted forty lines up, which is exactly how much good a note does.)
 */
function cronFor(mins) {
  const divisors = (n) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);
  if (mins < 60) {
    if (60 % mins) {
      die(`a cron schedule cannot fire every ${mins} minutes: «*/${mins}» means «every minute divisible by ${mins}»,\n` +
        `which wraps at the hour — more runs than you asked for, unevenly spaced.\n` +
        `Whole divisors of an hour: ${divisors(60).filter((d) => d < 60).join(', ')} minutes.\n` +
        (process.platform === 'darwin' ? 'Or use --kind launchd, whose StartInterval is exact.' : 'Or run loop.mjs directly, which takes a period rather than a calendar.'));
    }
    return `*/${mins} * * * *`;
  }
  if (mins % 60) {
    die(`a cron schedule has no «every ${mins} minutes»: past an hour it can only fire on whole hours.\n` +
      `Use a whole number of hours (${divisors(24).map((h) => h + 'h').join(', ')}), or --kind launchd for an exact interval.`);
  }
  const hours = mins / 60;
  if (hours < 24) {
    if (24 % hours) {
      die(`a cron schedule cannot fire every ${hours} hours: «*/${hours}» wraps at midnight.\n` +
        `Whole divisors of a day: ${divisors(24).filter((h) => h < 24).map((h) => h + 'h').join(', ')}.`);
    }
    return `0 */${hours} * * *`;
  }
  if (hours % 24) die('past a day, use a whole number of days.');
  const days = hours / 24;
  /**
   * A day-of-month step divides NOTHING: months are 28, 29, 30 or 31 days, so
   * every `N>1` wraps at the month boundary. «Every 28 days» fired 23 times a
   * year instead of 13 — 1.8× the invocations the operator approved. This is
   * the same wrap this function refuses one field up, and it was unguarded here.
   */
  if (days !== 1) {
    die(`a cron schedule cannot fire every ${days} days: a day-of-month step wraps at the end of\n` +
      'every month, so the real period is not the one you asked for. One day is the longest\n' +
      'period cron expresses honestly — for anything longer, schedule it yourself, or use\n' +
      "launchd's StartInterval, which is an exact period.");
  }
  return '0 0 * * *';
}
const cronExpr = kind === 'github' ? cronFor(minutes) : '';

/**
 * The wrapper every carrier runs, and the reason this is not just a cron line.
 *
 *  1. `cd` first: cron and launchd start in `/`, and every path in the ledger
 *     is relative to the project.
 *  2. The STOP file halts the CARRIER too. Otherwise stopping the loop stops
 *     the conversation and leaves a daemon still spending every 30 minutes —
 *     the loop dying while everyone assumes it is running, inverted.
 *  3. An overlap lock. A run that takes longer than the interval otherwise
 *     starts a second agent on the same ledger, and two loops sharing one
 *     goal.md is how a criterion gets marked met twice and landed once.
 *     ponytail: mkdir is the lock because it is atomic everywhere; there is no
 *     staleness timeout, so a crash leaves the lock directory behind — the message
 *     below says to delete it, and that is the whole recovery path.
 */
/**
 * POSIX single-quoting. `JSON.stringify` escapes `"` and `\` and leaves `$`,
 * backtick and `(` alone — so a directory named `proj$(touch pwned)` put a
 * command substitution into a unit that a scheduler runs as the user, every
 * interval, forever. Reproduced from a plist, executed exactly as launchd
 * would. Inside single quotes the shell expands nothing.
 */
const shq = (v) => `'${String(v).replace(/'/g, `'\\''`)}'`;
/** …and every value that reaches the plist is XML. `StandardOutPath` was not
 *  escaped while the wrapper beside it was, so a directory named `a&b<c`
 *  produced a plist that does not parse — and nested names injected balanced,
 *  VALID keys: `RunAtLoad` flipped to true against a hard-coded false. */
const xml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const wrapper = [
  `cd ${shq(project)} || exit 1`,
  `for s in ${stopPaths.map(shq).join(' ')}; do { [ -e "$s" ] || [ -L "$s" ]; } && exit 0; done`,
  // The shell's `kill -0` returns non-zero for an EMPTY argument and for EPERM
  // alike, so the old one-liner reclaimed in three states `takeLock` correctly
  // refuses: no pid file yet, an empty pid, and a live process owned by someone
  // else. «EPERM counts as alive» was true of lib.mjs and false of the copy
  // that actually runs unattended. Fail CLOSED, and only reclaim a pid that is
  // numeric and provably gone.
  `mkdir ${LOCK_DIR} 2>/dev/null || { p=$(cat ${LOCK_DIR}/pid 2>/dev/null); case "$p" in ''|*[!0-9]*) exit 0;; esac; kill -0 "$p" 2>/dev/null && exit 0; ps -p "$p" >/dev/null 2>&1 && exit 0; rm -rf ${LOCK_DIR}; mkdir ${LOCK_DIR} || exit 0; }`,
  `echo $$ > ${LOCK_DIR}/pid; trap 'rm -rf ${LOCK_DIR}' EXIT`,
  `mkdir -p ${logDir}`,
  agent,
  // `;`, never `&&`. Joined with `&&` this reads fine and is silently inert:
  // when STOP is ABSENT the test returns 1, the whole chain short-circuits, and
  // the carrier exits 0 having run nothing — a daemon that reports success
  // every 30 minutes and never once invokes the agent. Caught by running it.
].join('; ');

const LAUNCHD = () => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${xml(label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/sh</string>
    <string>-c</string>
    <string>${xml(wrapper)}</string>
  </array>
  <key>StartInterval</key><integer>${minutes * 60}</integer>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>${xml(path.join(project, logDir, 'carrier.log'))}</string>
  <key>StandardErrorPath</key><string>${xml(path.join(project, logDir, 'carrier.log'))}</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>${xml(process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin')}</string></dict>
</dict>
</plist>`;

const GITHUB = () => `# The only carrier here that survives the laptop being closed — and the only
# one that spends somebody's money on a schedule. Every run costs an agent
# invocation, and a loop with no stopping condition costs it forever: keep the
# STOP file check below, and prefer workflow_dispatch until you have watched a
# few runs.
name: autopilot
on:
  schedule:
    - cron: '${cronExpr}'
  workflow_dispatch:
concurrency:
  group: autopilot-\${{ github.ref }}   # the overlap lock, done by the platform
  cancel-in-progress: false
jobs:
  iterate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - name: is there a STOP file?
        id: stop
        # A bare exit 0 here would end this STEP successfully and GitHub would
        # run the next one anyway — the switch was inert. An output plus an if:
        # is what actually skips the agent.
        run: |
          halted=false
          for s in ${LEDGER_HOMES.map((h) => JSON.stringify(path.join(h, STOP_FILE))).join(' ')}; do
            { [ -e "$s" ] || [ -L "$s" ]; } && halted=true
          done
          echo "halted=$halted" >> "$GITHUB_OUTPUT"
      - name: one iteration
        if: steps.stop.outputs.halted != 'true'
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        # A block scalar, not a plain one. Interpolated bare, the agent command
        # was YAML: a hash truncated it silently (--max-turns 20 # nightly cap
        # ran without the cap), «fix issue #42» lost everything after the hash,
        # and a colon-space broke the file outright.
        run: |
${agent.split('\n').map((l) => '          ' + l).join('\n')}`;

const EMIT = { launchd: LAUNCHD, github: GITHUB }[kind];
if (!EMIT) {
  die(`unknown --kind «${kind}» — launchd or github.\n` +
    (kind === 'cron' || kind === 'linux'
      ? '\ncron was REMOVED, and the reason is worth reading before you ask for it back.\n' +
        'It produced four of this skill\'s findings in three rounds — a minute field that meant\n' +
        '«every minute divisible by N» rather than «every N» (48 paid runs a day where 32 were\n' +
        'asked for), and a `%` that cron turns into a newline, truncating the command mid-quote.\n' +
        'Both survived rounds of review for one reason: nothing in the suite can RUN a crontab,\n' +
        'so no interpreter ever read what was emitted. A grammar nobody checks is where defects\n' +
        'live, and this one spends money on a schedule.\n\n' +
        'On macOS use --kind launchd, whose StartInterval is an exact period.\n' +
        'On Linux use a systemd timer (OnUnitActiveSec is exact too), or just run the loop:\n' +
        '  nohup node <skill>/scripts/loop.mjs --agent "…" &\n' +
        'loop.mjs already owns the stopping conditions a schedule cannot express.'
      : ''));
}

console.log(EMIT());

const install = {
  launchd: `  mkdir -p ~/Library/LaunchAgents\n` +
    `  node ${selfPath} --agent … > ~/Library/LaunchAgents/${label}.plist\n` +
    `  launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/${label}.plist\n` +
    `  launchctl kickstart -p gui/$(id -u)/${label}      # fire once now, and watch ${logDir}/carrier.log\n` +
    `  launchctl bootout gui/$(id -u)/${label}           # remove it`,
  github: `  commit it as .github/workflows/autopilot.yml, set the ANTHROPIC_API_KEY secret,\n` +
    `  then run it once from the Actions tab (workflow_dispatch) BEFORE letting the schedule have it.`,
}[kind];

console.error(`\n# ── not installed ──────────────────────────────────────────────
# This printed a unit. It did not arm anything: a job that runs an agent
# unattended spends money on a schedule, which §6 says is yours to approve.
#
# To arm it:
${install}
#
${kind === 'github'
  ? `# It halts on any of these paths INSIDE THE CHECKOUT: ${LEDGER_HOMES.map((h) => path.join(h, STOP_FILE)).join(' ')}\n` +
    `# — which means a STOP that stops your local loop does NOT stop this one until\n` +
    `# it is committed and pushed. That is the price of a carrier that runs on\n` +
    `# somebody else's machine, and it is the difference between this and launchd.`
  : `# It halts on ANY of: ${stopPaths.join(' ')}\n` +
    `# — the same set prove.mjs honours, so stopping the loop cannot leave a daemon\n` +
    `# iterating without it. (${stopPath} is the one this project's ledger implies.)`}
${kind === 'github' ? '# (the lock and the log below are launchd-only — Actions gives you its own run log)' : ''}
# If a run crashes, ${LOCK_DIR} is left behind and every later run exits 0
# doing nothing: delete the directory to resume.
# Logs: ${path.join(logDir, 'carrier.log')} — read it after the first fire, or you have
# armed something you have never seen run.`);
