#!/usr/bin/env node
/**
 * Example: Set up a JIRA project with epics, stories, and sprints
 *
 * Usage:
 *   ATLASSIAN_DOMAIN=your-org.atlassian.net \
 *   ATLASSIAN_EMAIL=you@company.com \
 *   ATLASSIAN_API_TOKEN=your-token \
 *   node examples/jira-setup.mjs
 */
import { jira } from '../lib/jira.mjs';
import { loadConfig } from '../lib/config.mjs';

loadConfig();

// ── Project Configuration ──────────────────────────────────────
// Change these for your project:

const PROJECT_KEY = 'ACME';
const PROJECT_NAME = 'Acme Platform';

const COMPONENTS = [
  { name: 'Frontend', description: 'React/Next.js web application' },
  { name: 'Backend', description: 'NestJS API server' },
  { name: 'Infrastructure', description: 'DevOps, CI/CD, deployment' },
  { name: 'Design', description: 'UI/UX design' },
];

const EPICS = [
  {
    type: 'Epic',
    summary: 'User Authentication & Authorization',
    description: 'Implement complete auth flow: sign-up, sign-in, SSO, RBAC',
    priority: 'High',
    labels: ['auth', 'security'],
    components: ['Backend', 'Frontend'],
    children: [
      { type: 'Story', summary: 'Implement email/password sign-up', description: 'Users can create accounts with email and password', priority: 'High', labels: ['auth'] },
      { type: 'Story', summary: 'Implement sign-in flow', description: 'Users can sign in with email/password or SSO', priority: 'High', labels: ['auth'] },
      { type: 'Story', summary: 'Add Google OAuth integration', description: 'Users can sign in with Google accounts', priority: 'Medium', labels: ['auth', 'oauth'] },
      { type: 'Story', summary: 'Implement role-based access control', description: 'Admin, Manager, Member roles with permission guards', priority: 'High', labels: ['auth', 'rbac'] },
      { type: 'Story', summary: 'Add password reset flow', description: 'Users can reset passwords via email link', priority: 'Medium', labels: ['auth'] },
    ],
  },
  {
    type: 'Epic',
    summary: 'Dashboard & Analytics',
    description: 'Build main dashboard with KPI cards, charts, and activity feed',
    priority: 'High',
    labels: ['dashboard', 'analytics'],
    components: ['Frontend', 'Backend'],
    children: [
      { type: 'Story', summary: 'Build KPI metric cards', description: 'Display key metrics with trend indicators', priority: 'High', labels: ['dashboard'] },
      { type: 'Story', summary: 'Add time-series charts', description: 'Interactive charts for historical data visualization', priority: 'Medium', labels: ['dashboard', 'charts'] },
      { type: 'Story', summary: 'Build activity feed', description: 'Real-time feed of recent actions and events', priority: 'Medium', labels: ['dashboard'] },
      { type: 'Story', summary: 'Create dashboard API endpoints', description: 'REST endpoints for dashboard metrics aggregation', priority: 'High', labels: ['dashboard', 'api'] },
    ],
  },
  {
    type: 'Epic',
    summary: 'Integrations',
    description: 'Third-party CRM/tool integrations with OAuth flows',
    priority: 'Medium',
    labels: ['integrations'],
    components: ['Backend'],
    children: [
      { type: 'Story', summary: 'Salesforce OAuth integration', description: 'Complete OAuth 2.0 flow with token refresh', priority: 'High', labels: ['integrations', 'salesforce'] },
      { type: 'Story', summary: 'HubSpot integration', description: 'OAuth flow and API client for HubSpot', priority: 'Medium', labels: ['integrations', 'hubspot'] },
      { type: 'Story', summary: 'Webhook receiver', description: 'Generic webhook endpoint for real-time sync', priority: 'Low', labels: ['integrations'] },
    ],
  },
  {
    type: 'Epic',
    summary: 'Infrastructure & DevOps',
    description: 'CI/CD pipelines, monitoring, deployment automation',
    priority: 'Medium',
    labels: ['infrastructure', 'devops'],
    components: ['Infrastructure'],
    children: [
      { type: 'Story', summary: 'Set up CI/CD pipeline', description: 'GitHub Actions for lint, test, build, deploy', priority: 'High', labels: ['ci-cd'] },
      { type: 'Story', summary: 'Configure error tracking (Sentry)', description: 'Sentry integration for API and web', priority: 'Medium', labels: ['monitoring'] },
      { type: 'Story', summary: 'Set up staging environment', description: 'Staging deploy with preview URLs', priority: 'Medium', labels: ['devops'] },
      { type: 'Story', summary: 'Add health check endpoint', description: 'GET /health with DB and Redis connectivity check', priority: 'Low', labels: ['api'] },
    ],
  },
];

// ── Main Setup ─────────────────────────────────────────────────

export async function setup() {
  console.log('=============================================');
  console.log(`  ${PROJECT_NAME} — JIRA Project Setup`);
  console.log('=============================================\n');

  // 1. Create project
  const project = await jira.createProject(PROJECT_KEY, PROJECT_NAME, {
    description: `${PROJECT_NAME} development project`,
  });

  // 2. Create components
  console.log('\nCreating components...');
  for (const comp of COMPONENTS) {
    try {
      await jira.createComponent(PROJECT_KEY, comp.name, comp.description);
    } catch (e) {
      console.log(`  Component "${comp.name}" may already exist: ${e.message.substring(0, 80)}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  // 3. Create epics and stories
  console.log('\nCreating epics and stories...');
  const allIssues = await jira.createIssueTree(PROJECT_KEY, EPICS, 300);
  console.log(`\n  Created ${allIssues.length} issues total.`);

  // 4. Create sprints (optional)
  console.log('\nSetting up sprints...');
  try {
    const boards = await jira.listBoards(PROJECT_KEY);
    if (boards.length > 0) {
      const boardId = boards[0].id;
      console.log(`  Using board: ${boards[0].name} (ID: ${boardId})`);

      const sprint1 = await jira.createSprint(boardId, 'Sprint 1', {
        goal: 'Auth + Dashboard foundation',
      });

      const sprint2 = await jira.createSprint(boardId, 'Sprint 2', {
        goal: 'Integrations + Infrastructure',
      });

      // Move first batch of stories to Sprint 1
      const sprint1Issues = allIssues
        .filter(i => i.key)
        .slice(0, Math.min(8, allIssues.length))
        .map(i => i.key);

      if (sprint1Issues.length > 0) {
        await jira.moveToSprint(sprint1.id, sprint1Issues);
        console.log(`  Moved ${sprint1Issues.length} issues to Sprint 1`);
      }
    } else {
      console.log('  No board found — sprints not created');
    }
  } catch (e) {
    console.log(`  Sprint setup skipped: ${e.message.substring(0, 80)}`);
  }

  console.log('\n=============================================');
  console.log('  JIRA project setup complete!');
  console.log(`  View at: https://${process.env.ATLASSIAN_DOMAIN}/jira/software/projects/${PROJECT_KEY}/board`);
  console.log('=============================================');
}

export default setup;
if (import.meta.url === `file://${process.argv[1]}`) {
  setup().catch(e => { console.error('Error:', e.message); process.exit(1); });
}
