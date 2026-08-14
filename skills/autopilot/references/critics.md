# Critics — the review shape that produced reproductions

The point is not opinions. It is finding the defect **you** cannot see because
you did the work. In the campaign that produced this file, of the FATALS found
in each round that re-reviewed a previous round's repairs, the share living
inside those repairs was 4 of 4, then 2 of 5, then 8 of 9, then 6 of 14 —
countable in `docs/reviews/campaign-01.md`'s round table, which the «58–68 %»
that stood here was not. Your own number will differ; that it is large is the
part that keeps being true.

```
N hunters in parallel — ONE lens each, a schema, and facts marked «do not re-verify»
        ↓ every finding, separately
1 skeptic per finding, whose job is to REFUTE it
        ↓
only what survives is a finding
```

**The minimum is one.** For a small change, a single subagent that did not do the
work, given the exact scope and told to refute «this is done», is the whole of
this file that applies. The fan-out below is for a non-trivial change, and for a
campaign where the same area keeps coming back.

Nothing here is code-specific: a lens is a single question asked of an artifact,
and a report, a schema, a runbook or a dataset all have defects the author is
the last to see.

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
| Money | Can anyone pay for something they did not approve? |
| Irreversibility | What does this write, send or delete for real — and what if it runs twice? |
| Guard-can-fire | For each new check, construct the input that trips it. Cannot? It is decoration. |
| Two answers | Does this add a second answer to an existing question? Name both, diff their rules. |
| Reachability | What actually reaches this, and what silently does not? |
| Honesty | Does the artifact support what the summary, commit message and docs now claim? |
| Sources | For a document or a report: is every number traceable to something re-runnable? |
| Failure path | What happens on the unhappy path — empty, partial, twice, offline, denied? |

## Prompt rules that measurably changed output

- **Demand a reproduction.** «A finding without evidence you obtained yourself
  does not count — do not include it.»
- **Say the honest zero is valuable.** «A truthful nothing beats an invented bug
  — say what you tried.»
- **Give facts, not conclusions**, marked «do not re-verify».
- **The artifact outranks every description of it.** The code, the data, the
  running system — «commit messages and summaries are the subject of the audit,
  not a source.»
- **Define severity** or everything returns `major`: fatal = money/data loss,
  major = the mechanism does not do what it claims, minor = cosmetic.
- **Fix the scope yourself** — put the diff, file list or exact artifact in the
  prompt. «Go look around» is how you get an essay.

## The skeptic

> Try to refute this. Default to refuted if uncertain. **If you did not run it,
> or read the source yourself, and see the behaviour — it is NOT confirmed.**

When the confirm rate approaches 100 %, the skeptics have stopped filtering:
trim the fan-out and spend it on lenses.

## A reviewer that is not your model

«Someone who did not do the work» is satisfied by a subagent, and that is the
default because it is free with the session and can be handed tools. But a
subagent of the same model shares the author's priors — it is the same reader
with a different prompt. For the claim you most want to be wrong about, spend
one command on a referee from another family:

```bash
codex exec --sandbox read-only "Read <file>. Its claim is <X>. Try to refute it. Concrete invocations only."
gemini -p "…the same prompt…"
```

Read-only is not optional here either, and it is a FLAG, not a request: an
external CLI has its own permission model and its own idea of «helpful».

What it costs: another vendor's quota, and an answer that arrives as prose
rather than as a structured finding. What it buys: the failure mode where every
reviewer agrees because every reviewer is the same reader.

## The two cheapest agents, which return the most

**Convergence analyst**, every third round — told to COUNT, not search:
«Classify findings by CAUSE, not file or task. Is severity falling? Which areas
still move? Is there a part that should be REVERTED wholesale? What is a
verifiable stopping condition?» This is what finds that twenty-two separate
defects were one structural error.

**Honesty auditor**, after the work, never mixed with bug hunting: «Here are the
claims, verbatim. TRUE / EXAGGERATED / FALSE, each with evidence you obtained.»
It finds the false claim committed into a canonical doc — no bug-hunting lens
does, because the work is fine and the write-up is lying about it.
