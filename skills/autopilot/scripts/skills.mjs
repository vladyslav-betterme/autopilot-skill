#!/usr/bin/env node
/**
 * The skill library — what to install, chosen per project, never wholesale.
 *
 * An autonomous loop is only as good as what it knows how to do, and most of
 * that already exists as public skills. This file is the shortlist across every
 * niche, with the ONE thing a catalogue must have to be useful: tags, so the
 * agent installs what this project needs instead of everything.
 *
 * Why not install it all: every installed skill's description is loaded into the
 * agent's context on every turn. A hundred skills is not a hundred capabilities,
 * it is a smaller window and a model that skims. Install per project, per niche.
 *
 * Read-only unless you pass --install. Zero dependencies; --install shells out
 * to `npx skills` (github.com/vercel-labs/skills).
 *
 *   node skills.mjs                     # the catalogue
 *   node skills.mjs --tags react,perf   # only what matches
 *   node skills.mjs --json              # machine-readable
 *   node skills.mjs --install any --dry-run   # the exact commands, run nothing
 *   node skills.mjs --install any       # install the always-useful set
 *   node skills.mjs --install db,docs --global
 *   node skills.mjs --for "migrate the billing schema to postgres"
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { execFileSync } from 'node:child_process';
import { AGENT_SKILL_DIRS, SHARED_SKILL_HOME } from './lib.mjs';

/**
 * `any` = useful on every project regardless of stack or subject.
 * Everything else is a niche you opt into.
 */
