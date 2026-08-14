# Review — 2026-08-13

The council's own record. It exists because a cold-start drill found that the
ledger's most load-bearing number — «6 fatal, 11 major» — was pure assertion:
no transcript, no path, nothing to re-read or re-run. A criterion marked met on
evidence nobody can open is the second claim this skill exists to make
impossible, wearing a table.

**Every finding below carries the command that reproduces it.** Reviewers were
read-only, ran the reproductions themselves, and were told to refute.

## Round 1 — three lenses, on `6424dc9` and the working tree

| Reviewer | Lens | Fatal | Major | Minor |
|---|---|---:|---:|---:|
| guard-can-fire | for every guard, construct the input that trips it — and the one that should | 4 | 4 | 4 |
| reachability / failure path | what reaches this, what silently does not, and the unhappy path | 3 | 7 | 6 |
| honesty auditor | do the documents tell the truth about the code | — | 8 claims ruled EXAGGERATED or FALSE | — |

Overlapping findings counted once: **6 fatal, 11 major, 10 minor.**

### Fatal — every one reproduced against a running script

| # | What | Reproduction | Fixed by |
|---|---|---|---|
| F1 | The shell guard's true-positive set was inputs that were already honest: without a shell, `['false','\|','tail']` already exits 1. The real lie — a pipe inside an npm script — passed straight through and recorded `→ 0`. | `printf '{"scripts":{"verify":"node -e \\"process.exit(1)\\" \| tail"}}' > package.json; node prove.mjs --record -- npm run verify` → was `→ 0`, exit 0 | `hiddenPipe()` reads the resolved npm script. The shell half was fixed again in round 2 below — this round's version refused honest checks and missed dishonest ones. Tests «a pipe inside the npm script is refused», «a COMPOUND shell check is refused». |
| F2 | STOP was invisible from any subdirectory: `root = process.cwd()` and nothing walked up. A monorepo check runs from one. | `cd packages/api && node prove.mjs -- touch ran.txt` with `docs/STOP` present → ran, exit 0 | `findStopFile` walks up to the project boundary. Test «STOP is found from a subdirectory». |
| F3 | `findLedgerHome` returned the first root holding a `goal.md`, which need not be the home bootstrap elected — and macOS matched a project's own `GOAL.md`. Results were appended to a file the project owned; `docs/STOP` was ignored. | root `GOAL.md` + `docs/` ledger → `node prove.mjs --record -- touch it-ran.txt` wrote into `GOAL.md` and ran despite `docs/STOP` | exact-name matching, one `LEDGER_HOMES` list for election and search, and >1 hit refuses instead of guessing. Tests «two goal.md in scope», «the ledger home bootstrap elects is the one the runner searches». |
| F4 | `--times=3` was not `--times`, so it ran ONCE and the flakiness guard could never fire. | `node prove.mjs --times=3 -- ./flip.sh` → one run, exit 0 | strict flag parser; `--flag=value` supported, unknown flags end the run. Test «--times=3 is three runs». |
| F5 | `new-mcp.mjs` swallowed a config parse error and REPLACED the file. VS Code's `mcp.json` legally carries `//` comments and an `inputs` block. | a JSONC `mcp.json` + `node new-mcp.mjs ae -d "…" --config .vscode/mcp.json` → the other servers and `inputs` gone, exit 0 | refuses to write a config it cannot parse. Test «a config that does not parse is never rewritten». |
| F6 | The generated server's `--call` truncated at the pipe buffer and exited 0 — 100 KB back as exactly 65536 bytes, on the path this skill tells you to use. `process.exit` drops undrained stdout. | `node tools/x-mcp/server.mjs --call ping "$(…100000 chars…)" \| wc -c` → 65536 | `process.exitCode`, and the stdio loop only arms when not in CLI mode. Test «the generated CLI does not truncate at the pipe buffer». |

### Major — the ones that changed the code

