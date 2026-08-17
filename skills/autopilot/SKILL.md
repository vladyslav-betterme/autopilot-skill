---
name: autopilot
description: >-
  Use to run autonomous work on ANY project until a goal is actually met —
  «працюй автономно», «продовжуй», /loop, a Ralph-style loop, an unattended
  campaign, or setting a repo up so an agent can drive it. Code, documents,
  data, research, infrastructure, ops: it works the way an outsourced team does
  — repairs the environment it was handed, picks the skills THIS task needs
  (already installed, catalogued, or one of ECC's 285), hands small parcels to
  subagents and integrates their work itself. It discovers what «done» means
  here, arms itself with the skills AND the reach the work needs (public skills,
  MCP servers, plugins, connectors — writing the MCP server when none exists),
  and iterates as a real process that stops on a STOP file, a budget or thrash.
  Steerable mid-flight, carryable by launchd or CI so it outlives the
  session, and on a full context it checkpoints into its ledger and compacts
  instead of stopping. Every check is run by something that is not writing the
  summary; every criterion is verified by someone that is not you; every win,
  failure and decision is recorded, and repeated wins become new skills.
---

# Autopilot

An autonomous loop that is portable because it **asks the work what «done»
means** instead of assuming — and does not stop until that answer is satisfied.

Three claims this skill exists to make impossible:

- «It works» when nothing ran it.
- «It's done» when the only judge was the one who did it.
- «I worked on it» with no record of what was tried, what failed, and why.

The subject does not matter. A refactor, a migration, a report, a dataset, a
render farm, a cluster: the loop below is identical and only the **check**
differs.

## 0. Bootstrap — once per project

`<skill>` below is the directory this file sits in — `.agents/skills/autopilot`
after a CLI install, or wherever it was cloned. Run everything from the PROJECT
root.

```bash
node <skill>/scripts/discover.mjs        # checks, memory homes, danger signals, workshop readiness
node <skill>/scripts/bootstrap.mjs       # creates the ledger if absent
node <skill>/scripts/skills.mjs --for "<the task, in words>"   # the skills THIS task needs
node <skill>/scripts/tools.mjs           # what this machine can already REACH: MCP servers, plugins
```

`discover` prints the project's own check command. **That command is the
definition of done for every iteration below.**

If it prints `checks: []`, **do not believe it yet.** Discovery only reads files
that declare a check; a project's real check is often named in prose. Grep every
path it listed in `memoryHomes`, plus the README and CI config, for a runnable
command — one project's `checks: []` sat next to a `CLAUDE.md` naming
`./tests/run_all.sh`, which ran 63 tests in four seconds, while the check an
agent would have invented (`node --check`) was green on a dead app.

Only when that search comes back empty does the project genuinely have no
automatic check — common for prose, research and ops, and **not permission to
judge your own work**. Agree on an acceptance check *before* iteration one and
write it into the goal (§1). Any of these is a check; «I reviewed it and it
looks right» is not:

| The work | A check that is not your own opinion |
|---|---|
| code | a command that exits 0, run in the foreground |
| a document | a claim-by-claim list with a source or a command per claim |
| data | a query someone else can re-run that returns the expected shape |
| infra / ops | an observation from the system itself, before and after |
| research | the query or extraction that produces the number, plus the result you registered IN ADVANCE as refuting it — both re-runnable by someone else |

Read what discovery found before touching anything:

- **`memoryHomes`** — where durable knowledge already lives. Use those files.
  Never create a second `CHANGELOG.md`, a second learnings directory, a second
  `AGENTS.md`. A second home for one kind of knowledge is the most common way an
  agent makes a repo worse.
- **`signals.envFilesPresent`** and **`signals.remote`** — before the first
  iteration, **ask** whether the working environment points at production. It has
  been, on projects where nothing in the repo said so and every local run looked
  harmless. Assume yes until told otherwise.
- **`signals.vcs`** — `none` means no undo exists. Copy the inputs somewhere
  safe before iteration one, and say where in `goal.md`; §8's «commit what is
  green» has no meaning here and that is exactly when work is lost.
- **`signals.dirty`** — uncommitted work is somebody's. Branch, never build on top.

### The workshop before the work

**`readiness`** is the part of discovery that is about the environment rather
than the task: dependencies declared and not installed, `node_modules` older than
the lockfile, a python project with no virtualenv, keys `.env.example` declares
and `.env` does not (names only — never let a value reach a log), a pinned
runtime nobody is running, and **git with no committer identity, which makes
every commit this loop tries fail**. Each row carries the evidence and, where the
answer is certain, the command.

**Fix those FIRST, and fix them as work, not as a footnote.** A red baseline
caused by an unbuilt workshop is not your iteration's fault — but a loop that
starts anyway spends the campaign fixing code that was never broken, and books
the environment's red as its own. So: run the printed commands (announced, in
order — `npm ci` runs the project's install scripts, so it is somebody's code
and §6 applies to anything metered or irreversible), then re-run the baseline and
paste the new one into `goal.md` beside the old.