const LIBRARY = [
  {
    repo: 'obra/superpowers',
    what: 'Process methodology: how to plan, debug, test and review — not what to build.',
    skills: [
      ['brainstorming', 'any plan', 'Pull the real requirement out before designing anything.'],
      ['writing-plans', 'any plan', 'Turn a spec into a plan someone else could execute.'],
      ['executing-plans', 'any plan', 'Run a written plan with review checkpoints.'],
      ['systematic-debugging', 'any debug', 'Reproduce → minimise → hypothesise, before proposing a fix.'],
      ['test-driven-development', 'code test', 'Watch it fail first — the rule this loop refuses to skip.'],
      ['verification-before-completion', 'any test', 'Evidence before the claim of done.'],
      ['requesting-code-review', 'any review', 'How to ask so you get findings, not prose.'],
      ['receiving-code-review', 'any review', 'Verify the feedback instead of performing agreement.'],
      ['subagent-driven-development', 'any agents', 'Independent tasks, one subagent each.'],
      ['dispatching-parallel-agents', 'any agents', 'Fan out without shared state.'],
      ['using-git-worktrees', 'git', 'Isolate work that must not touch the current tree.'],
      ['writing-skills', 'skills', 'How to write one that actually fires.'],
    ],
  },
  {
    repo: 'anthropics/skills',
    what: 'Official Anthropic skills: real file formats, artifacts, MCP, skill authoring.',
    skills: [
      ['skill-creator', 'skills', 'Scaffold and structure a new skill.'],
      ['docx', 'docs office', 'Read and write Word documents for real, not as markdown.'],
      ['xlsx', 'docs office data', 'Spreadsheets: read, edit, formulas intact.'],
      ['pptx', 'docs office', 'Slide decks.'],
      ['pdf', 'docs office', 'Extract from and produce PDFs.'],
      ['doc-coauthoring', 'docs writing', 'Draft long documents with a human in the loop.'],
      ['webapp-testing', 'web test', 'Drive a local web app and see what it actually does.'],
      ['mcp-builder', 'api agents', 'Build an MCP server the right shape.'],
      ['claude-api', 'api', 'Model ids, pricing, tool use, caching — instead of guessing.'],
      ['frontend-design', 'web design', 'Visual direction that is not a template default.'],
      ['canvas-design', 'design', 'Layout and composition work.'],
      ['web-artifacts-builder', 'web', 'Self-contained interactive pages.'],
      ['brand-guidelines', 'design product', 'Apply a brand system consistently.'],
      ['algorithmic-art', 'design', 'Generative visuals.'],
      ['internal-comms', 'writing product', 'Announcements and updates that land.'],
    ],
  },
  {
    repo: 'mattpocock/skills',
    what: 'Engineering practice: reviewing, modelling, specifying, triaging.',
    skills: [
      ['code-review', 'code review', 'Review with a defect bar instead of an opinion.'],
      ['diagnosing-bugs', 'debug', 'Narrow a bug to its cause.'],
      ['domain-modeling', 'code design', 'Model the domain before the tables.'],
      ['tdd', 'code test', 'The short version of the discipline.'],
      ['to-spec', 'plan product', 'Turn a vague ask into a spec.'],
      ['to-tickets', 'plan product', 'Split a spec into workable tickets.'],
      ['triage', 'plan', 'Order a backlog by what actually matters.'],
      ['research', 'research', 'Investigate before committing to an approach.'],
      ['improve-codebase-architecture', 'code design', 'Structural improvement with a stopping condition.'],
      ['grill-me', 'any plan', 'Interview the plan for the holes you cannot see.'],
      ['handoff', 'any', 'Write the handoff the next session needs.'],
      ['writing-for-agents', 'skills writing', 'Prose an agent will actually follow.'],
    ],
  },
  {
    repo: 'addyosmani/web-quality-skills',
    what: 'Web quality with measurable targets (Lighthouse, Core Web Vitals).',
    skills: [
      ['accessibility', 'web a11y', 'WCAG audit and fixes.'],
      ['core-web-vitals', 'web perf', 'LCP/INP/CLS with numbers, not vibes.'],
      ['performance', 'web perf', 'Load and runtime performance work.'],
      ['seo', 'web seo', 'Crawlability and metadata.'],
      ['best-practices', 'web', 'The general web-quality bar.'],
      ['web-quality-audit', 'web review', 'One pass over all of the above.'],
    ],
  },
  {
    repo: 'vercel-labs/openreview',
    what: 'React, Next.js and React Native practice, maintained by Vercel.',
    skills: [
      ['next-best-practices', 'react next', 'App Router conventions, RSC boundaries, data patterns.'],
      ['next-cache-components', 'react next perf', 'Caching that is actually correct.'],
      ['next-upgrade', 'react next', 'Version migrations without a rewrite.'],
      ['vercel-react-best-practices', 'react perf', 'Performance patterns for React.'],
      ['vercel-composition-patterns', 'react design', 'Composition instead of boolean-prop sprawl.'],
      ['vercel-react-native-skills', 'react mobile', 'React Native specifics.'],
      ['web-design-guidelines', 'web design', 'Design bar for shipped UI.'],
    ],
  },
  {
    repo: 'supabase/agent-skills',
    what: 'Postgres and Supabase, including the security rules agents get wrong.',
    skills: [
      ['supabase', 'db backend', 'Auth, RLS, storage, edge functions, CLI.'],
      ['supabase-postgres-best-practices', 'db sql', 'Schema, migrations, indexes, RLS — for Postgres anywhere.'],
    ],
  },
  {
    repo: 'steipete/agent-scripts',
    what: 'A large grab-bag — install single skills from it, never the whole set.',
    skills: [
      ['skill-cleaner', 'any skills', 'Audit what the installed set costs in context, and what nothing uses.'],
      ['github-deep-review', 'review git', 'Deep PR review.'],
      ['github-project-triage', 'plan git', 'Triage an issue backlog.'],
      ['browser-use', 'web browser', 'Drive a real browser.'],
      ['markdown-converter', 'docs', 'Convert documents into markdown.'],
      ['instruments-profiling', 'mac perf', 'Profile a native app.'],
      ['swift-concurrency-expert', 'mac swift', 'Swift concurrency.'],
      ['swiftui-performance-audit', 'mac swift perf', 'SwiftUI performance.'],
      ['release-mac-app', 'mac release', 'Ship and notarise a macOS app.'],
      ['ssh-doctor', 'infra', 'Diagnose an SSH/remote setup.'],
      ['wrangler', 'infra', 'Cloudflare Workers.'],
      ['npm', 'code release', 'Publishing to npm without the usual mistakes.'],
    ],
  },
  {
    repo: 'vercel-labs/skills',
    what: 'The installer itself, plus discovery.',
    skills: [
      ['find-skills', 'any skills', 'Search for a skill that already does what you need.'],
    ],
  },
];