- `--record` typo'd (`--recrod`) was ignored silently; output was indistinguishable from a run with nothing to record. → unknown flags end the run.
- `97`/`98` collided with a check's own exit codes: a check that failed with 97 read as «stopped, never ran». → moved to `250`/`251`.
- A failed `--record` (read-only `goal.md`) threw past the flaky branch, so a check returning `0,1,0` exited 1 — «just red, retry». → the verdict decides the exit code; the write failure is reported loudly.
- `--record` with no ledger discarded the child's real status. → the destination is resolved BEFORE the run.
- `tools.mjs` read no Claude Desktop config and only VS Code's PROJECT config. On this machine that hid five VS Code servers and `AfterEffectsMCP` — while this repo's worked example for writing a server was «nothing drives After Effects». → both paths read; `~/.gemini`, `~/.cursor`, opencode and Codex too.
- An unparseable or unreadable config read as «no MCP here», and the ladder then says «write one». → reported as UNREADABLE, which is not absence.
- A `servers` array became servers named `0` and `1`, dropping their real names. → refused as malformed.
- `tools.mjs --cost` printed the ordinary table and exited 0, so a flag that measures nothing read as a measurement. → unknown flags are an error.
- `new-mcp --dir /opt/ae` wrote inside the project, registered an absolute path, and printed three false lines, exit 0. → both paths must resolve inside the project.
- A fresh `.vscode/mcp.json` was registered under `mcpServers`, the one key VS Code does not read. → the key follows the FILE.
- A failed registration left a scaffold that blocked its own retry («already exists — not overwriting»). → the config destination is validated first.

### Claims the honesty auditor ruled against, and the rewording

| Claim | Verdict | Now |
|---|---|---|
| «MCP servers configured across every harness on this machine» | FALSE | «in the config files it knows how to read», with the list and «an empty result means not in these files» |
| «a harness reads its MCP config at STARTUP» (absolute, in three places) | EXAGGERATED — VS Code watches `mcp.json`, Gemini has `/mcp refresh` | «most harnesses… assume startup unless you have WATCHED it reload» |
| «After Effects has aerender; macOS has osascript» implying headless | EXAGGERATED — `aerender` wants a licensed signed-in GUI seat; `osascript` trips macOS Automation consent | a paragraph naming both, and «test the rung under the conditions the loop will meet» |
| «relative path — it stays true on another machine» | EXAGGERATED — nothing verifies how a harness resolves it | «path relative to the project root… whether a harness resolves it is ITS choice and is not verified here» |
| «`\|`, `;` and `&&` are refused at the argument» | EXAGGERATED — exact-token matching only | superseded twice: the npm-script guard here, then round 2 deleted the token check entirely and replaced the shell half with one regex |
| «43 tests» in prose, `tests-37` in the badge | FALSE, and stale in two places at once | the badge no longer carries a number; the count lives in the output |
| «every other step leaves an artifact» | EXAGGERATED — Verify leaves none either | §3 now requires the verdict to be written down; this file is that rule applied to itself |
| «the runner and the bootstrap cannot disagree about where the ledger lives» | FALSE — two lists, five diverging homes | one `LEDGER_HOMES`, pinned by a test using `docs/learnings/` |

## Cold-start drill — can a fresh session resume from the ledger alone?

A subagent was given ONLY `docs/*.md` — no source, no SKILL.md, no git log — and
asked to name the next action. Verdict: **«resumable enough to start, not
resumable enough to close.»** It picked the right criterion for the right reason
and reconstructed the stop procedure, but found:

1. The goal sentence referenced «the 2026-08-13 review» and nothing enumerated it → **this file**.
2. Three cells said 43 tests; the suite ran 69, and the ledger did not reconcile with itself.
3. Criterion 1 was marked met on ONE council round while the goal demands no fatal or major in the same area **two rounds running**.
4. Criterion 6's check named `tools.mjs --cost`, a flag a landed test deliberately refuses.
5. The iteration log had one entry across four shipped changes: `prove --record` existed and was not being used.
6. «Parked: nothing parked» while arming the carrier is explicitly the owner's call.
7. The STOP path and the resume step were nowhere in the fixed state — reconstructed from a decision row and confirmed by luck, from stderr.

All seven are fixed in the same commit as this file.

