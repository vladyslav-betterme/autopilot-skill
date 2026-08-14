# Review — campaign 01 (2026-08-13 → 08-14)

> The file was called `2026-08-13.md` while carrying rounds done on the 14th —
> a drill caught it. Rounds are dated in their own headings now.
>
> **The cause counts in this file group FATALS into a narrative.** The counter
> §7 actually uses is the distribution table in `docs/failures.md`: one
> taxonomy, one file. Where they differ, that one wins.

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

Round 1's standard is «every finding carries the command that reproduces it».
Round 4's table was written without one — the first round in this campaign to
miss it — so the reproductions are restored here from the reviewers' reports.

| # | Area | What | Reproduce it | Fixed by |
|---|---|---|---|---|
| R4-F1 | prove | The quote stripper ran `'…'` before `"…"`, so an apostrophe inside a double-quoted string paired ACROSS whatever sat between and deleted it: `echo "don't panic" ; false ; echo "we're green"` was cleared, run, and recorded `→ 0` for a check that exited 1 | `"verify": "echo \"don't panic\" ; node -e \"process.exit(1)\" ; echo \"we're green\""` then `prove --record -- npm run verify` | one character scanner that tracks quote state, replacing three `String.replace` stages |
| R4-F2 | prove | The shell's script was «the first argument without a dash», so `bash -O extglob -c '… \| …'` was scanned as the string «extglob» | `prove -- bash -O extglob -c 'node -e "process.exit(1)" \| cat'` | the argument after `-c`, found wherever the shell sits in argv |
| R4-F3 | carrier | The GitHub emitter ignored the nine STOP paths and baked ONE relative path. With `STOP` at the project root the step reported `halted=false` and the agent ran every 30 minutes forever — under a banner printing all nine. Every carrier test hardcoded `--kind launchd`: the GitHub emitter had ZERO stop coverage | ledger in `docs/`, `STOP` at the root, then run the emitted step's shell block: it printed `halted=false` | the same set, relative to the repo root, where an Actions step actually runs |
| R4-F4 | carrier | A step in a cron minute field means «every value divisible by N». `--every 45m` fired at :00 and :45 — 48 paid runs a day where 32 were asked for | `carrier --kind cron --every 45m` → `*/45 * * * *`; expand it | refuse what cron cannot express, name the divisors — and later, cut the emitter entirely |
| R4-F5 | new-mcp | `configExists` was a snapshot taken BEFORE the lock and it gated the re-read, so a racer starting in an empty project wrote `{}` over what the first holder had just created: 7 races of 10 lost a registration, both printing «registered», both exit 0 | two `new-mcp` processes in one empty project, `wait`, then count the keys in `.mcp.json` | the lock is taken before anything is read or written |
| R4-F6 | loop | **Ctrl-C and SIGTERM could not stop it.** `run()` was fully synchronous, so the handlers never got a turn — while REGISTERING them had already removed Node's default terminate action. Ctrl-C killed the child and the loop immediately started a fresh PAID agent; only SIGKILL worked, and SIGKILL left the lock, which silently disabled the carrier forever | `loop --agent 'sleep 15' --max 6 --sleep 0 --thrash 99 &` then `kill -TERM` twice | the loop is asynchronous, the handlers run, and the lock carries its holder's PID so a dead one is reclaimed |
| R4-F7 | loop | The lock was keyed to `cwd` while the ledger came from a walk UP: two loops started from different directories drove one `goal.md` concurrently, each writing its own log | one loop from the root, one from `src/deep`, both running at once | one walk returns the ledger AND its project root; both the lock and the log key off it |
| R4-F8 | prove | `--note` was written raw, so one run could FORGE a second ledger entry for a command that never ran — through the flag the skill tells the model to use | `prove --record --note $'ok\n- **prove** `x` → 0' -- true` | whitespace-collapsed |
| R4-F9 | new-mcp | A top-level array config printed «registered» and exited 0 while `JSON.stringify` dropped the property; a top-level string threw and left a scaffold | `printf '["legacy"]' > .mcp.json` then `new-mcp ae -d "…"` | the shape helper is asked about the config itself, not only about `config[key]` |

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
scope taken from `cwd` (3). New causes per round: **do not read a sequence here — run the counter**, `grep -oE '\| R[0-9]+' docs/failures.md | sort | uniq -c`. Two prose sequences in this campaign disagreed with it and with each other; drill 5 caught both.

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

## Round 5 (08-14) — the three unreviewed scripts, and a re-review of round 4

**Fourteen fatals.** The prediction held exactly: a surface nobody had looked at
yields round-1-quality bugs, and the fixes of the previous round yield their own.

### The three scripts no reviewer had ever opened