**Then do the same for the SERVICE the work runs against**, which no file on disk
can answer. `tools.mjs` lists what is configured; only a call tells you what is
live. Before iteration one, exercise each service the goal depends on once,
harmlessly — read one row, list one bucket, describe one project, `--version` the
CLI — and write the result into `goal.md` as the workshop baseline. A server that
is configured and dead reads exactly like «no such tool» (`references/tooling.md`,
rung 0), and finding that out in iteration nine costs the whole run. What is
misconfigured and yours to fix, fix; what needs a human (an OAuth flow, a key you
do not have) is PARKED with both options and their costs, §6.

Anything you repaired is worth a line in `decisions.md` — the next session
inherits the workshop, and «why is this configured like that» is a question that
otherwise gets answered by re-breaking it.

### Arm yourself — for THIS task, not in general

**A team that outsources does not hire generalists twice; it staffs the job in
front of it.** So arming is per TASK, and the one command that answers it names
the task in words:

```bash
node <skill>/scripts/skills.mjs --for "migrate the billing schema to postgres"
```

Three lanes, in the order you should spend from: **already installed** (this
project, `$HOME`, every installed plugin — free, because it is already loaded and
already paid for, and a fourth skill for a job three installed ones do is the
expensive mistake); **the catalogue** below, by tag; then **ECC**
(`affaan-m/ECC`) — 285 community skills reaching far past the catalogue, at
community quality, **one at a time and never its plugin**, which would put all
285 descriptions on every turn.

Two things it deliberately will not do: it prints **no install line for a WEAK
lead** — one shared word is a coincidence, and installing on one is how a machine
collects skills nobody chose — and it reports an unreachable index as
*unavailable*, because «I could not reach GitHub» is not «nothing matches», and a
selector that cannot tell them apart turns an outage into a decision.

The catalogue's own tags are the vocabulary — `any` and `review` on every
project, then `web`, `react`, `db`, `docs`, `perf`, `a11y`, `mac`, `infra`,
`research`, `design` as the project actually needs them:

```bash
node <skill>/scripts/skills.mjs                            # the catalogue and its tags
node <skill>/scripts/skills.mjs --install any --dry-run    # what it WOULD run
node <skill>/scripts/skills.mjs --install any              # the always-useful set
node <skill>/scripts/skills.mjs --install react,perf,db    # this project's niches
npx skills add affaan-m/ECC -s <one-skill> -y              # ECC, one skill at a time
```

**Choose, do not hoard.** Every installed skill's description is loaded on every
turn: a hundred skills is not a hundred capabilities, it is a smaller window and
a model that skims.

Installing is running third-party code with your permissions, so it is an
announced act: `--dry-run` first, say what you are about to add and why, then
install. **Read the SKILL.md before you install it** — that goes double for ECC,
which is community-sourced and whose installer prints a per-skill risk rating
worth reading rather than scrolling past. If the project matches no niche in the
catalogue, `any` alone is the correct answer — and `find-skills` is the entry
point for a niche nothing above covers.

**Then measure what you just spent.** `skill-cleaner` comes with the `any` set
and is how «choose, do not hoard» stops being advice:

```bash
node --experimental-strip-types <skills-root>/skill-cleaner/scripts/skill-cleaner.ts \
  --root .agents/skills --root-only --no-logs
```

It reports the budget the installed descriptions occupy, duplicates (two skills
answering one question — the defect this loop hunts, one level up), and long
descriptions worth compressing. **Act on it**: uninstall what this project does
not use, and merge a duplicate rather than keeping both. An audit you read and
ignore costs the same context as no audit.

### Skills are half of it — the other half is reach

`skills.mjs` says what the agent KNOWS. `tools.mjs` says what it can TOUCH: the
MCP servers it finds **in the config files it knows how to read**, the plugins
that carry more, and what nothing on disk can tell you. **An empty result means
«not in these files», never «not on this machine».**

```bash
node <skill>/scripts/tools.mjs
```

