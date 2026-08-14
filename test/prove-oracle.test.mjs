import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * A DIFFERENTIAL ORACLE for the one thing `prove.mjs` promises.
 *
 * Four rounds of review produced twenty fatals; six of them were the shell
 * analyser, rewritten four times — token blacklist, one regex, a whitelist, a
 * quote-aware scanner — and each rewrite was correct about the thing it fixed
 * while the next round found the stage in front of it. A convergence analyst
 * counted it: 30 % of every fatal in the campaign, in an area with zero clean
 * rounds out of four, and called the surface unbounded. Deciding «could this
 * shell text lie about its exit status» over POSIX shell plus bash options plus
 * npm delegation is a grammar with a motivated adversary — the model writing
 * the check — and it cannot be closed by a fifth scanner.
 *
 * So stop reviewing the analyser and TEST THE PROMISE instead:
 *
 *   ground truth  = the status the check has when a pipe cannot hide a failure,
 *                   i.e. `bash -o pipefail -c <body>`
 *   the property  = prove NEVER reports success when that truth is failure.
 *                   Refusing the body counts as not reporting success.
 *
 * `-o pipefail` is usable as an ORACLE over this corpus, where the left-hand
 * side genuinely fails. It is NOT usable as a way to RUN checks in general, and
 * that was measured rather than assumed: `cat big.txt | head -1` exits 141
 * under pipefail because `head` closes the pipe and `cat` takes SIGPIPE. An
 * honest, extremely common check, called failed. That is why `prove.mjs` still
 * judges the shape instead of changing the semantics — see decisions.md. The corpus is every construct rounds
 * 1–4 submitted, plus the composition of separators, quote states, redirections
 * and substitutions — and it only grows: a new finding is a new row here first.
 *
 * This is the check a stranger can re-run. It does not care who reviewed what.
 */

const SCRIPTS = path.resolve(import.meta.dirname, '..', 'skills', 'autopilot', 'scripts');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'oracle-'));

/** What the body's status IS, when a pipe cannot hide a failure. */
const truth = (body, cwd) =>
  spawnSync('bash', ['-o', 'pipefail', '-c', body], { cwd, stdio: 'ignore' }).status;

/** What prove REPORTS for the same body, run the way the skill recommends. */
function verdict(body) {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: 'o', scripts: { verify: body } }));
  const res = spawnSync('node', [path.join(SCRIPTS, 'prove.mjs'), '--', 'npm', 'run', 'verify'],
    { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const refused = res.status === 2 && /compound|piped|cannot identify/.test(res.stderr);
  return { refused, status: res.status, cwd: d };
}

const FAIL = 'node -e "process.exit(1)"';
const OK = 'node -e "process.exit(0)"';

/**
 * Every row is a script body a real package.json could hold. The ones marked
 * `from` cite the round that submitted them; the rest compose the same grammar.
 */
const CORPUS = [
  // — round 1–4 reproductions, verbatim in shape —
  { body: `${FAIL} | tail -1`, from: 'R1' },
  { body: `${FAIL} | cat`, from: 'R2' },
  { body: `${FAIL}\necho artifact-checked`, from: 'R3' },
  { body: `echo checked $(${FAIL})`, from: 'R3' },
  { body: 'echo checked `' + FAIL + '`', from: 'R3' },
  { body: `${FAIL} || true`, from: 'R3' },
  { body: `${FAIL} || echo continuing`, from: 'R3' },
  { body: `${FAIL} ; echo done`, from: 'R3' },
  { body: `test -s dist/app.js; echo artifact-checked`, from: 'R3' },
  { body: `if test -s dist/app.js; then echo ok; fi`, from: 'R3' },
  { body: `test -s a & test -s b & wait`, from: 'R3' },
  { body: `echo "don't panic" ; ${FAIL} ; echo "we're green"`, from: 'R4' },
  { body: `echo "it's fine" && ${FAIL}`, from: 'R4' },
  // — honest bodies that must NOT be refused into uselessness —
  { body: OK },
  { body: `${OK} 2>&1` },
  { body: `${OK} && ${OK}` },
  { body: `echo --pattern "(unit|integration)"` },
  { body: `${OK} || exit 1` },
  { body: `${FAIL} || exit 1` },
  { body: `${FAIL} && ${OK}` },
  { body: `${OK} 2>>build.log` },
  { body: `${OK} "a;b"` },
  { body: `${OK} 'x|y'` },
  // — composed: separators × quote states × redirects —
  { body: `${FAIL} | ${OK}` },
  { body: `${FAIL} ; ${OK} ; ${OK}` },
  { body: `echo "a\\"b" ; ${FAIL}` },
  { body: `${FAIL} 2>&1 | tail` },
  { body: `${FAIL} & wait` },
  { body: `{ ${FAIL} ; } ; echo end` },
  { body: `${OK} && ${FAIL} | cat` },
  { body: `for i in 1 2; do ${FAIL}; done; echo looped` },
  { body: `${FAIL} | ${FAIL} | ${OK}` },
];

test('prove never reports success for a check that pipefail says failed', () => {
  const wrong = [];
  for (const row of CORPUS) {
    const v = verdict(row.body);
    const t = truth(row.body, v.cwd);
    // The property, stated once: a body whose honest status is failure must not
    // come back as success. Refusing it (exit 2) is a legitimate answer.
    const reportedSuccess = !v.refused && v.status === 0;
    if (t !== 0 && reportedSuccess) wrong.push({ ...row, truth: t, got: v.status });
  }
  assert.deepEqual(wrong, [], `prove reported success for ${wrong.length} failing check(s):\n` +
    wrong.map((w) => `  ${w.from ?? 'composed'}: ${JSON.stringify(w.body)} — pipefail says ${w.truth}`).join('\n'));
});

test('and it does not refuse everything to get there', () => {
  // A guard that refuses every input satisfies the property above and is
  // useless. At least the plainly honest bodies must RUN and report the truth.
  const honest = [OK, `${OK} 2>&1`, `${OK} && ${OK}`, `echo --pattern "(unit|integration)"`, `${OK} || exit 1`];
  for (const body of honest) {
    const v = verdict(body);
    assert.equal(v.refused, false, `refused an honest body: ${body}`);
    assert.equal(v.status, 0, `honest body did not report success: ${body}`);
  }
  // …and a failing single command must report its own status, not a refusal.
  const v = verdict(FAIL);
  assert.equal(v.refused, false);
  assert.equal(v.status, 1);
});