/**
 * ECC — 285 community skills, one repository, one skill installable at a time.
 *
 * The catalogue above is a shortlist somebody vetted. ECC is the opposite trade:
 * far more coverage (django, kotlin, homelab VLANs, healthcare compliance,
 * trading-agent security) at community quality, and its own plugin installs ALL
 * 285 at once — which is «choose, do not hoard» inverted into 285 descriptions
 * on every turn. So this file never installs the plugin; it selects BY NAME and
 * prints a per-skill install line.
 *
 * The index is the directory listing, not the recursive tree: 285 entries
 * instead of 4744, one request, cached for a week. Descriptions are fetched only
 * for the shortlist, and written back into the cache, so the second run scores
 * on them too.
 */
const ECC_REPO = 'affaan-m/ECC';
const ECC_INDEX_URL = `https://api.github.com/repos/${ECC_REPO}/contents/skills`;
const eccRaw = (name) => `https://raw.githubusercontent.com/${ECC_REPO}/main/skills/${name}/SKILL.md`;
const eccPage = (name) => `https://github.com/${ECC_REPO}/blob/main/skills/${name}/SKILL.md`;
const CACHE_FILE = path.join(os.homedir() || os.tmpdir(), '.cache', 'autopilot', 'ecc-index.json');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SHORTLIST = 8;

const argv = process.argv.slice(2);
const has = (name) => argv.includes(name);
/** A flag's value is the next argv entry ONLY if it is not itself a flag —
 *  `--install --global any` used to take «--global» as the tag list, match
 *  nothing, install nothing, and exit 0 with a satisfied-looking epilogue. */
const flag = (name) => {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  const v = argv[i + 1];
  return v && !v.startsWith('-') ? v : '';
};
const tagList = (v) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const installTags = tagList(flag('--install'));
const filterTags = tagList(flag('--tags'));
const task = flag('--for');
const eccIndexArg = flag('--ecc-index');
if (has('--install') && has('--tags')) {
  console.error('pass the tags to --install itself: --install any,react  (--tags only filters the catalogue)');
  process.exit(2);
}
const wants = has('--install') ? installTags : filterTags;
const matches = (tags) => !wants.length || wants.some((w) => tags.split(' ').includes(w));

const selected = LIBRARY
  .map((src) => ({ ...src, skills: src.skills.filter(([, tags]) => matches(tags)) }))
  .filter((src) => src.skills.length);

// ── selecting for ONE task ───────────────────────────────────────────────────

/** Words worth matching on. Two characters is noise, and the connective tissue
 *  of a sentence matches everything — in either language the human might use. */
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'need', 'want', 'have', 'when',
  'what', 'then', 'than', 'they', 'them', 'your', 'our', 'all', 'any', 'use', 'add', 'fix',
  'get', 'run', 'are', 'was', 'not', 'but', 'can', 'how', 'why', 'who', 'its', 'make', 'new',
  'без', 'для', 'або', 'що', 'як', 'при', 'над', 'під', 'зроби', 'треба',
]);
const words = (s) => [...new Set(String(s ?? '').toLowerCase().match(/[\p{L}\p{N}+#]{3,}/gu) ?? [])]
  .filter((w) => !STOP_WORDS.has(w));
/** `test` matches `testing`, `react` matches `react-patterns` — but `db` never
 *  matches `dbt`, because a 2-character prefix matches most of the catalogue. */
const related = (a, b) => a === b || (a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b));
/** The NAME is the strong signal and the description is the weak one: an ECC
 *  skill called `django-tdd` is about django whatever its prose says, while a
 *  skill that merely mentions django in passing is not. */
const rank = (want, name, text) => {
  const inName = words(name.replace(/[-_/]/g, ' '));
  const inText = words(text);
  let points = 0;
  let covered = 0;
  for (const w of want) {
    if (inName.some((t) => related(w, t))) { points += 3; covered += 1; }
    else if (inText.some((t) => related(w, t))) { points += 1; covered += 1; }
  }
  return { points, covered };
};

/**
 * `name` and `description` out of a SKILL.md, block scalars included.
 *
 * Hand-rolled because the frontmatter of an installed skill is three keys and a
 * YAML dependency is a dependency; `description: >-` folded over four lines is
 * the shape every skill in this catalogue actually uses, so it is the shape this
 * has to read. Anything it cannot parse comes back undefined and the skill is
 * still LISTED — a description that failed to parse must not delete the skill
 * from the inventory, which is the false-absence defect one file over.
 */
function frontMatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw ?? '');
  if (!m) return {};
  const lines = m[1].split(/\r?\n/);
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z][\w-]*):[ \t]*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    const [, key, inline] = kv;
    let value = inline;
    if (value === '' || /^[>|][-+]?$/.test(value.trim())) {
      const body = [];
      while (i + 1 < lines.length && /^[ \t]+\S/.test(lines[i + 1])) body.push(lines[++i].trim());
      value = body.join(' ');
    }
    out[key] = value.replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

