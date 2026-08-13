# The ledger — what gets written down, and where

A loop that does not record what it learned repeats it. But a loop that records
everything buries the part that mattered, so each file has an admission bar.

**Write into the project's existing homes.** `discover.mjs` prints
`memoryHomes`. A second `CHANGELOG.md` beside an existing one is worse than no
changelog.

## decisions

A choice and its cost. **Including the choice to do nothing** — «not removed,
accepted risk, because the cure breaks local dev» is a decision, and writing it
stops the next session re-opening it as an unfinished chore.

Admission bar: someone could reasonably decide the other way.

## defect-patterns

Failures classified by **CAUSE, not by file** — the file changes, the cause
repeats. Each entry: the shape, one reproduction, and the tell that you are
about to do it again.

Count **per subsystem**. A falling total hides a diverging file: on the project
this came from, the total went 32 → 19 → 12 while one file carried a fatal in
all three rounds and got worse each time.

Admission bar: it happened, with evidence.

## changelog

What shipped. Append to the project's own if it has one.

## The rule that keeps all three honest

**Before writing «X does not do Y» in a tracked file, run the check that would
prove it and paste the output into the commit.** Four false claims were caught
on that project, all phrased as structural guarantees — «has no lane», «no
longer exists», «imports no skill». That is the dangerous form: a hedge invites
checking, an invariant does not.

Two of those were mine, written the same day, in files *about* verification.
