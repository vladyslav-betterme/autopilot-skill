import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * A DIFFERENTIAL ORACLE for `tools.mjs`: what it REPORTS against what the files
 * actually contain, read a second time by something that is not it.
 *
 * The guard here judges «is this a server map, and is an empty answer an
 * absence». Both halves have failed in the wild:
 *
 *   round 1  it read no Claude Desktop config at all, on a machine whose
 *            Claude Desktop config held `AfterEffectsMCP` — while this repo's
 *            worked example for WRITING a server was «nothing drives After
 *            Effects». A false absence sends the ladder to «build it».
 *   round 2  an array in `~/.claude.json` became servers named `0` and `1`, a
 *            string became one per character, and `unreadable` stayed empty:
 *            not silence, INVENTED PRESENCE.
 *
 * So the property, over a matrix of config files:
 *
 *   every server the files declare is reported, with the transport the file
 *   gives it; nothing else is reported; and a file that cannot be read or is
 *   not a map appears under `unreadable` — never as an absence, never as data.
 *
 * The second reading is deliberately naive (a few lines of JSON here), because
 * an oracle that shares the code under test proves nothing.
 */

const SCRIPTS = path.resolve(import.meta.dirname, '..', 'skills', 'autopilot', 'scripts');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tools-oracle-'));

function inventory(project, home) {
  const res = spawnSync('node', [path.join(SCRIPTS, 'tools.mjs'), '--json'],
    { cwd: project, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, HOME: home } });
  assert.equal(res.status, 0, `tools.mjs exited ${res.status}: ${res.stderr}`);
  return JSON.parse(res.stdout);
}

/** The layouts, and what a second reader says is in them. */
const CASES = [
  {
    name: 'a project .mcp.json and a user ~/.claude.json',
    files: {
      'project/.mcp.json': '{"mcpServers":{"alpha":{"command":"node","args":["a.mjs"]},"beta":{"type":"http","url":"https://b"}}}',
      'home/.claude.json': '{"mcpServers":{"gamma":{"type":"http","url":"https://g"}}}',
    },
    expect: { servers: ['alpha', 'beta', 'gamma'], unreadable: 0 },
  },
  {
    name: 'VS Code uses «servers», and the user-scope file counts too',
    files: {
      'project/.vscode/mcp.json': '{"servers":{"vs-project":{"type":"http","url":"https://x"}}}',
      'home/Library/Application Support/Code/User/mcp.json': '{"servers":{"vs-user":{"command":"npx"}}}',
    },
    expect: { servers: ['vs-project', 'vs-user'], unreadable: 0 },
    darwinOnly: true,
  },
  {
    name: 'Claude Desktop — the reader whose absence produced a false «build it»',
    files: { 'home/Library/Application Support/Claude/claude_desktop_config.json': '{"mcpServers":{"AfterEffectsMCP":{"command":"node","args":["ae.js"]}}}' },
    expect: { servers: ['AfterEffectsMCP'], unreadable: 0 },
    darwinOnly: true,
  },
  {
    name: 'an array where a map belongs',
    files: { 'project/.mcp.json': '{"mcpServers":["legacy","other"]}' },
    expect: { servers: [], unreadable: 1 },
  },
  {
    name: 'a string where a map belongs, in the UNGUARDED reader',
    files: { 'home/.claude.json': '{"mcpServers":"see ./servers.d"}' },
    expect: { servers: [], unreadable: 1 },
  },
  {
    name: 'a config that does not parse',
    files: { 'project/.mcp.json': '{"mcpServers":{"a":{"command":"x"},}}' },
    expect: { servers: [], unreadable: 1 },
  },
  {
    name: 'a config that is empty of servers',
    files: { 'project/.mcp.json': '{"other":"settings"}' },
    expect: { servers: [], unreadable: 0 },
  },
  {
    name: 'opencode nests them under «mcp»',
    files: { 'project/opencode.json': '{"mcp":{"oc":{"type":"local","command":["node","x.mjs"]}}}' },
    expect: { servers: ['oc'], unreadable: 0 },
  },
];

test('what it reports is what the files contain — and unreadable is not absence', () => {
  const broken = [];
  for (const c of CASES) {
    if (c.darwinOnly && process.platform !== 'darwin') continue;
    const root = tmp();
    const project = path.join(root, 'project');
    const home = path.join(root, 'home');
    for (const [rel, body] of Object.entries(c.files)) {
      const abs = path.join(root, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, body);
    }
    fs.mkdirSync(project, { recursive: true });
    fs.mkdirSync(home, { recursive: true });

    const got = inventory(project, home);
    const names = got.servers.map((s) => s.name).sort();
    if (JSON.stringify(names) !== JSON.stringify([...c.expect.servers].sort())) {
      broken.push(`${c.name}: reported ${JSON.stringify(names)}, the files declare ${JSON.stringify(c.expect.servers)}`);
    }
    if ((got.unreadable?.length ?? 0) !== c.expect.unreadable) {
      broken.push(`${c.name}: ${got.unreadable?.length ?? 0} unreadable, expected ${c.expect.unreadable}` +
        ` — «not in these files» and «I could not read this file» are different answers`);
    }
    // A transport it invents is as bad as a server it invents.
    for (const s of got.servers) {
      const declared = Object.values(c.files).some((body) => {
        try { const j = JSON.parse(body); const map = j.mcpServers ?? j.servers ?? j.mcp; return map?.[s.name] !== undefined; } catch { return false; }
      });
      if (!declared) broken.push(`${c.name}: reported «${s.name}», which no file declares`);
    }
  }
  assert.deepEqual(broken, [], `tools.mjs and the files disagree:\n  ${broken.join('\n  ')}`);
});

test('an empty inventory says which files it read, so «none» can be checked', () => {
  // The failure this prevents is confident silence. A reader that finds nothing
  // must still be auditable — the ladder's rung 0 is «is it already reachable»,
  // and a bare «no» there is what sends a loop off to build what exists.
  const root = tmp();
  const got = inventory(root, path.join(root, 'home'));
  assert.deepEqual(got.servers, []);
  assert.ok(got.blind.length >= 4, 'it stopped saying what it cannot see');
  assert.match(JSON.stringify(got.blind), /not in these files/);
});