## Areas — the taxonomy the stopping rule needs

«No fatal finding in the same area two rounds running» was unusable until
«area» meant something. It means the subsystem a finding lives in:

`prove` · `carrier` · `ledger` (`lib.mjs` + `bootstrap.mjs`) · `tools` ·
`new-mcp` (including what it generates) · `docs`.

Every finding below is tagged. A cold-start drill found this missing and called
it the campaign's central defect: without it nobody can compute «am I done».

## Round 2 — the cross-model referee

`codex exec --sandbox read-only` (a different model family), given one claim:
«the status prove.mjs reports can never be green when the check actually
failed, except for the limits it names itself». Verdict: **Refuted**, with five
concrete invocations, three of which the same-model council had not found.

| # | Invocation | What happened |
|---|---|---|
| R1 | `prove -- sh -c 'test -s dist/app.js; echo artifact-checked'` | the artifact is missing, `test` fails, `echo` wins — `→ 0` |
| R2 | `prove -- sh -c 'if test -s dist/app.js; then echo ok; fi'` | a failed condition with no else branch returns 0 — `→ 0` |
| R3 | `prove -- bash -c 'test -s a & test -s b & wait'` | both checks fail, bare `wait` returns 0 — `→ 0` |
| R4 | `prove -- sh -c 'test -s README.md \|\| exit 1'` | honest, but `includes('|')` read `\|\|` as a pipe — refused, exit 2 |
| R5 | `prove -- grep -Fq '\|' README.md` | the pipe is grep's DATA — refused, exit 2 |

The fix deleted more than it added. The token check on a non-shell command is
**gone**: without a shell, `['false','|','tail']` already exits 1, so its entire
true-positive set was inputs that were already honest (round 1 said so) while
its false positives were real (R5). What remains is one regex over a shell's
script for the three separators whose last command wins — `|`, `;`, `&` — with
`&&` and `||` deliberately excluded because they propagate failure.

All five are pinned by two tests. This is what a reviewer from another model
family bought: three failure modes that four same-model reviewers, all told to
refute, did not construct.

## Round 2 — the re-review of the fixes (same-model, read-only)

«After fixing what review found, review again» — the fixes are where
self-inflicted defects live. Four more fatals, all in round 1's repairs.

| # | Area | What | Reproduction | Fixed by |
|---|---|---|---|---|
| R2-F1 | prove | `hiddenPipe` read exactly one key of the package.json in `cwd`. Three ways past it, each a sibling key in the file it had already parsed | `{"verify":"npm run inner","inner":"false \| cat"}`; a `preverify` script; and the same file run from `src/` — npm walks up to find package.json, the runner did not | follows pre/post and `npm run X` delegation, and walks up for package.json. Test «the pipe is found through delegation, a lifecycle script, and from a subdirectory». |
| R2-F2 | carrier | The unit baked ONE literal STOP path into a daemon while `prove.mjs` honours nine | ledger in `docs/`, human writes `STOP` at the project root as SKILL.md says: loop exits 250, carrier ran the agent anyway | the wrapper loops over every `LEDGER_HOMES` STOP path. Test «the carrier honours every STOP path the loop does». |
| R2-F3 | ledger | `projectDirs` pushed `$HOME` before its boundary check, and `notes` is a ledger home | a project with no `.git` under `$HOME` + `~/notes/goal.md` → `--record` appended the run to the owner's personal file | `$HOME` is a boundary and is never scanned; paths compared through `realpath`, because `/var` → `/private/var` made the first fix silently inert. Test «the walk-up stops BELOW $HOME». |
| R2-F4 | new-mcp | Containment was lexical (`path.resolve` + `startsWith`), so a symlinked `tools/` wrote outside the project and a symlinked `.mcp.json` rewrote a file elsewhere, exit 0 | `ln -s /elsewhere proj/tools; new-mcp thing --dir tools/thing-mcp` | the real path of the deepest existing ancestor is what is checked. Test «containment is checked on the REAL path». |