**A capability you lack is not a reason to narrow the goal.** It is a ladder —
already reachable → **the app's own CLI** → a public server → a connector (park
it, §6) → write one with `new-mcp.mjs`. The rungs, what each one costs and the
traps in every one of them are in **`references/tooling.md`; read it before
building anything**, because the two failures it prevents are invisible from
here: deciding a capability is missing when it is already configured, and
building a second answer to a question something already answers.

**The one that will bite:** most harnesses read their MCP config at STARTUP, so
a server written mid-run is usually invisible to the session that wrote it. That
is why the scaffold is *also* a CLI — `node server.mjs --call <tool> '<json>'`,
the same handlers. Use that form now and let the next session get the server.
«Continue after a restart» is a stalled loop holding a file.

Then, throughout: what you learn here becomes a skill of its own (§5), written
by the loop and used the same session — and a capability it lacked becomes a
tool of its own, used the same way.

## 1. The goal — the thing the loop runs until

Before iteration one, write down **one falsifiable sentence** and **2–5
done-criteria**. Into `goal.md`, or whatever discovery found already holds this.

- Falsifiable: «make X better» cannot be. «Every path that spends money is
  behind an explicit tap, and each one is held by a type or a failing test» can.
- Each criterion must be checkable **by someone who is not you** — the same bar
  as §0. A criterion only you can confirm is not a criterion; rewrite it.
- Unknowns are allowed, as criteria of their own: «we know whether N is the
  cause» is a legitimate done-criterion for research.
- **A big goal is reached through small ones, and the criteria ARE that
  decomposition** — each a slice that can be landed, checked and verified on its
  own. A criterion too large for one iteration gets split into criteria of its
  own; depth is fine, and every level keeps the same bar (checkable by someone
  who is not you). A level that stops being falsifiable is a plan, not a
  criterion.
- **A capability you lack is a criterion, not a detour.** «The loop can drive X
  headlessly, proven by one round-trip» goes in the table beside the work it
  unblocks (`references/tooling.md`). Written down, building a tool is bounded
  and its absence is visible; not written down, it becomes an afternoon that
  produced no criterion and reads as progress.
- **If nobody gave you a goal** — «продовжуй» and nothing else — the first
  iteration's ONLY output is a proposed `goal.md` and the question for the
  human. A criterion you authored and then satisfied is claim #2 above, wearing
  a checklist.
- `goal.md` also carries the FIXED state: the check command, its baseline
  output, the answer to the production question, the branch (or where the copy
  of the inputs is), and which skills were installed. A resume that has to
  re-derive those has not resumed.

**The loop then runs until every criterion is met AND verified.** Not until the
model feels finished, not until the critics go quiet — they never do. Each
iteration ends by marking in `goal.md` which criterion moved and what proves it.

Stop the loop early only for the reasons in §6 (ask), §7 (thrash) and §8
(context).

## 2. The iteration

One iteration = one landed change, checked, verified, recorded. Not one file,
not one turn.

**Pick.** From the goal's unmet criteria. If several are open, take the one
whose failure would invalidate the most other work — order by risk×reach, not by
what is easy.

**Understand before you shorten.** Trace the real thing end to end. Then, before
building anything new, ask whether it already exists — see
`references/premise-check.md`, the single highest-yield habit in this skill and
the one that took longest to learn.

**Build** the smallest thing that is actually correct. Root cause, not the
symptom the request names: find every other place with the same shape first, and
fix it where they all pass through.

**When a guard normalises and then decides, delete the pipeline.** Whatever
normalises is where the next defect lives, because it looks like plumbing and
nobody reviews plumbing. This skill learned it three times, and all three diffs
were SHORTER than what they replaced: a check and a write that each computed
their own path became one derived path; three `String.replace` stages in front
of a whitelist became one scanner that tracks quote state; two functions
answering «where does the state live» became one. The tell is that a fix keeps
being correct and the next round keeps finding the stage before it.

### 2b. The crew — parcels out, one integrator

**When the criterion is bigger than one sitting, staff it instead of grinding
it.** A team that takes an outsourced job does not put one person on everything;
it cuts the work into pieces that can be done at the same time, and then somebody
owns putting them back together. That second half is the part that gets skipped,
and it is the part that decides whether any of it lands.

- **Fan out only what is independent.** A parcel is a slice of a criterion with
  **its own check** and **its own files**. Same file, two agents → a merge you
  will do by hand, badly: split differently, use a worktree each, or run them in
  series. Needs another parcel's RESULT → it is a sequence, not a fan-out.
- **Three to five in flight is a crew.** Twenty is a queue with no integrator.
- **Every brief carries all seven fields** — goal, scope, check, facts,
  forbidden, return format, and what to do when blocked. The full template, and
  the two ways a crew fails without looking like it is failing, are in
  **`references/crew.md`; read it before you spawn the first one.**