const home = os.homedir() || '';
const readText = (abs) => { try { return fs.readFileSync(abs, 'utf8'); } catch { return null; } };
const shortPath = (abs) => (home && abs.startsWith(home) ? abs.replace(home, '~') : path.relative(process.cwd(), abs) || '.');

/** Plugin skills are installed skills. They live four levels down —
 *  `<market>/<plugin>/<version>/skills` — and leaving them out reported «you
 *  have nothing for this» to a machine holding superpowers and claude-mem. */
function pluginSkillHomes() {
  const cache = path.join(home, '.claude', 'plugins', 'cache');
  const out = [];
  const kids = (dir) => { try { return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()); } catch { return []; } };
  for (const market of kids(cache)) {
    for (const plugin of kids(path.join(cache, market.name))) {
      for (const version of kids(path.join(cache, market.name, plugin.name))) {
        const dir = path.join(cache, market.name, plugin.name, version.name, 'skills');
        if (fs.existsSync(dir)) out.push({ dir, scope: `plugin:${plugin.name}` });
      }
    }
  }
  return out;
}

/**
 * Every skill this machine has already loaded, wherever it lives.
 *
 * This lane exists because the expensive mistake is not «missed a good skill» —
 * it is installing a fourth skill for a job three installed ones already do,
 * and paying for all four on every turn from then on.
 */
function installedSkills() {
  const root = process.cwd();
  const homes = [
    { dir: path.join(root, SHARED_SKILL_HOME), scope: 'project' },
    ...AGENT_SKILL_DIRS.map((d) => ({ dir: path.join(root, d), scope: 'project' })),
    ...(home ? [
      { dir: path.join(home, SHARED_SKILL_HOME), scope: 'user' },
      ...AGENT_SKILL_DIRS.map((d) => ({ dir: path.join(home, d), scope: 'user' })),
      ...pluginSkillHomes(),
    ] : []),
  ];
  const byReal = new Map();
  for (const { dir, scope } of homes) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      const file = path.join(abs, 'SKILL.md');
      if (!fs.existsSync(file)) continue;
      // `.claude/skills/x` is usually a symlink to `.agents/skills/x`; counting
      // both would report one skill as two and inflate every «already have it».
      let real; try { real = fs.realpathSync(file); } catch { real = file; }
      const seen = byReal.get(real);
      if (seen) { if (!seen.where.includes(shortPath(abs))) seen.where.push(shortPath(abs)); continue; }
      const front = frontMatter(readText(file));
      byReal.set(real, { name: front.name || e.name, description: front.description ?? '', scope, where: [shortPath(abs)] });
    }
  }
  /**
   * One row per NAME, not per copy on disk.
   *
   * Two plugin versions and a `~/.codex/skills` copy of one skill are three
   * files and one capability, and printed as three rows they ate three of the
   * eight shortlist slots — the shortlist is the scarce thing here, and a
   * duplicate is not a second answer to the task.
   */
  const byName = new Map();
  for (const s of byReal.values()) {
    const seen = byName.get(s.name);
    if (seen) { seen.where.push(...s.where); continue; }
    byName.set(s.name, s);
  }
  return [...byName.values()];
}

