#!/usr/bin/env node
/**
 * What can this loop actually DO here — beyond skills?
 *
 * `skills.mjs` answers «what does the agent KNOW». This answers «what can it
 * REACH»: MCP servers, plugins, and the honest list of what neither this script
 * nor any config file can see. The loop needed it because an autonomous run
 * stalls the same way twice — it decides a capability is missing when it is
 * already configured, or it decides one is present because a config file names
 * it, and neither belief was ever checked.
 *
 * The false ABSENCE is the expensive one, and this script has already produced
 * it: an early version read only VS Code's PROJECT config and no Claude Desktop
 * config at all, on a machine whose Claude Desktop config held `AfterEffectsMCP`
 * — while this very repo used «no public server drives After Effects» as its
 * worked example for writing one. A missing reader does not report a gap; it
 * reports a green «none», which is why an unreadable file is now a finding of
 * its own rather than silence.
 *
 * A config file is a claim about DISK. The tool list in the running session is
 * the only authority on what is live — this script says so rather than
 * pretending otherwise.
 *
 * Read-only. Prints a table, or `--json`. Zero dependencies.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const home = os.homedir();
const argv = process.argv.slice(2);
const json = argv.includes('--json');
for (const a of argv) {
  // An unknown flag used to print the ordinary table and exit 0, so a `--cost`
  // that measures nothing reads exactly like a measurement.
  if (a !== '--json') { console.error(`unknown flag «${a}» — the only flag is --json`); process.exit(2); }
}

const unreadable = [];
const readText = (abs) => {
  try { return fs.readFileSync(abs, 'utf8'); } catch (err) {
    if (err.code !== 'ENOENT') unreadable.push({ file: abs, why: err.code ?? err.message });
    return null;
  }
};
const readJson = (abs) => {
  const raw = readText(abs);
  if (raw === null) return null;
  try { return JSON.parse(raw); } catch (err) {
    // A trailing comma, or VS Code's legal `//` comments, used to read as «no
    // MCP here» — and the ladder then says «write one».
    unreadable.push({ file: abs, why: `not valid JSON (${err.message.split('\n')[0]})` });
    return null;
  }
};
const short = (abs) => (home && abs.startsWith(home) ? abs.replace(home, '~') : path.relative(root, abs) || '.');

/** Per-OS application support directory, for the desktop apps that keep their
 *  config there rather than in a dotfile. */
const appSupport = process.platform === 'darwin' ? path.join(home, 'Library', 'Application Support')
  : process.platform === 'win32' ? (process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming'))
    : path.join(process.env.XDG_CONFIG_HOME ?? path.join(home, '.config'));

/**
 * Every harness keeps its MCP servers in its own file. VS Code says `servers`,
 * opencode says `mcp`, everyone else says `mcpServers` — one reader, three keys,
 * because a reader that knows one of them reports «no MCP here» in an editor
 * full of them.
 */
const JSON_SOURCES = [
  { abs: path.join(root, '.mcp.json'), scope: 'project' },
  { abs: path.join(root, '.cursor', 'mcp.json'), scope: 'project' },
  { abs: path.join(root, '.vscode', 'mcp.json'), scope: 'project' },
  { abs: path.join(root, '.gemini', 'settings.json'), scope: 'project' },
  { abs: path.join(root, 'opencode.json'), scope: 'project' },
  { abs: path.join(home, '.cursor', 'mcp.json'), scope: 'user' },
  { abs: path.join(home, '.gemini', 'settings.json'), scope: 'user' },
  { abs: path.join(appSupport, 'Code', 'User', 'mcp.json'), scope: 'user' },
  { abs: path.join(appSupport, 'Claude', 'claude_desktop_config.json'), scope: 'user' },
  { abs: path.join(home, '.config', 'opencode', 'opencode.json'), scope: 'user' },
];

const servers = [];
const add = (name, entry, source, scope) => {
  const transport = entry?.type ?? (entry?.url ? 'http' : 'stdio');
  const command = [entry?.command, ...(Array.isArray(entry?.args) ? entry.args : [])].filter(Boolean).join(' ');
  const how = String(entry?.url ?? command ?? '').slice(0, 80);
  const existing = servers.find((s) => s.name === name);
  // Two scopes defining one name is an OVERRIDE CHAIN, not agreement. Keeping
  // the first definition and appending only the later source's NAME showed a
  // URL for a server that was really `node local-override.mjs`, and the row
  // read as three sources agreeing.
  if (existing) {
    existing.sources.push(source);
    // Only when BOTH sides actually carry a definition: the Codex reader names
    // servers without parsing them, and comparing against that empty string
    // marked every Codex-and-JSON server as a conflict with itself.
    if (how && existing.how && existing.how !== how) {
      existing.differs = existing.differs ?? [{ source: existing.sources[0], transport: existing.transport, how: existing.how }];
      existing.differs.push({ source, transport, how });
    }
    return;
  }
  servers.push({ name, transport, how, sources: [source], scope });
};

/**
 * ONE entry point, because the guarded and unguarded readers disagreed.
 *
 * The `.mcp.json` loop checked the map's shape; the `~/.claude.json` reader did
 * not — so an array there became servers named `0` and `1`, and a string became
 * one server per character, with `unreadable: []`. Not swallowed into silence:
 * converted into a false PRESENCE, which is worse than the absence this script
 * was written to stop.
 */
const addAll = (map, abs, source, scope) => {
  if (map === undefined || map === null) return;
  if (typeof map !== 'object' || Array.isArray(map)) {
    unreadable.push({ file: abs, why: `the server map is ${Array.isArray(map) ? 'an array' : typeof map}, not an object` });
    return;
  }
  for (const [name, entry] of Object.entries(map)) add(name, entry, source, scope);
};

for (const { abs, scope } of JSON_SOURCES) {
  const cfg = readJson(abs);
  if (!cfg) continue;
  addAll(cfg.mcpServers ?? cfg.servers ?? cfg.mcp, abs, short(abs), scope);
}

/**
 * Claude Code keeps user-scope servers at the top of `~/.claude.json` and
 * LOCAL-scope ones per project inside `projects[<cwd>]` — the second is the one
 * that gets forgotten, because nothing in the repository mentions it and a
 * teammate cloning the repo does not have it.
 */
const claudeJson = path.join(home, '.claude.json');
const claude = readJson(claudeJson);
addAll(claude?.mcpServers, claudeJson, '~/.claude.json', 'user');
const claudeProject = claude?.projects?.[root];
addAll(claudeProject?.mcpServers, claudeJson, '~/.claude.json (this project only)', 'local');

/** Codex is TOML. One regex for the header line is enough to NAME them, and
 *  naming them is the whole job here — this script never launches anything. */
const codex = readText(path.join(home, '.codex', 'config.toml'));
for (const m of (codex ?? '').matchAll(/^\[mcp_servers\.("?)([^\]."]+)\1]/gm)) {
  add(m[2], {}, '~/.codex/config.toml', 'user');
}

