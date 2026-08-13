---
name: autopilot
description: >-
  Use to run autonomous work on ANY project, of any kind, until a goal is
  actually met — «працюй автономно», «продовжуй», /loop, an unattended
  campaign, or a request to set a repo up so an agent can drive it. Code,
  documents, data, research, infrastructure, ops: it discovers what «done»
  means here, arms itself with the public skills this project's niche needs,
  loops until every done-criterion is verified by someone that is not you,
  records every win, failure and decision, and writes repeated wins into new
  skills it then uses in the same session.
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
node <skill>/scripts/discover.mjs        # checks, memory homes, danger signals
node <skill>/scripts/bootstrap.mjs       # creates the ledger if absent
node <skill>/scripts/skills.mjs          # the skill library — pick this project's niches
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

### Arm yourself before iteration one

`skills.mjs` is the shortlist of public skills worth having, tagged by niche.
The tags are the vocabulary — `any` and `review` on every project, then `web`,
`react`, `db`, `docs`, `perf`, `a11y`, `mac`, `infra`, `research`, `design` as
the project actually needs them.

```bash
node <skill>/scripts/skills.mjs                            # the catalogue and its tags
node <skill>/scripts/skills.mjs --install any --dry-run    # what it WOULD run
node <skill>/scripts/skills.mjs --install any              # the always-useful set
node <skill>/scripts/skills.mjs --install react,perf,db    # this project's niches
```

**Choose, do not hoard.** Every installed skill's description is loaded on every
turn: a hundred skills is not a hundred capabilities, it is a smaller window and
a model that skims.

Installing is running third-party code with your permissions, so it is an
announced act: `--dry-run` first, say what you are about to add and why, then
install. If the project matches no niche in the catalogue, `any` alone is the
correct answer — and `find-skills` is the entry point for a niche the catalogue
is thin on (research, infra, data are thin today).

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

Then, throughout: what you learn here becomes a skill of its own (§5), written
by the loop and used the same session.

## 1. The goal — the thing the loop runs until

Before iteration one, write down **one falsifiable sentence** and **2–5
done-criteria**. Into `goal.md`, or whatever discovery found already holds this.

- Falsifiable: «make X better» cannot be. «Every path that spends money is
  behind an explicit tap, and each one is held by a type or a failing test» can.
- Each criterion must be checkable **by someone who is not you** — the same bar
  as §0. A criterion only you can confirm is not a criterion; rewrite it.
- Unknowns are allowed, as criteria of their own: «we know whether N is the
  cause» is a legitimate done-criterion for research.
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

**Prove.** Run the discovered check, **in the foreground, reading the exit code
in the shell that ran it.** Run it ONCE BEFORE the first iteration too and paste
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

**Verify — §3. Never skip it, never do it yourself.**

**Land** however this project accepts work: commit and PR, publish, apply, hand
over. Stage by name — never `-A`/`-u`/`.`, they pick up local-only edits and `-u`
misses new files. Then **check the thing actually landed**: a green local run is
not a deploy, and a merged PR is not a live change.

**Record — §4.** Then update `goal.md` and start the next iteration.

## 3. Verify with someone who did not do the work

This is not the same as running the check, and it is not optional.

**Your own fixes are the second-largest source of defects** — 58–68 % of all
findings in the later rounds of one measured campaign, on one repository. You cannot see them, because
writing them is what ruled out seeing them.

- **Every iteration: at least one subagent** that did not do the work, given the
  exact scope, **read-only**, whose job is to REFUTE the claim that it is done.
  «Confirmed» from a reviewer who did not run anything does not count.
- **Non-trivial change: the council in `references/critics.md`** — N hunters,
  one lens each, then one skeptic per finding. That file also carries the prompt
  rules that measurably changed what came back, and the two cheapest agents
  (convergence analyst, honesty auditor) that return the most.
- **After fixing what review found, review again** — the fixes are where the
  self-inflicted defects live. **One round plus one re-review is the budget.** A
  third round means the change was too big: split it.
- **No subagent available?** Then say so and stop at that criterion. A second
  pass by the same context is not verification, and calling it one is the whole
  failure this section exists for.

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
this project has, so it is **live for the current session** — read the file it
prints and apply it now, on the very next iteration. Waiting for a restart is
how a skill becomes a file nobody opens.

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

## 6. Stop and ask

Autonomy is not permission. Stop, say what you would do, and wait:

- **Spending money** — anything metered, a paid tier, new infrastructure.
- **Anything irreversible, or anything on production** — deleting or rewriting
  data, rotating or deleting a secret, sending something outward, deleting files.
  *Blanket approval is permission, not information*: «do whatever you decide» is
  not knowledge of what is in the 245 GB you are about to delete.
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
met and verified by §3** — and, for a campaign of many review rounds, when all
four of these hold too:

1. No fatal finding in the same area two rounds running. ← the one that matters
2. Self-inflicted share of findings below ~30 %.
3. Every remaining finding is minor **and** in an area whose count is falling.
4. Every claim in a tracked doc has a command or a source that reproduces it.

**Also stop — and report — when the loop is not moving.** Two consecutive
iterations with no criterion advanced is thrash, not persistence: say what is
blocking, what you tried, and what you need.

Thrash detection does not catch the worse case: a goal that is WRONG advances
its criteria happily forever. So run `references/premise-check.md` against the
GOAL itself every third iteration — is this still the thing worth doing, and is
it still true? And when two criteria contradict, that is a defect in the goal,
not an iteration to attempt: stop, record it, ask.

## 8. Context

At **80 %** of the window: stop the iteration, write the state into `goal.md`
and the ledger, commit what is green, say where you stopped. Pushing past it
produces the failure where the summary is confident and the work is half-landed.