| # | Area | What | Reproduce it | Fixed by |
|---|---|---|---|---|
| R5-F1 | discover | A Gemfile with neither `spec/` nor a Rakefile produced a check that globbed `test/**/*_test.rb`, found nothing, required nothing and **exited 0** — a definition of done that cannot fail, on every iteration of every Jekyll site | `printf 'source "x"' > Gemfile` then `discover.mjs` | the fallback is deleted; no spec and no Rakefile means an honest none |
| R5-F2 | discover | `pytest -q` was emitted because a `tests/` directory existed, and `deno test -A` because a `deno.json` held a formatter width — commands for tools that are not installed, red from iteration one | a unittest project with `requirements.txt`; a Node project with `{"fmt":{"lineWidth":100}}` | declared **and** on PATH, or not claimed |
| R5-F3 | discover | The Makefile check was a regex over the file, so it invented `make check` for a target inside a `define` block (make exits 2) and MISSED `check test:` and a target arriving through `include`, handing the loop `make build` as its definition of done | both fixtures above | it asks make: `make -n <target>` runs nothing and answers |
| R5-F4 | discover | An aggregate named `check` DELETED the test suite from the definition of done. SvelteKit's own manifest is `"check": "tsc && cd ./test/types && tsc"` beside a real `test` | that package.json, then `discover.mjs` | an aggregate stands alone only over what it visibly INVOKES; and «invokes» is a runner calling it, not the word appearing in a path |
| R5-F5 | discover | `JSON.parse` in a bare catch: a package.json with a UTF-8 BOM — what PowerShell writes, what npm reads fine — was reported as «unknown project, no check, no scripts», silently | a BOM'd manifest | BOM and comments are stripped, and an unreadable manifest is a reported finding |
| R5-M1 | skills | `--json` ran before the install block, so `--install nosuchtag --json` printed `[]` and exited 0 where the same command without `--json` refuses — and `--install any --json` installed nothing, successfully | `skills.mjs --install nosuchtag --json` | the two flags do not combine |
| R5-M2 | new-skill | The `mkdirSync` sat outside the try, so a `.claude/skills` that is a dangling symlink threw uncaught AFTER the skill was written — and the retry refused, because it now existed | `ln -s ../.agents/skills-gone .claude/skills` | inside the try; the skill is created and the link failure is reported |
| R5-M3 | new-skill | A body opening with `---` (a legal markdown thematic break) had its whole first section stripped as frontmatter, silently, exit 0 | pipe a body starting with `---` | only a block whose first line is `key:` is frontmatter |

### The re-review of round 4's fixes — the layers nest

| # | Area | What | Fixed by |
|---|---|---|---|
| R5-F6 | prove | `cat <(node -e "process.exit(1)")` — process substitution hides a status like a pipe, and was not a separator to the scanner | added, with `>(…)` |
| R5-F7 | prove | `bash -cx '… \| tail'` — the `-c` pattern required `c` to be LAST; short options combine. Round 4's fix moved the hole from «options take values» to «options combine» | any cluster containing `c` |
| R5-F8 | prove | `sh -c 'npm run direct'` — argv[0] was `sh`, so the npm-script guard never ran | the guards recurse through each other, depth-bounded |
| R5-F9 | prove | `"verify": "sh -c '… \| tail'"` — the scanner correctly treats quoted text as data, and that data was a shell script | the same recursion, the other way |
| R5-F10 | prove | `npm run --silent inner` — the graph walk captured «--silent» as the script name | flags are skipped |
| R5-F11 | prove | `\|\| exit 0` was permitted **by name**, beside a message saying `\|\| exit` cannot hide a failure | `exit 0` is refused; `exit 1`, `exit $?` are not |
| R5-F12 | loop | Ctrl-C during the `--sleep` gap killed nothing and started a fresh PAID agent — 15 seconds of every iteration by default | the gap is interruptible, and the timer is CLEARED so the process actually leaves |
| R5-F13 | loop | An agent that ignores SIGTERM made the loop killable only by SIGKILL, because registering a handler removes Node's default terminate | a second signal kills the agent's process GROUP and exits |
| R5-F14 | carrier | A STOP that is a broken symlink halted the loop and NOT the carrier: `lib` uses `lstat` on purpose, both emitted units used `[ -e ]` | `[ -e "$s" ] \|\| [ -L "$s" ]` |

Majors with them: the GitHub banner printed nine absolute paths from the
author's laptop while the workflow checks the checkout; `--every --kind github`
silently scheduled every 30 minutes because the value was missing; `EPERM` from
`process.kill(pid, 0)` was read as «gone» and stole a live holder's lock; a
compound `--agent` orphaned the real agent on Ctrl-C.

### And the finding about the check itself

**The oracle was decorative.** Ground truth was `bash -o pipefail`, which
answers «what did the LAST command return»: 22 of 32 corpus rows had truth 0,
including **ten of the thirteen labelled as round 1–4 fatal reproductions**. The
reviewer proved it by running the round-4 oracle against the pre-round-4
`prove.mjs` — the binary with both round-4 fatals — and it passed.

Ground truth is `bash -e -o pipefail` now («did any command fail»), the known
divergence is a labelled row, and **the oracle has its own regression test: it
must FAIL against two historic versions.** It does. That test is the answer to
«how do you know a check is load-bearing», and it is the one thing from this
campaign most worth stealing.

## Round 6 (08-14) — three lenses this campaign had not used

Two fatals, seven majors, sixteen doc claims — and **one new cause**, which is
the number the stopping rule counts.