- **A subagent cannot ask.** It has no human on the other end, so a parcel that
  meets a §6 decision must return `blocked: …` rather than decide. Say that in
  the brief, every time, or «I improvised» stays available and silent.
- **Their report is not evidence.** The parcel returns the check's own output,
  pasted; a return with no output is a claim, and a claim is treated exactly as a
  red result.
- **Then YOU integrate**: merge, hunt the duplicate helpers two independent
  agents just invented for one job, run the **project's whole check** — not the
  parcels' — and write the one ledger entry yourself.
- **And §3 still applies to the seam.** The verifier did neither the work nor the
  integration, because the integration is where a crew's defects live.

The same shape works for the parts of an iteration that are not building:
several hunters with one lens each is exactly this, and it is what §3 already
runs. What is never a parcel: the goal, the criteria, the ledger, anything
metered or irreversible, and the verification of one's own work.

**Prove.** Let something that is not writing the summary run the check and read
its exit code — **`prove.mjs`, not the bare command.** Running it yourself in
the foreground and reading the status in the shell that ran it is the fallback
when the runner cannot be used, and it costs you the kill switch: **`STOP` is
enforced at `prove.mjs`, so a bare `npm run verify` never consults it.**
`loop.mjs` and the emitted carrier check `STOP` themselves, so those two shapes
stay stoppable either way — but the shape §5b calls the common one, a
self-scheduled wakeup inside a session, has no other reader. There, skipping the
runner turns the human's switch back into a request the loop has to notice.

```bash
node <skill>/scripts/prove.mjs --record -- npm run verify   # the check, its true status, into goal.md
node <skill>/scripts/prove.mjs --times 3 -- <check>         # a check that disagrees with itself is flaky
```

Prove and Verify are the two steps a model can NARRATE — the others leave a
file, a commit or a diff, while «the check passed» and «the reviewer agreed»
were both text written by the context that wanted them to be true. The runner
answers the first: it spawns **without a shell**, so the status it reports is
the child's own; it **refuses a check whose own npm script contains a pipe**
(`"verify": "tsc | tail"` reported the status of `tail`, which is the shape that
shipped six red deploys reading as green); it reports `250` when the loop has
been stopped, `251` when the same check returns two different statuses, and with
`--record` writes the number **the run produced** — including a failing one —
into `goal.md`.

What it cannot see: a pipe inside a shell script, a Makefile target or a binary
your check invokes. It removes the lie it can prove; it does not certify your
check. §3 is what answers for Verify — record the verdict and its evidence in
the ledger, or that step is narration too.

Run it ONCE BEFORE the first iteration too and paste
that into `goal.md`: a failure that predates you is a decision to record, not
your iteration's fault, and without the baseline you will either adopt someone
else's red or book their green as progress. A check that has ever disagreed with
itself is flaky — re-run it three times before a criterion is marked met. Three
ways a check lies, all observed:

| | |
|---|---|
| `check \| tail` | reports `tail`'s status |
| `check > log; echo "EXIT=$?"` | `;` makes the status the LAST command's — always 0 |
| a backgrounded wrapper | the completion notification reports the **wrapper** |

**When there is no command**, Prove is not skipped and is not «I read it again».
Re-run the acceptance check exactly as `goal.md` words it, paste its output, and
say what a failing result would have looked like. If you cannot state the
failure, you do not have a check.

Every new guard needs a demonstration you have **watched fail** without the fix.
Delete the fix, run it, see red, restore. A guard that cannot fire is worse than
none: it reads as proof the case is handled. The same rule outside code — if the
check cannot fail, it is decoration.

**And when the work EMITTED something — a config, a script, a unit file, a
generated server — run the thing you emitted.** Reading it proves nothing;
three times in one campaign the defect was invisible on the page and obvious on
the first execution. A generated MCP server looked correct and would have hung
its client, because a JSON-RPC notification must get no reply. A carrier's
wrapper read perfectly and exited 0 having never invoked the agent, because its
steps were joined with `&&`. A launchd plist passed `plutil -lint` either way —
only `launchctl bootstrap` + `kickstart`, and then reading what it wrote, showed
it actually running. Emitting is not doing.

**Verify — §3. Never skip it, never do it yourself.**

**Land** however this project accepts work: commit and PR, publish, apply, hand
over. Stage by name — never `-A`/`-u`/`.`, they pick up local-only edits and `-u`
misses new files. Then **check the thing actually landed**: a green local run is
not a deploy, and a merged PR is not a live change.

