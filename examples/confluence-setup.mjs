#!/usr/bin/env node
/**
 * Example: Set up Confluence documentation for a new project
 *
 * Usage:
 *   ATLASSIAN_DOMAIN=your-org.atlassian.net \
 *   ATLASSIAN_EMAIL=you@company.com \
 *   ATLASSIAN_API_TOKEN=your-token \
 *   node examples/confluence-setup.mjs
 *
 * Or copy .env.example to .env and fill in your credentials, then:
 *   node examples/confluence-setup.mjs
 */
import { confluence } from '../lib/confluence.mjs';
import { cf, nx } from '../lib/formatters.mjs';
import { loadConfig } from '../lib/config.mjs';

// Load configuration
loadConfig();

// ── Project Configuration ──────────────────────────────────────
// Change these for your project:

const PROJECT = {
  name: 'Acme Platform',
  description: 'Acme Platform documentation',
  spaces: [
    {
      key: 'ENG',
      name: 'Engineering',
      description: 'Engineering documentation',
    },
    {
      key: 'PM',
      name: 'Product Management',
      description: 'Product documentation',
    },
  ],
};

// ── Page Content Generators ────────────────────────────────────

function engineeringHomepage() {
  return `
${nx.excerpt(`${PROJECT.name} — Engineering documentation hub.`)}

${nx.pageProperties([
  ['Project', PROJECT.name],
  ['Status', nx.s('Active', 'Green')],
  ['Last Updated', new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
])}

${nx.hr}

${nx.h2e(nx.star, 'Documentation')}
${cf.children()}
`;
}

function architecturePage() {
  return `
${nx.excerpt('System architecture overview.')}
${cf.toc()}
${nx.hr}

${nx.h2e(nx.info, 'Tech Stack')}
${cf.table(
  ['Layer', 'Technology', 'Purpose'],
  [
    ['Frontend', 'React / Next.js', 'Web application'],
    ['Backend', 'Node.js / NestJS', 'REST API'],
    ['Database', 'PostgreSQL', 'Primary data store'],
    ['Cache', 'Redis', 'Session + caching'],
  ]
)}

${nx.hr}
${nx.h2e(nx.info, 'Architecture Diagram')}
<p><em>Add your architecture diagram here.</em></p>
`;
}

function gettingStartedPage() {
  return `
${nx.excerpt('Getting started guide for new developers.')}
${cf.toc()}
${nx.hr}

${nx.h2e(nx.light, 'Prerequisites')}
${cf.table(
  ['Tool', 'Version', 'Install'],
  [
    ['Node.js', '18+', '<code>nvm install 18</code>'],
    ['pnpm', '8+', '<code>npm i -g pnpm</code>'],
    ['Docker', 'Latest', '<a href="https://docker.com">docker.com</a>'],
  ]
)}

${nx.hr}
${nx.h2e(nx.info, 'Quick Start')}
${cf.code('bash', `git clone git@github.com:your-org/your-repo.git
cd your-repo
pnpm install
pnpm dev`)}

${nx.tipPanel('Tip', '<p>Run <code>pnpm test</code> before pushing to catch issues early.</p>')}
`;
}

function deploymentPage() {
  return `
${nx.excerpt('Deployment guide and runbook.')}
${cf.toc()}
${nx.hr}

${nx.h2e(nx.warn, 'Deployment Checklist')}
<ul>
  <li>${nx.tick} All tests pass</li>
  <li>${nx.tick} Code reviewed and approved</li>
  <li>${nx.tick} Changelog updated</li>
  <li>${nx.tick} Environment variables verified</li>
</ul>

${nx.hr}
${nx.h2e(nx.info, 'Deploy Commands')}
${cf.code('bash', `# Production deploy
git push origin main
# Vercel auto-deploys on push

# Manual rollback
vercel rollback`)}
`;
}

function productHomepage() {
  return `
${nx.excerpt(`${PROJECT.name} — Product documentation hub.`)}

${nx.pageProperties([
  ['Product', PROJECT.name],
  ['Owner', 'Product Team'],
])}

${nx.hr}
${cf.children()}
`;
}

function roadmapPage() {
  return `
${nx.excerpt('Product roadmap and milestones.')}
${cf.toc()}
${nx.hr}

${nx.h2e(nx.star, 'Roadmap')}
${cf.table(
  ['Quarter', 'Milestone', 'Status'],
  [
    ['Q1 2026', 'MVP Launch', nx.s('In Progress', 'Blue')],
    ['Q2 2026', 'v2 Features', nx.s('Planned', 'Grey')],
    ['Q3 2026', 'Enterprise', nx.s('Planned', 'Grey')],
  ]
)}
`;
}

// ── Main Setup ─────────────────────────────────────────────────

export async function setup() {
  console.log('=============================================');
  console.log(`  ${PROJECT.name} — Confluence Setup`);
  console.log('=============================================\n');

  // Create Engineering space
  const eng = await confluence.createSpace('ENG', 'Engineering', 'Engineering documentation');
  const engHomeId = eng.homepage?.id || eng.id;

  await confluence.buildPageTree('ENG', engHomeId, [
    { title: 'Architecture', body: architecturePage(), labels: ['architecture'] },
    { title: 'Getting Started', body: gettingStartedPage(), labels: ['onboarding'] },
    { title: 'Deployment', body: deploymentPage(), labels: ['deployment', 'devops'] },
  ]);

  // Update homepage last (so children macro works)
  await confluence.updatePage('ENG', 'Engineering', engineeringHomepage());

  // Create Product Management space
  const pm = await confluence.createSpace('PM', 'Product Management', 'Product documentation');
  const pmHomeId = pm.homepage?.id || pm.id;

  await confluence.buildPageTree('PM', pmHomeId, [
    { title: 'Product Roadmap', body: roadmapPage(), labels: ['roadmap'] },
  ]);

  await confluence.updatePage('PM', 'Product Management', productHomepage());

  console.log('\n=============================================');
  console.log('  Confluence setup complete!');
  console.log('=============================================');
}

// Run directly or via CLI
export default setup;
if (import.meta.url === `file://${process.argv[1]}`) {
  setup().catch(e => { console.error('Error:', e.message); process.exit(1); });
}
