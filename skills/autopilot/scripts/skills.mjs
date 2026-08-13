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
 *   node skills.mjs --install any       # install the always-useful set
 *   node skills.mjs --install db,docs --global
 */
import { execFileSync } from 'node:child_process';

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
      ['skill-cleaner', 'skills', 'Audit the context budget your installed skills cost.'],
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

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : (argv[i + 1] ?? '');
};
const wants = (flag('--tags') ?? flag('--install') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const matches = (tags) => !wants.length || wants.some((w) => tags.split(' ').includes(w));

const selected = LIBRARY
  .map((src) => ({ ...src, skills: src.skills.filter(([, tags]) => matches(tags)) }))
  .filter((src) => src.skills.length);

if (argv.includes('--json')) {
  console.log(JSON.stringify(selected, null, 2));
  process.exit(0);
}

if (argv.includes('--install')) {
  if (!wants.length) {
    console.error('refusing to install everything — pass tags, e.g. --install any,react\n' +
      'run without --install to see the catalogue and its tags.');
    process.exit(2);
  }
  const scope = argv.includes('--global') ? ['-g'] : [];
  const failed = [];
  for (const src of selected) {
    const names = src.skills.map(([n]) => n).join(',');
    const args = ['--yes', 'skills@latest', 'add', src.repo, '-s', names, '-y', ...scope];
    console.log(`\n$ npx ${args.join(' ')}`);
    try {
      execFileSync('npx', args, { stdio: 'inherit' });
    } catch {
      failed.push(src.repo);
    }
  }
  console.log('\nThese are third-party skills and they run with full agent permissions.');
  console.log('Read what you installed before the loop starts using it.');
  if (failed.length) {
    console.log(`\nFAILED: ${failed.join(', ')} — install them by hand or drop them.`);
    process.exit(1);
  }
  process.exit(0);
}

const width = Math.max(...selected.flatMap((s) => s.skills.map(([n]) => n.length)), 0);
for (const src of selected) {
  console.log(`\n\x1b[1m${src.repo}\x1b[0m — ${src.what}`);
  for (const [name, tags, what] of src.skills) {
    console.log(`  ${name.padEnd(width)}  ${what}  \x1b[2m[${tags}]\x1b[0m`);
  }
  console.log(`  \x1b[2m$ npx skills add ${src.repo} -s ${src.skills.map(([n]) => n).join(',')} -y\x1b[0m`);
}
const allTags = [...new Set(LIBRARY.flatMap((s) => s.skills.flatMap(([, t]) => t.split(' '))))].sort();
console.log(`\ntags: ${allTags.join(' ')}`);
console.log('pick by project, not by appetite — every installed skill costs context on every turn.');
console.log('install: node skills.mjs --install any        (add the niches this project is actually in)');
