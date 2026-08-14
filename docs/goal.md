# Goal

The loop runs until every criterion below is met AND verified by someone who did
not do the work. This file is the loop's state: a fresh session resumes from
here without re-deriving the plan.

## Fixed state — written once, at bootstrap

| | |
|---|---|
| check command | `npm run verify` — better, `node skills/autopilot/scripts/prove.mjs --record -- npm run verify`, which appends the true status to the iteration log below |
| baseline | 2026-08-13, before iteration one: exit 0, `# tests 43 / # pass 43 / # fail 0`. Nothing red predates this campaign. |
| where it stands NOW | **Do not read a number here — produce one:** `npm test`, then `git log --oneline -1`. Last updated at `11f9fbf` (2026-08-14). **If that is not `git rev-parse --short HEAD`, the count below is unknown.** This row has been stale three times, twice under a sentence explaining why it must not be; carrying the command is the only version that cannot rot. |
| reading the check | it prints ~40 `#`-prefixed lines that look like errors (`refusing to run a shell-shaped check`, `FLAKY`, `STOPPED by STOP`, `RECORD FAILED`). Those are captured output from tests that assert on failure paths. **The exit code is the verdict**, nothing else. |
| points at production? | No. No `.env*`, no deploy target, no database. The only outward act is `git push`. |
| push policy | after the check is green, at the end of an iteration — not at campaign end. Standing authorisation, `github.com/vladyslav-betterme/autopilot-skill`. |
| version control | git, `main`, clean at start. **What has LANDED is in `docs/changelog.md`, newest first, each with its SHA** — the iteration log below stops at I14 and then carries only `prove` receipts, so reading it as the landing record loses the last five landings, round 7's lock fix among them. |
| how to stop this loop | create `docs/STOP` (whatever text it holds is printed). `prove.mjs` then exits `250` **before running the check**, and the carrier's wrapper exits without invoking the agent. Delete the file to resume. |
| skills installed | none added for this campaign — the work is prose and zero-dependency Node. |
| tools reachable | called and seen to work: `codex` and `gemini` CLIs (cross-model skeptics), `launchctl`, `crontab`, `plutil`, `gh`. `tools.mjs` reports what THIS machine has — run it; the number is not a fact about the repo. None of it is needed for this campaign. |
| the review this goal refers to | `docs/reviews/campaign-01.md` — every finding with the command that reproduces it |

## The goal, in one falsifiable sentence

Every gap enumerated in `docs/reviews/campaign-01.md` is **either built and
pinned by a test that fails without its fix, or recorded in `decisions.md` as a
choice not to build it**, and the three conditions of §7 hold:

1. every guard in the table below has a differential oracle that disagrees with
   it zero times on a corpus that only grows;
2. every grammar this skill EMITS is executed by its real interpreter in the
   check, with every switch asserted per path per kind;
3. **two consecutive rounds add zero new rows to the distribution table in
   `docs/failures.md`** — that table is the taxonomy, and it is the only one.

The second half of this sentence stated the rule §7 REPLACED, for eight hours
after the replacement: the most load-bearing sentence in the ledger,
contradicting the rule twelve lines below it. A drill found it, not a reader.

## The guards, and their oracles — clause 1's denominator

«1 guard of ~6» was not computable, because nobody had listed the six. A new
guard is a new row.

| guard | what it judges | oracle |
|---|---|---|
| `prove`: compound shell + `hiddenPipe` | can this check lie about its status | **yes** — `test/prove-oracle.test.mjs`, ground truth `bash -e -o pipefail` — «did anything fail», not «what did the last command return». Count the corpus with `grep -c '{ body:' test/prove-oracle.test.mjs` |
| `new-mcp`: containment + config shape | is this path inside the project; is this a server map | **yes** — `test/new-mcp-oracle.test.mjs`, every printed line against disk, plus «the file landed where `--dir` asked» |
| the ledger: election vs search | where does this loop's state live | **yes** — `test/ledger-oracle.test.mjs`, bootstrap's announcement against every consumer, ten layouts |
| `tools.mjs` config readers | is this a server map, and is «absent» absence | **yes** — `test/tools-oracle.test.mjs`, eight layouts read a second time by something that is not it |
| `loop` thrash detection | did this iteration do anything | **yes** — `test/loop-oracle.test.mjs`, ground truth is the git HEAD plus the ledger's bytes, measured outside the loop |
| every script's printed instructions | can the next actor run what it was told | **yes** — `test/printed-instructions-oracle.test.mjs`, 16 invocations |
| carrier schedule expression | does this fire at the period asked | **yes** — `test/carrier-oracle.test.mjs` expands it over a week and measures every gap |
| the lock | how many processes believe they hold it AT ONCE | **yes** — `test/lock-oracle.test.mjs`, 8 racers × 8 trials against a stale lock, counted from outside; plus a differential row in `carrier-oracle` that gives `takeLock` and the EMITTED wrapper the same four states and fails when they disagree |

