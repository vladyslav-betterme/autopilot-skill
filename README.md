# autopilot

[![verify](https://github.com/vladyslav-betterme/autopilot-skill/actions/workflows/verify.yml/badge.svg)](https://github.com/vladyslav-betterme/autopilot-skill/actions/workflows/verify.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A520.11-brightgreen.svg)](package.json)

An agent skill that runs **autonomous work on any project, until the goal is
actually met**. It is portable because it asks the work what «done» means
instead of assuming — and it keeps going until that answer is satisfied.

Three claims it exists to make impossible:

- **«It works»** when nothing ran it.
- **«It's done»** when the only judge was the one who did it.
- **«I worked on it»** with no record of what was tried, what failed, and why.

Code, documents, data, research, infrastructure, ops — the loop is identical and
only the **check** differs.

---

## The loop

```
discover what «done» means here  →  install the skills this project's niche needs
        ↓
write the goal: one falsifiable sentence + criteria someone else can check
        ↓
   ┌──→ pick an unmet criterion → does it already exist? → build → run the check
   │            ↓
   │    verify with a subagent that did NOT do the work, told to refute it
   │            ↓
   │    land it → record the win, the failure, the decision, the change
   │            ↓
   └─── a win seen 3× becomes a new skill, written and used the same session
                ↓
      stop when every criterion is met AND verified — or when nothing moved twice
```

## Install

**With the [`skills`](https://github.com/vercel-labs/skills) CLI** — run it in
the project you want driven; it lands the skill in `.agents/skills/autopilot`
and links it into every agent it detects (Claude Code, Codex, Gemini CLI,
Copilot, Zed …):

```bash
npx skills add vladyslav-betterme/autopilot-skill
```

**By hand** — clone once, symlink into every harness that should load it:

```bash
git clone https://github.com/vladyslav-betterme/autopilot-skill.git
ln -s "$PWD/autopilot-skill/skills/autopilot" ~/.claude/skills/autopilot
```

Then prove it loaded: **ask the agent to list its skills.** A skill in a
directory nothing reads is not a rule — the same failure as a guard that cannot
fire.

## Use

Say «працюй автономно», «продовжуй», run `/loop`, or ask for an unattended
campaign. The skill fires on its own description; you can also invoke it by name.

Once per project, from the project root (`<skill>` = `.agents/skills/autopilot`
after a CLI install, or wherever you cloned it):

```bash
node <skill>/scripts/discover.mjs         # what «done» means here, and what is dangerous
node <skill>/scripts/bootstrap.mjs        # the ledger: goal, wins, failures, decisions, changelog
node <skill>/scripts/skills.mjs           # the skill library — then install this project's niches
```

`discover` is read-only and prints JSON. `bootstrap` is idempotent and **never
overwrites** — it prints what it deliberately left alone.

```jsonc
// node <skill>/scripts/discover.mjs   (abridged)
{
  "project":     { "kind": "node", "packageManager": "npm", "checks": ["npm run verify"] },
  "memoryHomes": ["CLAUDE.md", "docs/learnings", "CHANGELOG.md"],
  "signals":     { "hasCI": true, "envFilesPresent": [".env.local"], "dirty": false }
}
```

**`checks` is the definition of done for every iteration.** Node, Deno, Python,
Rust, Go, Gradle, Maven, .NET, Ruby, Elixir, PHP, `Makefile` and `justfile`
targets. If it comes back empty — normal for research, prose and ops work — the
skill says so and requires an acceptance check agreed with you, rather than
inventing one. A loop with no check stops when the model is satisfied, which is
the failure mode the whole thing is built against.

## It arms itself, and it writes its own skills

**Before the first iteration** it installs what the project's niche needs, from
a tagged shortlist of the best public skill sets — process and review on
everything, then web, React, database, documents, native, infra, research:

```bash
node <skill>/scripts/skills.mjs                          # catalogue + tags
node <skill>/scripts/skills.mjs --install any            # the always-useful set
node <skill>/scripts/skills.mjs --install react,perf,db  # this project's niches
```

Sources: [`obra/superpowers`](https://github.com/obra/superpowers),
[`anthropics/skills`](https://github.com/anthropics/skills),
[`mattpocock/skills`](https://github.com/mattpocock/skills),
[`addyosmani/web-quality-skills`](https://github.com/addyosmani/web-quality-skills),
[`vercel-labs/openreview`](https://github.com/vercel-labs/openreview),
[`supabase/agent-skills`](https://github.com/supabase/agent-skills),
[`steipete/agent-scripts`](https://github.com/steipete/agent-scripts),
[`vercel-labs/skills`](https://github.com/vercel-labs/skills). It refuses to
install everything: every skill's description costs context on **every** turn,
so it picks by tag and tells you to read what you installed — they are
third-party and run with your permissions.

**During the loop it writes new ones.** A pattern recorded in `wins.md` three
times graduates into a skill, written by the loop and **live in the same
session** — no restart, no copy step:

```bash
node <skill>/scripts/new-skill.mjs piped-check -d "when a check reads green locally and red in CI…"
node <skill>/scripts/new-skill.mjs <name> -d "…" < body.md
```

It writes into the shared skills home, symlinks into every agent directory the
project has, refuses a name that already exists, and refuses a description too
vague to ever trigger.

## What's inside

| File | What it carries |
| --- | --- |
| [`SKILL.md`](skills/autopilot/SKILL.md) | The loop: the goal, the iteration, the check, the verification, the ledger, the distillation, when to stop and ask, when to stop the loop. |
| [`references/premise-check.md`](skills/autopilot/references/premise-check.md) | Check whether the thing already exists before building it. The highest-yield habit here — «two answers to one question» was 35 % of all defects in one campaign, and the only cause whose share *grew*. |
| [`references/critics.md`](skills/autopilot/references/critics.md) | The review shape that produced reproductions instead of essays: one lens per hunter, one skeptic per finding, everyone read-only. |
| [`references/ledger.md`](skills/autopilot/references/ledger.md) | The five files, and the admission bar that keeps each one worth reading. |
| [`references/distillation.md`](skills/autopilot/references/distillation.md) | Turning a pattern that worked **three times** into a skill — and when to delete one. |
| [`scripts/discover.mjs`](skills/autopilot/scripts/discover.mjs) | The project's own check, its memory homes, and the signals a loop must not trip. |
| [`scripts/bootstrap.mjs`](skills/autopilot/scripts/bootstrap.mjs) | The ledger, in the project's **own** memory home, only what is missing. |
| [`scripts/skills.mjs`](skills/autopilot/scripts/skills.mjs) | The skill library, tagged by niche. Installs on request, never wholesale. |
| [`scripts/new-skill.mjs`](skills/autopilot/scripts/new-skill.mjs) | Write a skill from a win and link it where the harness loads from. |

Zero dependencies. Plain Node ≥ 20.11, anywhere Node runs.

## The parts worth stealing even if you never install it

- **The check is discovered, not declared** — and run in the foreground, reading
  the exit code in the shell that ran it, because `check | tail` reports
  `tail`'s status and `check > log; echo $?` reports the `echo`'s.
- **Every new guard needs a demonstration you have watched fail.** Delete the
  fix, run it, see red, restore. A guard that cannot fire is worse than none: it
  reads as proof the case is handled.
- **Verification is not self-service.** At least one subagent that did not do the
  work, read-only, told to refute — because self-inflicted defects were 58–68 %
  of all findings in later review rounds.
- **Never a second home for one kind of knowledge.** A second `CHANGELOG.md` is
  worse than none, because now neither is authoritative. That rule survives a
  rename: a project keeping `defect-patterns.md` never gets a `failures.md`.
- **Autonomy is not permission.** Money, anything irreversible, and reversing a
  written directive all stop and ask. *Blanket approval is permission, not
  information.*
- **Stop on a criterion, not on a mood** — and stop on **thrash** too: two
  iterations with nothing advanced is a wrong premise, not persistence.

## Tests

```bash
npm test          # 23 tests, no install step, no dependencies
```

They are not decoration. Several pin defects a review council reproduced in
these scripts, including the one that overwrote a real `decisions.md` through a
symlinked memory home while printing «created» and exiting 0 — a layout
`references/distillation.md` recommends. **A tool that recommends a layout must
be tested against that layout.**

## Limits

- It is a **skill, not a harness**: it describes the loop, the critic prompts,
  the ledger and the stopping rule. Your agent tooling dispatches the subagents
  and runs the checks.
- Check discovery covers the ecosystems listed above. Anything else reports **no
  check** — deliberately, and loudly.
- `bootstrap.mjs` looks for existing ledger files in `.` and `docs/` (one level
  deep). A ledger buried deeper is not seen; read the `left alone` line before
  accepting what it created.
- `skills.mjs` shells out to `npx skills` for installs, so that one command
  needs the network. Everything else is offline.

## License

MIT — see [LICENSE](LICENSE).
