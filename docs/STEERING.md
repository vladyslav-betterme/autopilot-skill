# Steering — read fresh every iteration

You are one iteration of an autonomous loop, driving THIS repository
(`autopilot-skill`) with the skill it contains. Read `docs/goal.md` first; it is
the state. This file is the dial: it says what to work on now, and it can change
between iterations without stopping the run.

## The check

`node skills/autopilot/scripts/prove.mjs --record --note "<what this proves>" -- npm run verify`

Exit 0 or the iteration is not done. **Never** pipe it. `250` means a human
wrote a STOP file — stop immediately and say so.

## What to work on, in order — take ONE and finish it

1. **Criterion 4 is `partly`.** Three cold-start drills have run; each read only
   `docs/**` and answered «could a fresh session resume and CLOSE the work».
   Drills 1 and 2 said «start but not close»; drill 3's fourteen findings are
   fixed. The criterion needs a fourth drill against the current ledger, and
   `goal.md` names the procedure: dispatch a fresh read-only agent, paste its
   verdict verbatim into `docs/reviews/`, and mark the criterion met ONLY if it
   answers YES. **If you cannot dispatch a subagent, say so and take item 2 —
   do not mark it met, and do not audit the ledger yourself.** A drill run by
   the party it audits is worth nothing, and that is written in `goal.md`.

2. **`docs/changelog.md` is stale.** It stops at I13 while `docs/goal.md`'s
   iteration log runs further and every landing since has a SHA. Bring it
   current: newest first, one line each, what it does and what was wrong
   before, with the SHA from `git log --oneline`.

3. **The five «not covered» items** in `docs/reviews/campaign-01.md` — Windows,
   whether a harness resolves a relative server path against the project root,
   runtime MCP reload, concurrent `prove --record`, `aerender` headless. Four
   are adjudicated in `decisions.md`. **Concurrent `prove --record` is the one
   that can be tested here**: two processes appending to one `goal.md` at the
   same instant. Write the test, watch it fail if you break the append, and
   record the result — as a fix if it corrupts, as a decision if it does not.

4. **Nothing else.** Do not add features. §3 of the skill says a third review
   round means the change was too big; this campaign is on its sixth. Anything
   you think is missing goes in `decisions.md` as a recorded choice, not in the
   code.

## The rules that are not negotiable

- **Prove before you claim.** Run the check, read its exit code, paste it.
- **Never `git add -A`, `-u` or `.`** — stage by name.
- **Commit only what is green**, with a message that says what was wrong before.
- **Record in the ledger**: the win in `wins.md` with its count, the failure in
  `failures.md` by CAUSE, the choice in `decisions.md` with its cost, and the
  criterion that moved in `goal.md`.
- **Do not push.** A human is watching this run and will push.
- If a criterion is blocked on a decision only the owner can make, PARK it in
  `goal.md` with both options and both costs, and move to the next item.

## How this iteration ends

Either a criterion moved and you say which and what proves it, or nothing moved
and you say what is blocking. Two iterations with neither and the loop stops
itself — that is thrash, and it is a wrong premise, not persistence.
