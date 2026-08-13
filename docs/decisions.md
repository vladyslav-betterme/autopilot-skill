# Decisions

A choice and its cost. **Including the choice to do nothing** — «not changed,
accepted risk, because the cure costs more than the disease» is a decision, and
recording it stops the next session re-opening it as an unfinished chore.

Admission bar: someone could reasonably have decided the other way.

| date | decision | cost accepted | why not the alternative |
|---|---|---|---|
| 2026-08-13 | The ledger lives in `docs/`, created by making that directory before bootstrap elected a home | A directory that did not exist in a five-file repo | The elected fallback was `.`, which puts five ledger files beside the README of a published skill. Nothing else wanted `docs/`, so there is still one home per kind of knowledge. |
| 2026-08-13 | `carrier.mjs` prints the unit and **installs nothing** | The human runs one more command, and can get it wrong | Arming a scheduled agent spends money on a schedule with nobody watching — §6 says that is theirs to approve. A skill that installs it has taken a decision that was not its to take. |
| 2026-08-13 | `prove.mjs` refuses shell tokens instead of sanitising them | `prove.mjs -- sh -c 'a \| b'` still reaches a shell — this is a speed bump on the honest mistake, not a wall against a determined one | Sanitising implies a guarantee it cannot keep. Refusing the shape names the failure at the moment someone writes it, which is where the six red deploys came from. |
| 2026-08-13 | «Execute what you emitted» reached three wins and is written into **SKILL.md §2**, not into a skill of its own | The three-at-a-time rule now has one documented exception, and someone will have to judge the next one | A separate skill answering «how do I prove this» beside the skill whose whole subject is proving would be two answers to one question — the defect this repo hunts. `references/distillation.md` already says to delete a skill when its rule became structural; writing one that is born structural is the same error, earlier. |
| 2026-08-13 | The overlap lock is `mkdir`, with no staleness timeout | A crashed run leaves `.carrier.lock` and every later run exits 0 doing nothing, until someone deletes it | A timeout needs a clock, a PID check and a policy for «the other run is still going». `mkdir` is atomic on every filesystem this will meet, and the recovery is one `rmdir` printed in the output. Marked `ponytail:` in the source. |
