# Decisions

A choice and its cost. **Including the choice to do nothing** — «not changed,
accepted risk, because the cure costs more than the disease» is a decision, and
recording it stops the next session re-opening it as an unfinished chore.

Admission bar: someone could reasonably have decided the other way.

| date | decision | cost accepted | why not the alternative |
|---|---|---|---|
| 2026-08-13 | The ledger lives in `docs/`, created by making that directory before bootstrap elected a home | A directory that did not exist in a five-file repo | The elected fallback was `.`, which puts five ledger files beside the README of a published skill. Nothing else wanted `docs/`, so there is still one home per kind of knowledge. |
| 2026-08-13 | `carrier.mjs` prints the unit and **installs nothing** | The human runs one more command, and can get it wrong | Arming a scheduled agent spends money on a schedule with nobody watching — §6 says that is theirs to approve. A skill that installs it has taken a decision that was not its to take. |
| 2026-08-13 | `prove.mjs` refuses shell tokens instead of sanitising them | `prove.mjs -- sh -c 'a \| b'` still reaches a shell — this is a speed bump on the honest mistake, not a wall against a determined one | Sanitising implies a guarantee it cannot keep. Refusing the shape names the failure at the moment someone writes it, which is where the six red deploys came from. |
| 2026-08-13 | «Execute what you emitted» reached three wins and is written into **SKILL.md §2**, not into a skill of its own | The three-at-a-time rule now has one documented exception, and someone will have to judge the next one | A separate skill answering «how do I prove this» beside the skill whose whole subject is proving would be two answers to one question — the defect this repo hunts. `references/distillation.md` already says to delete a skill when its rule became structural; writing one that is born structural is the same error, earlier. |
| 2026-08-13 | The overlap lock is `mkdir`, with no staleness timeout | A crashed run leaves `.carrier.lock` and every later run exits 0 doing nothing, until someone deletes it | A timeout needs a clock, a PID check and a policy for «the other run is still going». `mkdir` is atomic on every filesystem this will meet, and the recovery is one `rmdir` printed in the output. Marked `ponytail:` in the source. |
| 2026-08-13 | **Not built: `tools.mjs --cost`**, which would launch every configured stdio server and count the bytes its `tools/list` returns | The context an unused MCP server costs is still unmeasured — it is named as a real tax in `references/tooling.md` and nobody has a number for it | Measuring it means LAUNCHING third-party servers merely to count them: a server can prompt for a key, hang, reach the network, or mutate state on start, and an unattended loop would do that to every entry in every config file on the machine. `tools.mjs`'s value rests on being read-only by construction — an auditor verified that claim by grepping it for `spawn`/`fetch` and finding nothing — and a byte count is not worth trading it for. The honest cheap version stays manual: launch ONE server you already trust, deliberately, and count. The `--cost` flag now errors as an unknown flag rather than printing the ordinary table, so «I measured it» cannot be a typo. |
| 2026-08-13 | Reviewers may be a DIFFERENT MODEL, not only a subagent of the same one | Another vendor's CLI spends that vendor's quota, and its findings arrive as text rather than as a structured result | «Someone who did not do the work» is weaker when the reviewer shares the author's priors. `codex` and `gemini` are installed here, so the stronger form costs one command. Same-model subagents stay the default because they are free with the session and can be given tools; the cross-model referee is for the claim you most want to be wrong about. |
| 2026-08-14 | **Not covered, accepted for this campaign:** Windows behaviour, whether a harness resolves a relative server path against the project root, runtime MCP reload, and `aerender` actually rendering headless. *(Concurrent `prove --record` was in this list by mistake — it needs no machine this campaign lacks, and a drill caught the contradiction with `STEERING.md`. It is measured now: 20 concurrent appends, 20 lines, none interleaved, none truncated. `appendFileSync` is `O_APPEND` and a line is far under `PIPE_BUF`.)* | Five known blind spots ship with the skill. Each is named in `docs/reviews/campaign-01.md` § What none of it covers, and none is claimed as covered anywhere | Every one needs a machine or an account this campaign does not have: a Windows host, each harness installed and launched, an After Effects seat. Testing them by reasoning is how the eight false invariants got written in the first place. A drill asked whether they were in scope for the goal — they are enumerated, so this row is the adjudication: recorded, not built. |
| 2026-08-14 | **Not built, and now with a measurement: making the check HONEST instead of judging its shape.** `bash -o pipefail -c 'cat big.txt \| head -1'` exits **141** — `head` closes the pipe, `cat` takes SIGPIPE — so running every check under pipefail calls one of the commonest honest pipelines there is a failure. It is a fine ORACLE over a corpus whose left-hand side genuinely fails; it is not a way to run arbitrary checks | The analyser stays, and with it the surface that produced 6 of the campaign's 20 fatals | Superseded by `test/prove-oracle.test.mjs`: the promise is now checked by something that is not the analyser, so a future round adds a corpus row instead of rewriting the scanner for a fifth time. Measured, not reasoned about — which is what the row below asked for. |
| 2026-08-14 | *(superseded, kept for the reasoning)* **Not built (yet): making the check HONEST instead of judging its shape** — e.g. running npm scripts through a shell with `set -o pipefail -e`, so a pipe's failure propagates and the reported status is true by construction | Three rounds of fatals have all been in the analysis, and analysis of shell by a scanner will keep losing corner cases. The cost of NOT doing it is that the fourth round may find a fifth way past the scanner | It changes what the user asked to run. `set -e` alters semantics in ways an honest script can trip over, and npm's `script-shell` is a path, not a command line, so the mechanism is unverified. Adding an unverified semantic change to the one tool whose whole job is not lying would be worse than the bug. Recorded as the next thing to try if round 5 finds another analysis defect — and to be TESTED, not reasoned about. |
| 2026-08-14 | **The shell analyser is KEPT, against a convergence analyst's recommendation to delete it** | The unbounded surface stays, and with it the expectation that a fresh lens can find a fifth way past it | The analyst reasoned «once the oracle is green the analyser is provably redundant». The experiment says otherwise: with the analyser the property holds on all 32 corpus bodies; **with it disabled, prove reports success for 6 failing checks**. Redundant was a hypothesis, and it was refuted by running it. What the oracle actually buys is that the promise is now tested by something other than the analyser. |
| 2026-08-14 | **`--kind cron` is REMOVED** (the schedule expression stays, for GitHub) | A Linux user loses the one-line local carrier and is pointed at a systemd timer or `nohup loop.mjs`. Anyone who wants crontab must write the line themselves | Four findings in three rounds, all in the crontab COMMAND LINE: a step field that meant «divisible by N» (48 paid runs a day where 32 were asked), a `%` that cron turns into a newline mid-quote, an almost-empty PATH, everything on one line. They survived review because nothing in the suite can run a crontab — no interpreter ever read what was emitted. The plist is `plutil -lint`ed and the wrapper is executed, and neither ever carried a surviving defect. Cutting the surface is the fix the evidence supports. |
| 2026-08-14 | **A win whose subject is this skill's own doctrine goes into SKILL.md, not into a skill of its own.** Three are at the three-time threshold — «execute the artifact you emitted» (§2), «re-run the reviewer's own reproduction» (§3), «delete the pipeline instead of fixing its stages» (§2) — and all three are written into the sections that already own those steps | The three-times rule now has a stated class of exception, and someone will have to judge the next candidate against it | A separate skill answering «how do I prove this» beside the skill whose entire subject is proving is two answers to one question — this repo's most-repeated cause, with 21 rows of evidence. `references/distillation.md` already says to delete a skill when its rule became structural; writing one that is born structural is the same error, earlier. The test is: would this pattern help someone who is NOT running this loop? If yes, write the skill. All three of these are about running this loop. |
| 2026-08-14 | **The emitted GitHub workflow is PARSED, never executed by GitHub.** A drill asked whether that was considered or merely unnoticed — the way `cron` went unnoticed for three rounds | §7's clause 2 is satisfied for the plist (`plutil` + the wrapper is run), the generated server (driven), and the schedule (expanded and its gaps measured); for the workflow it is satisfied by a real YAML reader and NOT by a runner | Running it means pushing a workflow to a repository and paying for a scheduled agent — the one thing this campaign has refused to do without the owner. Recorded as considered, not as covered. **If it is ever armed, the first run is the check**, and `goal.md`'s parked row says so. |


