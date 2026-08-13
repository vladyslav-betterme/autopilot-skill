# Failures

Classified by **CAUSE, not by file or task** — the task changes, the cause
repeats. Each entry: the shape, one reproduction, and the tell that you are
about to do it again.

Count **per area**. A falling total hides one area getting worse.

## The distribution

| Cause | Count | Trend |
|---|---:|---|
| A composed chain whose short-circuit swallows the payload | 1 | new |
| A discovered value hardcoded at the second call site | 1 | new |
| A destructive write reachable through an argument | 1 | caught before landing |

## Patterns

### A composed chain whose short-circuit swallows the payload — FATAL shape

`carrier.mjs` built the unit's command by joining its steps with `&&`. It reads
correctly and it is inert:

```
cd "$root" || exit 1 && [ -e docs/STOP ] && exit 0 && mkdir .carrier.lock … && <the agent>
```

With STOP **absent** the test returns 1, the rest of the chain never runs, and
the wrapper exits **0**. Observed: `agent ran: NEVER`, exit 0. A carrier armed
with that plist reports success every thirty minutes and never once invokes the
agent — the loop dying while everyone assumes it is running, in daemon form.

Fixed by joining with `;`. Pinned by a test that RUNS the emitted wrapper.

**The tell:** you are joining steps whose *failure* is meaningful (a guard, a
test, a lock) with an operator that treats failure as «stop». Guards compose
with `;`; only steps that must not proceed on failure compose with `&&`.

### A discovered value hardcoded at the second call site

Two new `prove.mjs` tests wrote `path.join(d, 'docs', 'goal.md')` while the
ledger home is **elected** — a bare temp directory has no `docs/`, so the home
is `.`. `ENOENT`, two red tests. The older test in the same file already read
the home back from the tool's own output.

**The tell:** you are writing a path that another part of the system chose. The
question «where did it actually put it» has an answer on stdout.

### A destructive write reachable through an argument

`new-mcp.mjs --config ~/.codex/config.toml` would have replaced a working TOML
config with a JSON object. Caught before landing; refused at the argument, and
the refusal is pinned by a test that asserts the TOML is still intact.

**The tell:** a flag whose value is a path you will WRITE, and you only validated
what you write, not where.
