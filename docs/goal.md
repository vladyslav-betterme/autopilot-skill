# Goal

The loop runs until every criterion below is met AND verified by someone who did
not do the work. This file is the loop's state: a fresh session resumes from
here without re-deriving the plan.

## Fixed state — written once, at bootstrap

| | |
|---|---|
| check command | `npm run verify` — better, `node skills/autopilot/scripts/prove.mjs --record -- npm run verify`, which appends the true status to the iteration log below |
| baseline | 2026-08-13, before iteration one: exit 0, `# tests 43 / # pass 43 / # fail 0`. Nothing red predates this campaign. The count grows with the campaign — the iteration log carries the current one, this row does not. |
| reading the check | it prints ~40 `#`-prefixed lines that look like errors (`refusing to run a shell-shaped check`, `FLAKY`, `STOPPED by STOP`, `RECORD FAILED`). Those are captured output from tests that assert on failure paths. **The exit code is the verdict**, nothing else. |
| points at production? | No. No `.env*`, no deploy target, no database. The only outward act is `git push`. |
| push policy | after the check is green, at the end of an iteration — not at campaign end. Standing authorisation, `github.com/vladyslav-betterme/autopilot-skill`. |
| version control | git, `main`, clean at start. What has landed is in the iteration log, with its SHA. |
| how to stop this loop | create `docs/STOP` (whatever text it holds is printed). `prove.mjs` then exits `250` **before running the check**, and the carrier's wrapper exits without invoking the agent. Delete the file to resume. |
| skills installed | none added for this campaign — the work is prose and zero-dependency Node. |
| tools reachable | called and seen to work: `codex` and `gemini` CLIs (cross-model skeptics), `launchctl`, `crontab`, `plutil`, `gh`. `tools.mjs` here reports 18 MCP servers across seven config files; none is needed for this campaign. |
| the review this goal refers to | `docs/reviews/2026-08-13.md` — every finding with the command that reproduces it |

## The goal, in one falsifiable sentence

Every gap enumerated in `docs/reviews/2026-08-13.md` is **either built and pinned
by a test that fails without its fix, or recorded in `decisions.md` as a choice
not to build it** — and a council that did not do the work cannot reproduce a
fatal or major finding in the same area two rounds running.

## Done-criteria

| # | criterion | how it is checked | met? | evidence |
|---|---|---|---|---|
| 1 | Reach: the loop inventories MCP servers/plugins, climbs the capability ladder, and writes the server it lacks — usable in the session that wrote it | `npm run verify`; **no fatal in the same AREA two rounds running** (areas defined in the review file) | **no** — `new-mcp` carried 2 fatal in R1 and 1 in R2, so the rule fails; `prove` and `ledger` fail it too. Round 3 is scoped to exactly those three areas | `docs/reviews/2026-08-13.md` § What the stopping rule now says |
| 2 | The loop survives the session it started in: a carrier that outlives the window, and a stop that is a file rather than a promise | the emitted unit is executed once and its effect observed; `STOP` halts a real run | yes | the plist was `launchctl bootstrap`ed, kickstarted, wrote its timestamp, booted out; `STOP` halts both the wrapper and `prove.mjs`, from a subdirectory; 7 tests |
| 3 | The evidence step is mechanical: the check is run by something that reads its own exit code and writes the result, so «pasted output» cannot be narrated | a test where the piped form reports 0 and the runner reports the true non-zero | yes | `false \| tail` → 0 while `prove -- false` → 1; a piped npm script refused; flaky → 251; 12 tests |
| 4 | The ledger is provably resumable: a subagent given ONLY the ledger names the correct next action | run the drill with a fresh read-only subagent; **the orchestrator records the verdict**, because the drill agent cannot write | partly — drill 1 «start but not close» (7 findings, all fixed); drill 2 confirmed all seven fixed and raised 7 more, now fixed. Drill 3 pending | `docs/reviews/2026-08-13.md` §§ Cold-start drill, Cold-start drill 2 |
| 5 | Verification is not self-service and not same-model-only: the skeptic can be a different model, named with commands that exist here | `command -v` for each named tool; one claim actually refereed by it | yes | `codex exec --sandbox read-only` refuted the central claim about `prove.mjs` with 5 invocations, 3 of them missed by four same-model reviewers — `docs/reviews/2026-08-13.md` § Round 2; doctrine in `references/critics.md` |
| 6 | The cost of a configured MCP server is measured, or the choice not to measure it is recorded with its cost | an entry in `decisions.md` naming what stays unmeasured and why | yes | `decisions.md`, «Not built: `tools.mjs --cost`» — and a landed test refuses that flag, so «measured» cannot be a typo |

## Parked — blocked on the owner

| what | both options, and their costs |
|---|---|
| **Arming the carrier** | `carrier.mjs` prints a launchd/cron/GitHub unit and installs nothing, by decision: arming a scheduled agent spends money unattended. So criterion 2 is met in the «proven it works» sense, not «it is running». To arm it the owner runs the printed `launchctl bootstrap` (or commits the workflow). **Cost of arming, stated: the default interval is 30 minutes → 48 agent invocations a day, indefinitely, until a `STOP` file exists.** Pick a longer `--every` for less. Cost of not arming: the loop lives only as long as a session. **The loop did not choose, and must not.** |

## Review rounds

| round | reviewers | fatal | major | minor | outcome |
|---|---|---:|---:|---:|---|
| 1 | guard-can-fire · reachability · honesty auditor · cold-start drill — all read-only, all Opus | 6 | 11 | 10 | every fatal reproduced against a running script; all fixed and pinned before landing (`docs/reviews/2026-08-13.md`) |
| 2 | cross-model referee (`codex exec --sandbox read-only`) | 0 | 1 | 0 | refuted the central claim; the fix DELETED the useless half of the guard |
| 2 | re-review of the fixes · cold-start drill 2 — same-model, read-only | 4 | 6 | 2 | every fatal was in round 1's own repairs; all fixed and pinned (78 tests) |
| 3 | one reviewer per owed area — `prove`, `ledger`, `new-mcp` | 5 | 6 | 3 | two were earlier fatals alive under their own fixes; all fixed and pinned (98 tests) |
| 4 | **owed**: the same three, plus `loop.mjs` (new, unreviewed) | | | | nothing new is added until they come back clean — §3's «the change was too big», accepted |

## Iteration log

- **I0** — bootstrap: ledger into `docs/` (the repo had no memory home). Baseline green, 43 tests.
- **I1** — `prove.mjs` + the STOP file. 48 tests. Watched fail without the fix: `false | tail` exits 0 where the runner exits 1.
- **I2** — `carrier.mjs`. 54 tests. Watched fail without the fix: the `&&`-joined wrapper exits 0 having never invoked the agent.
- **I3** — the round-1 fix batch, 6 fatal + 11 major. 69 tests. Landed `c4f0631`.
- **I4** — the ledger repair the cold-start drill demanded: this file, and `docs/reviews/2026-08-13.md`, so the council's numbers can be read by someone who was not there.
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
