#!/usr/bin/env node
/**
 * Build the tool that does not exist yet — and use it in THIS session.
 *
 * `new-skill.mjs` turns a repeated win into knowledge. This turns a missing
 * capability into a reachable one: when the loop needs to drive something no
 * MCP server covers (a desktop app, an internal API, a render farm), the last
 * rung of the ladder in `references/tooling.md` is to write the server.
 *
 * The reason this script exists rather than a paragraph of advice: a harness
 * reads its MCP config at STARTUP. A server written mid-run is invisible to the
 * session that wrote it, so the loop stalls waiting for a restart that
 * unattended work never gets. The scaffold is therefore ALSO a CLI — the same
 * tool functions, callable as `node server.mjs --call <tool> '<json>'` — so the
 * capability is live the moment it is written and the server form is what the
 * next session gets for free.
 *
 *   node new-mcp.mjs <name> -d "<what it drives, and why the CLI was not enough>"
 *   node new-mcp.mjs <name> -d "..." --config .cursor/mcp.json
 *
 * Never overwrites. Zero dependencies, and so is what it generates.
 */
import fs from 'node:fs';
import path from 'node:path';
import { realPath, serverMapProblem } from './lib.mjs';

const root = process.cwd();
const argv = process.argv.slice(2);
const VALUE_FLAGS = ['-d', '--description', '--config', '--dir'];
const flag = (...names) => {
  const i = argv.findIndex((a) => names.includes(a));
  return i === -1 ? null : argv[i + 1] ?? null;
};
/** Same trap as new-skill.mjs: `-d "…" name` must not read the description as
 *  the name, so a bare word that FOLLOWS a value flag is not a candidate. */
const name = argv.find((a, i) => !a.startsWith('-') && !VALUE_FLAGS.includes(argv[i - 1]));
const description = flag('-d', '--description');
const configRel = flag('--config') ?? '.mcp.json';

const die = (msg) => { console.error(msg); process.exit(2); };

if (!name || !description) die('usage: new-mcp.mjs <name> -d "<what it drives>" [--config .mcp.json]');
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) die(`bad server name «${name}» — lower-case kebab-case only`);
if (description.length < 20) die('description too short — say what it drives and what it is for');
/** Registration writes JSON. Pointed at Codex's TOML it would replace a working
 *  config with a JSON object — refuse the write instead of «noting» it after. */
if (!configRel.endsWith('.json')) {
  die(`--config must be a JSON config; «${configRel}» is not.\n` +
    'Codex uses TOML: scaffold with --config .mcp.json and add the [mcp_servers.…] block by hand.');
}

/**
 * ONE absolute path per thing, derived once.
 *
 * The containment check used `path.resolve(root, rel)` and the write used
 * `path.join(root, rel)`. Those agree only while `rel` is relative: an ABSOLUTE
 * `--dir` that lands inside the project passed the check and then wrote to a
 * doubled path (`<root>/<root>/tools/…`), registered an absolute arg that does
 * not exist, and printed four lines that were each false, exit 0. That is the
 * round-1 fatal, alive under the fix that was supposed to close it — because
 * the fix answered «is it inside?» with a different function than the one that
 * decides where the bytes go.
 */
const dirAbs = path.resolve(root, flag('--dir') ?? path.join('tools', `${name}-mcp`));
const serverAbs = path.join(dirAbs, 'server.mjs');
const configAbs = path.resolve(root, configRel);
const dirRel = path.relative(root, dirAbs);
const serverRel = path.relative(root, serverAbs);

/**
 * The scaffold must land INSIDE the project, because the path it registers is
 * relative to it. `--dir /opt/ae` wrote to `<root>/opt/ae` (that is what
 * `path.join` does with an absolute second argument), registered
 * `/opt/ae/server.mjs`, and printed three lines that were each false while
 * exiting 0 — a server that can never start.
 */
/**
 * Containment has to be checked on the REAL path, not the lexical one.
 * `path.resolve` + `startsWith` refuses `--dir tools/../../x` and happily
 * accepts `--dir tools/thing` when `tools` is a symlink pointing out of the
 * project — which wrote the scaffold outside it and, through a symlinked
 * `.mcp.json`, rewrote a config file elsewhere on disk, exit 0. `lib.mjs`
 * documents this exact lesson about symlinks; it was not applied here.
 */