| # | Lens | What | Reproduce it | Fixed by |
|---|---|---|---|---|
| R6-F1 | money | The carrier took its overlap lock in the directory it was EMITTED from while the loop locks the project the ledger belongs to. Emitted from `packages/api`, both paid agents ran concurrently, every interval, under a banner promising a lock. The log dir went to the same wrong place | emit from a subdirectory, run the wrapper, start the loop from the root | one derived project root for the `cd`, the lock and the log |
| R6-F2 | money | SIGHUP had no handler, so a closing terminal killed the supervisor while the agent — detached into its own group — survived. The lock carries the SUPERVISOR's pid, so the next carrier tick reclaimed it and paid for a second agent beside the orphan, with nothing watching STOP | `kill -HUP` the loop, then run the carrier's wrapper | SIGHUP joins SIGINT/SIGTERM |
| R6-M1 | money | The thrash stop was inert for the workflow SKILL.md recommends: `prove --record` appends a timestamped line every iteration, so the content hash moved every time — eight of eight iterations «moved» with nothing done | a loop whose agent is only `prove --record -- true` | the hash excludes the tool's own receipt |
| R6-M2 | money | Two projects named `api` produced one launchd label and one install path in `~/Library/LaunchAgents`: arming the second overwrote the first's plist, and the job that kept firing was the FIRST project's | emit from two same-named checkouts | the label carries a hash of the project path |
| R6-M3…M9 | first run | **The tool prints an instruction that does not work** — seven of them: a usage line offering `--kind cron` deleted two rounds earlier, `<skill>` in a terminal, an `install:` hint that fails from the project root the skill says to stand in, `read /goal.md`, a `python -m pytest` fallback on a machine with only `python3`, a justfile project reporting «no check» while `just check` sat in the repo | follow the README as a stranger and run every line | fixed individually, and covered by a seventh oracle that runs every script and checks what it printed |
| R6-D1…D16 | honesty | Sixteen claims false or exaggerated, **no new cause**: «four stopping conditions» when there are six, «six harnesses» when seven, a «five-lens council» that was three, «32 bodies» when the corpus is 37 under a ground truth that changed — and the row that exists BECAUSE the count kept rotting, rotted a third time | `npm test`; `grep -c "stopped:" skills/autopilot/scripts/loop.mjs (7, not the «six» this row asserted — the number rotted again inside the row recording that numbers rot)`; count the corpus | the numbers that rot now carry the command instead |

**The new cause:** «the tool's own printed instruction does not work». It is not
a bug in what anything DOES — and for an unattended loop the next actor is a
model reading that line, so it is the same thing. `test/printed-instructions-oracle.test.mjs`
is the guard: sixteen invocations, no placeholder outside a usage line, every
offered flag accepted by its own parser, every path present.

New causes per round so far: **the counter owns this number** — `grep -oE '\| R[0-9]+' docs/failures.md | sort | uniq -c`, which at `8f2d3af` answers R1 9 · R2 1 · R3 4 · R5 5 · R6 4 · R7 3. The prose sequence that stood here («6 → 1 → 0 → 2 → 5 → 1») agreed with the counter on no round at all, and its «0» was cited in `goal.md` as the proof that a zero round is reachable. It proves nothing: **no round in this campaign has ever been zero.**

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

## Cold-start drill 4 (08-14) — against the current ledger, after round 6

A fresh subagent, restricted to `docs/*.md` and `docs/reviews/campaign-01.md`
only — no source, no `SKILL.md`, no git log — asked whether a fresh session
could both resume the work and CLOSE it from the ledger alone. Verdict, pasted
verbatim:

---

# Cold-start drill — verdict

## 1. Verdict: **NO**

## 2. Reasoning for RESUME

Unambiguous. `STEERING.md` gives an ordered "take ONE and finish it" list, and item 1 is not close: **dispatch a fresh read-only agent, given only `docs/**`, to answer whether a fresh session can resume and close the work; paste its verdict verbatim into `docs/reviews/`; mark criterion 4 met only if the verdict is YES.** That is exactly this task — this session *is* that drill. `goal.md` criterion 4 states the same procedure independently ("dispatch a fresh read-only drill, paste its verdict verbatim into `docs/reviews/`, and mark this met only if it answered YES… A drill run by the party it audits does not count"). So the next action is knowable with certainty, and it is the one currently executing.