**Record — §4.** Then update `goal.md` and start the next iteration.

## 3. Verify with someone who did not do the work

This is not the same as running the check, and it is not optional.

**Your own fixes are where the next round's defects live.** Count it rather than
believing a percentage — this file carried «58–68 % of all findings» until an
honesty auditor looked for the measurement and found none. What IS in the record
(`docs/reviews/campaign-01.md`, round table): of the FATALS found in each round
that re-reviewed a previous round's repairs, the share that lived inside those
repairs was **4 of 4, then 2 of 5, then 7 of 9** (`docs/goal.md`'s round table; round
5's split is recorded two different ways and is deliberately left out of this
list rather than quoted from the version that suits the point). Your own number
will differ; that it is large is the part that keeps being true. You cannot see
them, because writing them is what ruled out seeing them.

- **Every iteration: at least one subagent** that did not do the work, given the
  exact scope, **read-only**, whose job is to REFUTE the claim that it is done.
  «Confirmed» from a reviewer who did not run anything does not count.
- **Non-trivial change: the council in `references/critics.md`** — N hunters,
  one lens each, then one skeptic per finding. That file also carries the prompt
  rules that measurably changed what came back, and the two cheapest agents
  (convergence analyst, honesty auditor) that return the most.
- **After fixing what review found, review again** — the fixes are where the
  self-inflicted defects live. **One round plus one re-review is the budget.** A
  third round means the change was too big: split it. (This skill's own campaign
  earned a third round, in three areas at once. The rule is not decoration.)
- **Re-run the reviewer's OWN reproduction, verbatim, after the fix.** Not your
  version of it, and not the test you wrote for it: a fix that reads correctly
  can be completely inert. One here compared a directory against `$HOME` to stop
  a walk-up escaping into the owner's files — and `/var` is a symlink to
  `/private/var`, so the comparison never matched and the personal file was
  still written to. The test passed. The reviewer's four-line repro did not.
- **No subagent available?** Then say so and stop at that criterion. A second
  pass by the same context is not verification, and calling it one is the whole
  failure this section exists for.
- **Write the verdict down** — which reviewer, what scope, what it reproduced,
  what it could not run. Verify is the other step that leaves no artifact of its
  own, so «a critic confirmed it» is exactly as checkable as «the tests passed»
  was before `prove.mjs`: not at all, unless somebody records it. The evidence
  column of `goal.md` holds a small round; a round too big for a cell gets a file
  beside the ledger, **with the command that reproduces each finding**. A
  cold-start drill on this repo found that its proudest number — «6 fatal, 11
  major» — had no transcript, no path, and nothing to re-run: a criterion marked
  met on evidence nobody can open.

All reviewers are read-only, every time, said explicitly: not even a command
meant to prove a bypass. A skeptic once ran a production migration script to
disprove a claim about a migration guard, and it was inert only by luck.

## 4. Record — wins, failures, decisions, history

A loop that does not write down what it learned repeats it. But a loop that
records everything buries the part that mattered, so each file has an admission
bar (`references/ledger.md`). Created by `bootstrap.mjs` in whatever home
discovery found — appended to if the project already has one:

- **`goal.md`** — the goal, its criteria, and which are met with what evidence.
  This is the loop's state: it is what lets a fresh session resume mid-campaign.
- **`wins.md`** — what worked, and **how many times**. The count is the point:
  three is the threshold at which a habit becomes a skill (§5).
- **`failures.md`** — what failed, classified by **CAUSE, not by file or task**.
  The task changes; the cause repeats. Count per area: a falling total hides one
  area getting worse.
- **`decisions.md`** — a choice and its cost. Including choices to do NOTHING:
  «not removed, accepted risk, because the cure breaks local dev» is a decision
  and saves the next session from re-opening it.
- **`changelog.md`** — what shipped.

**The rule that keeps all five honest:** before writing «X does not do Y» in a
tracked file, run the check that would prove it and paste the output into the
commit. Four false claims were caught that way in one campaign, all phrased as
structural guarantees. That is the dangerous form — a hedge invites checking,
an invariant does not.

## 5. Write your own skills from wins — and use them immediately

When an entry in `wins.md` reaches **three**, it stops being a habit and becomes
a skill. Do not describe it in a doc nobody loads; write it:

```bash
node <skill>/scripts/new-skill.mjs <name> -d "<when to use it, in trigger words>"
node <skill>/scripts/new-skill.mjs <name> -d "..." < body.md   # you write the body
```

