# Wins

What worked, and **how many times**. Not a diary: an entry earns its place when
it is a pattern you would repeat on a different task.

**At three, it graduates into a skill of its own** — write it with
`scripts/new-skill.mjs` and use it immediately. The count is the mechanism.

| pattern | times | last seen | evidence it worked |
|---|---:|---|---|
| **Execute the artifact you emitted, never review it.** A generated file is not a claim about behaviour until something runs it. | 3 | 2026-08-13 | (1) the scaffolded MCP server driven through a real `initialize`/`tools/list`/`tools/call` handshake — reading it would not have shown that a notification must get no reply; (2) the carrier wrapper run under `/bin/sh`, which is the ONLY reason the `&&` short-circuit was found; (3) the emitted plist actually `launchctl bootstrap`ed and kickstarted — `plutil -lint` was green on it either way. |
| **Demonstrate the guard on a COPY with the fix removed.** Never on the real file. | 2 | 2026-08-13 | the notification/TOML/one-key demos ran against `sed`-patched copies; the carrier demo needed the copy to sit *beside* `lib.mjs` to resolve its import, which is itself the tell that a probe placed anywhere else proves nothing. |
| **Read back the value the tool elected instead of assuming it.** | 2 | 2026-08-13 | two `prove.mjs` tests hardcoded `docs/` as the ledger home and failed on a bare temp dir, where the home is `.`; the fix is `run('bootstrap.mjs').match(/ledger home: (.+)/)`, which is what the older test in the same file already did. |