If for some reason a subagent could not be dispatched, `STEERING.md` also names the fallback unambiguously: bring `docs/changelog.md` current (item 2), which is independently verifiable as stale (it stops at "I13" while `goal.md`'s iteration log runs through round 4/5/6 fixes with SHAs after that point).

So RESUME is answerable cleanly. The problem is entirely on the CLOSE side.

## 3. Reasoning for CLOSE

Walking `goal.md`'s done-criteria table:

- **#1 "The three §7 conditions hold" — partly.** The evidence cell's arithmetic doesn't match the table it sits above (see Finding 1). Separately, the mechanism it depends on — "two consecutive rounds add zero new rows to `failures.md`" — cannot be independently recomputed from `failures.md` as written (Finding 4), and there is no scheduled path in `STEERING.md` for how this criterion ever reaches "yes" (Finding 5). Not closable from the ledger alone.
- **#2 "The loop survives the session" — yes.** Evidence is a narrative claim (launchd bootstrap/kickstart, STOP from a subdirectory, "7 tests") without a reproduction command, unlike most other cells in this same ledger. Weaker than the campaign's own stated standard ("every finding carries the command that reproduces it") but not contradicted by anything else I read — I'd call this "believable, not provably closed."
- **#3 "Evidence step is mechanical" — yes.** Well evidenced: concrete reproducible commands (`false | tail` → 0 vs `prove -- false` → 1), specific counts (12 tests). Sufficient to believe without re-deriving.
- **#4 "The ledger is provably resumable" — partly.** Directly contradicted between `STEERING.md` and `goal.md` on what "drill 3" even is or whether it happened (Finding 2). `campaign-01.md` — the file both cite as evidence — doesn't contain a "Cold-start drill 3" section at all.
- **#5 "Verification is not self-service" — yes**, on the part covered by `campaign-01.md` § Round 2 (five concrete invocations, three missed by same-model review — fully reproducible). The cell also cites "doctrine in `references/critics.md`," which is outside the docs/ ledger and unverifiable under the drill's own rules (minor, Finding 8).
- **#6 "MCP server cost is measured or the choice is recorded" — yes.** Cleanly matches `decisions.md` verbatim, including the fact that a landed test refuses the `--cost` flag. This one is genuinely closable from the ledger alone.

So: two criteria (#3, #6) are solidly closable from the ledger; one (#2) is plausible but thinly evidenced; three (#1, #4, and the cross-cutting §7 mechanism) contain actual contradictions or unrecoverable ambiguity that a fresh session cannot resolve without going outside the ledger (or without guessing).

## 4. Specific findings

1. **`goal.md`'s own guard count is stale — "6" vs. the 7 rows actually in its table.** The text directly above the guard table says *"«1 guard of ~6» was not computable, because nobody had listed the six"*, and criterion 1's evidence cell says *"**6 guards of 6** have oracles"* (`docs/goal.md` lines 42, 59). But the table itself (lines 47–53) lists **seven** rows with oracles: `prove`, `new-mcp`, "the ledger: election vs search", `tools.mjs`, `loop` thrash detection, "every script's printed instructions", and "carrier schedule expression". `campaign-01.md`'s own Round 6 section calls the printed-instructions test **"a seventh oracle"** twice. The iteration log even shows the moment the number changed and was never reconciled in the prose: `"all six guards have oracles · 2026-08-14T11:08:09Z"` (line 154) is followed later by `"R6: printed instructions oracle · 2026-08-14T11:30:19Z"` (line 159) — a guard added *after* the "six" count was written, with the surrounding prose never updated. This is the exact class of bug the campaign says it fixed at Round 6 ("the numbers that rot now carry the command instead") — and it rotted anyway, in the most load-bearing sentence in the file.

2. **Contradiction about "drill 3" between `STEERING.md` and `goal.md`, and a dangling reference to a section that doesn't exist.** `STEERING.md` line 18 says *"Drills 1 and 2 said «start but not close»; **drill 3's fourteen findings are fixed**."* `goal.md` line 62 says *"drills 1 and 2 both «start but not close», **14 findings between them, all fixed. Drill 3 is running** against this version"*. These disagree on (a) whether the 14 findings belong to drill 3 or to drills 1+2 combined, and (b) whether drill 3 is finished or still in progress. Neither claim is checkable: `campaign-01.md`, which both cite (`§§ Cold-start drill, Cold-start drill 2`), contains only two "Cold-start drill" sections — there is no "Cold-start drill 3" write-up anywhere in the file, despite it being the file the campaign says must carry "the command that reproduces it" for every finding.

3. **`decisions.md` and `STEERING.md` directly disagree about "concurrent `prove --record`".** `decisions.md` (2026-08-14 row) lumps it in with Windows/harness-reload/aerender under *"Not covered, accepted for this campaign… recorded, not built"*, and justifies all five together as needing *"a machine or an account this campaign does not have."* `STEERING.md` item 3 says the opposite: *"Four are adjudicated in `decisions.md`. **Concurrent `prove --record` is the one that can be tested here**"* — no special machine or account needed, just two local processes — and instructs the next iteration to actually write that test, demoting it to a decision only "if it does not [corrupt]". `decisions.md`'s stated cost reasoning (Windows host / harness install / AE seat) doesn't even apply to this item, confirming the adjudication was written for the other four and appears to have absorbed this fifth one by mistake. A fresh session cannot tell whether this gap is closed or still open.

4. **§7's stopping-rule denominator ("two consecutive rounds, zero new rows in `failures.md`") cannot be recomputed from `failures.md` as written.** `failures.md`'s own preamble declares it the sole authority over `campaign-01.md`'s round narrative ("When they disagree, this file wins"), but its "Trend" column is free text that mixes single-round labels ("R3"), multi-round ranges ("R2, R3, R4"), and bare dates with no round at all ("2026-08-13 and 2026-08-14, both green on macOS and red in CI"). Tallying "new causes per round" directly from this column produces a different shape than the "6 → 1 → 0 → 2 → 5 → 1" sequence asserted in `campaign-01.md`'s Round 6 section (e.g. several rows first tagged "R3" in `failures.md` — the different-function fix, the blacklist-to-whitelist rewrite, the cwd-scope guard — don't fit a "round 3 = 0 new causes" reading). Since `goal.md`'s claim *"the streak is 0 of 2, reset by round 5"* rests on this exact computation, and the designated authoritative file doesn't support mechanically re-deriving it, this number has to be taken on faith rather than verified.

5. **No visible path to ever closing criterion 1.** It needs two consecutive review rounds with zero new causes; across six rounds there has never been more than one zero round in isolation (per `campaign-01.md`'s own sequence). Yet `STEERING.md`'s current three-item work list contains no instruction to run a seventh review round, and criterion 1 is not in the "Parked — blocked on the owner" table either. A fresh session has no way to know whether more review rounds are expected, how many, or whether this criterion is meant to be reclassified/parked instead.

6. **`docs/changelog.md` is confirmed stale**, exactly as `STEERING.md` item 2 already flags: it stops at "I13" while `goal.md`'s iteration log continues with SHA-bearing work through rounds 4, 5, and 6 (round 5's 14 fatals, round 6's fixes, the printed-instructions oracle). This is a known, currently-open gap, not a hypothetical — worth noting because `docs/reviews/campaign-01.md`'s "Cold-start drill 2" section says this exact defect ("`changelog.md` contradicted the iteration log and omitted the last two landings") was already found and fixed once; it has since recurred.

7. **Possible unacknowledged gap: GitHub Actions YAML is only parsed, not executed by its real interpreter.** Criterion 1's "how it is checked" column offers *"a YAML reader over the emitted workflow"* as satisfying §7 condition 2 ("every grammar this skill EMITS is executed by its real interpreter in the check"). A structural YAML parse is not the same claim as execution by GitHub's own runner — and `failures.md` documents this exact distinction as one of the campaign's most serious recurring causes ("a grammar emitted for an interpreter the check cannot run," the reason `--kind cron` was cut outright). Nothing in the ledger's "install path, run end to end" section or the "not covered" list mentions actually running the emitted GitHub workflow, so it's unclear whether this was considered and judged acceptable, or simply not noticed the way cron wasn't for three rounds. Not provable as a defect from the ledger alone, but not resolvable either.

8. **Minor: criterion 5's evidence cites a file outside the docs/ ledger.** *"doctrine in `references/critics.md`"* — under the drill's own rules (docs/** only, no source), this half of the evidence is unverifiable. The empirical part of the claim (five `codex` invocations in `campaign-01.md` § Round 2) is independently checkable and does hold up, so this is minor, but it's still a pointer the ledger leans on that a docs-only session cannot open.

---

**Clarification finding 2 asks for:** the «Cold-start drill 3» that `STEERING.md`
and `goal.md` both name never got a section of its own here. It is the
reviewer tagged «cold-start drill 3» in Round 5's table above, and its
findings are inside that round's fourteen fatals — there is no standalone
write-up, and there never was one. This paragraph is that absence made
explicit instead of left dangling.

Of the eight findings, one is fixed in the same commit as this section: the
guard table grew a seventh row in round 6 (the printed-instructions oracle)
and criterion 1's evidence cell still said six — see `goal.md`. The other
seven are recorded here for whichever iteration picks them up; none of them
is fixed in this pass.

## Round 7 — concurrency, ordering and time

One reviewer, one lens, read-only, top tier: **«nothing here is single-threaded
— two processes, and time itself»**. It was dispatched because every round
before it had reviewed the code as if one process ran it, while the whole point
of a carrier is that a scheduler fires it on an interval that has no idea a loop
is already running.

It returned **one fatal and five major, every one reproduced against running
code**, and it is the round that most changes what this skill claims about
itself.

| # | Finding | Reproduction it ran |
|---|---|---|
| F1 | **FATAL — the lock is not mutually exclusive.** Reclaiming a stale lock was `rmSync` then `mkdirSync`: two syscalls, so a competitor's remove landed after the winner's create and both held it. | 1 contended start in 60 with two racers; 23 of 25 with sixty-four (up to 6 simultaneous holders); loop-vs-carrier at 250 µs offsets: 12 of 57; **end to end, both paid agents ran, 1 in 150** |
| F2 | The emitted wrapper and `takeLock` disagree about «held». `kill -0 "$(cat pid)"` returns non-zero for an EMPTY argument and for EPERM alike, so the wrapper stole the lock in three states the library refuses — including a live process owned by another user. | deterministic, all three states |
| F3 | The SIGKILL escalation closed over the mutable `child` and was never cleared, so it killed the **next** iteration's healthy agent — and with the default `--thrash 2` the loop then stopped the campaign blaming the operator's command. | `--timeout 1 --sleep 5 --max 2`: iteration 2 exit 137 at 5 s, ledger records it as the agent's own death |
| F4 | `--timeout` ≥ 35792 overflows `setTimeout` and fires after 1 ms: asking for a very long timeout produced **no** timeout, while the loop printed the number asked for. | `--timeout 40000` → agent killed at 0 s, `timedOut:true` |
| F5 | `release()` deleted the lock without checking it still owned it, stripping it from a process that had legitimately taken it after an operator cleared a stale one. | three-process sequence, third acquired while the second ran |
| F6 | `cronFor` guards step-wrap in the minute and hour fields and forgets the day: «every 28 days» fires **23 times a year, not 13** — 1.8× the invocations the operator approved. | expanded against a real calendar |

**What it ran and found nothing in** — worth as much as the findings, because
these were open questions: 200 concurrent `prove --record` with 6 KB lines and
50 with 400 KB lines, **0 malformed, 0 interleaved, 0 lost** (this closes the
«concurrent `prove --record`» item that three rounds listed as not covered); 40
concurrent appends to a `goal.md` with no trailing newline, no spurious blank
line, so the thrash detector cannot be falsely reset that way; DST, which cannot
reach this code at all (GitHub cron is UTC, launchd gets a pure interval).

**What it could not land, and said so:** the clean-directory race between
`mkdir` and the `pid` write. 102 swept offsets in one direction, 81 plus 40
random in the other, zero hits; estimated width a few tens of microseconds. F2
proves the window is exploitable, and it fails CLOSED — a skipped iteration, not
two agents. Recorded as a limit of the check, not as an absence of the bug.

**Fixed in the same pass, each with a guard watched failing first**
(`test/lock-oracle.test.mjs`, plus two rows in `carrier-oracle` and two in
`loop-oracle`): the reclaim is now a single atomic `rename`; `releaseLock`
checks the pid is ours; the escalation captures **this** iteration's child and
is cleared with the timeout; `--timeout` is bounded at a day and refuses
anything it cannot honour; the wrapper's lock line fails closed and only
reclaims a numeric pid that neither `kill -0` nor `ps -p` can find; a
day-of-month step is refused outright, since cron cannot express one honestly.

**The observation that outlives the findings:** the reviewer noticed the working
tree change under it mid-review — nine source files at 15:47 — verified every
function it reports on was byte-identical in that diff, and named the shape:
*two agents writing one working tree with nothing serialising them is F1 at the
campaign level.* The campaign has no lock of its own. It is recorded in
`decisions.md` rather than fixed, because the serialisation that exists — one
human, one terminal — held throughout.

## Cold-start drill 5 — verdict NO (pasted verbatim; the fixes follow it)

A fresh read-only subagent, permitted to read `docs/**` and nothing else, no git
history, asked: «could a fresh session RESUME this work AND CLOSE it?»

> **Verdict: NO.** A fresh session can RESUME from this ledger — comfortably, in
> about six minutes of reading. It cannot CLOSE it. The single criterion that
> gates the campaign (criterion 1, condition 3) is decided by a number, the
> ledger names the exact command that produces that number, I ran it, and **it
> returns the opposite of what the ledger asserts beside it** — twice, in two
> different ways. Separately, the file the ledger designates as "what to work on
> now" is a full iteration stale on every item it contains, and nothing in the
> ledger says which file wins when it and `goal.md` disagree.
>
> Time to know what to do next: **~4 minutes**. Time to discover that what I was
> told to do next was already done: ~9 minutes. That gap is the finding.

The thirteen findings, and what happened to each:

| # | finding | status |
|---|---|---|
| F1 | **FATAL.** Round 7's three causes were written as `###` sections and **no row was added to the distribution table**, so the counter §7 names (`grep -oE '\| R[0-9]+' …`) reported round 7 as a ZERO round. The stopping rule and the prose beside it gave opposite answers about whether one clean round remains or two | **fixed** — three rows added, tagged `R7`; the counter now answers 3 |
| F2 | **FATAL for closing.** `goal.md` claimed «R3 0 … Round 3 is the existence proof that zero is reachable». The counter says R3 is **4**. **No round in this campaign has ever been a zero round**, so the one sentence a fresh session would lean on to believe the goal is achievable at all was untrue | **fixed** — the claim is deleted and replaced with the counter and an explicit «no round has ever been zero» |
| F3 | **FATAL for resuming honestly.** `STEERING.md` — «read fresh every iteration», «what to work on now» — was stale on **all four** items, ordering a drill that had already run, a changelog that was already current, and a measurement round 7 had already made; and it omitted the only open item (round 8). Nothing said which file outranks the other | **fixed** — STEERING rewritten around round 8 / round 9 / drill 6, and `goal.md` now states that it outranks STEERING |
| F4 | **MAJOR.** The two files gave **opposite** instructions about the only irreversible outward act: `goal.md` «standing authorisation» to push, `STEERING.md` «do not push» | **fixed** — STEERING corrected; the standing authorisation is the true one |
| F5 | **MAJOR.** The Parked row — the one place the ledger exists to inform the owner's money decision — said the GitHub workflow is «YAML no reader in the check parses» (contradicted three times elsewhere in the same ledger, 29 lines from itself) and that its kill switch was broken «one round ago» (it was three) | **fixed** |
| F6 | **MAJOR.** The `mkdir` lock decision was left unmarked after round 7 replaced it, so its recorded cost and its «atomic on every filesystem» guarantee both read as current — the second being exactly the claim round 7 refuted | **fixed** — marked superseded, with the successor row beside it and the lesson: the guarantee was true of the PRIMITIVE and false of the SEQUENCE |
| F7 | **MAJOR.** «32 corpus bodies» — ruled false in round 6, remedied there by carrying the command instead — survived in two more places, one of them the entire justification for keeping the shell analyser. The command answers **37** | **fixed** in both |
| F8 | **MAJOR.** A printed reproduction command in this file (`grep -c "stopped:" loop.mjs`) does not run from the repo root, and its «corrected» number had rotted again (7, not six) — round 6's own new cause, occurring inside the row that records round 6's new cause | **fixed** |
| F9 | **MAJOR.** Criterion 1's evidence cited §§ Round 4, Round 5 for a claim that lives in § Round 7 | **fixed** |
| F10 | **MEDIUM.** The «document stating as an invariant what was never checked» row carried no `R<n>` tag, so the counter skipped the largest category in its own taxonomy — and round 6's sixteen doc claims were never folded into its count of 10 | **fixed** — tagged `R1`, count 26 |
| F11 | **MEDIUM.** The same property measured twice, thirty lines apart, in one file: 20 concurrent appends and 200 | **fixed** — the smaller measurement now names the larger as the one to cite |
| F12 | **MEDIUM.** `goal.md`'s iteration log, declared «the loop's state», is BEHIND `changelog.md`: the last five landings, round 7's lock fix among them, are not in it | **fixed** — the fixed-state row now names `changelog.md` as the landing record |
| F13 | **MINOR.** «Last updated at `0cdb95b`» competes with `changelog.md`'s newest SHA, and a docs-only session cannot break the tie | **fixed in the same commit as this section**, and it will rot again by one commit every time — which is why the row's instruction is to PRODUCE the number, not read it |

**What the drill found healthy, recorded because it is the part that worked:**
the four-step «how criterion 1 actually closes» plan with an owner per step and
an explicit escape hatch; the guard table at 8 of 8, with all eight named oracle
files present on disk; drill 4's dangling «Cold-start drill 3» resolved
explicitly; criterion 5 verifiable from the ledger alone (`command -v` found all
six named tools); and the «reading the check» row, which stopped the drill from
misreading forty `#`-prefixed lines as failures.

**What it could not judge**, in its own words: whether `0cdb95b` is HEAD (git is
outside its permission by design), whether the R7 omission was deliberate or an
oversight, whether the eight oracle files contain the differential oracles
claimed (filenames and one `grep -c` only), whether round 7's fixes are actually
in the tree — «the campaign's own tenth failure row is precisely *a record
written from intent, and intent is not the file*» — and four cited files under
`references/` it is not permitted to open.

**Criterion 4 stays `partly`.** The procedure in `goal.md` is explicit: it moves
to met only on a YES. Drill 6 runs against the repaired ledger.

## Round 8 — the honesty audit, the mutation test, and the fix that was not one

Four read-only reviewers were dispatched: a critic over round 7's own repairs, a
mutation tester over all eight oracles, cold-start drill 5 (its verdict is the
section above), and an honesty auditor over `SKILL.md` and `references/`. **Round
8 is not clean** — it added three rows.

### The finding that outranks the rest: round 7's fix was not a fix

The lock oracle written IN round 7's own commit passed five consecutive
standalone runs. Under the full suite, machine loaded, it failed with **three to
six simultaneous holders in every trial** — worse than the defect it replaced.
`rename` is atomic; the RECLAIM is not, because «this pid is dead» and «remove
its directory» are two steps and a competitor reclaims in between. Repaired by
checking what was moved, and then by making the pid file — not the directory —
the claim, verified after a settle. Recorded in `failures.md` as «One step made
atomic, while the RACE spans two», with the second lesson beside it: **a
concurrency guard that has not been run under load has not been run.**

### The honesty audit — five majors, all against the shipped artifact

| # | finding | status |
|---|---|---|
| M1 | **§7's proof that its own stopping rule is reachable is false in every term.** «demonstrably reachable: this skill's own campaign went 6 → 1 → 0 → 2 new causes per round» — the auditor ran the counter `failures.md` prescribes: the real series is 9 · 1 · 4 · 5 · 4, and the load-bearing **0** was a round that produced four rows. It was never true: at the commit that introduced the sentence, R3 already stood at 4. The section that replaced a rule for being unsatisfiable was itself claiming satisfiability with an invented number | **fixed** — the claim is replaced by the counter, by «eight rounds, not one of them zero», and by the reason the rule is still better that needs no number |
| M2 | «**Four** stopping conditions» in §5b — there are five; the fifth (five sub-second iterations) reproduced in nine seconds. An enumeration is a claim of exhaustiveness | **fixed** |
| M3 | «Stopping is a mechanism the human owns rather than a request the loop has to notice… enforced at Prove: that is the one step every iteration passes through» — but §2 offered the bare foreground check FIRST, and a bare `npm run verify` never consults `STOP`. In the shape §5b calls common (a self-scheduled wakeup inside a session) the switch was back to being a request | **fixed** — `prove.mjs` is now the primary and the fallback names what it costs |
| M4 | `loop.mjs` kills a running paid agent at **45 minutes** and the skill never mentioned it — nor the heartbeat, nor that a healthy 46-minute iteration dies by default | **fixed** — documented with the SIGTERM→SIGKILL sequence and «raise it for slow work» |
| M5 | «`STEERING.md` … passed to the agent on stdin» omitted that it arrives DEMOTED inside an untrusted-data frame, and never mentioned `--steer`, the operator's trusted channel. A reader who needs trusted steering could not learn it exists | **fixed**, including the part the auditor did not ask for: nothing enforces that a `--steer` path is outside the repository |
| m6 | The two headline percentages («58–68 % of all findings», «35 % of every defect») are derivable from nothing — the auditor grepped for them and found no measurement. This is the artifact's own named defect: «a criterion marked met on evidence nobody can open» | **fixed** — replaced by counts that exist in this file's round table (4 of 4, 2 of 5, 8 of 9, 6 of 14 fatals inside the previous round's repairs) and by the named instances of «two answers to one question» |
| m7 | The prescribed counter counted the table HEADER (`| Cause | R1 | Trend |`), so R1 was inflated by one — the stopping rule's unit, off by one in its own measurement | **fixed** — the header column is now `count` |
| m8 | «Cadence: 5 minutes by default» while `loop.mjs` sleeps 15 SECONDS and the carrier example is 30m: three cadences in thirty-five lines, one called «the default» | **fixed** |
| m9 | `decisions.md` still described the lock as `.carrier.lock` with «no staleness timeout» | **fixed** by drill 5's repair pass |

**What the audit found TRUE** is the larger half of its report and is worth
recording: every §0 imperative runs clean from the project root; the
`skill-cleaner` invocation works verbatim and reports the three things claimed;
`--install any --dry-run` installs nothing; **the capability claim it most wanted
to break held** — the scaffolded MCP server driven both as stdio JSON-RPC and as
`--call` gives identical validation text from one `call()`, and
`notifications/initialized` correctly gets no reply; every `prove.mjs` number in
§2 is real (250 without running the check, 251 on disagreement, a piped npm
script refused, a failing number recorded); `carrier.mjs` installs nothing and
the launchd unit does all three things claimed; `new-skill.mjs` works in both
documented forms and is honest when there is nowhere to link; and §8's cold-start
story still matches the latest drill's verdict.

Its one unstated gap, recorded here because it is a real limit: **nothing but the
agent writes the ledger.** `prove --record` is the only mechanical writer, and
its line carries the command and exit code, not which criterion moved — so §8's
«checkpoint into the ledger and compact» is agent discipline end to end. The
skill says as much («survivable only if the ledger genuinely carries the
campaign — which is a testable claim, not a hope»), and the cold-start drills are
that test.


### The second half of round 8: eight mutations that survived everything

A mutation tester deleted one clause at a time from every guard and ran the
suite. **Eight survived all 161 tests** — three of them money, three of them the
round-1 false-absence fatal reintroduced for free, one of them the lie this
repository exists to prevent. Every one now has a guard, watched failing against
its own mutation before it was accepted:

| mutation | guard added |
|---|---|
| `prove`'s `<(…)` clause deleted → `→ 0` recorded for a check that exited 1 | nine constructs asserted REFUSED, one row each — a refusal is not a comparison, and the ground truth cannot judge a construct whose defect is that the shell does not see it |
| `StartInterval` in minutes → 2880 paid invocations a day instead of 48 | the launchd interval compared against the period asked for, in seconds, for five periods |
| `RunAtLoad` true → an unapproved invocation at every login | asserted false in the same test |
| the Cursor / Gemini-user / `~/.claude.json` local-scope readers dropped | three new layouts in `tools-oracle` |
| every transport reported as `stdio` | the transport asserted against what the file declares |
| `launchctl bootstrap` misspelled → the arming instruction does not run | every printed `launchctl`/`crontab`/`plutil` line has its binary and its subcommand checked against that binary's own help |

### …and the critic's four, against the lock the same round had just repaired

| # | finding | status |
|---|---|---|
| F1/F2 | The emitted wrapper still carried round 7's two-syscall reclaim and an unconditional release trap: **20 of 20 trials overlapping at eight racers**, 44 agent runs where 8 was correct, and a carrier tick's trap deleting a running loop's lock (3 of 3 runs, two paid agents) | **fixed** — the wrapper got the same three defences as the library, and the contention case is now a test |
| F3/F4 | `mkdir` then the pid write is two syscalls: a competitor's reclaim in between threw ENOENT **out of `takeLock`** into a `loop.mjs` that does not catch it, and its put-back restored a directory with NO pid file — a lock every later run refuses **forever**, which is a daemon reporting success and never invoking the agent (4 in 30 trials) | **fixed at the source** — the lock is built complete in a staging directory and moved into place in ONE `rename`, so it is never observable without its pid; an empty directory is now recognised as residue and recovered |
| F5/F6 | `ps` and `sleep` are external commands and the plist bakes PATH at emit time: without `ps` the wrapper stole a live root-owned lock; without `sleep` its claim check collapsed | **fixed** — both are required up front, and their absence is a refusal written to the carrier log |
| F7 | A failed put-back orphaned `.stale-*` directories forever — 36 in one run, and nothing cleans them | **fixed**, plus a `.gitignore` glob: an autopilot running `git add -A` could commit a lock |

**What the critic could not break, after 145 trials at 2/8/32/64 racers under
load average 15–90:** the library's mutual exclusion. Zero overlapping trials,
and zero in 66 end-to-end runs of a real loop against a real carrier tick at
eleven arrival offsets.

**And the finding that lands on this campaign's own instrument:** the lock oracle
counted WINNERS over a trial, not overlapping intervals — so a legitimate
handover (the previous holder had exited) was reported as «2 processes held the
lock at once». It was red 2 runs in 11 against correct code, and the «three to
six simultaneous holders» that motivated round 8's first repair was inflated by
it; the true figure for that defect was worst 3 at 15 %. **The defect was real
and the fix was right; the number was the instrument's.** It now measures
intervals. A flaky guard in a repo whose thesis is «a check that can lie is worse
than none» corrupts every other verdict the suite gives — a reviewer's own
mutation run read a flake as «the suite caught it» and had to be corrected.

## What none of it covers

- Windows. No reviewer had a host; `path.join` backslashes in `args`, and the
  printed `--call '{"text":"…"}'` quoting, are unverified there.
- Whether any harness actually resolves a relative server path against the
  project root — the claim is now hedged rather than tested.
- Runtime MCP reload behaviour, for the same reason.
- ~~Concurrent `prove.mjs --record` runs appending to one `goal.md`.~~ **Measured in round 7** — 200 concurrent runs with 6 KB notes, 50 with 400 KB, 0 malformed, 0 interleaved, 0 lost. It stays on this list only as a filesystem caveat: `appendFileSync` is one `O_APPEND` write, which holds on APFS and would not on some network mounts, and nothing here would notice.
- `aerender` actually rendering: existence and architecture were verified,
  headless behaviour was not.