// ── the ECC index ────────────────────────────────────────────────────────────

function readCache() {
  try {
    const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    return Array.isArray(cached?.skills) && cached.skills.length ? cached : null;
  } catch { return null; }
}
/**
 * `at` is the time the INDEX was fetched, not the time this file was written.
 *
 * Learning one more description must not reset the week: `--for` run daily would
 * then refresh descriptions, stamp a new `at` every time, and never refetch the
 * listing — so an ECC skill added after the first run could never appear, and
 * the cache would look fresh forever. Only `{name, description}` is stored: the
 * scores belong to the task that was asked, not to the index.
 */
function writeCache(skills, at = Date.now()) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    const lean = skills.map((s) => (s.description ? { name: s.name, description: s.description } : { name: s.name }));
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ at, skills: lean }, null, 1));
  } catch { /* a cache that cannot be written costs a request, not a run */ }
}

/**
 * The 285 names, from the network or from the week-old copy of it.
 *
 * Every failure here returns `unavailable` with the reason attached, and the
 * caller PRINTS that instead of an empty list. «No ECC skill matches your task»
 * and «I could not reach GitHub» are different answers, and a selector that
 * cannot tell them apart quietly turns an outage into a decision.
 */
async function eccIndex({ source, refresh }) {
  if (source && !/^https?:/i.test(source)) {
    try {
      const list = JSON.parse(fs.readFileSync(source, 'utf8'));
      const skills = (Array.isArray(list) ? list : list.skills ?? []).map((e) => (typeof e === 'string' ? { name: e } : e));
      if (!skills.length) return { unavailable: `${source} lists no skills` };
      return { skills, from: source, offline: true };
    } catch (err) { return { unavailable: `${source}: ${err.code ?? err.message}` }; }
  }
  const url = source || ECC_INDEX_URL;
  const cached = readCache();
  if (cached && !refresh && Date.now() - Number(cached.at) < CACHE_TTL_MS) {
    return { skills: cached.skills, at: Number(cached.at), from: `cached ${new Date(Number(cached.at)).toISOString().slice(0, 10)}` };
  }
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'autopilot-skills' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const listing = await res.json();
    const fresh = (Array.isArray(listing) ? listing : []).filter((e) => e?.type === 'dir' && e.name).map((e) => ({ name: e.name }));
    if (!fresh.length) throw new Error('the listing held no skill directories');
    // Descriptions already learned survive the refresh; they cost a request each.
    const known = new Map((cached?.skills ?? []).map((s) => [s.name, s.description]));
    for (const s of fresh) if (known.get(s.name)) s.description = known.get(s.name);
    const at = Date.now();
    writeCache(fresh, at);
    return { skills: fresh, at, from: url };
  } catch (err) {
    if (cached) return { skills: cached.skills, at: Number(cached.at), from: `STALE cache — ${err.message}` };
    return { unavailable: err.message };
  }
}

/** Descriptions for the shortlist only — 8 requests, not 285. Best effort: a
 *  skill whose SKILL.md could not be fetched is still shown, marked. */
async function describeEcc(items, allowNetwork) {
  if (!allowNetwork) return;
  await Promise.all(items.filter((i) => !i.description).map(async (i) => {
    try {
      const res = await fetch(eccRaw(i.name), { signal: AbortSignal.timeout(10000) });
      if (res.ok) i.description = frontMatter(await res.text()).description ?? '';
    } catch { /* the name and the URL are still worth printing */ }
  }));
}