## Done-criteria

| # | criterion | how it is checked | met? | evidence |
|---|---|---|---|---|
| 1 | The three §7 conditions hold | the guard table above · a YAML reader over the emitted workflow · two rounds with no new row in `failures.md` | **no** — conditions 1 and 2 hold (**8 guards of 8** have oracles; every emitted grammar is read by its interpreter, with the GitHub workflow parsed rather than run — recorded in `decisions.md` as considered, not covered). Condition 3 is the open one: the streak is **0 of 2** — rounds 7 AND 8 each added three causes, and round 8's were mostly inside round 7's own repairs | `docs/reviews/campaign-01.md` §§ Round 4, Round 5, **Round 7**, **Cold-start drill 5** |
| 2 | The loop survives the session it started in: a carrier that outlives the window, and a stop that is a file rather than a promise | the emitted unit is executed once and its effect observed; `STOP` halts a real run | yes | the plist was `launchctl bootstrap`ed, kickstarted, wrote its timestamp, booted out; `STOP` halts both the wrapper and `prove.mjs`, from a subdirectory; 7 tests |
| 3 | The evidence step is mechanical: the check is run by something that reads its own exit code and writes the result, so «pasted output» cannot be narrated | a test where the piped form reports 0 and the runner reports the true non-zero | yes | `false \| tail` → 0 while `prove -- false` → 1; a piped npm script refused; flaky → 251; 12 tests |
| 4 | The ledger is provably resumable: a subagent given ONLY the ledger names the correct next action | **the procedure, because «the orchestrator records it» is unclosable when the resuming session IS the orchestrator:** dispatch a fresh read-only drill, paste its verdict verbatim into `docs/reviews/`, and mark this met only if it answered YES to «could a fresh session CLOSE the work». A drill run by the party it audits does not count | partly — **drill 5** (fresh read-only subagent, `docs/**` only) verdict: **NO**. RESUME is clear (~4 minutes to know the next action); CLOSE is not — 13 findings, the sharpest being that round 7's causes existed as prose but not as ROWS, so the counter this criterion rests on read round 7 as a ZERO round, and «R3 0, the existence proof that zero is reachable», which the counter refutes. All 13 are fixed; **drill 6 runs against the repaired ledger** | `docs/reviews/campaign-01.md` §§ Cold-start drill, drill 2, drill 4, **drill 5** |
| 5 | Verification is not self-service and not same-model-only: the skeptic can be a different model, named with commands that exist here | `command -v` for each named tool; one claim actually refereed by it | yes | `codex exec --sandbox read-only` refuted the central claim about `prove.mjs` with 5 invocations, 3 of them missed by four same-model reviewers — `docs/reviews/campaign-01.md` § Round 2; doctrine in `references/critics.md` |
| 6 | The cost of a configured MCP server is measured, or the choice not to measure it is recorded with its cost | an entry in `decisions.md` naming what stays unmeasured and why | yes | `decisions.md`, «Not built: `tools.mjs --cost`» — and a landed test refuses that flag, so «measured» cannot be a typo |

## How criterion 1 actually closes — the path a drill said was missing

Condition 3 needs **two consecutive review rounds that add no row** to
`failures.md`. Nothing schedules those, so a fresh session could not tell
whether more rounds were expected or whether the criterion should be parked.
It is neither: it is a bounded plan.

