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

const readJson = (abs) => {
  try { return JSON.parse(fs.readFileSync(abs, 'utf8')); } catch { return null; }
};
const readText = (abs) => {
  try { return fs.readFileSync(abs, 'utf8'); } catch { return null; }
};
const short = (abs) => (abs.startsWith(home) ? abs.replace(home, '~') : path.relative(root, abs) || '.');

/**
 * Every harness keeps its MCP servers in its own file, under one of two keys.
 * VS Code says `servers`, everyone else says `mcpServers`; a reader that knows
 * only one key reports «no MCP here» in an editor full of them.
 */
const JSON_SOURCES = [
  { abs: path.join(root, '.mcp.json'), scope: 'project' },
  { abs: path.join(root, '.cursor', 'mcp.json'), scope: 'project' },
  { abs: path.join(root, '.vscode', 'mcp.json'), scope: 'project' },
  { abs: path.join(home, '.cursor', 'mcp.json'), scope: 'user' },
  { abs: path.join(home, '.gemini', 'settings.json'), scope: 'user' },
  { abs: path.join(home, '.config', 'opencode', 'opencode.json'), scope: 'user' },
  { abs: path.join(root, 'opencode.json'), scope: 'project' },
];

const servers = [];
const add = (name, entry, source, scope) => {
  const transport = entry?.type ?? (entry?.url ? 'http' : 'stdio');
  const how = entry?.url ?? [entry?.command, ...(entry?.args ?? [])].filter(Boolean).join(' ') ?? '';
  const existing = servers.find((s) => s.name === name);
  if (existing) { existing.sources.push(source); return; }
  servers.push({ name, transport, how: String(how).slice(0, 90), sources: [source], scope });
};

for (const { abs, scope } of JSON_SOURCES) {
  const json = readJson(abs);
  // opencode nests them under `mcp`, VS Code under `servers`. One reader, three keys.
  const map = json?.mcpServers ?? json?.servers ?? json?.mcp;
  if (!map || typeof map !== 'object') continue;
  for (const [name, entry] of Object.entries(map)) add(name, entry, short(abs), scope);
}

/**
 * Claude Code keeps user-scope servers at the top of `~/.claude.json` and
 * LOCAL-scope ones per project inside `projects[<cwd>]` — the second is the one
 * that gets forgotten, because nothing in the repository mentions it and a
 * teammate cloning the repo does not have it.
 */
const claude = readJson(path.join(home, '.claude.json'));
for (const [name, entry] of Object.entries(claude?.mcpServers ?? {})) {
  add(name, entry, '~/.claude.json', 'user');
}
const claudeProject = claude?.projects?.[root];
for (const [name, entry] of Object.entries(claudeProject?.mcpServers ?? {})) {
  add(name, entry, '~/.claude.json (this project only)', 'local');
}

/** Codex is TOML. One regex for the header line is enough to NAME them, and
 *  naming them is the whole job here — this script never launches anything. */
const codex = readText(path.join(home, '.codex', 'config.toml'));
for (const m of (codex ?? '').matchAll(/^\[mcp_servers\.([^\].]+)]/gm)) {
  add(m[1], {}, '~/.codex/config.toml', 'user');
}

/** Plugins can carry BOTH skills and MCP servers, so a plugin is a capability
 *  even when it appears in neither list above. */
const plugins = [];
const installed = readJson(path.join(home, '.claude', 'plugins', 'installed_plugins.json'));
for (const [name, entries] of Object.entries(installed?.plugins ?? {})) {
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
];

if (argv.includes('--json')) {
  console.log(JSON.stringify({ root, servers, plugins, approval, blind }, null, 2));
  process.exit(0);
}

const w = Math.max(...servers.map((s) => s.name.length), 4);
console.log(`\x1b[1mMCP servers configured\x1b[0m (${servers.length})`);
for (const s of servers) {
  console.log(`  ${s.name.padEnd(w)}  ${s.transport.padEnd(5)}  ${s.how}  \x1b[2m[${s.sources.join(', ')}]\x1b[0m`);
}
if (!servers.length) console.log('  none in any config file this script reads.');

if (plugins.length) {
  console.log(`\n\x1b[1mPlugins\x1b[0m (${plugins.length}) — these can carry skills AND servers`);
  for (const p of plugins) console.log(`  ${p.name}  \x1b[2m${p.version} · ${p.scope}\x1b[0m`);
}
if (approval && (approval.enabled.length || approval.disabled.length)) {
  console.log(`\nApproval for .mcp.json: enabled=${JSON.stringify(approval.enabled)} disabled=${JSON.stringify(approval.disabled)}`);
}

console.log('\n\x1b[1mWhat this cannot see\x1b[0m — check these in the session, not here:');
for (const b of blind) console.log(`  · ${b}`);
console.log('\nBefore building a capability, walk the ladder in references/tooling.md:');
console.log('  already reachable → the app\'s own CLI → a public MCP server → write one (new-mcp.mjs).');