Majors: a failed registration left a scaffold that blocked its own retry;
bootstrap could elect a home whose `goal.md` the runner would never find
(deadlock: «run bootstrap.mjs first», forever); bootstrap planted a third
`goal.md` in a monorepo that had two; `tools.mjs --json` carried the same
`process.exit` truncation that was called fatal when the generated server had
it; `~/.claude.json`'s reader was unguarded, so an array there became servers
named `0` and `1` with `unreadable: []`; `SKILL.md` still documented exit `97`.
All fixed, all pinned.

### What the stopping rule now says — and it is not «done»

| Area | R1 fatal | R2 fatal | Rule: no fatal two rounds running |
|---|---:|---:|---|
| prove | 3 | 1 | **FAILS** |
| ledger | 1 | 1 | **FAILS** |
| new-mcp | 2 | 1 | **FAILS** |
| carrier | 0 | 1 | first round with one |
| tools | 0 | 0 (majors only) | holds |

Three areas carry a fatal in two consecutive rounds. By §7 the loop may not
stop, and by §3 («one round plus one re-review is the budget — a third round
means the change was too big») the honest reading is that this campaign landed
too much at once. Round 3 is scoped to those three areas only.

## Cold-start drill 2 — after the repair

Same rules, fresh agent, only `docs/`. Verdict: **still NO for closing**, and
seven specific reasons, all now addressed: «area» was undefined (above); «in
flight» appeared three times with no owner or artifact path; criterion 1's
counts contradicted its own evidence cell; `changelog.md` contradicted the
iteration log and omitted the last two landings; the newest landing carried no
SHA against an explicit promise; the review's five «not covered» items were
un-adjudicated against a goal that demands every enumerated gap be built or
recorded; and the parked human question quoted no interval, so the owner was
asked to approve a cost nobody had stated.

It also found what no code review would: five consecutive `prove` records
reading `→ 0` with nothing to distinguish them, so «a loop making progress and
a loop spinning look exactly the same». `prove.mjs` grew `--note` for that.

## Round 3 — one reviewer per area that owed a clean round

Scoped by §7: `prove`, `ledger` and `new-mcp` each carried a fatal in two
consecutive rounds, so each got a reviewer of its own and nothing else.
**Five more fatals.** Two of them were earlier rounds' fatals alive under their
own fixes.

| # | Area | What | Fixed by |
|---|---|---|---|
| R3-F1 | prove | The separator regex missed a NEWLINE — the same separator as `;` — plus `$(…)`, backticks and `\|\| true`, the commonest failure-swallowing idiom there is. Five script bodies recorded `→ 0` for a check that exited 1. It also REFUSED `tsc --noEmit 2>&1` and a quoted `\|` in a jest pattern. | the guard is a WHITELIST now: strip what cannot lie (quotes, redirects, `&&`, `\|\| exit`), refuse what is left. Tests «the compound guard is a WHITELIST», «a wrapped shell is still a shell». |
| R3-F2 | prove | `npm run verify -w packages/api` read the ROOT package.json, found it clean, and recorded `→ 0` for a workspace script with a live pipe. | a workspace flag is refused — the script npm will run is not the one this can read. Test «a workspace flag is refused». |
| R3-F3 | ledger | The carrier's STOP paths were relative to cwd while `prove.mjs` walks up. Emitted from `packages/api`, the unit watched `packages/api/docs/STOP` while the loop honoured `docs/STOP` — and the banner PRINTED the right path while watching none of it. | both come from the same walk, absolute. Test «the carrier honours a STOP found by the WALK». |
| R3-F4 | ledger | When the walk yielded nothing, every consumer failed OPEN — no STOP, no ledger, and the piped-check guard silently off. Two triggers: an empty `$HOME` (`realPath('')` is the cwd) and a project whose root IS `$HOME`. | the directory you stand in is always scanned; the boundary applies to parents. The 12-level cap is 40 — at 13 below a repo root the STOP silently vanished. Tests «a walk that finds nothing…», «the project you are STANDING IN». |
| R3-F5 | new-mcp | An ABSOLUTE `--dir` inside the project: the check used `path.resolve`, the write used `path.join`. It wrote to a doubled path, registered an arg that does not exist, and printed four false lines, exit 0 — round 1's fatal, alive under the fix meant to close it, because two functions answered one question. | one absolute path per thing, derived once. Test «an ABSOLUTE --dir inside the project writes where it says». |

