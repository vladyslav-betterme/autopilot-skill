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
| 1 | Reach: the loop inventories MCP servers/plugins, climbs the capability ladder, and writes the server it lacks — usable in the session that wrote it | `npm run verify`; no fatal or major reproduced in this area for **two** rounds | no — round 1 found 3 fatal here, all fixed; round 2 is in flight | `6424dc9` + `c4f0631`; `docs/reviews/2026-08-13.md` (F5, F6, and the major list) |
| 2 | The loop survives the session it started in: a carrier that outlives the window, and a stop that is a file rather than a promise | the emitted unit is executed once and its effect observed; `STOP` halts a real run | yes | the plist was `launchctl bootstrap`ed, kickstarted, wrote its timestamp, booted out; `STOP` halts both the wrapper and `prove.mjs`, from a subdirectory; 7 tests |
| 3 | The evidence step is mechanical: the check is run by something that reads its own exit code and writes the result, so «pasted output» cannot be narrated | a test where the piped form reports 0 and the runner reports the true non-zero | yes | `false \| tail` → 0 while `prove -- false` → 1; a piped npm script refused; flaky → 251; 12 tests |
| 4 | The ledger is provably resumable: a subagent given ONLY the ledger names the correct next action | run the drill with a fresh read-only subagent; **the orchestrator records the verdict**, because the drill agent cannot write | partly — «resumable enough to start, not resumable enough to close»; its seven findings are fixed, the re-drill is pending | `docs/reviews/2026-08-13.md` § Cold-start drill |
| 5 | Verification is not self-service and not same-model-only: the skeptic can be a different model, named with commands that exist here | `command -v` for each named tool; one claim actually refereed by it | partly — the doctrine is in `references/critics.md`, `codex` and `gemini` are both present, the referee run is in flight | `decisions.md`, «Reviewers may be a DIFFERENT MODEL» |
| 6 | The cost of a configured MCP server is measured, or the choice not to measure it is recorded with its cost | an entry in `decisions.md` naming what stays unmeasured and why | yes | `decisions.md`, «Not built: `tools.mjs --cost`» — and a landed test refuses that flag, so «measured» cannot be a typo |

## Parked — blocked on the owner

| what | both options, and their costs |
|---|---|
| **Arming the carrier** | `carrier.mjs` prints a launchd/cron/GitHub unit and installs nothing, by decision: arming a scheduled agent spends money unattended. So criterion 2 is met in the «proven it works» sense, not «it is running». To arm it the owner runs the printed `launchctl bootstrap` (or commits the workflow). Cost of arming: one agent invocation every interval, forever, until `docs/STOP`. Cost of not arming: the loop lives only as long as a session. **The loop did not choose, and must not.** |

## Review rounds

| round | reviewers | fatal | major | minor | outcome |
|---|---|---:|---:|---:|---|
| 1 | guard-can-fire · reachability · honesty auditor · cold-start drill — all read-only, all Opus | 6 | 11 | 10 | every fatal reproduced against a running script; all fixed and pinned before landing (`docs/reviews/2026-08-13.md`) |
| 2 | re-review of the fixes · cross-model referee (`codex exec --sandbox read-only`) | in flight | | | fixes are where self-inflicted defects live |

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
