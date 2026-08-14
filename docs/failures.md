# Failures

Classified by **CAUSE, not by file or task** — the task changes, the cause
repeats. Each entry: the shape, one reproduction, and the tell that you are
about to do it again.

Count **per area**. A falling total hides one area getting worse.

> **Every row carries the round that FIRST produced it, as a single `R<n>` tag
> in the Trend column.** §7 counts «new rows per round», and a drill found the
> column mixing single rounds, ranges and bare dates — so the number the
> stopping rule rests on could not be recomputed from the file that claims to
> own it. Count them with:
> `grep -oE '\| R[0-9]+' docs/failures.md | sort | uniq -c`
>
> (The header column was literally `R1` until drill 8's honesty audit, so the
> counter counted the HEADER and reported one row too many for round 1 — the
> stopping rule's own unit, off by one in its own prescribed measurement.)
>
> **This table is the ONE taxonomy.** §7's stopping rule counts «new causes per
> round», and a cold-start drill found that number defined twice at different
> granularity — 15 rows here against «9 distinct causes» in the review file —
> with the rule naming neither. A rule whose unit is defined twice cannot be
> passed, and «two answers to one question» is this repo's most-repeated cause.
> So: **a new cause is a new ROW BELOW.** The review file's grouping is a
> narrative over fatals only; it is not the counter. When they disagree, this
> file wins, and the review file says so.

## The distribution

Round 1 of review (2026-08-13, `docs/reviews/campaign-01.md`) is the first data
point. «Trend» needs two rounds to mean anything and says so rather than
inventing a direction.

| Cause | count | Trend |
|---|---:|---|
| **A permissive parser accepts what it should refuse** — an unknown flag ignored, `--times=3` not matching `--times`, `--dir /opt/x`, a TOML path taking a JSON write | 5 | R1 |
| **An error swallowed into silence, which then reads as absence or success** — a config parse error into `null` and then over the file, an unreadable config as «no MCP here», a failed record throwing past the verdict | 4 | R1 |
| **A guard whose true-positive set is inputs that were already safe** — the shell-token check | 1 | R1 |
| **A scope taken from `cwd` when the thing being scoped is the project** — STOP invisible from a subdirectory | 1 | R1 |
| **Two lists answering one question** — election vs search for the ledger home | 1 | R1 |
| **A composed chain whose short-circuit swallows the payload** | 1 | R1 |
| **`process.exit` before stdout has drained** | 1 | R1 |
| **A discovered value hardcoded at the second call site** | 1 | R1 |
| **A document stating as an invariant what was never checked** | 26 claims | R1 — one written BY this campaign an hour after the rule against it; a tenth found by cold-start drill 4, in this campaign's own ledger again; **+16 more in round 6's honesty audit**, folded in here because they were the same cause and were being counted nowhere. This row had NO tag until drill 5, so the prescribed `grep` skipped the largest category in its own taxonomy |
| **A fix that answers the question with a DIFFERENT function than the one that acts** | 2 | R3 |
| **A blacklist of ways to lie, in a grammar that has more** | 1 | R3 |
| **The guard is beaten by the layer IN FRONT of it** | 3 | R2 |
| **A grammar emitted for an interpreter the check cannot run** | 4 | R3 |
| **Writing the very syntax the comment warns about, into a comment** | 2 | R6 |
| **A commit whose message describes work the commit does not contain** | 1 | R6 |
| **A check invented from a file merely being present** | 5 | R5 |
| **A name believed instead of the behaviour behind it** | 3 | R5 |
| **A half-finished artifact left by an unhappy path, which then blocks its own retry** | 3 | R5 |
| **A guard that judges a LAYER and not the thing** | 6 | R5 |
| **A test that depends on a platform value it never names** | 2 | R6 |
| **The tool's own printed instruction does not work** | 7 | R6 |
| **A check whose ground truth answers a different question** | 1 | R5 |
| **A guard whose scope is `cwd` when the tool it guards resolves differently** | 2 | R3 |
| **A guard written for one process, in a program a scheduler runs twice** — a non-atomic lock reclaim, a release that does not check ownership, a kill timer that outlives its own iteration, a cron step that wraps at the month boundary | 4 | R7 |
| **The tested copy of a rule and the copy that RUNS are different files** — «EPERM counts as alive» was true of `lib.mjs` and false of the shell line the carrier emits | 1 | R7 |
| **One step made atomic, while the RACE spans two** — `rename` is atomic, but «is this holder dead» and «remove its lock» are still two steps, and a competitor reclaims in between | 1 | R8 |
| **A stopping rule proved reachable by a number nobody ran the command for** — «6 → 1 → 0 → 2 new causes per round» matched the counter on no round at all, and its load-bearing 0 was a round with four rows | 1 | R8 |
| **An enumeration that is a claim of exhaustiveness, counted from memory** — «four stopping conditions» with five in the code; «the default cadence» naming one number where three mechanisms have three | 2 | R8 |
| **A number that cannot be honoured, accepted as if it were** — `--timeout 40000` overflowed `setTimeout` and fired after 1 ms, so a very long timeout became no timeout | 1 | R7 |

## Patterns

### A composed chain whose short-circuit swallows the payload — FATAL shape

`carrier.mjs` built the unit's command by joining its steps with `&&`. It reads
correctly and it is inert:

```
cd "$root" || exit 1 && [ -e docs/STOP ] && exit 0 && mkdir .carrier.lock … && <the agent>
```

With STOP **absent** the test returns 1, the rest of the chain never runs, and
the wrapper exits **0**. Observed: `agent ran: NEVER`, exit 0. A carrier armed
with that plist reports success every thirty minutes and never once invokes the
agent — the loop dying while everyone assumes it is running, in daemon form.

Fixed by joining with `;`. Pinned by a test that RUNS the emitted wrapper.

**The tell:** you are joining steps whose *failure* is meaningful (a guard, a
test, a lock) with an operator that treats failure as «stop». Guards compose
with `;`; only steps that must not proceed on failure compose with `&&`.

### A discovered value hardcoded at the second call site

Two new `prove.mjs` tests wrote `path.join(d, 'docs', 'goal.md')` while the
ledger home is **elected** — a bare temp directory has no `docs/`, so the home
is `.`. `ENOENT`, two red tests. The older test in the same file already read
the home back from the tool's own output.

**The tell:** you are writing a path that another part of the system chose. The
question «where did it actually put it» has an answer on stdout.

### A destructive write reachable through an argument

`new-mcp.mjs --config ~/.codex/config.toml` would have replaced a working TOML
config with a JSON object. Caught before landing; refused at the argument, and
the refusal is pinned by a test that asserts the TOML is still intact.

**The tell:** a flag whose value is a path you will WRITE, and you only validated
what you write, not where.

### A permissive parser accepts what it should refuse — the largest class

Five separate defects, one shape. `--times=3` did not match `flags.includes('--times')`,
so it ran once and the flakiness guard could never fire; `--recrod` was dropped
silently and looked exactly like a run with nothing to record; `--dir /opt/ae`
wrote inside the project while registering an absolute path; `--config` pointed
at TOML would have written JSON over it.

**The tell:** you are reading arguments with `includes()` or `indexOf()`, and
there is no branch for «this is not one of mine». Every guard downstream is then
one typo away from being off, and being off looks identical to being satisfied.

### An error swallowed into silence, which then reads as absence or success

`catch { return null }` is the whole defect. A config that would not parse became
`null`, then `{}`, then the file was replaced. An unreadable config became «no
MCP servers here», which sends the ladder to «write one». A failed ledger append
threw past the branch that decides the exit code.

**The tell:** an empty catch, or a catch that returns the same value as «this
does not exist». Absent and unreadable are different answers, and the second one
has to be able to reach the report.

### A document stating as an invariant what was never checked — including mine

Eight of these came from the honesty auditor. The ninth was written by this
campaign: `decisions.md` recorded «reached three wins and is written into
SKILL.md §2» as a settled fact, and `grep -i emitted skills/autopilot/SKILL.md`
returned nothing. The rule had been decided, the decision had been recorded, and
the rule itself was never written down — one hour after landing a commit whose
message says the ledger must carry a command that reproduces each claim.

**The tell:** you are recording a decision ABOUT a change in the same breath as
making it. The record is written from intent, and intent is not the file. Run
the grep that would fail if you had not done it — it takes four seconds, and
this one took four seconds to catch.

**A tenth, four rounds later, same shape:** `goal.md`'s guard table grew a
seventh row in round 6 (the printed-instructions oracle); the prose beside it
— criterion 1's evidence cell, «6 guards of 6» — was never revisited to match,
and survived one more round under a criterion that cites that same table as
its own evidence. A cold-start drill found it, not a reader —
`docs/reviews/campaign-01.md` § Cold-start drill 4. Fixed in the same commit
as this row; the tell is unchanged from the ninth instance above, which is
the point.

### A fix that answers the question with a DIFFERENT function than the one that acts

Round 1 refused `--dir /opt/x`; round 3 showed the same flag still broken, because
the containment check used `path.resolve(root, rel)` while the write used
`path.join(root, rel)` — identical for a relative path, divergent for an
absolute one. Same shape in the carrier: `prove.mjs` finds STOP by walking up,
the emitted unit tested nine paths relative to cwd.

**The tell:** the guard and the action are two expressions, not one value. Derive
the value ONCE and let both use it — a check that recomputes what it is checking
is checking something else.

### The guard is beaten by the layer in front of it — three rounds running

R2 hardened `hiddenPipe` to read the script; R3 showed the script it read was
the wrong package.json. R3 replaced a separator blacklist with a whitelist; R4
showed the whitelist was fed by a stripper that an apostrophe inside double
quotes could forge. Every fix was correct **about the thing it fixed**.

A reviewer put it exactly: *«each round's guard is defeated by the layer in
front of it.»* The tell is that a guard has a PIPELINE — normalise, then decide.
Whatever normalises is where the next defect lives, because it is the part
nobody reviews: it looks like plumbing.

**What worked, twice:** delete the pipeline. R3's `--dir` fix derived ONE
absolute path and let the check and the write share it; R4's replaced three
`String.replace` stages with a single scanner that tracks quote state. Both
diffs were SHORTER than what they replaced.

**What is still open** is whether analysis is the right shape at all — see
`decisions.md`, «not built: making the check honest instead of judging it».

### Writing the very syntax the comment warns about — twice, in one file

`carrier.mjs` broke because a block comment contained a cron step expression,
whose two characters close a block comment. It was fixed with a note saying so.
**The next day the same file broke the same way**, in a comment explaining the
same bug — written by the same author who had written the note.

**The tell:** you are quoting a syntax INSIDE the syntax that has to hold it.
The note in the file did nothing; what would have worked is `node --check`
before saving, which is one command and now runs after every edit to a script.

### A grammar emitted for an interpreter the check cannot run

cron and GitHub Actions YAML produced four findings across two rounds, and a
convergence analyst put the cause exactly: every carrier defect that survived a
round lived in the part no interpreter reads. The suite executes the emitted
`sh` wrapper and lints the plist — those two never carried a surviving defect.

**The response was not a fifth fix.** `--kind cron` is deleted; the schedule
expression it shared with GitHub stays, because that is five fields and not a
command line. **If you cannot run an emitted grammar in your check, that is a
reason to cut it, not to review it again.**

### A commit whose message describes work the commit does not contain

`git add a b c` **aborts entirely** when one path does not exist — and the path
that did not exist was the pre-rename name of a file `git mv` had already
staged. Nothing else got added. `git commit` then had exactly the rename to
commit, and took a message describing a third oracle, a unified taxonomy and
six ledger repairs. It was pushed that way.

**The tell:** you passed several paths to `git add` and did not read what it
printed, or `git status` after it. The campaign's own rule — «check that the
thing actually landed» — is usually read as being about deploys. It is about
commits too: `git show --stat` against the message is four seconds.

### A check whose ground truth answers a different question

The `prove` oracle was built to be the stopping rule's mechanism, and a reviewer
showed it passing against a binary with two known fatals. Its ground truth,
`bash -o pipefail`, answers «what did the last command return»; the question is
«did anything fail». Twenty-two of thirty-two rows had truth 0, so the property
could not fire on them.

**The tell:** you cannot say, in one sentence and without hedging, what your
ground truth would answer for an input where it disagrees with a human. Write
that sentence before the corpus.

**And the repair that generalises:** the oracle now has its own regression test
— it must FAIL against historic versions with known fatals. A check nobody has
watched fail is not a check, applied one level up.

### The tool's own printed instruction does not work

Seven in one pass, found by a reviewer who simply followed the documents as a
stranger and ran every line they were told to run: `usage: … [--kind
launchd|cron|github]` for a `cron` deleted two rounds earlier; `next : node
<skill>/scripts/skills.mjs`, which a terminal cannot expand; `install: node
skills.mjs …`, which fails from the project root the skill tells you to stand
in; `read /goal.md`, which is `path.relative` returning `''` and never guarded
at that one call site while every sibling guards it.

None is a bug in what the tool DOES. Every one is a bug in what it tells the
next actor to do — and for an unattended loop the next actor is a model reading
that line, so the two are the same thing.

**The tell:** you are writing a string that contains a command. If it is not
covered by something that RUNS it, it is prose, and prose rots.
`test/printed-instructions-oracle.test.mjs` now runs every script and checks
what it printed: no placeholder outside a usage line, every offered flag
accepted by that script's own parser, every `node …` path present, every «read
X» present.

### A guard written for one process, in a program a scheduler runs twice (R7)

The lock's own comment names the cost — «two agents on one ledger, which is how
a criterion gets marked met twice and landed once» — and the lock did not
deliver it. Reclaiming a stale one was `rmSync` then `mkdirSync`: two syscalls,
so a competitor's remove landed after the winner's create and **both** returned
true. Measured: 1 contended start in 60 with two racers, 23 of 25 with
sixty-four, and end to end both paid agents ran, 1 in 150. `mkdir` was the
atomic primitive all along; the reclaim stepped outside it. It is now one
`rename`, which only one process can win.

**The shape, not the syscall:** six rounds reviewed this code as if one process
ran it, while the whole purpose of the carrier is that a scheduler fires it on
an interval that has no idea a loop is already running. Every guard here has a
second reader — and the second reader is not a person, it is another copy of the
same program.

Three more of the same family in one round: `release()` deleted the lock without
checking it still owned it; the SIGKILL escalation closed over the mutable
`child` and killed the NEXT iteration's agent, after which the loop stopped the
campaign blaming the operator's command; and the day-of-month cron step wrapped
at the end of every month, so «every 28 days» fired 23 times a year instead of
13.

### The tested copy of a rule and the copy that RUNS are different files (R7)

«EPERM counts as alive» was true of `lib.mjs`, tested, and false of the shell
one-liner the carrier emits — the copy that actually runs unattended every
interval for weeks. `kill -0 "$(cat pid)"` returns non-zero for an EMPTY
argument and for EPERM alike, so the wrapper reclaimed in three states the
library refuses, including a live process owned by another user.

This is the same cause as «a grammar emitted for an interpreter the check cannot
run», one turn further on: here the check COULD run it and nobody had. The guard
that closes it is a differential — `takeLock` and the emitted wrapper are given
the same four lock states and must agree, and disagreement prints which one
stole it.

### A number that cannot be honoured, accepted as if it were (R7)

`--timeout 40000` overflowed `setTimeout` past 2^31-1 ms and fired after ONE
millisecond: asking for a very long timeout produced no timeout at all, every
agent killed instantly, while the loop printed «40000 min» and the ledger
recorded a 40000-minute timeout for a 0-second run. Refusing a value is the only
honest answer when the runtime cannot represent it — the same rule this repo
already applies to a cron period it cannot express.

### One step made atomic, while the RACE spans two (R8)

Round 7 replaced a two-syscall lock reclaim (`rmSync` + `mkdirSync`) with a
single atomic `renameSync` and called the fatal closed. The oracle written in the
same commit passed — five times standalone. Under the FULL SUITE, with the
machine loaded, it failed with **three to six simultaneous holders in every
trial**: worse than the bug it replaced.

`rename` is atomic; the reclaim is not. «This pid is dead» and «remove its
directory» are two steps, and between them a competitor reclaims the same stale
lock and creates its own LIVE one at that path — which the first process then
deletes, believing it is the stale one it judged a moment ago.

Two repairs, and the second is the one that matters:

1. after moving the directory aside, **check what you moved**: if its pid is not
   the dead pid you judged, or that pid is alive, put it back and start over.
2. **the claim is not the directory, it is the pid file.** Every path ends with
   the winner writing its own pid, so if two processes both believed they created
   the lock, the file names exactly one. Wait for any racer to have written, read
   it back, and whoever is not named says so. Residual races stop mattering,
   because the property that is actually needed is «at most one holder», not «one
   winner per syscall».

**The tell:** a fix that makes one step atomic, when the invariant spans a
decision and an action. Ask what the two steps are, and what a competitor can do
between them — and if you cannot close it, make the CLAIM verifiable after the
fact instead.

**And the lesson about the check:** the oracle passed five consecutive standalone
runs and failed under load. A concurrency guard that has not been run under load
has not been run. This one now rides in the full suite, where the machine is busy
by construction.
