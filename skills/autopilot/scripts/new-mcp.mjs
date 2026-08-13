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

const dirRel = flag('--dir') ?? path.join('tools', `${name}-mcp`);
const serverRel = path.join(dirRel, 'server.mjs');
const serverAbs = path.join(root, serverRel);
const configAbs = path.join(root, configRel);

/**
 * The scaffold must land INSIDE the project, because the path it registers is
 * relative to it. `--dir /opt/ae` wrote to `<root>/opt/ae` (that is what
 * `path.join` does with an absolute second argument), registered
 * `/opt/ae/server.mjs`, and printed three lines that were each false while
 * exiting 0 — a server that can never start.
 */
for (const [label, rel] of [['--dir', dirRel], ['--config', configRel]]) {
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(root + path.sep)) die(`${label} must stay inside the project — «${rel}» resolves to ${abs}`);
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
const configExists = fs.existsSync(configAbs);
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
const key = /[/\\]?\.vscode[/\\]/.test(configRel) ? 'servers' : (config?.servers ? 'servers' : 'mcpServers');
if (config?.[key]?.[name]) {
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

fs.mkdirSync(path.join(root, dirRel), { recursive: true });
try {
  fs.writeFileSync(serverAbs, TEMPLATE, { flag: 'wx' });
} catch (err) {
  if ((err && err.code) === 'EEXIST') die(`${serverRel} already exists — not overwriting.`);
  throw err;
}

/** Register it where the harness reads. Only this file is touched, and only its
 *  server map: a config carrying other settings keeps them. */
const next = config ?? {};
next[key] = next[key] ?? {};
next[key][name] = { type: 'stdio', command: 'node', args: [serverRel] };
fs.writeFileSync(configAbs, JSON.stringify(next, null, 2) + '\n');

console.log(`created   : ${serverRel}`);
console.log(`registered: ${configRel}  (server «${name}», path relative to the project root)`);
console.log(`            Whether a harness resolves that path against the project is ITS choice and`);
console.log(`            is not verified here — if it fails to start, make the path absolute.`);
console.log(`use now   : node ${serverRel} --call ping '{"text":"hello"}'`);
console.log(`            An MCP config is read at STARTUP. This session cannot see the server;`);
console.log(`            the --call form is the same code and works immediately — use it, do not wait.`);
console.log(`next      : replace the ping tool with the real ones, then say what you verified by running.`);
console.log(`            Anything you put in a handler runs unattended, with your permissions.`);