const resolveReal = (rel) => {
  let probe = path.resolve(root, rel);
  const tail = [];
  while (!fs.existsSync(probe)) {
    tail.unshift(path.basename(probe));
    const up = path.dirname(probe);
    if (up === probe) break;
    probe = up;
  }
  return path.join(realPath(probe), ...tail);
};
const rootReal = realPath(root);
for (const [label, rel] of [['--dir', dirAbs], ['--config', configAbs]]) {
  const abs = resolveReal(rel);
  if (abs !== rootReal && !abs.startsWith(rootReal + path.sep)) {
    die(`${label} must stay inside the project — «${rel}» really resolves to ${abs}`);
  }
}

/**
 * The premise check, applied to tools: a SECOND server for a job one already
 * does is the same defect as a second changelog, and costs more.
 *
 * A config that EXISTS but does not parse is the dangerous case and is refused:
 * the parse error used to be swallowed into `null`, and the file was then
 * REPLACED by a one-server object — VS Code's `mcp.json` legally carries `//`
 * comments and an `inputs` block, so «registered» could mean «your entire MCP
 * config is gone», exit 0.
 */
/**
 * The lock comes FIRST — before the config is read and before anything is
 * written. Two things went wrong when it did not:
 *
 *  · `configExists` was a snapshot taken BEFORE the lock, and it gated the
 *    re-read. A racer that started in an empty project therefore skipped the
 *    re-read and wrote `{}` over whatever the first holder had just created:
 *    7 races of 10 lost a registration while BOTH processes printed
 *    «registered» and exited 0 — on the path this script is FOR, scaffolding
 *    the first server in a project.
 *  · every `die()` between «scaffold written» and «config written» left the
 *    scaffold, so the retry said «already exists — not overwriting». Taking the
 *    lock here means every refusal happens before anything exists.
 */
const lockDir = path.join(root, '.mcp-lock');
let locked = false;
for (let i = 0; i < 50 && !locked; i++) {
  try { fs.mkdirSync(lockDir); locked = true; } catch { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100); }
}
if (!locked) {
  die(`another process is holding ${path.relative(root, lockDir)} — if nothing else is running, delete it.\n` +
    'Nothing was written, so a retry is a retry.');
}
const release = () => { try { fs.rmdirSync(lockDir); } catch { /* already gone */ } };
process.on('exit', release);
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { release(); process.exit(130); });

const configStat = (() => { try { return fs.statSync(configAbs); } catch { return null; } })();
if (configStat?.isDirectory()) die(`--config «${configRel}» is a directory.`);
// realpath resolves symlinks; a hardlink has no path to resolve, so the file
// this rewrites can still live outside the project. Refuse rather than edit
// somebody else's file under a name that looks local.
if (configStat && configStat.nlink > 1) {
  die(`${configRel} has ${configStat.nlink} links — the same file exists elsewhere on disk.\n` +
    'Refusing: writing «inside the project» would rewrite that file too.');
}
const configExists = Boolean(configStat);
let config = null;
if (configExists) {
  const raw = fs.readFileSync(configAbs, 'utf8');
  try {
    config = JSON.parse(raw);
  } catch (err) {
    die(`${configRel} exists but is not valid JSON (${err.message.split('\n')[0]}).\n` +
      'Refusing to write: this file may carry comments or other settings, and rewriting it would delete them.\n' +
      'Fix the file, or pass --config <another path>.');
  }
}
/** The key belongs to the FILE, not to what happens to be in it. Choosing it
 *  from existing content registered a fresh `.vscode/mcp.json` under
 *  `mcpServers` — the one key VS Code does not read. */