## The campaign itself has no lock — recorded, not fixed

Round 7's reviewer watched the working tree change under it mid-review (nine
source files at 15:47), verified every function it reported on was byte-identical
in that diff, and named the shape: **two agents writing one working tree with
nothing serialising them is the same defect as the lock fatal it had just found,
one level up.**

Not fixed. `loop.mjs` locks a PROJECT so two loops cannot run on one ledger, and
that is the case a scheduler can create by itself. A reviewer subagent running
while the orchestrator edits is created only by a human dispatching both, and the
serialisation that exists — one person, one terminal, reviewers that are
read-only by construction — held for every round of this campaign. Locking a
read-only reviewer out of a repository would also make the cheap parallel council
in `references/critics.md` impossible, which is the practice that found most of
these defects.

**The cost, stated:** a review of a moving tree can report a finding against code
that no longer exists. The mitigation is the one round 7 used unprompted — say
which diff you verified your findings against. That is now the expectation for
any reviewer dispatched while work continues, and it is cheaper than the lock.

## Concurrent `prove --record` — measured, and it holds

Three rounds listed this as «not covered». Round 7 measured it: 200 concurrent
`--record` runs with 6 KB notes, then 50 with 400 KB notes, on APFS. **0
malformed, 0 interleaved, 0 lost lines.** A single `appendFileSync` is one
`O_APPEND` write and holds well past PIPE_BUF here. Also measured: 40 concurrent
appends to a `goal.md` with no trailing newline produce no spurious blank line,
so the thrash detector cannot be reset that way.

Recorded as a decision rather than a test because the property belongs to the
filesystem, not to this repo: on a filesystem without atomic O_APPEND (some
network mounts) it would not hold, and nothing here would notice.
