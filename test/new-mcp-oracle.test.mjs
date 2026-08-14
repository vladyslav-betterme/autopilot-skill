import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * A DIFFERENTIAL ORACLE for `new-mcp.mjs`: every line it PRINTS against what is
 * actually on disk and what actually runs.
 *
 * Three of this campaign's fatals were found by one move — running the printed
 * lines verbatim. `--dir /opt/ae` printed «created /opt/ae/server.mjs», the
 * file was somewhere else, and the `use now` line it printed threw MODULE_NOT
 * FOUND. An absolute `--dir` inside the project did the same thing twice more,
 * across two rounds, because the check and the write each computed the path
 * their own way. A config whose server map was an array printed «registered»
 * while `JSON.stringify` silently dropped the entry.
 *
 * So the property, stated once and checked mechanically over a matrix:
 *
 *   IF the run exits 0, every claim it printed is true —
 *     «created X»      → X exists and is a file
 *     «registered: C»  → C parses, holds the server under the key that FILE
 *                        uses, and its args point at a file that exists
 *     «use now: <cmd>» → that exact command runs and answers
 *   IF the run exits non-zero, it changed NOTHING —
 *     no scaffold, and the config byte-identical to what it was
 *
 * The second half matters as much as the first: «refuses» and «refuses without
 * leaving a half-built thing» are different claims, and the second one is what
 * two rounds of dead-ends were about.
 */

const SCRIPTS = path.resolve(import.meta.dirname, '..', 'skills', 'autopilot', 'scripts');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-oracle-'));
const DESC = 'drives the thing through its own cli, a description long enough to pass';