Majors: `--every 2h` emitted a step-1 minute field — **720 agent invocations a
day instead of 12**, under a header reading «every 120 min»; the GitHub
workflow's STOP step ran `exit 0`, which ends the STEP and lets the next one
run, so the switch on the only carrier that survives a closed laptop was inert;
`{"mcpServers":["legacy"]}` printed «registered» and exited 0 while
`JSON.stringify` dropped the property set on an array; a hardlinked config
rewrote a file outside the project; two processes racing lost a registration in
2 runs of 3 while both printed «registered»; `--note` wrote raw into the ledger,
so one run could FORGE a second entry for a command that never ran.

### The stopping rule after round 3 — still not «done»

| Area | R1 | R2 | R3 | Rule: no fatal two rounds running |
|---|---:|---:|---:|---|
| prove | 3 | 1 | 2 | **FAILS** |
| ledger | 1 | 1 | 2 | **FAILS** |
| new-mcp | 2 | 1 | 1 | **FAILS** |
| carrier | 0 | 1 | 0 (majors) | holds |
| tools | 0 | 0 | — | holds |
| loop | — | — | — | never reviewed; one runaway bound found by its author |

Round 4 is owed on the same three, plus `loop.mjs`, which is new code.
**§3 says a third round means the change was too big — this is the fourth.**
That judgement is recorded rather than argued with: nothing new is added until
those areas come back clean.

## Round 4 — one reviewer per area, plus the first outside look at `loop.mjs`

**Nine fatals.** Every one except `loop`'s was inside a previous round's fix.

| # | Area | What | Fixed by |
|---|---|---|---|
| R4-F1 | prove | The quote stripper ran `'…'` before `"…"`, so an apostrophe inside a double-quoted string paired ACROSS whatever sat between and deleted it: `echo "don't panic" ; false ; echo "we're green"` was cleared, run, and recorded `→ 0` for a check that exited 1 | one character scanner that tracks quote state, replacing three `String.replace` stages |
| R4-F2 | prove | The shell's script was «the first argument without a dash», so `bash -O extglob -c '… \| …'` was scanned as the string «extglob» | the argument after `-c`, found wherever the shell sits in argv |
| R4-F3 | carrier | The GitHub emitter ignored the nine STOP paths and baked ONE relative path. With `STOP` at the project root the step reported `halted=false` and the agent ran every 30 minutes forever — under a banner printing all nine. Every carrier test hardcoded `--kind launchd`: the GitHub emitter had ZERO stop coverage | the same set, relative to the repo root, where an Actions step actually runs |
| R4-F4 | carrier | A step in a cron minute field means «every value divisible by N». `--every 45m` fired at :00 and :45 — 48 paid runs a day where 32 were asked for | refuse what cron cannot express, name the divisors — and later, cut the emitter entirely |
| R4-F5 | new-mcp | `configExists` was a snapshot taken BEFORE the lock and it gated the re-read, so a racer starting in an empty project wrote `{}` over what the first holder had just created: 7 races of 10 lost a registration, both printing «registered», both exit 0 | the lock is taken before anything is read or written |
| R4-F6 | loop | **Ctrl-C and SIGTERM could not stop it.** `run()` was fully synchronous, so the handlers never got a turn — while REGISTERING them had already removed Node's default terminate action. Ctrl-C killed the child and the loop immediately started a fresh PAID agent; only SIGKILL worked, and SIGKILL left the lock, which silently disabled the carrier forever | the loop is asynchronous, the handlers run, and the lock carries its holder's PID so a dead one is reclaimed |
| R4-F7 | loop | The lock was keyed to `cwd` while the ledger came from a walk UP: two loops started from different directories drove one `goal.md` concurrently, each writing its own log | one walk returns the ledger AND its project root; both the lock and the log key off it |
| R4-F8 | prove | `--note` was written raw, so one run could FORGE a second ledger entry for a command that never ran — through the flag the skill tells the model to use | whitespace-collapsed |
| R4-F9 | new-mcp | A top-level array config printed «registered» and exited 0 while `JSON.stringify` dropped the property; a top-level string threw and left a scaffold | the shape helper is asked about the config itself, not only about `config[key]` |

