---
name: autopilot
description: >-
  Use to run autonomous development on ANY project — «працюй автономно»,
  «продовжуй», /loop, an unattended multi-hour campaign, or when asked to set a
  repo up so an agent can drive it. Discovers the project's own gates, keeps a
  ledger of what worked and what failed, has every success attacked by a critic
  that is not you, and distils repeated wins into new skills. Backend, frontend,
  infrastructure — the loop is the same; only the gate differs.
---

# Autopilot

An autonomous development loop that is portable because it **asks the project
what «done» means** instead of assuming.

Two claims this skill exists to make impossible:

- «It works» when nothing ran it.
- «It's done» when the only judge was the model that wrote it.

## 0. Bootstrap — once per project

```bash
node <skill>/scripts/discover.mjs        # gates, memory homes, danger signals
node <skill>/scripts/bootstrap.mjs       # creates the ledger if absent
```

`discover` prints the project's own gate command. **That command is the
definition of done for every iteration below.** If it prints `gates: []`, stop
and say so: a loop without a gate is a loop that stops when the model is
satisfied, which is the failure mode this whole skill is built against. Offer to
write the first gate instead of proceeding without one.

Read what discovery found before touching anything:

- **`memoryHomes`** — where durable knowledge already lives. Use those files.
  Never create a second `CHANGELOG.md`, a second learnings directory, a second
  `AGENTS.md`. A second home for one kind of knowledge is the most common way an
  agent makes a repo worse.
- **`signals.envFilesPresent`** and **`signals.remote`** — before the first
  iteration, **ask** whether the dev environment points at production. On the
  project this skill was extracted from it did, and nothing in the repo said so.
  Assume yes until told otherwise.
- **`signals.dirty`** — uncommitted work is somebody's. Branch, never build on top.

## 1. The iteration

One iteration = one landed change, gated, reviewed, recorded. Not one file, not
one turn.

**Pick.** From the project's own backlog if it has one; otherwise highest
risk×reach. Write the goal in one falsifiable sentence *before* touching code.
«Make X better» cannot be falsified. «No path spends money without an explicit
tap, and each guarantee is held by a type or a failing test» can.

**Understand before you shorten.** Trace the real flow end to end. Then, before
writing a new function, ask whether one already answers that question — see
`references/premise-check.md`, which is the single highest-yield habit in this
skill and the one that took longest to learn.

**Build** the smallest thing that is actually correct. Root cause, not the path
the ticket names: grep every caller first.

**Prove.** Run the discovered gate, **in the foreground, reading the exit code in
the shell that ran it.** Three ways it lies, all observed:

| | |
|---|---|
| `gate \| tail` | reports `tail`'s status |
| `gate > log; echo "EXIT=$?"` | `;` makes the status the LAST command's — always 0 |
| a backgrounded wrapper | the completion notification reports the **wrapper** |

Every new guard needs a test you have **watched fail** without the fix. Delete
the fix, run it, see red, restore. A guard that cannot fire is worse than none:
it reads as proof the case is handled.

**Review.** Non-trivial change → `references/critics.md`. Your own fixes are the
second-largest source of defects; a review round after the fixes is not optional.

**Land.** Stage by name — never `-A`/`-u`/`.`, they pick up local-only edits and
`-u` misses new files. Branch → PR → check the deploy actually went green. A
local green build is not a deploy.

**Record.** `references/ledger.md` — what worked, what failed, and *why*, in the
project's existing memory home.

## 2. The ledger is the point

A loop that does not write down what it learned repeats it. Three files, created
by `bootstrap.mjs` in whatever home discovery found:

- **`decisions`** — a choice and its cost. Includes choices to do NOTHING: «not
  removed, accepted risk, because the cure breaks local dev» is a decision and
  saves the next session from re-opening it.
- **`defect-patterns`** — failures classified by CAUSE, not by file. The file
  changes; the cause repeats. Count per subsystem: a falling total hides a
  diverging file.
- **`changelog`** — what shipped. If the project already has one, append to it.

## 3. Distil skills from repeated wins

After a pattern has worked **three times**, it stops being a habit and becomes a
skill. Write it as a sibling `SKILL.md` with a `description` naming the trigger
words that should summon it. See `references/distillation.md`.

**Do not distil after one success.** One success is luck with a good story. The
three-time rule is what stops this skill from filling a repo with advice.

## 4. Stop and ask

Autonomy is not permission. Stop, say what you would do, and wait:

- **Spending money** — generations, paid tiers, new infrastructure.
- **Anything irreversible on production** — dropping or rewriting data, rotating
  or deleting a secret, deleting user files. *Blanket approval is permission,
  not information*: «do whatever you decide» is not knowledge of what is in the
  245 GB you are about to delete.
- **Reversing a written directive.** That is a proposal, not a task.
- **You are about to claim something you cannot reproduce on demand.** Say «not
  verified» instead.

## 5. Stop the loop when

Not «the critics found nothing» — they always find something, including in their
own last fix. Stop when all four hold:

1. No fatal finding in the same subsystem two rounds running. ← the one that matters
2. Self-inflicted share of findings below ~30 %.
3. Every remaining finding is minor **and** in a subsystem whose count is falling.
4. Every claim in a tracked doc has a command in the commit that reproduces it.

## 6. Context

At **80 %** of the window: stop the iteration, write the state into the tracked
doc, commit what is green, say where you stopped. Pushing past it produces the
failure where the summary is confident and the work is half-landed.
