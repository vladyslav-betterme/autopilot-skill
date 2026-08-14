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
 *   node carrier.mjs --agent "codex exec 'continue'" --every 15m --kind cron
 *   node carrier.mjs --agent "…" --kind github > .github/workflows/autopilot.yml
 *
 * Before using this at all, check the rung above it: **if your harness already
 * has a scheduler, use that** — Claude Code's own scheduled agents, a cloud
 * runner, an existing CI cron. This is rung four of the ladder, not rung one.
 *
 * Prints to stdout. Writes nothing, installs nothing, needs no dependencies.
 */
import path from 'node:path';
import { findLedgerHomes, LEDGER_HOMES, STOP_FILE } from './lib.mjs';

const root = process.cwd();
const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(name);
  const v = i === -1 ? null : argv[i + 1];
  return v && !v.startsWith('--') ? v : fallback;
};
const die = (msg) => { console.error(msg); process.exit(2); };

const agent = flag('--agent');
if (!agent) {
  die('usage: carrier.mjs --agent "<headless agent command>" [--every 30m] [--kind launchd|cron|github]\n' +
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

const kind = flag('--kind', process.platform === 'darwin' ? 'launchd' : 'linux');
const label = `autopilot.${path.basename(root).replace(/[^a-zA-Z0-9.-]/g, '-')}`;
// The unit's STOP path is written once, into a file that will run for weeks —
// so an ambiguous ledger is resolved by the human now, not by a guess baked
// into a daemon.
const ledgers = findLedgerHomes(root);
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
const stopPaths = LEDGER_HOMES.map((h) => path.join(h, STOP_FILE));
const stopPath = ledgers.length ? path.join(path.relative(root, ledgers[0]) || '.', STOP_FILE) : STOP_FILE;
const logDir = 'agent-logs';

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
 *     staleness timeout, so a crash leaves .carrier.lock behind — the message
 *     below says to delete it, and that is the whole recovery path.
 */
const wrapper = [
  `cd ${JSON.stringify(root)} || exit 1`,
  `for s in ${stopPaths.map((p) => JSON.stringify(p)).join(' ')}; do [ -e "$s" ] && exit 0; done`,
  `mkdir .carrier.lock 2>/dev/null || exit 0`,
  `trap 'rmdir .carrier.lock' EXIT`,
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
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/sh</string>
    <string>-c</string>
    <string>${wrapper.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</string>
  </array>
  <key>StartInterval</key><integer>${minutes * 60}</integer>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>${path.join(root, logDir, 'carrier.log')}</string>
  <key>StandardErrorPath</key><string>${path.join(root, logDir, 'carrier.log')}</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>${process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin'}</string></dict>
</dict>
</plist>`;

const CRON = () => `# every ${minutes} min — autopilot carrier for ${root}
# PATH is set explicitly: cron's is nearly empty, and «command not found» in a
# job nobody watches looks exactly like «the loop is quietly working».
PATH=${process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin'}
*/${minutes < 60 ? minutes : 1} ${minutes < 60 ? '*' : `*/${Math.round(minutes / 60)}`} * * * /bin/sh -c '${wrapper.replace(/'/g, `'\\''`)}' >> ${path.join(root, logDir, 'carrier.log')} 2>&1`;

const GITHUB = () => `# The only carrier here that survives the laptop being closed — and the only
# one that spends somebody's money on a schedule. Every run costs an agent
# invocation, and a loop with no stopping condition costs it forever: keep the
# STOP file check below, and prefer workflow_dispatch until you have watched a
# few runs.
name: autopilot
on:
  schedule:
    - cron: '*/${minutes < 60 ? minutes : 1} ${minutes < 60 ? '*' : `*/${Math.round(minutes / 60)}`} * * *'
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
      - name: stop file halts the carrier too
        run: 'for s in ${stopPaths.join(' ')}; do [ -e "$s" ] && exit 0; done; true'
      - name: one iteration
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: ${agent}`;

const EMIT = { launchd: LAUNCHD, cron: CRON, linux: CRON, github: GITHUB }[kind];
if (!EMIT) die(`unknown --kind «${kind}» — launchd, cron or github`);

console.log(EMIT());

const install = {
  launchd: `  mkdir -p ~/Library/LaunchAgents\n` +
    `  node <skill>/scripts/carrier.mjs --agent … > ~/Library/LaunchAgents/${label}.plist\n` +
    `  launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/${label}.plist\n` +
    `  launchctl kickstart -p gui/$(id -u)/${label}      # fire once now, and watch ${logDir}/carrier.log\n` +
    `  launchctl bootout gui/$(id -u)/${label}           # remove it`,
  cron: `  crontab -l > /tmp/ct; node <skill>/scripts/carrier.mjs --agent … >> /tmp/ct; crontab /tmp/ct\n` +
    `  crontab -l    # read it back — this is the step people skip\n` +
    `  crontab -e    # remove the block to stop it`,
  github: `  commit it as .github/workflows/autopilot.yml, set the ANTHROPIC_API_KEY secret,\n` +
    `  then run it once from the Actions tab (workflow_dispatch) BEFORE letting the schedule have it.`,
}[kind === 'linux' ? 'cron' : kind];

console.error(`\n# ── not installed ──────────────────────────────────────────────
# This printed a unit. It did not arm anything: a job that runs an agent
# unattended spends money on a schedule, which §6 says is yours to approve.
#
# To arm it:
${install}
#
# It halts on ANY of: ${stopPaths.join(' ')}
# — the same set prove.mjs honours, so stopping the loop cannot leave a daemon
# iterating without it. (${stopPath} is the one this project's ledger implies.)
# If a run crashes, .carrier.lock is left behind and every later run exits 0
# doing nothing: delete the directory to resume.
# Logs: ${path.join(logDir, 'carrier.log')} — read it after the first fire, or you have
# armed something you have never seen run.`);