// The helper was asked about `config[key]` and never about `config` itself, so
// a TOP-LEVEL array printed «registered» and exited 0 while JSON.stringify
// dropped the property, and a top-level string threw. Both shapes are the ones
// the helper's own doc comment names — one level up.
const topProblem = serverMapProblem(config);
if (topProblem) {
  die(`${configRel} is ${topProblem}, not an object.\n` +
    'Refusing: a server added to that either vanishes when it is written back, or throws.');
}
const key = /[/\\]?\.vscode[/\\]/.test(configRel) ? 'servers' : (config?.servers ? 'servers' : 'mcpServers');
const mapProblem = serverMapProblem(config?.[key]);
if (mapProblem) {
  die(`${configRel} has «${key}» as ${mapProblem}, not an object of servers.\n` +
    'Refusing: setting a named property on that either vanishes when it is written back, or throws.');
}
// hasOwn, not truthiness: «constructor» passes the name regex and inherits from
// Object.prototype, so it was reported as already registered in a config that
// had never heard of it.
if (config?.[key] && Object.hasOwn(config[key], name)) {
  die(`«${name}» is already registered in ${configRel} — extend that server instead of adding a second one.`);
}
/** Written before the server file exists, so a failure here does not leave a
 *  scaffold that «already exists — not overwriting» on the retry. */
const configDir = path.dirname(configAbs);
if (!fs.existsSync(configDir)) die(`${path.relative(root, configDir)}/ does not exist — create it, or pass --config <another path>.`);

const TEMPLATE = `#!/usr/bin/env node
/**
 * ${name} — ${description}
 *
 * TWO WAYS TO CALL IT, one implementation:
 *
 *   node ${serverRel} --list
 *   node ${serverRel} --call ping '{"text":"hello"}'     ← works right now, in any session
 *   (as an MCP server: registered in ${configRel}, loaded when the harness next STARTS)
 *
 * Add a tool by adding one entry to TOOLS. Keep the handler small and make it
 * return text — the model reads the text, not your exit code.
 *
 * When this grows past a handful of tools, stop hand-rolling: load the
 * \`mcp-builder\` skill and move to the official SDK.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const TOOLS = [
  {
    name: 'ping',
    description: 'Placeholder so the server is testable before it does anything real. Replace it.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'anything' } },
      required: ['text'],
    },
    handler: async ({ text }) => \`${name} is alive: \${text}\`,
  },

  // A real tool usually wraps a command the target app already has. Pass an
  // ARGUMENT ARRAY, never a shell string: the model's output is untrusted input,
  // and \`sh -c\` turns a filename into a command.
  //
  // {
  //   name: 'render',
  //   description: 'Render a comp. Returns the output path.',
  //   inputSchema: { type: 'object', properties: { project: { type: 'string' }, comp: { type: 'string' } }, required: ['project', 'comp'] },
  //   handler: async ({ project, comp }) => {
  //     const { stdout } = await run('aerender', ['-project', project, '-comp', comp]);
  //     return stdout.trim();
  //   },
  // },
];

async function call(toolName, args) {
  const tool = TOOLS.find((t) => t.name === toolName);
  if (!tool) throw new Error(\`unknown tool «\${toolName}» — have: \${TOOLS.map((t) => t.name).join(', ')}\`);
  return String(await tool.handler(args ?? {}));
}

// ── CLI ─────────────────────────────────────────────────────────────────────
// process.exitCode, never process.exit. On a PIPE stdout is asynchronous and
// exiting drops whatever has not drained: a 100 KB result came back cut to
// exactly 65536 bytes, with status 0 and no marker. Every agent harness reads a
// subprocess through a pipe, and this is the path the skill tells you to use.
const argv = process.argv.slice(2);
const cliMode = argv[0] === '--list' || argv[0] === '--call';
if (cliMode) {
  try {
    if (argv[0] === '--list') console.log(TOOLS.map((t) => \`\${t.name}  \${t.description}\`).join('\\n'));
    else console.log(await call(argv[1], JSON.parse(argv[2] ?? '{}')));
  } catch (err) {
    console.error(String(err.message ?? err));
    process.exitCode = 1;
  }
}

// ── MCP over stdio ──────────────────────────────────────────────────────────
// JSON-RPC 2.0, one message per line. A message with no \`id\` is a NOTIFICATION
// and must get no reply at all — answering \`notifications/initialized\` is the
// classic way a hand-written server hangs a client at startup.
// A client that closes stdout raises EPIPE on the write, and an unhandled
// 'error' event kills the process with a stack nobody is left to read.
process.stdout.on('error', (err) => { if (err.code === 'EPIPE') process.exit(0); throw err; });
const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\\n');
const PROTOCOL = '2025-06-18';

async function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined) return; // notification
  const ok = (result) => send({ jsonrpc: '2.0', id, result });
  try {
    if (method === 'initialize') {
      return ok({
        // Echo the client's version when it sent one: it is the version both
        // sides already agree on, and guessing higher gets the session dropped.
        protocolVersion: typeof params?.protocolVersion === 'string' ? params.protocolVersion : PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: '${name}', version: '0.1.0' },
      });
    }
    if (method === 'ping') return ok({});
    if (method === 'tools/list') {
      return ok({ tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    }
    if (method === 'tools/call') {
      // A tool that THREW is a result the model must see and can react to —
      // not a protocol error, which it never sees.
      try {
        return ok({ content: [{ type: 'text', text: await call(params?.name, params?.arguments) }] });
      } catch (err) {
        return ok({ content: [{ type: 'text', text: String(err.message ?? err) }], isError: true });
      }
    }
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: \`unknown method \${method}\` } });
  } catch (err) {
    send({ jsonrpc: '2.0', id, error: { code: -32603, message: String(err.message ?? err) } });
  }
}

let buffer = '';
if (!cliMode) process.stdin.setEncoding('utf8');
if (!cliMode) process.stdin.on('data', (chunk) => {
  buffer += chunk;
  // Split on newlines and keep the tail: a message can arrive in pieces.
  const lines = buffer.split('\\n');
  buffer = lines.pop() ?? '';
  for (const line of lines) {
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    handle(msg);
  }
});
`;

