# Changelog

What shipped, newest first. One line per landed change: what it does, and what
was wrong before. **Newest first** — it read oldest-first once and a cold-start
drill named the oldest change as the most recent thing that landed.

- **I13 · the ledger's own debt** — one taxonomy for «cause» (`failures.md`'s
  table, cited by §7), the goal sentence rewritten to the rule that applies, the
  six guards enumerated so clause 1 has a denominator, a drill-recording
  procedure a resuming session can follow, the review file renamed for the
  campaign, and a third oracle. Before: a drill could start but not close.
- **I12 · round 4** (`eff9ae4`) — nine fatals, `--kind cron` cut, §7 replaced,
  and the first differential oracle.
- **I11 · the install path** (`56d7d34`) — `npx skills add` into a clean
  project, then all ten documented commands. Before: everything was tested
  where the scripts are developed, never where they are installed.
- **I10 · round 3 in the ledger** (`f6c1ae2`).
- **I9 · a full context is a checkpoint** (`e90d7d8`) — write the state into the ledger,
  commit, compact, resume by re-reading it. Before: the loop ended at 80%.
- **I8 · `loop.mjs`** — the loop as a process: STOP, `--max`, thrash, a failing
  agent, and `STEERING.md` read fresh each pass. Before: the loop was doctrine
  and a unit-emitter, with no program that actually iterated.
- **I7 · round 3's fixes** (`c90a036`) — the compound guard inverted into a
  whitelist, the carrier's STOP set taken from the same walk as the loop's, an
  hourly interval that no longer means every minute.
- **I6 · round 2's fixes** — `hiddenPipe` follows script delegation, pre/post
  lifecycle scripts and walks up for `package.json`; the carrier watches every
  `STOP` path instead of one; the ledger walk stops below `$HOME`; `new-mcp`
  checks containment on the real path. Before: each of those reported success
  while doing the wrong thing, and all four lived inside round 1's own fixes.
- **I5 · the cross-model referee** (`2407e38`) — a compound shell check is
  refused by what it does (`|`, `;`, `&`), and the token check on a non-shell
  command is gone. Before: it refused honest checks and missed dishonest ones.
- **I4 · the ledger repair** (`7975c3a`, `92dd603`, `7a4431c`, `448bcfb`) —
  `docs/reviews/campaign-01.md` so the council's numbers can be re-read; the
  criteria stopped contradicting themselves; the capability ladder is written
  once; the «execute what you emitted» rule was actually written down.
- **I3 · round 1's fixes** (`c4f0631`) — 6 fatal and 11 major, every one
  reproduced against a running script before it was touched.
- **I2 · `carrier.mjs`** — emits the launchd / cron / GitHub unit that outlives
  the session, and installs none of them. Before: the loop's only continuation
  was a wakeup that dies with the window.
- **I1 · `prove.mjs` and `STOP`** — the check is run by something that is not
  writing the summary, and one file halts both the loop and the carrier.
  Before: «the check passed» was output pasted by the context that wanted it to
  have passed.
- **I0 · reach** (`6424dc9`) — `tools.mjs`, `new-mcp.mjs`, the capability
  ladder. Before: arming was skills-only, so a missing capability read as a
  smaller goal.