/**
 * Only what is in the same league as the best hit — and an honest label when
 * nothing is.
 *
 * Points alone did not work. `security` in a skill's NAME scores 3 whether the
 * task is Postgres RLS or not, so a Supabase task's install line came back
 * recommending `defi-amm-security` and `perl-security`: one word of eight,
 * matched loudly. COVERAGE is the signal points cannot carry — how many of the
 * task's distinct words a skill answers at all — and `postgres-patterns`
 * covered three where every one of those covered one.
 *
 * When nothing clears both floors, everything is returned marked `weak`. The
 * caller prints weak leads without an install line: a lead is worth reading,
 * and installing on one is how a machine collects skills nobody asked for.
 */
const strongest = (hits) => {
  if (!hits.length) return { rows: [], weak: false };
  const pointFloor = Math.max(2, Math.ceil(Math.max(...hits.map((h) => h.points)) / 2));
  const coverFloor = Math.ceil(Math.max(...hits.map((h) => h.covered)) / 2);
  const rows = hits.filter((h) => h.points >= pointFloor && h.covered >= coverFloor);
  return rows.length ? { rows, weak: false } : { rows: hits, weak: true };
};

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

async function selectFor(text) {
  const want = words(text);
  if (!want.length) {
    console.error(`nothing to match on in «${text}» — describe the task in words, not just punctuation.`);
    process.exitCode = 2;
    return;
  }
  console.log(`${bold('task')}: ${text}`);
  console.log(dim(`matching on: ${want.join(' ')}`));

  // 1. What is already here. Nothing to install, nothing to pay for.
  const installed = installedSkills();
  const have = strongest(installed
    .map((s) => ({ ...s, ...rank(want, s.name, s.description) }))
    .filter((s) => s.points > 0).sort((a, b) => b.points - a.points));
  const haveHits = have.rows.slice(0, SHORTLIST);
  console.log(`\n${bold('ALREADY INSTALLED')} — ${installed.length} skills on this machine, ` +
    `${haveHits.length} ${have.weak ? 'WEAK lead(s), nothing strong' : 'match'}`);
  for (const s of haveHits) {
    const copies = s.where.length > 1 ? dim(` (+${s.where.length - 1} more copies)`) : '';
    console.log(`  ${s.name}  ${dim(s.where[0])}${copies}\n      ${clip(s.description || '(no description)', 150)}`);
  }
  if (!haveHits.length && installed.length) console.log(dim('  none of them — the two lanes below are where to look next.'));
  if (!installed.length) console.log(dim('  no skill directory found here or in $HOME. Empty means «none in the places I read».'));

  // 2. The vetted catalogue, addressed the way it is installed: by tag.
  const catalog = strongest(LIBRARY.flatMap((src) => src.skills.map(([name, tags, what]) => ({
    name, tags, what, repo: src.repo, ...rank(want, `${name} ${tags}`, what),
  }))).filter((s) => s.points > 0).sort((a, b) => b.points - a.points));
  const catalogHits = catalog.rows.slice(0, SHORTLIST);
  console.log(`\n${bold('CATALOGUE')} — vetted, tagged, installed by tag${catalog.weak ? dim(' — WEAK leads only') : ''}`);
  for (const s of catalogHits) console.log(`  ${s.name}  ${dim(`[${s.tags}]`)}  ${s.what}`);
  // The tags of the rows that matched — a tag is the unit `--install` takes, and
  // a tag derived from the TASK's words instead («postgres») matches no tag at
  // all and silently fell back to `any`.
  const tags = [...new Set(catalogHits.slice(0, 3).flatMap((s) => s.tags.split(' ')))].slice(0, 3);
  if (catalogHits.length && catalog.weak) {
    console.log(dim('  weak leads — do not install on one. Say more of the task\'s own nouns, or use find-skills.'));
  } else if (catalogHits.length) {
    console.log(dim(`  $ node ${self()} --install ${tags.join(',')} --dry-run`));
    console.log(dim(`  that installs EVERY skill carrying those tags — see them first: --tags ${tags.join(',')}`));
  } else {
    console.log(dim('  nothing matched — `--install any` is still the right floor for a bare project.'));
  }

  // 3. ECC: coverage the catalogue does not have, at community quality.
  const index = await eccIndex({ source: eccIndexArg, refresh: has('--refresh') });
  console.log(`\n${bold('ECC')} ${dim(`(${ECC_REPO})`)} — one skill at a time, never the 285-skill plugin`);
  if (index.unavailable) {
    console.log(`  ${dim(`index unavailable: ${index.unavailable}`)}`);
    console.log(dim('  that is NOT «no ECC skill matches» — retry, or pass --ecc-index <file> with a copy.'));
  } else {
    const ranked = index.skills.map((s) => ({ ...s, ...rank(want, s.name, s.description ?? '') }))
      .filter((s) => s.points > 0).sort((a, b) => b.points - a.points);
    // Rank by name, fetch descriptions for the head, then rank again: the
    // description is what separates two plausible names, and it is also what
    // makes the NEXT run of this command cheaper.
    const head = ranked.slice(0, SHORTLIST * 2);
    await describeEcc(head, !index.offline);
    if (!index.offline && head.some((s) => s.description)) {
      writeCache(index.skills.map((s) => head.find((h) => h.name === s.name) ?? s), index.at);
    }
    const ecc = strongest(head.map((s) => ({ ...s, ...rank(want, s.name, s.description ?? '') }))
      .sort((a, b) => b.points - a.points));
    const shortlist = ecc.rows.slice(0, SHORTLIST);
    console.log(dim(`  index: ${index.skills.length} skills, ${index.from}; ${ranked.length} touch the task, ` +
      `${shortlist.length} ${ecc.weak ? 'WEAK lead(s), nothing strong' : 'shortlisted'}`));
    for (const s of shortlist) {
      console.log(`  ${s.name}\n      ${clip(s.description || '(description not fetched — read the SKILL.md)', 150)}\n      ${dim(eccPage(s.name))}`);
    }
    if (shortlist.length && ecc.weak) {
      console.log(dim('\n  no install line for weak leads: read the pages above, or say more of the task\'s own nouns.'));
    } else if (shortlist.length) {
      console.log(`\n  $ npx skills add ${ECC_REPO} ${shortlist.slice(0, 3).map((s) => `-s ${s.name}`).join(' ')} -y`);
      console.log(dim('  community skills, full agent permissions, and the installer prints a risk rating.'));
      console.log(dim('  READ the SKILL.md of each one before you run that line, and install the two you will use.'));
    }
  }

  console.log(`\n${bold('The rule that outranks every list above')}: install what this task needs and`);
  console.log('nothing else. Every installed description is paid on every turn, forever after.');
  process.exitCode = 0;
}

