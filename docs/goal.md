# Goal

The loop runs until every criterion below is met AND verified by someone who did
not do the work. This file is the loop's state: a fresh session resumes from
here without re-deriving the plan.

## Fixed state — written once, at bootstrap

| | |
|---|---|
| check command | `npm run verify` — run in the foreground, exit code read in the shell that ran it |
| baseline | 2026-08-13, before iteration one: `BASELINE EXIT=0`, `# tests 43 / # pass 43 / # fail 0`. Nothing red predates this campaign. |
| points at production? | No. No `.env*`, no deploy target, no database. The only outward act is `git push` to `github.com/vladyslav-betterme/autopilot-skill` — authorised standing, after the check is green. |
| version control | git, `main`, clean at start. Remote exists, so `git reflog` + the remote are the undo. |
| skills installed | none added for this campaign — the work is prose and zero-dependency Node, and the catalogue's `any` set is already loaded in the driving session. |
| tools reachable | Called and seen to work: `codex` and `gemini` CLIs (cross-model skeptics), `launchctl`, `crontab`, `gh`. `tools.mjs` on this repo reports 11 MCP servers configured across three harnesses; none is needed for this campaign. |

## The goal, in one falsifiable sentence

Every gap the 2026-08-13 review named is **either built and pinned by a test
that fails without its fix, or recorded in `decisions.md` as a choice not to
build it** — and a council that did not do the work cannot reproduce a fatal or
major finding in the same area two rounds running.

## Done-criteria

| # | criterion | how it is checked | met? | evidence |
|---|---|---|---|---|
| 1 | Reach: the loop inventories MCP servers/plugins, climbs the capability ladder, and writes the server it lacks — usable in the session that wrote it | `npm run verify`; a council reproduces no fatal/major | yes | `6424dc9`, 43/43; round 1 council below |
| 2 | The loop survives the session it started in: a carrier that outlives the window, and a stop that is a file rather than a promise | the emitted unit is executed once and its effect observed; `STOP` halts a real run | yes | the plist was `launchctl bootstrap`ed + kickstarted and wrote its timestamp, then booted out; `STOP` halts the wrapper AND `prove.mjs`, both from a subdirectory; 6 tests |
| 3 | The evidence step is mechanical: the check is run by something that reads its own exit code and writes the result, so «pasted output» cannot be narrated | a test where the piped form reports 0 and the runner reports the true non-zero | yes | `false \| tail` → 0 while `prove -- false` → 1; a piped npm script is refused; flaky → 251; 12 tests |
| 4 | The ledger is provably resumable: a subagent given ONLY the ledger names the correct next action | run the drill with a fresh subagent, read-only | no | |
| 5 | Verification is not self-service and not same-model-only: the skeptic can be a different model, named with commands that exist here | `command -v` for each named tool; one finding actually refereed by it | no | |
| 6 | The cost of a configured MCP server is measured, or the choice not to measure it is recorded with its cost | `tools.mjs --cost` output, or an entry in `decisions.md` | no | |

## Parked

Nothing parked.

## Review rounds

| round | reviewers | fatal | major | minor | what it cost |
|---|---|---:|---:|---:|---|
| 1 | guard-can-fire · reachability · honesty auditor (all read-only, all Opus) | 6 | 11 | 10 | every fatal reproduced against a running script; all fixed and pinned by tests before landing |

## Iteration log

- **I0** — bootstrap: ledger into `docs/` (the repo had no memory home; `docs/`
  keeps five ledger files out of the front page). Baseline green, 43 tests.
- **prove** `npm run verify` → 0 · 2026-08-13T14:27:00Z
