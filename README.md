# autopilot

[![verify](https://github.com/vladyslav-betterme/autopilot-skill/actions/workflows/verify.yml/badge.svg)](https://github.com/vladyslav-betterme/autopilot-skill/actions/workflows/verify.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A520.11-brightgreen.svg)](package.json)

An agent skill for **autonomous development on any project**. It is portable
because it asks the project what «done» means instead of assuming.

Two claims this skill exists to make impossible:

- **«It works»** when nothing ran it.
- **«It's done»** when the only judge was the model that wrote it.

Backend, frontend, infrastructure — the loop is the same; only the gate differs.

---

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
campaign. The skill fires on its own description; you can also invoke it by
name.

Once per project, from the project root, before the first iteration
(`<skill>` = `.agents/skills/autopilot` after a CLI install, or wherever you
cloned it):

```bash
node <skill>/scripts/discover.mjs    # gates, memory homes, danger signals
node <skill>/scripts/bootstrap.mjs   # creates the ledger, only if absent
```

`discover` is read-only and prints JSON. `bootstrap` is idempotent and **never
overwrites** — it prints what it deliberately left alone.

```jsonc
// node <skill>/scripts/discover.mjs   (abridged)
{
  "project":     { "kind": "node", "packageManager": "npm", "gates": ["npm run verify"] },
  "memoryHomes": ["CLAUDE.md", "docs/learnings", "CHANGELOG.md"],
  "signals":     { "hasCI": true, "envFilesPresent": [".env.local"], "dirty": false }
}
```

**`gates` is the definition of done for every iteration.** If it comes back
empty, the skill says so and stops rather than inventing one — a loop without a
gate stops when the model is satisfied, which is the failure mode the whole
thing is built against.

## What's inside

| File | What it carries |
| --- | --- |
| [`SKILL.md`](skills/autopilot/SKILL.md) | The loop: pick → understand → build → prove → review → land → record. Plus when to stop and ask, and when to stop the loop. |
| [`references/premise-check.md`](skills/autopilot/references/premise-check.md) | Check whether the thing already exists before building it. The highest-yield habit here — five planned items turned out to already exist, four of them inferred absent from *filenames*. |
| [`references/critics.md`](skills/autopilot/references/critics.md) | The review shape that produced reproductions instead of essays: one lens per hunter, one skeptic per finding, everyone read-only. |
| [`references/ledger.md`](skills/autopilot/references/ledger.md) | What gets written down, where, and the admission bar that keeps each file worth reading. |
| [`references/distillation.md`](skills/autopilot/references/distillation.md) | Turning a pattern that worked **three times** into a skill of its own — and when to delete one. |
| [`scripts/discover.mjs`](skills/autopilot/scripts/discover.mjs) | Finds the project's own gate, its existing memory homes, and the signals a loop must not trip. Node, Python, Rust, Go, Make. |
| [`scripts/bootstrap.mjs`](skills/autopilot/scripts/bootstrap.mjs) | Creates the ledger **in the project's own memory home**, only what is missing. |

Zero dependencies. Both scripts are plain Node ≥ 20.11 and run anywhere Node runs.

## The parts worth stealing even if you never install it

- **The gate is discovered, not declared.** `npm run verify`, `make check`,
  `cargo test` — whatever the repo already believes. And it is run in the
  foreground, reading the exit code in the shell that ran it, because
  `gate | tail` reports `tail`'s status and `gate > log; echo $?` reports the
  `echo`'s.
- **Every new guard needs a test you have watched fail.** Delete the fix, run
  it, see red, restore. A guard that cannot fire is worse than none: it reads as
  proof the case is handled.
- **Never a second home for one kind of knowledge.** A second `CHANGELOG.md`
  beside an existing one is worse than no changelog, because now neither is
  authoritative. `bootstrap.mjs` is written entirely around this — and it failed
  its own rule on the first run, which is why it now asks the filesystem the
  same question in both places (see the tests).
- **Autonomy is not permission.** Money, anything irreversible in production,
  and reversing a written directive all stop and ask. *Blanket approval is
  permission, not information.*
- **A stopping condition that is not «the critics found nothing»** — they always
  find something, including in their own last fix.

## Tests

```bash
npm test          # 12 tests, no install step, no dependencies
```

They are not decoration. Five of the twelve pin defects a review council
reproduced in these two scripts, including the one that overwrote a real
`decisions.md` through a symlinked memory home while printing «created» and
exiting 0 — a layout `references/distillation.md` recommends. **A tool that
recommends a layout must be tested against that layout.**

## Where it came from

Extracted from an unattended-development campaign on a ~4 000-commit production
Next.js codebase. Every number in the skill (58–68 % of later findings are
self-inflicted, «two predicates for one question» at 35 % and growing, the
32 → 19 → 12 total that hid a diverging file) was measured there, not
estimated. The incidents are real incidents.

## Limits

- It is a **skill, not a harness**: it describes the loop, the critic prompts
  and the ledger. Your agent tooling dispatches the reviewers and runs the
  gates.
- Gate discovery covers Node, Python, Rust, Go, and `Makefile` targets. Anything
  else reports **no gate** — deliberately, and loudly.
- `bootstrap.mjs` looks for existing ledger files in `.` and `docs/` (one level
  deep). A ledger buried deeper is not seen; check the `left alone` line it
  prints before accepting what it created.

## License

MIT — see [LICENSE](LICENSE).