const self = () => {
  const rel = path.relative(process.cwd(), url.fileURLToPath(import.meta.url));
  return rel && !rel.startsWith('../..') ? rel : url.fileURLToPath(import.meta.url);
};

/**
 * Everything below runs inside `main()` for one reason: `process.exit` after
 * writing to stdout DROPS whatever has not drained. On a pipe that is a silent
 * truncation at the buffer size, with status 0 — the same defect that was
 * called fatal in the generated MCP server and then found again in
 * `tools.mjs --json`. Found here by grepping for the SHAPE instead of waiting
 * for a third reviewer to hit it. `return` + `process.exitCode` lets Node exit
 * on its own, after the writes.
 */
main().catch((err) => {
  // An async main that rejects used to print a bare unhandled-rejection warning
  // and — in Node's own words — exit non-zero with no explanation of which lane
  // failed. The selector reaches the network; say what broke.
  console.error(`skills.mjs failed: ${err?.stack ?? err}`);
  process.exitCode = 1;
});
async function main() {
if (has('--for')) {
  if (!task) {
    console.error('--for needs the task, in words: --for "migrate the billing schema to postgres"');
    process.exitCode = 2;
    return;
  }
  // Selecting and installing are two acts, and the second one is announced.
  if (has('--install') || has('--json')) {
    console.error('--for selects and prints the install lines; it installs nothing and emits no JSON.\n' +
      'Run it alone, then run the line it prints.');
    process.exitCode = 2;
    return;
  }
  if (has('--ecc-index') && !eccIndexArg) {
    console.error('--ecc-index needs a path or a URL. Without one this would silently go to the network.');
    process.exitCode = 2;
    return;
  }
  await selectFor(task);
  return;
}

if (has('--json')) {
  // …but NOT together with --install. This branch used to run first, so
  // `--install nosuchtag --json` printed `[]` and exited 0 where the same
  // command without --json refuses with exit 2 — and `--install any --json`
  // installed nothing, silently, successfully. Every guarantee in the install
  // block below was skipped by the flag an agent driving this would reach for.
  if (has('--install')) {
    console.error('--json and --install do not combine: --json prints the catalogue and installs nothing.\n' +
      'Run --install on its own, or use --install … --dry-run to see the exact commands.');
    process.exitCode = 2;
    return;
  }
  console.log(JSON.stringify(selected, null, 2));
  process.exitCode = 0;
  return;
}

if (has('--install')) {
  if (!wants.length) {
    console.error('refusing to install everything — pass tags, e.g. --install any,react\n' +
      'run without --install to see the catalogue and its tags.');
    process.exitCode = 2;
    return;
  }
  // An unknown tag used to select nothing and exit 0, which reads exactly like
  // «installed». Refuse the empty SELECTION, not just the empty argument.
  if (!selected.length) {
    console.error(`no skill carries ${wants.join(' or ')} — run without --install to see the tags.`);
    process.exitCode = 2;
    return;
  }
  const scope = has('--global') ? ['-g'] : [];
  const dry = has('--dry-run');
  const failed = [];
  for (const src of selected) {
    // ONE `-s` PER SKILL. The CLI parses -s as space-separated variadic and
    // matches names by exact equality, so a comma-joined list matched nothing:
    // `add obra/superpowers -s a,b -y` exits 1 having installed zero skills.
    // Verified by running both forms.
    const args = ['--yes', 'skills@latest', 'add', src.repo,
      ...src.skills.flatMap(([n]) => ['-s', n]), '-y', ...scope];
    console.log(`\n$ npx ${args.join(' ')}`);
    if (dry) continue;
    try {
      execFileSync('npx', args, { stdio: 'inherit' });
    } catch {
      failed.push(src.repo);
    }
  }
  if (dry) {
    console.log('\n--dry-run: nothing was installed.');
    process.exitCode = 0;
    return;
  }
  console.log('\nThese are third-party skills and they run with full agent permissions.');
  console.log('Read what you installed before the loop starts using it.');
  if (failed.length) {
    console.log(`\nFAILED: ${failed.join(', ')} — install them by hand or drop them.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = 0;
  return;
}

const width = Math.max(...selected.flatMap((s) => s.skills.map(([n]) => n.length)), 0);
for (const src of selected) {
  console.log(`\n\x1b[1m${src.repo}\x1b[0m — ${src.what}`);
  for (const [name, tags, what] of src.skills) {
    console.log(`  ${name.padEnd(width)}  ${what}  \x1b[2m[${tags}]\x1b[0m`);
  }
  console.log(`  \x1b[2m$ npx skills add ${src.repo} ${src.skills.map(([n]) => `-s ${n}`).join(' ')} -y\x1b[0m`);
}
const allTags = [...new Set(LIBRARY.flatMap((s) => s.skills.flatMap(([, t]) => t.split(' '))))].sort();
console.log(`\ntags: ${allTags.join(' ')}`);
console.log('pick by project, not by appetite — every installed skill costs context on every turn.');
console.log('thin outside code and web: for a niche with one entry or none, `find-skills` is the real entry point.');
console.log(`install: node ${self()} --install any --dry-run`);
console.log('         (then drop --dry-run to actually install)');
// A RUNNABLE example, not `--for "<your task>"`: the next reader of this line is
// a model, and a placeholder is a line it cannot execute (the defect
// test/printed-instructions-oracle.test.mjs exists for).
console.log(`per task: node ${self()} --for "migrate the billing schema to postgres"`);
console.log(`         — this catalogue, what is already installed, and ${ECC_REPO}'s 285,`);
console.log('           ranked against that one task. Installs nothing; prints the lines.');
}