function runNewMcp(cwd, args) {
  const res = spawnSync('node', [path.join(SCRIPTS, 'new-mcp.mjs'), ...args],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { status: res.status, out: res.stdout ?? '', err: res.stderr ?? '' };
}

/** Every case: a project layout, the arguments, and nothing else. The oracle
 *  decides what is true afterwards — the case does not say what to expect. */
const CASES = [
  { name: 'a bare project', setup: () => {}, args: ['ae', '-d', DESC] },
  { name: 'a relative --dir', setup: () => {}, args: ['ae', '-d', DESC, '--dir', 'servers/ae'] },
  { name: 'an ABSOLUTE --dir inside the project', absDir: 'tools/ae-mcp', args: ['ae', '-d', DESC] },
  { name: '--dir with a trailing slash', setup: () => {}, args: ['ae', '-d', DESC, '--dir', 'tools/ae/'] },
  { name: '--dir . (the project root)', setup: () => {}, args: ['ae', '-d', DESC, '--dir', '.'] },
  { name: 'an existing config with other keys', args: ['ae', '-d', DESC],
    setup: (d) => fs.writeFileSync(path.join(d, '.mcp.json'), '{"$schema":"x","mcpServers":{"seed":{"command":"node"}},"extra":1}') },
  { name: 'a fresh .vscode config', args: ['ae', '-d', DESC, '--config', '.vscode/mcp.json'],
    setup: (d) => fs.mkdirSync(path.join(d, '.vscode')) },
  { name: 'an existing .vscode config using servers', args: ['ae', '-d', DESC, '--config', '.vscode/mcp.json'],
    setup: (d) => { fs.mkdirSync(path.join(d, '.vscode')); fs.writeFileSync(path.join(d, '.vscode', 'mcp.json'), '{"servers":{"seed":{"type":"http","url":"https://x"}},"inputs":[]}'); } },
  { name: 'a name that is a prototype key', args: ['constructor', '-d', DESC] },
  { name: 'a config that does not parse', args: ['ae', '-d', DESC],
    setup: (d) => fs.writeFileSync(path.join(d, '.mcp.json'), '{ // a comment\n "servers": {} }') },
  { name: 'a top-level array config', args: ['ae', '-d', DESC],
    setup: (d) => fs.writeFileSync(path.join(d, '.mcp.json'), '["legacy"]') },
  { name: 'a server map that is a string', args: ['ae', '-d', DESC],
    setup: (d) => fs.writeFileSync(path.join(d, '.mcp.json'), '{"mcpServers":"see ./servers.d"}') },
  { name: 'a --dir escaping the project', args: ['ae', '-d', DESC, '--dir', '../outside'] },
  { name: 'a name already registered', args: ['ae', '-d', DESC],
    setup: (d) => fs.writeFileSync(path.join(d, '.mcp.json'), '{"mcpServers":{"ae":{"command":"node"}}}') },
  { name: 'a lock held by a live process', args: ['ae', '-d', DESC],
    setup: (d) => { fs.mkdirSync(path.join(d, '.mcp-lock')); fs.writeFileSync(path.join(d, '.mcp-lock', 'pid'), String(process.pid)); } },
  { name: 'a config directory that does not exist', args: ['ae', '-d', DESC, '--config', 'nope/mcp.json'] },
];

test('every line it prints is true, or it printed nothing and changed nothing', () => {
  const broken = [];
  for (const c of CASES) {
    const d = tmp();
    c.setup?.(d);
    const args = c.absDir ? [...c.args, '--dir', path.join(d, c.absDir)] : c.args;
    const before = (() => { try { return fs.readFileSync(path.join(d, '.mcp.json'), 'utf8'); } catch { return null; } })();
    const r = runNewMcp(d, args);

    if (r.status !== 0) {
      // A refusal must leave NOTHING: two rounds of dead ends were a scaffold
      // that survived a refusal and then blocked its own retry.
      if (fs.existsSync(path.join(d, 'tools')) || fs.existsSync(path.join(d, 'servers'))) {
        broken.push(`${c.name}: refused (exit ${r.status}) but left a scaffold`);
      }
      const after = (() => { try { return fs.readFileSync(path.join(d, '.mcp.json'), 'utf8'); } catch { return null; } })();
      if (before !== after) broken.push(`${c.name}: refused but the config changed`);
      continue;
    }

    // «created X» — X must exist.
    const created = r.out.match(/created\s*:\s*(.+)/)?.[1]?.trim();
    if (!created) broken.push(`${c.name}: exit 0 and printed no «created» line`);
    else if (!fs.existsSync(path.resolve(d, created))) broken.push(`${c.name}: printed «created ${created}» and it is not there`);

    // WHERE THE USER ASKED. Every printed line can be true of each other and
    // still describe the wrong place: with the old `path.join`, an absolute
    // `--dir` inside the project produced a DOUBLED path, and «created», the
    // registered args and «use now» were all consistent with each other and
    // none of them was the directory the user named. The oracle missed that
    // until it was told to check the request, not only the self-consistency —
    // which is what «the corpus only grows» means: a finding becomes a row.
    const asked = args[args.indexOf('--dir') + 1];
    if (args.includes('--dir') && created) {
      const where = path.resolve(d, created);
      const wanted = path.resolve(d, asked);
      if (!where.startsWith(wanted + path.sep) && path.dirname(where) !== wanted) {
        broken.push(`${c.name}: --dir asked for ${wanted} and the file landed at ${where}`);
      }
    }

    // «registered: C» — C parses, the server is under the key that file uses,
    // and its args point at something that exists.
    const cfgRel = r.out.match(/registered\s*:\s*(\S+)/)?.[1];
    if (!cfgRel) broken.push(`${c.name}: exit 0 and printed no «registered» line`);
    else {
      let cfg = null;
      try { cfg = JSON.parse(fs.readFileSync(path.resolve(d, cfgRel), 'utf8')); } catch { broken.push(`${c.name}: «registered ${cfgRel}» does not parse`); }
      if (cfg) {
        const key = cfgRel.includes('.vscode') ? 'servers' : (cfg.servers ? 'servers' : 'mcpServers');
        const name = r.out.match(/server «([^»]+)»/)?.[1];
        const entry = cfg[key]?.[name];
        if (!entry) broken.push(`${c.name}: «registered» but ${cfgRel} has no ${key}.${name}`);
        else if (!fs.existsSync(path.resolve(d, entry.args?.[0] ?? ''))) {
          broken.push(`${c.name}: registered args «${entry.args?.[0]}» which does not exist`);
        }
      }
    }

    // «use now: <cmd>» — run it exactly as printed.
    const useNow = r.out.match(/use now\s*:\s*(.+)/)?.[1]?.trim();
    if (useNow) {
      const ran = spawnSync('/bin/sh', ['-c', useNow], { cwd: d, encoding: 'utf8' });
      if (ran.status !== 0) broken.push(`${c.name}: the printed «use now» line exits ${ran.status}: ${(ran.stderr ?? '').split('\n')[0]}`);
      else if (!/alive/.test(ran.stdout ?? '')) broken.push(`${c.name}: «use now» ran but answered ${JSON.stringify(ran.stdout)}`);
    }
  }
  assert.deepEqual(broken, [], `new-mcp printed something untrue:\n  ${broken.join('\n  ')}`);
});

/**
 * PROTOCOL CONFORMANCE for the server the scaffold writes.
 *
 * The skill's rung 4 is «when nothing drives the thing you need, write one» —
 * so what it writes has to be a correct MCP server, not one that passes a
 * handshake. A conformance pass driven by the official SDK client found three
 * fatals: the schema was advertised and never enforced (`arguments:{}` against
 * `required:["text"]` came back «alive: undefined» as a SUCCESS), `initialize`
 * echoed any string as the negotiated version including one newer than the
 * server itself, and a JSON-RPC batch was swallowed so the client hung forever.
 */
const speak = (dir, lines) => spawnSync('node', ['tools/probe-mcp/server.mjs'],
  { cwd: dir, encoding: 'utf8', input: lines.map((l) => JSON.stringify(l)).join('\n') + '\n' });

test('the generated server keeps the promise its schema makes', () => {
  const d = tmp();
  runNewMcp(d, ['probe', '-d', DESC]);
  const rpc = (msg) => JSON.parse(speak(d, [msg]).stdout.trim().split('\n')[0]);

  // The schema says `text` is a required string. Both violations are PROTOCOL
  // errors per the spec, not tool results.
  assert.equal(rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'ping', arguments: {} } }).error.code, -32602);
  assert.equal(rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'ping', arguments: { text: 123 } } }).error.code, -32602);
  // An unknown tool is a protocol error too — isError is for a tool that RAN.
  assert.equal(rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'nope' } }).error.code, -32602);
  // …and the happy path still answers.
  assert.match(rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'ping', arguments: { text: 'hi' } } }).result.content[0].text, /alive: hi/);
});

