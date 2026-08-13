# Changelog

What shipped, newest first. One line per landed change: what it does, and what
was wrong before.

- **prove.mjs** — the check is run by something that is not writing the summary.
  Before: «the check passed» was output pasted by the context that wanted it to
  have passed, and `check | tail` exits 0 on a red check.
- **carrier.mjs** — emits the launchd / cron / GitHub unit that outlives the
  session, and installs none of them. Before: the loop's only continuation was a
  wakeup that dies with the window.
- **STOP** — one file halts the loop AND the carrier, searched from any
  subdirectory up. Before: stopping meant killing the session, which left the
  daemon iterating.
- **tools.mjs / new-mcp.mjs / references/tooling.md** — the capability ladder,
  the inventory across seven config files, and the scaffold that is also a CLI.
  Before: arming was skills-only, so a missing capability read as a smaller goal.
