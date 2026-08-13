# Critics — the review shape that produced reproductions

The point is not opinions. It is finding the defect **you** cannot see because
you wrote the fix — measured at 58–68 % of all findings in later rounds.

```
N hunters in parallel — ONE lens each, a schema, and facts marked «do not re-verify»
        ↓ every finding, separately
1 skeptic per finding, whose job is to REFUTE it
        ↓
only what survives is a finding
```

All reviewers **read-only**. Say it explicitly, every time:

> You are read-only. Do not edit, do not commit, and **never run a command whose
> purpose is to mutate production or spend money** — not even to prove a bypass.
> Prove it against a pure function or a throwaway copy. Say what you did not run.

Not theoretical: a skeptic once ran a production migration script to disprove a
claim about a migration guard. It was inert only by luck.

## Lenses that produce reproductions

One per agent — «review this diff» produces prose. Pick 3–5 that match:

| Lens | The only question |
|---|---|
| Money | Can a user pay for something they did not approve? |
| Prod write | What does this write to production, and what if it runs twice? |
| Guard-can-fire | For each new check, construct the input that trips it. Cannot? It is decoration. |
| Two predicates | Does this add a second answer to an existing question? Name both, diff their rules. |
| Reachability | Which call paths reach this, and which silently do not? |
| Honesty | Does the code support what the commit message and docs now claim? |

## Prompt rules that measurably changed output

- **Demand a reproduction.** «A finding without evidence you obtained yourself
  does not count — do not include it.»
- **Say the honest zero is valuable.** «A truthful nothing beats an invented bug
  — say what you tried.»
- **Give facts, not conclusions**, marked «do not re-verify».
- **Code outranks docs and outranks the commit message.** «Commit messages are
  the subject of the audit, not a source.»
- **Define severity** or everything returns `major`: fatal = money/data loss,
  major = the mechanism does not do what it claims, minor = cosmetic.
- **Fix the scope yourself** — put the diff or file list in the prompt.

## The skeptic

> Try to refute this. Default to refuted if uncertain. **If you did not run the
> code and see the behaviour — it is NOT confirmed.**

When the confirm rate approaches 100 %, the skeptics have stopped filtering:
trim the fan-out and spend it on lenses.

## The two cheapest agents, which return the most

**Convergence analyst**, every third round — told to COUNT, not search:
«Classify findings by CAUSE, not file. Is severity falling? Which subsystems
still move? Is there a part that should be REVERTED wholesale? What is a
verifiable stopping condition?» This is what finds that twenty-two separate
defects were one structural error.

**Honesty auditor**, after the work, never mixed with bug hunting: «Here are the
claims, verbatim. TRUE / EXAGGERATED / FALSE, each with evidence you obtained.»
It finds the false claim committed into a canonical doc — no bug-hunting lens
does, because the code is fine and the doc is lying about it.