| step | what | who |
|---|---|---|
| 1 | **Round 8** — fresh lenses, over everything, and at least one that treats the program as MORE THAN ONE PROCESS (round 7's lens, which found the only fatal that let two paid agents run). Count new rows with `grep -oE '\\| R[0-9]+' docs/failures.md \| sort \| uniq -c` | a council that did not do the work |
| 2 | If round 8 adds a row: fix it, add the oracle that would have caught it, and step 1 again. Rounds are cheap; a new CAUSE means a surface nobody had covered | |
| 3 | If round 8 adds none: **round 9**, same shape. Two in a row and condition 3 is met | |
| 4 | If three consecutive rounds each add exactly one row of the same kind, that is not convergence — reclassify it as a standing limitation in `decisions.md` and say so out loud | the owner decides |

New rows per round: **do not read them here either — run the counter**
(`grep -oE '\| R[0-9]+' docs/failures.md | sort | uniq -c`). At `8f2d3af` it
answers R1 9 · R2 1 · R3 4 · R5 5 · R6 4 · R7 3; R4's are folded into R5's tags
where the fix landed.

**No round has ever been a zero round.** This file claimed «R3 0 … the existence
proof that zero is reachable» for four rounds, and cold-start drill 5 ran the
counter: R3 is 4. Nothing in this campaign has yet demonstrated that condition 3
is satisfiable — that is precisely why it is the open criterion, and a fresh
session must not be told otherwise. The nearest thing to evidence is the trend
in what the rounds FIND: round 7's three rows are one lens nobody had used
(«more than one process»), not three new ways of being wrong.

**When a section here and `docs/STEERING.md` disagree, THIS FILE WINS.**
`STEERING.md` is the dial for the current iteration and goes stale by design;
this file is the state. Drill 5 found all four of STEERING's items stale at
once, including one that ordered a drill that had already run.

## Parked — blocked on the owner

| what | both options, and their costs |
|---|---|
| **Arming the carrier** | `carrier.mjs` prints a launchd or GitHub unit and installs nothing, by decision: arming a scheduled agent spends money unattended. So criterion 2 is met in the «proven it works» sense, not «it is running». To arm it the owner runs the printed `launchctl bootstrap` (or commits the workflow). **Cost of arming, stated: the default interval is 30 minutes → 48 agent invocations a day, indefinitely, until a `STOP` file exists.** Pick a longer `--every` for less. Cost of not arming: the loop lives only as long as a session. **And the disclosure that belongs here rather than in an evidence cell: round 4 found the GitHub path's STOP step INERT while the banner printed all nine paths. Arming it means arming a paid daemon whose kill switch was broken — THREE rounds ago now, and covered since by a real YAML reader in `carrier-oracle` that parses the emitted workflow and asserts the agent step is still gated on `steps.stop.outputs.halted`. This row claimed «YAML no reader in the check parses» for three rounds after that reader landed, contradicting three other lines of this same ledger, until cold-start drill 5 caught it; launchd remains the path executed end to end.** **The loop did not choose, and must not.** |

## Review rounds

| round | reviewers | fatal | major | minor | outcome |
|---|---|---:|---:|---:|---|
| 1 | guard-can-fire · reachability · honesty auditor · cold-start drill — all read-only, all Opus | 6 | 11 | 10 | every fatal reproduced against a running script; all fixed and pinned before landing (`docs/reviews/campaign-01.md`) |
| 2 | cross-model referee (`codex exec --sandbox read-only`) | 0 | 1 | 0 | refuted the central claim; the fix DELETED the useless half of the guard |
| 2 | re-review of the fixes · cold-start drill 2 — same-model, read-only | 4 | 6 | 2 | every fatal was in round 1's own repairs; all fixed and pinned (78 tests) |
| 3 | one reviewer per owed area — `prove`, `ledger`, `new-mcp` | 5 | 6 | 3 | two were earlier fatals alive under their own fixes; all fixed and pinned (98 tests) |
| 4 | prove · ledger+carrier · new-mcp · `loop.mjs` (first outside look) · convergence analyst | 9 | 8 | — | every fatal but `loop`'s was inside a previous round's fix; cron was CUT and §7 was replaced as a result |
| 5 | the three scripts nobody had ever reviewed · a re-review of round 4's fixes · cold-start drill 3 | 14 | 8 | — | eight in unreviewed scripts, six in round 4's own fixes; **the oracle itself was found decorative** and rebuilt |
| 6 | money & irreversibility · a stranger's first run · honesty audit | 2 | 7 (+16 doc claims) | — | **one new cause** — «the tool's own printed instruction does not work» — now covered by a seventh oracle |
| 7 | concurrency, ordering and time — the first reviewer to treat this as more than one process | 1 | 5 | — | **three new causes.** The lock was not mutually exclusive: both paid agents ran, 1 contended start in 150. Also closed the «concurrent `prove --record`» item three rounds had listed as not covered — 200 concurrent 6 KB appends, 0 lost |

| 8 | critic over round 7's fixes · **mutation tester over all eight oracles** · cold-start drill 5 · honesty auditor over `SKILL.md` · devil's advocate over round 8's own repairs | 3 | 14 | 5 | **three new causes.** Round 7's lock fix was itself wrong (3–6 holders under load); the carrier's wrapper still carried the old reclaim — 44 agent runs where 8 was correct; and **eight mutations survived all 161 tests**, three of them money. Every one now has a guard watched failing |

## Iteration log

- **I0** — bootstrap: ledger into `docs/` (the repo had no memory home). Baseline green, 43 tests.
- **I1** — `prove.mjs` + the STOP file. 48 tests. Watched fail without the fix: `false | tail` exits 0 where the runner exits 1.
- **I2** — `carrier.mjs`. 54 tests. Watched fail without the fix: the `&&`-joined wrapper exits 0 having never invoked the agent.
- **I3** — the round-1 fix batch, 6 fatal + 11 major. 69 tests. Landed `c4f0631`.
- **I4** — the ledger repair the cold-start drill demanded: this file, and `docs/reviews/campaign-01.md`, so the council's numbers can be read by someone who was not there.
- **prove** `npm run verify` → 0 · 2026-08-13T14:27:00Z
- **prove** `npm run verify` → 0 · 2026-08-13T14:46:39Z
- **prove** `npm run verify` → 0 · 2026-08-13T14:48:34Z
- **prove** `npm run verify` → 0 · 2026-08-13T14:49:35Z
- **prove** `npm run verify` → 0 · 2026-08-13T14:51:14Z
- **I5** — the cross-model referee's five cases: three shell forms that exited 0
  on a failing check, two honest checks that were refused. The guard shrank.
- **prove** `npm run verify` → 0 · 2026-08-14T07:43:44Z
- **I5** — the cross-model referee's five cases. `2407e38`.
- **I6** — round 2's four fatals, all inside round 1's fixes: `hiddenPipe` past three
  routes, the carrier's single baked STOP path, the `$HOME` escape, symlink
  containment. Plus six majors and `--note`. 78 tests. Landed at `d2ab924`+1.
- **prove** `npm run verify` → 0 — I6 round-2 fixes: 4 fatal, 6 major, 78 tests · 2026-08-14T07:45:40Z
- **prove** `npm run verify` → 0 — distilled: re-run the reviewer's own repro · 2026-08-14T07:47:46Z
- **prove** `npm run verify` → 0 — the exit-after-stdout shape, hunted everywhere it lives · 2026-08-14T07:49:53Z
- **prove** `npm run verify` → 0, 0 (2 runs) — round 3: prove + new-mcp fatals · 2026-08-14T08:04:23Z
- **prove** `npm run verify` → 0 — round 3: new-mcp fatals pinned · 2026-08-14T08:05:03Z
- **prove** `npm run verify` → 0 — round 3: ledger+carrier fatals · 2026-08-14T08:06:46Z
- **prove** `npm run verify` → 0, 0 (2 runs) — round 3 pinned: 5 fatal across prove/ledger/new-mcp · 2026-08-14T08:07:27Z
- **prove** `npm run verify` → 1 — loop.mjs: the loop as a process · 2026-08-14T08:12:42Z
- **prove** `npm run verify` → 0, 0 (2 runs) — loop.mjs + one lock name · 2026-08-14T08:13:14Z
- **prove** `npm run verify` → 0 — context: checkpoint, not stop · 2026-08-14T08:21:49Z
- **prove** `npm run verify` → 0 — context checkpoint + description · 2026-08-14T08:22:38Z
- **I7** — round 3: five fatals across the three owed areas, six majors. The
  compound guard became a whitelist; the carrier's STOP set came from the walk;
  `--every 2h` stopped meaning «every minute». `c90a036`.
- **I8** — `loop.mjs`: the loop as a process, with §7's thrash rule as a
  stopping condition and `STEERING.md` as the mid-flight dial. `09eb017`.
- **I9** — §8 is a checkpoint, not a stop: ledger, commit, compact, resume from
  the ledger. Conditioned out loud on the cold-start drill. `e90d7d8`.
- **prove** `npm run verify` → 0 — I10 ledger: round 3 recorded · 2026-08-14T08:44:15Z
- **I11** — the published install, run end to end: `npx skills add …` into a
  clean project, then all ten documented commands, ten for ten. Nobody had run
  the path the README's first line describes.
- **prove** `npm run verify` → 0, 0 (2 runs) — R4 prove: quoting scanned, -c located · 2026-08-14T08:52:02Z
- **prove** `npm run verify` → 0 — R4 new-mcp: lock first, top-level shape · 2026-08-14T08:54:56Z
- **prove** `npm run verify` → 1 — R4 carrier: github STOP, cron divisors, %, YAML · 2026-08-14T08:56:51Z
- **prove** `npm run verify` → 0, 0 (2 runs) — R4 carrier pinned · 2026-08-14T08:57:54Z
- **prove** `npm run verify` → 0 — R4 loop: signals, lock, content, failure-first · 2026-08-14T09:04:36Z
- **prove** `npm run verify` → 1, 1 (2 runs) — R4 loop+carrier lock reclaim · 2026-08-14T09:05:42Z
- **prove** `npm run verify` → 0 — R4 loop+carrier complete · 2026-08-14T09:06:50Z
- **prove** `npm run verify` → 0, 0 (2 runs) — the differential oracle · 2026-08-14T09:10:17Z
- **prove** `npm run verify` → 1 — cron cut · 2026-08-14T09:12:10Z
- **prove** `npm run verify` → 1 — cron cut · 2026-08-14T09:12:55Z
- **prove** `npm run verify` → 0, 0 (2 runs) — cron cut, schedule kept · 2026-08-14T09:14:07Z
- **prove** `npm run verify` → 0 — the stopping rule that can be satisfied · 2026-08-14T09:15:04Z
- **prove** `npm run verify` → 0, 0 (2 runs) — R4 complete: cron cut, oracle, new stopping rule · 2026-08-14T09:16:34Z
- **I12** — round 4's nine fatals, and what the count led to: `--kind cron` cut
  (a grammar nothing in the check could execute), §7 replaced (the old rule was
  lost 4 times of 4), and `test/prove-oracle.test.mjs` — a differential oracle
  whose ground truth is `bash -o pipefail`. `eff9ae4`.
- **prove** `npm run verify` → 0 — round 4 in the ledger · 2026-08-14T09:24:58Z
- **prove** `npm run verify` → 0, 0 (2 runs) — second oracle: printed claims vs disk · 2026-08-14T09:28:00Z
- **prove** `npm run verify` → 0, 0 (2 runs) — one function for the ledger question · 2026-08-14T09:31:25Z
- **prove** `npm run verify` → 0 — I13 ledger debt from drill 3 · 2026-08-14T09:33:25Z
- **prove** `npm run verify` → 0 — I13 ledger debt · 2026-08-14T09:35:11Z
- **prove** `npm run verify` → 1 — R5 discover: no invented checks · 2026-08-14T09:40:54Z
- **prove** `npm run verify` → 0 — R5 discover fixes · 2026-08-14T09:42:00Z
- **prove** `npm run verify` → 0 — R5 fixes pinned · 2026-08-14T09:43:44Z
- **prove** `npm run verify` → 0 — R5: nested layers, signals, symlink STOP · 2026-08-14T09:48:03Z
- **prove** `npm run verify` → 0, 0 (2 runs) — R5 loop+carrier pinned · 2026-08-14T09:49:28Z
- **prove** `npm run verify` → 0, 0 (2 runs) — carrier oracles: YAML parsed, schedule expanded · 2026-08-14T10:19:12Z
- **prove** `npm run verify` → 0 — round 5 in the ledger · 2026-08-14T10:20:34Z
- **prove** `npm run verify` → 0, 0 (2 runs) — all six guards have oracles · 2026-08-14T11:08:09Z
- **prove** `npm run verify` → 0 — the three-at-three patterns, resolved · 2026-08-14T11:10:22Z
- **prove** `npm run verify` → 1 — R6 money fixes · 2026-08-14T11:23:00Z
- **prove** `npm run verify` → 0, 0 (2 runs) — R6 money fixes pinned · 2026-08-14T11:25:09Z
- **prove** `npm run verify` → 0 — R6 doc claims · 2026-08-14T11:27:31Z
- **prove** `npm run verify` → 0, 0 (2 runs) — R6: printed instructions oracle · 2026-08-14T11:30:19Z
- **prove** `npm run verify` → 0 — the platform default, again · 2026-08-14T11:32:48Z
- **I14** — cold-start drill 4: a fresh read-only subagent, given only
  `docs/*.md` and `docs/reviews/campaign-01.md`, verdict **NO** — RESUME is
  clear, CLOSE is not. Pasted verbatim in `docs/reviews/campaign-01.md` §
  Cold-start drill 4, 8 findings. One is fixed in this same commit: the guard
  table grew a seventh row in round 6 and criterion 1's evidence cell still
  said six. The other seven — a dangling «Cold-start drill 3» reference, a
  `decisions.md`/`STEERING.md` disagreement about concurrent `prove --record`,
  §7's stopping-rule count not recomputable from `failures.md`'s own Trend
  column, no scheduled path to criterion 1 ever reaching «met», and three
  smaller ones — are recorded, not fixed, for whichever iteration picks them
  up next.
- **prove** `npm run verify` → 0 — cold-start drill 4: verdict NO recorded, guard count 6→7 fixed, 8 findings ledgered · 2026-08-14T12:03:35Z
- **prove** `npm run verify` → 0 — the timeout and heartbeat a real run demanded · 2026-08-14T12:16:52Z
- **prove** `npm run verify` → 0, 0 (2 runs) — drill 4's findings · 2026-08-14T12:21:57Z
- **prove** `npm run verify` → 1 — R7 hostile input + MCP conformance · 2026-08-14T12:54:12Z
- **prove** `npm run verify` → 0, 0 (2 runs) — R7 fixes · 2026-08-14T12:58:16Z
- **prove** `npm run verify` → 0 — R7: atomic lock reclaim, wrapper/takeLock parity, stray SIGKILL escalation, day-step cron, timeout overflow · 2026-08-14T13:10:18Z
- **prove** `npm run verify` → 0 — drill 5: the ledger repair · 2026-08-14T13:29:59Z
- **prove** `npm run verify` → 1 — R8: the honesty audit's five majors + drill 5's ledger repair · 2026-08-14T13:38:36Z
- **prove** `npm run verify` → 0, 0 (2 runs) — R8: the lock's claim is the pid file, verified after a settle · 2026-08-14T13:44:34Z
- **prove** `npm run verify` → 0 — R8 landing: honesty audit + drill 5 + the lock's real fix · 2026-08-14T13:47:38Z
- **prove** `npm run verify` → 1, 1 (2 runs) — R8b: atomic lock creation, the wrapper's own claim check, 8 guards for 8 escapes · 2026-08-14T15:10:57Z
- **prove** `npm run verify` → 0, 0 (2 runs) — R8b: atomic lock creation, wrapper parity, 8 guards for 8 escapes · 2026-08-14T15:15:25Z
- **prove** `npm run verify` → 0 — R8b ledger · 2026-08-14T15:18:13Z
- **prove** `npm run verify` → 0, 0, 0 (3 runs) — R8b landing: 169 tests · 2026-08-14T15:24:33Z
