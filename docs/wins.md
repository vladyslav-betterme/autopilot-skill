# Wins

What worked, and **how many times**. Not a diary: an entry earns its place when
it is a pattern you would repeat on a different task.

**At three, it graduates into a skill of its own** — write it with
`scripts/new-skill.mjs` and use it immediately. The count is the mechanism.

One class is exempt, and the exemption is recorded in `decisions.md`: a pattern
whose subject is THIS loop's own doctrine belongs in the SKILL section that owns
that step, not in a second skill beside it. The test is whether the pattern
would help someone who is not running this loop.

| pattern | times | last seen | evidence it worked |
|---|---:|---|---|
| **Execute the artifact you emitted, never review it.** A generated file is not a claim about behaviour until something runs it. | 3 | 2026-08-13 | (1) the scaffolded MCP server driven through a real `initialize`/`tools/list`/`tools/call` handshake — reading it would not have shown that a notification must get no reply; (2) the carrier wrapper run under `/bin/sh`, which is the ONLY reason the `&&` short-circuit was found; (3) the emitted plist actually `launchctl bootstrap`ed and kickstarted — `plutil -lint` was green on it either way. |
| **Demonstrate the guard on a COPY with the fix removed.** Never on the real file. | 2 | 2026-08-13 | the notification/TOML/one-key demos ran against `sed`-patched copies; the carrier demo needed the copy to sit *beside* `lib.mjs` to resolve its import, which is itself the tell that a probe placed anywhere else proves nothing. |
| **Read back the value the tool elected instead of assuming it.** | 2 | 2026-08-13 | two `prove.mjs` tests hardcoded `docs/` as the ledger home and failed on a bare temp dir, where the home is `.`; the fix is `run('bootstrap.mjs').match(/ledger home: (.+)/)`, which is what the older test in the same file already did. |
| **Re-run the REVIEWER's own reproduction after the fix — not your own version of it.** | 3 | 2026-08-14 | (1) the `$HOME` walk-up fix looked right and was **inert**: `/var` is a symlink to `/private/var`, so the boundary compared unequal and the owner's `~/notes/goal.md` was still written to — visible only by re-running the reviewer's exact repro; (2) the cross-model referee's five shell cases, replayed one by one, showed two of my «fixes» were false positives; (3) round 2's three `hiddenPipe` routes, each replayed verbatim, and the third (a subdirectory) failed the first attempt at the fix. |
| **Delete the pipeline instead of fixing its stages.** A guard that normalises and then decides puts its next defect in the normaliser. | 3 | 2026-08-14 | (1) `--dir` — one derived absolute path replaced a check and a write that each computed their own; (2) the shell guard — one quote-aware scanner replaced three `String.replace` stages, after a blacklist and then a whitelist had each been beaten by the stage in front of them; (3) `findLedger` — one function replaced the two that answered «where does the state live», found because an oracle written for that shape could not demonstrate itself against this repo's own `lib.mjs`. All three diffs were SHORTER than what they replaced. |


### Give the guard a second reader that is another copy of the same program — 3

The count reaches three, and it is the same move each time. `prove`'s oracle
re-derives «did anything fail» with `bash -e -o pipefail` instead of asking the
runner. `tools.mjs`'s oracle re-reads the config files with a few lines of JSON
instead of the reader under test. Round 7's lock oracle counts, from OUTSIDE,
how many processes believed they held the lock at once — the one question the
lock cannot be asked, because a single process taking it twice is exactly the
case that always worked.

The third instance is also the sharpest: six rounds had reviewed this code as if
one process ran it, while the entire purpose of a carrier is that a scheduler
fires it on an interval that has no idea a loop is already running.

**Distilled?** Not as a new skill — it is §3 of the skill («verify with someone
who did not do the work») applied to a program instead of a person, and
`references/critics.md` already carries the doctrine. What went in instead is a
line in the guard table naming the second reader for every guard, so a guard
without one is visible.