/** Plugins can carry BOTH skills and MCP servers, so a plugin is a capability
 *  even when it appears in neither list above. */
const plugins = [];
const pluginsJson = path.join(home, '.claude', 'plugins', 'installed_plugins.json');
const installed = readJson(pluginsJson);
const pluginMap = installed?.plugins;
if (pluginMap !== undefined && (typeof pluginMap !== 'object' || pluginMap === null || Array.isArray(pluginMap))) {
  unreadable.push({ file: pluginsJson, why: `the plugin map is ${Array.isArray(pluginMap) ? 'an array' : typeof pluginMap}, not an object` });
}
for (const [name, entries] of Object.entries(pluginMap && !Array.isArray(pluginMap) && typeof pluginMap === 'object' ? pluginMap : {})) {
  const e = Array.isArray(entries) ? entries[0] : entries;
  plugins.push({ name, scope: e?.scope ?? '?', version: e?.version ?? '?' });
}

/** A `.mcp.json` server still has to be APPROVED in Claude Code. Empty lists
 *  mean «nobody has been asked yet», which is not the same as «off» — so this
 *  is reported as-is and never turned into a verdict. */
const approval = claudeProject
  ? { enabled: claudeProject.enabledMcpjsonServers ?? [], disabled: claudeProject.disabledMcpjsonServers ?? [] }
  : null;

const blind = [
  'connectors (claude.ai, ChatGPT): they live in an account, not on disk — the session tool list is the only place they show up',
  'whether a configured server actually STARTS: a bad path or a missing key fails at launch, silently, and reads exactly like «no such tool»',
  'which tools each server exposes: only the running session knows',
  'any harness whose config is not in the files listed above — an empty result means «not in these files», never «not on this machine»',
];

if (json) {
  // process.exitCode, never process.exit: on a pipe stdout is asynchronous, and
  // a large inventory came back cut at exactly 65536 bytes, invalid JSON, exit
  // 0. The same fatal was fixed in the generated server and left here.
  console.log(JSON.stringify({ root, servers, plugins, approval, unreadable, blind }, null, 2));
  process.exitCode = 0;
} else {

const w = Math.min(Math.max(...servers.map((s) => s.name.length), 4), 28);
console.log(`\x1b[1mMCP servers configured\x1b[0m (${servers.length})`);
for (const s of servers) {
  console.log(`  ${s.name.padEnd(w)}  ${s.transport.padEnd(5)}  ${s.how}  \x1b[2m[${s.sources.join(', ')}]\x1b[0m`);
  for (const d of s.differs ?? []) {
    console.log(`  ${' '.repeat(w)}  \x1b[33m↳ DIFFERS\x1b[0m ${d.transport} ${d.how}  \x1b[2m[${d.source}]\x1b[0m`);
  }
}
if (!servers.length) console.log('  none in any config file this script reads.');

if (plugins.length) {
  console.log(`\n\x1b[1mPlugins\x1b[0m (${plugins.length}) — these can carry skills AND servers`);
  for (const p of plugins) console.log(`  ${p.name}  \x1b[2m${p.version} · ${p.scope}\x1b[0m`);
}
if (approval && (approval.enabled.length || approval.disabled.length)) {
  console.log(`\nApproval for .mcp.json: enabled=${JSON.stringify(approval.enabled)} disabled=${JSON.stringify(approval.disabled)}`);
}
if (unreadable.length) {
  console.log(`\n\x1b[1;33mCould not read — treat as UNKNOWN, not as absent\x1b[0m`);
  for (const u of unreadable) console.log(`  ${short(u.file)}  \x1b[2m${u.why}\x1b[0m`);
}

console.log('\n\x1b[1mWhat this cannot see\x1b[0m — check these in the session, not here:');
for (const b of blind) console.log(`  · ${b}`);
console.log('\nBefore building a capability, walk the ladder in references/tooling.md:');
console.log('  already reachable → the app\'s own CLI → a public MCP server → write one (new-mcp.mjs).');
}
