# Steering — read fresh every iteration

You are one iteration of an autonomous loop, driving THIS repository
(`autopilot-skill`) with the skill it contains. Read `docs/goal.md` first; it is
the state. This file is the dial: it says what to work on now, and it can change
between iterations without stopping the run.

**`goal.md` outranks this file.** Cold-start drill 5 found all four items here
stale at once — one of them ordering a drill that had already run, and one
contradicting `goal.md` about pushing. A dial goes stale by design; when they
disagree, believe `goal.md` and fix this file in the same iteration.

## The check

`node skills/autopilot/scripts/prove.mjs --record --note "<what this proves>" -- npm run verify`

Exit 0 or the iteration is not done. **Never** pipe it. `250` means a human
wrote a STOP file — stop immediately and say so.

## What to work on, in order — take ONE and finish it

1. **Round 8's findings, if any are open.** Round 8 is the first candidate clean
   round: four read-only reviewers (a critic over round 7's own fixes, a
   mutation tester over all eight oracles, cold-start drill 5, an honesty
   auditor over `SKILL.md`). Fix what they found, add the guard that would have
   caught it — **watched failing first** — and record it: the cause as a ROW in
   `docs/failures.md`'s distribution table tagged `R8`, the round in
   `docs/reviews/campaign-01.md`.

2. **Then round 9**, the same shape, with at least one lens that treats the
   program as MORE THAN ONE PROCESS — round 7's lens, which found the only
   fatal that let two paid agents run. Condition 3 needs **two consecutive
   rounds that add no row**; `goal.md` § «How criterion 1 actually closes» owns
   the procedure and the escape hatch.

3. **Criterion 4 is `partly`, and only a fresh read-only drill can move it.**
   Drill 5's verdict was NO — its findings are the ledger repairs listed in
   `docs/reviews/campaign-01.md` § Cold-start drill 5. When they are all landed,
   dispatch drill **6** against the repaired ledger, paste its verdict verbatim,
   and mark the criterion met ONLY if it answers YES. **If you cannot dispatch a
   subagent, say so and take item 1 — do not mark it met, and do not audit the
   ledger yourself.** A drill run by the party it audits is worth nothing.

4. **Nothing else.** Do not add features. §3 of the skill says a third review
   round means the change was too big; this campaign is on its eighth. Anything
   you think is missing goes in `decisions.md` as a recorded choice, not in the
   code.

## The rules that are not negotiable

- **Prove before you claim.** Run the check, read its exit code, paste it.
- **Never `git add -A`, `-u` or `.`** — stage by name.
- **Commit only what is green**, with a message that says what was wrong before.
- **Record in the ledger**: the win in `wins.md` with its count, the failure in
  `failures.md` as a ROW in the distribution table with its `R<n>` tag (a `###`
  section alone is invisible to the counter the stopping rule uses — that
  happened in round 7), the choice in `decisions.md` with its cost, and the
  criterion that moved in `goal.md`.
- **Push at the end of an iteration whose check is green** — standing
  authorisation, `github.com/vladyslav-betterme/autopilot-skill`. This file said
  «do not push» for four rounds against `goal.md`'s standing authorisation; the
  authorisation is the true one.
- If a criterion is blocked on a decision only the owner can make, PARK it in
  `goal.md` with both options and both costs, and move to the next item.

## How this iteration ends

Either a criterion moved and you say which and what proves it, or nothing moved
and you say what is blocking. Two iterations with neither and the loop stops
itself — that is thrash, and it is a wrong premise, not persistence.
