# The crew — many small goals in parallel, one integrator

A criterion is landed by ONE owner. A goal is landed by a crew. This page is how
to run one without producing the thing a fan-out usually produces: five agents,
three versions of the same helper, and a tree nobody can check.

The unit is a **parcel**: a slice of a criterion, small enough that one agent
finishes it in one sitting, with **its own check** and **its own files**. Not one
parcel per file — one per independent piece of work.

```
goal → criteria (§1) → parcels ─┬─→ agent  → diff + the check's own output
                                ├─→ agent  → diff + the check's own output
                                └─→ agent  → «blocked», and why
                                       ↓
                            YOU integrate: merge, reconcile, run the FULL check
                                       ↓
                            §3 verify — by someone who did neither
```

## Cut the parcels before you spawn anything

Four questions per parcel, and a «no» to any of them means it is not a parcel
yet:

1. **Does it have a check of its own?** A parcel whose only evidence is the
   agent's report is a parcel you cannot integrate — the report is text written
   by the context that wants it to be true (§2, Prove).
2. **Does it own its files?** Two agents editing one file is a merge you will do
   by hand, twice, badly. Either split differently, or give them separate
   worktrees, or run them in series.
3. **Is it independent of the others' RESULTS?** «Use the interface B invents» is
   a sequence, not a fan-out. Fan out the independent ones, then run the
   dependents.
4. **Would you rather do it yourself?** Then do it. A parcel costs a brief, a
   review and an integration; below some size the crew is more expensive than
   the work.

Three to five parcels in flight is a crew. Twenty is a queue with no integrator,
and the integration is the part that decides whether any of it lands.

## The brief

Every parcel gets all seven. The missing one is always what comes back wrong.

```
GOAL       one sentence, falsifiable, and the criterion in goal.md it serves.
SCOPE      the exact files/paths you may change. Everything else is read-only.
CHECK      the command that proves it, verbatim, and its expected exit status.
FACTS      what is already established — marked «do not re-verify».
FORBIDDEN  no commits to the shared branch; nothing metered; nothing
           irreversible; no edits outside SCOPE; no new dependency.
RETURN     the diff (or the paths you wrote), the check's own output pasted
           verbatim, and what you could NOT do. Prose about how it went is not
           a deliverable.
BLOCKED    if the parcel needs a decision only the human can make (§6), or a
           file outside SCOPE, STOP and return «blocked: …». Do not widen your
           own scope, and do not decide for the human.
```

**A subagent cannot ask.** It has no human on the other end, so a parcel that
meets a §6 decision either parks or drifts — and drift is silent. Saying
`BLOCKED` explicitly in every brief is what makes «I improvised» not an option.

**Facts, not conclusions.** The same rule the critics run on
(`references/critics.md`): tell it what is true so it does not spend its context
re-deriving it, and mark that block so it does not spend its context doubting it.

## Integration is the job, not the paperwork

The crew produces parts. Nothing is landed until you have done all four:

1. **Merge, then run the FULL check** — the project's own check from §0, not the
   parcels'. Every parcel passing its own check and the suite failing together is
   the normal outcome of a fan-out, not a surprise.
2. **Hunt the duplicates.** Independent agents solving nearby problems invent
   nearby helpers: two date parsers, two retry wrappers, two «where does the
   state live» functions. That is `premise-check.md`'s «second answer to one
   question», arriving three times in one hour instead of once a quarter — and it
   is the specific tax a crew adds. Merge them in the integration, while you can
   still see both.
3. **Reconcile the story.** One ledger, one changelog, one goal.md — written by
   you, from the parcels' evidence. Five agents appending to one file is how a
   ledger gets three answers to «which criterion moved».
4. **Then §3.** The verifier did neither the work nor the integration, and the
   integration is exactly where the crew's defects live — the seams nobody owned.

## What never gets delegated

- **The goal and its criteria.** A parcel that writes its own definition of done
  is claim #2 in SKILL.md wearing a checklist.
- **The ledger.** The crew returns evidence; the integrator writes the record.
- **Spending, deleting, sending, production** (§6). Not by a parcel, not by a
  tool a parcel wrote.
- **Verifying its own parcel.** «Someone who did not do the work» excludes the
  agent that did it, however the brief was worded.

## Cost, and the two ways this fails quietly

A crew multiplies spend by the number of parcels, and the parcels that fail cost
the same as the ones that land. Bound it before you spawn: how many parcels, and
what you will do with a parcel that comes back empty.

The two failures worth watching for, because neither one looks like a failure:

- **A parcel that reports success without running the check.** The brief demands
  the check's own output; if the return has no output pasted, the parcel is not
  done — it is a claim. Treat a missing output exactly as a red one.
- **A parcel that quietly widened its scope.** `git diff --stat` against the
  brief's SCOPE, every time, before you look at anything else. An agent that
  fixed «one more thing» has handed you an unreviewed change inside a change
  that reviews clean.
