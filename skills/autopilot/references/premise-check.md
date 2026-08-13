# Check the premise before you build

The highest-yield habit in this skill, and the one that took longest to learn.

On the project this was extracted from, **five planned items turned out to
already exist.** Four times the absence had been inferred from FILENAMES —
«there is no `x-brain.ts`, so there is no brain» — and four times that was
wrong. Acting on any of them would have produced a second implementation
alongside a working one.

That matters because **«two predicates for one question» was 35 % of every
defect found in that repo, and its share GREW every review round** while every
other cause decayed. Two places answer the same question with slightly different
rules, and the gap between them is the bug. The fix is never to reconcile them —
make one call the other, or make them one type. Every reconciliation buys one
round.

## Before adding or porting anything

1. **Grep for the CAPABILITY, not the name you expect.** «Does anything already
   decide which model to use» — not «is there a file called model-select».
2. **Read the call sites of what you find.** On that project the ranked model
   pool was already computed and returned; every caller took `.primary` and
   threw the rest away. The feature was one field, not a module.
3. **If it exists, say so and stop.** «Closed as a non-task» is a real outcome
   and a good one. Write down why, so the plan does not re-open it.

## The tell that you are about to do it again

You are writing a function whose name is a synonym of one that exists. You are
adding a second config file «because the first one is for something else». You
are about to reconcile two lists. Stop and make one of them the source.

## Grep traps

- Some `grep` builds (`ugrep`) silently skip UTF-8 files as **binary** and
  report absence. Use `/usr/bin/grep -rn` or python3 for anything correctness-critical.
- `\b` and `\w` are **ASCII-only**. `/\bдісней\b/` can never match. Use `\p{L}`
  with the `u` flag. On that project this shipped 151 unrewritten prompts to a
  vendor while the counter read healthy, because every rewrite it counted was real.
