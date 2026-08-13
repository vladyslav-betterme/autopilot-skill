# Check the premise before you build

The highest-yield habit in this skill, and the one that took longest to learn.

In one campaign, **five planned items turned out to already exist.** Four times
the absence had been inferred from NAMES — «there is no `x-brain.ts`, so there is
no brain» — and four times that was wrong. Acting on any of them would have
produced a second implementation beside a working one.

That matters because **«two answers to one question» was 35 % of every defect
found in that campaign, and its share GREW every review round** while every other
cause decayed. Two places answer the same question with slightly different
rules, and the gap between them is the bug. It is not a code-only failure: two
dashboards defining «active user» differently, two documents stating the same
limit, two runbooks for one incident — same shape, same consequence.

The fix is never to reconcile them. Make one call the other, or make them one
thing. Every reconciliation buys exactly one round.

## Before adding, porting or writing anything

1. **Search for the CAPABILITY, not the name you expect.** «Does anything
   already decide which model to use» — not «is there a file called
   model-select». For non-code work: «has anyone already measured this», not «is
   there a doc called benchmark».
2. **Read how what you found is actually used.** In one case the ranked model
   pool was already computed and returned; every caller took `.primary` and threw
   the rest away. The feature was one field, not a module.
3. **If it exists, say so and stop.** «Closed as a non-task» is a real outcome
   and a good one. Write down why, so the plan does not re-open it.

## The tell that you are about to do it again

You are writing something whose name is a synonym of one that exists. You are
adding a second config, sheet, doc or list «because the first one is for
something else». You are about to reconcile two versions of the same number.
Stop, and make one of them the source.

## Search traps that report a false absence

An absence you did not really establish is the input to every mistake above.

- Some `grep` builds (`ugrep`) silently skip UTF-8 files as **binary** and
  report nothing found. Use `/usr/bin/grep -rn` or a script for anything
  correctness-critical.
- In JS/Python regex, `\b` and `\w` are **ASCII-only**. `/\bдісней\b/` can never
  match. Use `\p{L}` with the `u` flag. This shipped 151 unrewritten prompts to a
  vendor while the counter read healthy, because every rewrite it did count was
  real.
- A search over one branch, one directory, or one export is not a search over
  the thing. Name the scope you actually covered when you report an absence.