test('it never claims a protocol version it was not written for', () => {
  const d = tmp();
  runNewMcp(d, ['probe', '-d', DESC]);
  const ver = (asked) => JSON.parse(speak(d, [{ jsonrpc: '2.0', id: 0, method: 'initialize', params: asked === undefined ? {} : { protocolVersion: asked } }]).stdout.trim()).result.protocolVersion;
  assert.equal(ver('2025-06-18'), '2025-06-18', 'it should agree to a version it supports');
  for (const asked of ['2025-11-25', 'banana', 1999, undefined]) {
    assert.equal(ver(asked), '2025-06-18', `it echoed «${asked}» back as negotiated`);
  }
});

test('nothing a client can send leaves it silent or dead', () => {
  const d = tmp();
  runNewMcp(d, ['probe', '-d', DESC]);
  // A batch, a parse error and a null line: each used to be dropped without a
  // reply — and the null one killed the process after answering the messages
  // before it, so the client saw good replies and then a dead transport.
  const batch = spawnSync('node', ['tools/probe-mcp/server.mjs'], { cwd: d, encoding: 'utf8', input: '[{"jsonrpc":"2.0","id":1,"method":"tools/list"}]\n' });
  assert.equal(JSON.parse(batch.stdout.trim()).error.code, -32600);
  const bad = spawnSync('node', ['tools/probe-mcp/server.mjs'], { cwd: d, encoding: 'utf8', input: '{"jsonrpc":"2.0","id":42,"method":"tools/list",}\n' });
  assert.equal(JSON.parse(bad.stdout.trim()).error.code, -32700);
  const withNull = spawnSync('node', ['tools/probe-mcp/server.mjs'], { cwd: d, encoding: 'utf8',
    input: '{"jsonrpc":"2.0","id":1,"method":"ping"}\nnull\n{"jsonrpc":"2.0","id":2,"method":"ping"}\n' });
  assert.equal(withNull.status, 0, 'a null line killed the session');
  const ids = withNull.stdout.trim().split('\n').map((l) => JSON.parse(l).id);
  assert.deepEqual(ids, [1, null, 2], 'the messages after the bad line were lost');
  // A notification still gets nothing at all.
  const note = spawnSync('node', ['tools/probe-mcp/server.mjs'], { cwd: d, encoding: 'utf8', input: '{"jsonrpc":"2.0","method":"notifications/initialized"}\n' });
  assert.equal(note.stdout.trim(), '');
});