Majors worth naming: `%` in a cron command becomes a newline and truncated it
mid-quote, taking the log redirect with it; `run: ${agent}` as a plain YAML
scalar let « #» truncate the command silently; thrash counted mtime, so
`touch goal.md` bought twenty-five paid iterations; one truncated log line
erased the entire history for `--status`; a failing agent was diagnosed as
thrash, so an unauthenticated CLI was reported as «a wrong premise, not
persistence»; an agent that returns instantly could fan out without limit.

## Convergence analysis — after four rounds, counting instead of searching

20 fatals, **9 distinct causes**, three of which produced 70 %: one question
answered by two implementations (5), a guard that analyses shell text (6), and
scope taken from `cwd` (3). New causes per round: **6 → 1 → 0 → 2**.

Severity was **not** falling. Round 1's worst outcome was a lie told to a human
who was present; round 4's was an inert kill switch on an unattended paid
daemon. Two round-3 MAJORS were re-graded FATAL in round 4 after partial fixes.

Two verdicts came out of it, and both were acted on:

- **Cut the grammar nothing can execute.** `--kind cron` produced four findings
  in three rounds, all in the crontab COMMAND LINE, and they survived because
  nothing in the suite can run a crontab. The plist is `plutil`-linted and the
  `sh` wrapper is executed — neither ever carried a surviving defect. Deleted.
- **Replace the stopping rule.** «No fatal in the same area two rounds running»
  was lost 4 times of 4 (`prove` clean in 0 rounds of 4). §7 now asks for a
  differential oracle per guard, every emitted grammar executed by its real
  interpreter, and two consecutive rounds adding zero new CAUSES.

The analyst also predicted the shell analyser would be redundant once an oracle
existed. **That was tested and refuted:** with the analyser the property holds
on all 32 corpus bodies; with it disabled, prove reports success for **six**
failing checks. A recommendation strong enough to act on is strong enough to
test first.

## The install path, run end to end — a check nobody had done

Everything above tests the scripts where they are developed. The thing people
actually get is `npx skills add vladyslav-betterme/autopilot-skill`, and until
now nothing had run that. From a clean temp project, install then every
documented command in order:

| Command | Result |
|---|---|
| `npx skills add …` | exit 0 → `.agents/skills/autopilot/` |
| `discover.mjs` | exit 0, `checks: ["npm run verify"]` |
| `bootstrap.mjs` | exit 0, five ledger files at the elected home |
| `tools.mjs` | exit 0, 8 servers found |
| `skills.mjs --install any --dry-run` | exit 0, 4 install commands printed, nothing run |
| `prove.mjs --record --note … -- npm run verify` | exit 0, recorded into the ledger it just created |
| `carrier.mjs --agent …` | exit 0, a plist on stdout, nothing armed |
| `loop.mjs --agent … --max 2` | exit 0, two iterations, stopped at the bound |
| `new-mcp.mjs probe -d …` then the printed `--call` line | `probe is alive: fresh` |
| `new-skill.mjs probe-skill -d …` | exit 0, `.agents/skills/probe-skill/SKILL.md` |

Ten for ten. It is «execute the artifact you emitted» applied to the repository
as a product rather than to one file — and the first time this campaign checked
that what it publishes is what it tests.

## What none of it covers

- Windows. No reviewer had a host; `path.join` backslashes in `args`, and the
  printed `--call '{"text":"…"}'` quoting, are unverified there.
- Whether any harness actually resolves a relative server path against the
  project root — the claim is now hedged rather than tested.
- Runtime MCP reload behaviour, for the same reason.
- Concurrent `prove.mjs --record` runs appending to one `goal.md`.
- `aerender` actually rendering: existence and architecture were verified,
  headless behaviour was not.