It lands in the shared skills home and is symlinked into every agent directory
this project has. **Usable immediately, indexed after a restart** — that is not
the same thing, and the tool says so where the docs used to say «live in the
current session»: READ the file it prints and follow it on the very next
iteration. A harness that indexes skills at startup will list it later; waiting
for that is how a skill becomes a file nobody opens.

Three things or it will not fire (`references/distillation.md`):

1. **A `description` naming the trigger words** — including the ones the person
   actually says, in their language.
2. **The incident, not the principle.** «Never trust a piped check» is
   forgettable; «`… | tail` reports tail's status and shipped six red deploys
   that read as green locally» is not.
3. **What it does NOT cover.** Every guard has an edge it cannot see; writing it
   down is the difference between a limitation and a lie.

**Do not distil after one success.** One success is luck with a good story. Two
is a coincidence you will over-fit. Three is the first time the pattern survived
a situation you did not design it for — and the three-time rule is what stops
this loop from filling a repo with advice nobody follows.

**Re-run `skill-cleaner` after each one you write.** The loop only ever ADDS
skills, and every description it adds is paid on every turn from then on. The
audit is what turns that into a decision instead of a drift.

Delete one when its advice has been wrong twice, when `skill-cleaner` shows
nothing has used it, or when the thing it guards became structural. A rule
enforced by a type does not need a skill.

## 5b. The loop must own itself

**Every iteration ends one of exactly two ways: a new wakeup is scheduled, or
the loop is declared over out loud.** There is no third option, and «I just
stopped calling it» is not a stop — it is the loop dying while everyone assumes
it is running.

This is written here because it happened. A loop ran for a day on a 25-minute
self-scheduled wakeup, then one iteration ended with a report and no re-arm.
Nothing announced it. The work continued only because the human happened to keep
typing «continue» faster than the timer would have fired — so the failure was
invisible until they asked why the timer had stopped. **A mechanism that depends
on the agent remembering to re-arm it is not a mechanism; it is discipline
wearing the costume of one.**

**Cadence: 5 minutes by default for a SELF-SCHEDULED WAKEUP** — the timer inside
a session, which is the only cadence you choose by hand. (`loop.mjs` waits
`--sleep 15` SECONDS between iterations, because nothing is idling; a carrier
runs on `--every 30m`. Three different numbers for three different mechanisms,
and an auditor found all three called «the default» within thirty-five lines.)
Long gaps were chosen to «leave room to intervene», which is the wrong trade:
the human can interrupt at any moment anyway, and a long timer mostly buys dead
air. Go longer only when waiting on something that genuinely moves slowly — a CI
run, a deploy, a remote queue — and say which.

**Be honest about what the wakeup is worth.** A self-scheduled wakeup lives
inside the session: close the window and it is gone. That is a timer in a
conversation, not autonomy. There are two ways out, and they are different:

```bash
node <skill>/scripts/loop.mjs --agent "claude -p 'continue the loop; read docs/goal.md first'"
node <skill>/scripts/loop.mjs --status      # what the last runs actually did
```

**`loop.mjs` is the loop as a process** — it iterates in front of you until the
ledger says stop, not until your patience does. **Six** stopping conditions,
each written into `agent-logs/loop.jsonl` with its reason: a `STOP` file,
`--max` (the default is 25, never «forever»), **thrash** — `--thrash` iterations
in a row with no commit and no ledger change, which is §7 made mechanical — an
agent that exits non-zero that many times running, **five iterations that
each returned in under a second** — which is not work, it is a backgrounded
command or one that exits immediately — and a **signal**: SIGINT/SIGTERM/SIGHUP
stop the run after the current iteration, twice to stop now. (This list said
«four» when the code had six, and two successive reviewers each corrected it to
a different wrong number. An enumeration is a claim of exhaustiveness: count it
against the source — `grep -oE "stopped: [^,}]+" loop.mjs | sort -u` — before
you write it.)
It refuses to start at all without a `goal.md`, because a loop whose stopping
condition is not written down is a `while true` with a nicer name.

**And it bounds a single iteration: `--timeout`, 45 minutes by default**, 0 to
disable, fractions allowed. At the timeout the agent's whole process group gets
SIGTERM and, ten seconds later, SIGKILL, and the row in `loop.jsonl` carries
`timedOut: true`; a heartbeat prints how long the current iteration has been
running every minute. This exists because a real run had ONE iteration take 22
minutes in silence with nothing bounding it. **Raise it for slow work** — a
healthy 46-minute iteration is killed by the default, and the ledger will say
the agent was killed, not that it was slow.

