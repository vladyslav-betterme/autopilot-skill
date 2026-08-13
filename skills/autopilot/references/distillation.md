# Turning repeated wins into skills

After a pattern has worked **three times**, it stops being a habit and becomes a
skill. The count lives in `wins.md` — that column is the whole reason the ledger
counts instead of merely listing.

## Why three

One success is luck with a good story. Two is a coincidence you will over-fit.
Three is the first point at which the pattern has survived a situation you did
not design it for. Distilling earlier fills the repo with advice nobody follows,
which is worse than no skill: it trains the reader to skim.

## What a distilled skill must contain

- **A `description` naming the trigger words** that should summon it — including
  the ones the owner actually says, in their language. A skill that never fires
  is a file.
- **The incident**, not the principle. «Never trust a piped check» is forgettable;
  «`… | tail` reports tail's status and shipped six red deploys that read as
  green locally» is not.
- **What it does NOT cover.** Every guard has an edge it cannot see; writing it
  down is the difference between a limitation and a lie.

## Where it goes, and how it gets used the same day

```bash
node <skill>/scripts/new-skill.mjs <name> -d "<when to use it, in trigger words>"
node <skill>/scripts/new-skill.mjs <name> -d "..." < body.md   # you write the body
```

It writes into the shared skills home and symlinks into every agent directory
the project has — the same layout an installer produces — then prints how to
apply it **in the session that wrote it**. A skill that waits for someone to
remember to copy it is a skill nobody uses.

Beside the others, in a **tracked** directory, symlinked into whatever path the
harness loads from (`.claude/skills/`, `.agents/skills/`, …). A skill that lives
only in an ignored directory exists on one laptop.

**And know what that pattern costs.** This page recommended the symlink layout
while `bootstrap.mjs` could not see through a symlink — it elected a symlinked
`docs/learnings` as the ledger home and overwrote the real files behind it, exit
0, printing «created». Fixed, and pinned by two tests. The general lesson is
larger than the bug: **a tool that recommends a layout must be tested against
that layout**, and «create only what is missing» has to be enforced at the write
(`flag: 'wx'`), not only by a check that can be wrong.

**Then prove it loaded.** Ask the agent to list its skills. Operating rules have
been written into a file the harness never read, invisible until someone asked.
Rules in a location nothing loads are not rules — the same failure as a guard
that cannot fire.

## When to delete one

When its advice has been wrong twice, or when the thing it guards has been made
structural. A rule enforced by a type does not need a skill telling you to
follow it.