try {
  fs.mkdirSync(dirAbs, { recursive: true });
} catch (err) {
  die(`cannot create ${dirRel}: ${err.code ?? err.message}` +
    (err.code === 'ENOENT' ? ' — a dangling symlink in that path, most likely.' : ''));
}
try {
  fs.writeFileSync(serverAbs, TEMPLATE, { flag: 'wx' });
} catch (err) {
  if ((err && err.code) === 'EEXIST') die(`${serverRel} already exists — not overwriting.`);
  throw err;
}

/** Register it where the harness reads. Only this file is touched, and only its
 *  server map: a config carrying other settings keeps them. */
/**
 * Read-modify-write on a shared file, so it takes a lock.
 *
 * Two agents scaffolding at once lost a registration in 2 runs of 3 while BOTH
 * printed «registered» and exited 0 — and «unattended agents arming
 * themselves» is this skill's own pitch. `mkdir` is the lock because it is
 * atomic everywhere. ponytail: no staleness timeout; a crash leaves the
 * directory and the message below says to delete it.
 */
const next = config ?? {};

next[key] = next[key] ?? {};
next[key][name] = { type: 'stdio', command: 'node', args: [serverRel] };
try {
  fs.writeFileSync(configAbs, JSON.stringify(next, null, 2) + '\n');
} catch (err) {
  // The scaffold exists by now. Leaving it there turns a transient EACCES into
  // a dead end: the retry refuses with «already exists — not overwriting», and
  // the only way forward is deleting a file you were just told never to
  // overwrite. Take it back out, so a retry is a retry.
  try { fs.rmSync(serverAbs); fs.rmdirSync(path.dirname(serverAbs)); } catch { /* leave what we cannot remove */ }
  die(`could not write ${configRel}: ${err.code ?? err.message}\n` +
    `The scaffold was removed, so fixing that and running this again works.`);
}

console.log(`created   : ${serverRel}`);
console.log(`registered: ${configRel}  (server «${name}», path relative to the project root)`);
console.log(`            Whether a harness resolves that path against the project is ITS choice and`);
console.log(`            is not verified here — if it fails to start, make the path absolute.`);
console.log(`use now   : node ${serverRel} --call ping '{"text":"hello"}'`);
console.log(`            An MCP config is read at STARTUP. This session cannot see the server;`);
console.log(`            the --call form is the same code and works immediately — use it, do not wait.`);
console.log(`next      : replace the ping tool with the real ones, then say what you verified by running.`);
console.log(`            Anything you put in a handler runs unattended, with your permissions.`);