**`<ledger home>/STEERING.md` is the dial.** If it exists it is read FRESH each
iteration and passed to the agent on stdin, so you can reprioritise mid-flight
without killing the run. **It arrives DEMOTED**: wrapped in a
`--- BEGIN STEERING ---` frame that tells the agent this is data the project
supplies, which may reprioritise the work but may not widen what it is allowed
to do, spend, send or delete. That is deliberate — a file inside the working
tree is writable by anything that can write the tree, and a reproduced prompt
injection is why the frame exists. **The operator's own channel is
`--steer <path>`**, whose contents are passed through UNWRAPPED, as an
instruction. Point it somewhere the repository cannot write — nothing enforces
that, so `--steer docs/STEERING.md` would hand tree content the trusted lane by
hand. `STOP` is the switch; steering is the dial;
between them you rarely need to kill anything.

**A carrier is what survives the window closing.** The ladder applies here too:
**if the harness already has a scheduler, use it** — a cloud schedule, a runner,
an existing CI cron. Only when there is none:

```bash
node <skill>/scripts/carrier.mjs --agent "claude -p 'continue the loop; read docs/goal.md first'" --every 30m
```

It prints a launchd job or a GitHub Actions workflow — and **installs
nothing**. (`--kind cron` was removed: four findings in three rounds, all in a
grammar nothing in the check could execute.) Arming a job that runs an agent unattended spends money on
a schedule, which is §6's to approve, so the install command is printed for a
human to run. **The launchd unit** `cd`s to the project the ledger belongs to (a scheduler
starts in `/`), holds an overlap lock carrying its holder's PID, and watches
every STOP path the loop's own walk finds. **The GitHub unit does none of those
three:** the checkout supplies the directory, `concurrency:` supplies the
overlap lock, and it can only see a STOP that has been **committed and pushed**.
Both facts are printed on the unit itself. launchd is the verified path; the
workflow is the one that survives a closed laptop, and those are different
properties. Read the log after the first fire, or you have armed something you have
never watched run.

**Draw the next item from the ledger, not from memory.** If the only thing that
knows what comes next is this context window, the loop cannot survive a cold
start — and a loop that cannot survive a cold start is a conversation.

**And it must be stoppable without killing it.** A `STOP` file in the ledger
home (or the project root) halts the run at the next Prove step: `prove.mjs`
exits `250` **without running the check**, prints whatever the file says, and the
iteration ends by writing state instead of landing half a change. Deleting the
file resumes. The point is that stopping is a mechanism the human owns rather
than a request the loop has to notice — the same reason the wakeup is scheduled
rather than remembered, and the reason it is enforced at Prove: that is the one
step every iteration passes through.

## 6. Stop and ask

Autonomy is not permission. Stop, say what you would do, and wait:

- **Spending money** — anything metered, a paid tier, new infrastructure.
- **Anything irreversible, or anything on production** — deleting or rewriting
  data, rotating or deleting a secret, sending something outward, deleting files.
  *Blanket approval is permission, not information*: «do whatever you decide» is
  not knowledge of what is in the 245 GB you are about to delete. **A tool you
  wrote yourself is not an exemption**: a handler that can spend or delete is the
  same ask, and it is the easiest one to miss, because you were thinking about
  the schema when you wrote it.
- **Reversing a written directive.** That is a proposal, not a task.
- **You are about to claim something you cannot reproduce on demand.** Say «not
  verified» instead.

**Asking must not kill an unattended run.** When the human is unavailable, a
criterion blocked on their decision is PARKED in `goal.md` — both options, both
costs, what you did instead — and the loop moves to the next criterion. It stops
when every remaining criterion is parked, and then reports all of them at once.
What is never parked: spending money, and anything irreversible.

## 7. Stop the loop when

The goal decides, not the mood. Stop when **every done-criterion in `goal.md` is
met and verified by §3**.

For a campaign of many review rounds, that is not enough — reviewers keep
finding things, so «the critics went quiet» never arrives. Three conditions,
all about ARTIFACTS, all checkable by someone who did not do the work:

1. **Every guard that judges an input has a differential oracle, disagreeing
   with it zero times on a corpus that only grows.** Not «a reviewer read it».
   Pick a source of truth that is not the guard — for a check-runner, the status
   the check has when a pipe cannot hide a failure — and assert agreement over
   every construct the reviews have submitted. A new finding becomes a corpus
   row before it becomes a fix.
2. **Every artifact you EMIT is executed by its real interpreter in the check,
   and every switch is asserted per path per kind.** The defects that survive
   rounds live in whatever no interpreter reads. If you cannot run an emitted
   grammar in the check, that is a reason to CUT it, not to review it again.
