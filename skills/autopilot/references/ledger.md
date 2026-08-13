# The ledger — what gets written down, and where

A loop that does not record what it learned repeats it. But a loop that records
everything buries the part that mattered, so **each file has an admission bar**.

**Write into the project's existing homes.** `discover.mjs` prints
`memoryHomes`, and `bootstrap.mjs` creates only what is missing. A second
`CHANGELOG.md` beside an existing one is worse than no changelog, because now
neither is authoritative.

Five files. None of them is code-specific — the same five work for a research
campaign, a migration, or a week of ops.

## goal.md — the loop's state

The goal in one falsifiable sentence, its 2–5 done-criteria, and which are met
with what evidence. Updated at the end of every iteration.

This is the file that makes the loop **resumable**: a session that runs out of
context, or a different person tomorrow, picks up from here without re-deriving
the plan. If it is stale, the loop has no stopping condition.

Admission bar: a criterion someone who is not you could check.

## wins.md — what worked, and how many times

Not a diary. An entry earns its place when it is a **pattern you would repeat**:
the situation, what you did, and the evidence it worked.

**Carry a count.** The count is the mechanism, not decoration — at three, the
entry graduates into a skill of its own (`distillation.md`). Without the count,
«it has worked a few times» is a feeling, and skills get written after one lucky
success.

| pattern | times | last seen | evidence |
|---|---:|---|---|

Admission bar: you would do it again on a different task.

## failures.md — what failed, by CAUSE

Classified by cause, **not by file, task or ticket** — the task changes, the
cause repeats. Each entry: the shape, one reproduction, and the tell that you
are about to do it again.

Count **per area**. A falling total hides a diverging one: in one campaign the
total went 32 → 19 → 12 while a single file carried a fatal in all three rounds
and got worse each time.

Admission bar: it happened, with evidence.

## decisions.md — a choice and its cost

**Including the choice to do nothing** — «not removed, accepted risk, because
the cure breaks local dev» is a decision, and writing it stops the next session
re-opening it as an unfinished chore.

Admission bar: someone could reasonably have decided the other way.

## changelog.md — what shipped

One line per landed change: what it does, and what was wrong before. Append to
the project's own if it has one.

## The rule that keeps all five honest

**Before writing «X does not do Y» in a tracked file, run the check that would
prove it and paste the output into the commit.** Four false claims were caught
that way in one campaign, all phrased as structural guarantees — «has no
lane», «no longer exists», «imports no skill». That is the dangerous form: a
hedge invites checking, an invariant does not.

Two of those were mine, written the same day, in files *about* verification.