3. **Two consecutive rounds add ZERO NEW ROWS to the distribution table in
   `failures.md`.** Findings may be non-zero; new CAUSES may not. The unit is a
   ROW, tagged with the round that first produced it, so anyone can recompute
   the number instead of believing a sentence:
   `grep -oE '\| R[0-9]+' docs/failures.md | sort | uniq -c`. Writing the cause
   up as prose without adding the row makes it invisible to the rule — that
   happened here in round 7 and made the campaign's own streak unknowable.

   **And be honest about this rule the way the old one was not.** It stood here
   claiming to be «demonstrably reachable: 6 → 1 → 0 → 2 new causes per round» —
   a sequence that agreed with the counter on no round at all, whose
   load-bearing **0** was a round that in fact produced four rows. An honesty
   auditor ran the command and returned the real series. What is true:
   **this campaign has run eight rounds and the counter has never returned a zero one** (round 4's rows carry round 5's tags, where the fixes landed, so the command shows seven tags for eight rounds — that too is worth checking rather than believing). The rule
   is still better than the «no fatal in the same area twice» it replaced, for a
   reason that needs no invented number — it is counted by a command rather than
   argued, and a round that finds plenty still satisfies it as long as every
   finding is a cause already on the table. But it is NOT proven reachable. Use
   the escape hatch below rather than assuming convergence.

Why the change, since the old rule sounded stricter: «no fatal in the same area
two rounds running» was a coin this campaign flipped four times and lost four
times. `prove` was clean in **0 rounds of 4**, `new-mcp` in 0 of 4. A rule
nothing can satisfy stops being a stopping condition and becomes a reason the
loop never ends — and a loop that cannot end is the failure this section exists
to prevent, wearing a rule.

**Also stop — and report — when the loop is not moving.** Two consecutive
iterations with no criterion advanced is thrash, not persistence: say what is
blocking, what you tried, and what you need. `loop.mjs` enforces this: no commit
and no ledger change for `--thrash` iterations ends the run, and the ledger's
CONTENT is what counts, because «the file was touched» is not work.

Thrash detection does not catch the worse case: a goal that is WRONG advances
its criteria happily forever. So run `references/premise-check.md` against the
GOAL itself every third iteration — is this still the thing worth doing, and is
it still true? And when two criteria contradict, that is a defect in the goal,
not an iteration to attempt: stop, record it, ask.

**Every third round, count instead of searching.** A convergence analyst
(`references/critics.md`) classifies findings by CAUSE, says which areas still
move, and answers the question no bug-hunter will: **is there a surface that
should be CUT rather than fixed again?** On this repo it found that three causes
produced 70 % of twenty fatals, that severity was going UP rather than down, and
that one emitter had produced four findings in three rounds for one reason —
nothing in the check could run what it emitted. That emitter is gone. The
analyst was also wrong about one thing, which is why its recommendation was
tested before being followed: it predicted a guard would prove redundant once
the oracle existed, and disabling the guard made the oracle fail on six inputs.

## 8. Context — a checkpoint, not a stop

At **80 %** of the window the loop does NOT end. It checkpoints, in this order:

1. **Get the state out of context and into the ledger.** Which criterion moved,
   what proves it, what is next, what is parked — into `goal.md`; the lesson
   into `failures.md`; the choice into `decisions.md`. Then **commit what is
   green**. Everything that exists only in the window is about to stop existing.
2. **Compact.** In Claude Code that is `/compact`; most harnesses also summarise
   on their own when the window fills. If yours cannot, hand the campaign to a
   fresh session — the ledger is the handoff and needs no other briefing.
3. **Resume from the LEDGER, not from the summary.** The first act after
   compaction is re-reading `goal.md`. A summary is a claim about what happened,
   written by the context that is being discarded; the ledger is the record, and
   the two disagree exactly where it matters.

**Why this is safe here and is not safe in general.** Compaction loses whatever
only the window knew, so it is survivable only if the ledger genuinely carries
the campaign — which is a testable claim, not a hope. **Run the cold-start drill
(§3) before you rely on this**: give a fresh subagent nothing but the ledger and
ask it to name the next action. On this repo the first drill answered
«resumable enough to start, not to close», and named seven things that would
have been lost. They were fixable *because* someone checked. If the drill fails,
compaction will lose work — fix the ledger first, then compact.

**The structural version costs nothing:** `loop.mjs` starts a fresh agent
process per iteration, so context never accumulates across iterations at all.
A long campaign driven that way never reaches 80 % in the first place — the
window is the concern of one iteration, and the ledger is the concern of the
campaign.
