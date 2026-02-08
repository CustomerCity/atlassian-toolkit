#!/usr/bin/env node
/**
 * Atlassian Toolkit CLI
 *
 * Usage:
 *   atl confluence setup <config.mjs>    — Create spaces and pages from config
 *   atl confluence update <space> <title> — Update a page from stdin
 *   atl confluence list <space>           — List all pages in a space
 *   atl jira setup <config.mjs>          — Create project + issues from config
 *   atl jira list <projectKey>           — List issues in a project
 *   atl screenshots <config.mjs>         — Take screenshots and upload
 *   atl test                             — Test Atlassian connection
 */
import path from 'path';
import { loadConfig } from '../lib/config.mjs';
import { atlassianRequest } from '../lib/atlassian-client.mjs';

const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];

async function main() {
  // Load .env from current working directory
  loadConfig();

  switch (command) {
    case 'test':
      return testConnection();

    case 'confluence':
      switch (subcommand) {
        case 'setup':   return confluenceSetup(args[2]);
        case 'update':  return confluenceUpdate(args[2], args[3]);
        case 'list':    return confluenceList(args[2]);
        default:        return usage();
      }

    case 'jira':
      switch (subcommand) {
        case 'setup':   return jiraSetup(args[2]);
        case 'list':    return jiraList(args[2]);
        default:        return usage();
      }

    case 'screenshots':
      return screenshotRun(args[1]);

    default:
      return usage();
  }
}

// ── Commands ───────────────────────────────────────────────────

async function testConnection() {
  console.log('Testing Atlassian connection...\n');
  const config = loadConfig();
  console.log(`  Domain: ${config.atlassian.domain}`);
  console.log(`  Email:  ${config.atlassian.email}`);

  try {
    // Test Confluence
    const spaces = await atlassianRequest('GET', '/wiki/rest/api/space?limit=5');
    console.log(`\n  Confluence: ${spaces.results?.length || 0} spaces found`);
    for (const s of (spaces.results || []).slice(0, 5)) {
      console.log(`    - ${s.key}: ${s.name}`);
    }
  } catch (e) {
    console.log(`\n  Confluence: ERROR — ${e.message.substring(0, 100)}`);
  }

  try {
    // Test JIRA
    const projects = await atlassianRequest('GET', '/rest/api/3/project/search?maxResults=5');
    console.log(`\n  JIRA: ${projects.values?.length || 0} projects found`);
    for (const p of (projects.values || []).slice(0, 5)) {
      console.log(`    - ${p.key}: ${p.name}`);
    }
  } catch (e) {
    console.log(`\n  JIRA: ERROR — ${e.message.substring(0, 100)}`);
  }

  console.log('\nDone.');
}

async function confluenceSetup(configFile) {
  if (!configFile) { console.log('Usage: atl confluence setup <config.mjs>'); return; }
  const configPath = path.resolve(process.cwd(), configFile);
  const config = await import(configPath);
  if (typeof config.default !== 'function' && typeof config.setup !== 'function') {
    console.log('Config must export a default function or named setup function.');
    return;
  }
  const fn = config.setup || config.default;
  await fn();
}

async function confluenceUpdate(spaceKey, title) {
  if (!spaceKey || !title) { console.log('Usage: atl confluence update <spaceKey> <title>'); return; }
  const { confluence } = await import('../lib/confluence.mjs');

  // Read body from stdin
  let body = '';
  for await (const chunk of process.stdin) body += chunk;

  if (!body.trim()) { console.log('No content on stdin. Pipe HTML content.'); return; }
  await confluence.updatePage(spaceKey, title, body);
}

async function confluenceList(spaceKey) {
  if (!spaceKey) { console.log('Usage: atl confluence list <spaceKey>'); return; }
  const { confluence } = await import('../lib/confluence.mjs');

  const pages = await confluence.listPages(spaceKey);
  console.log(`\nPages in ${spaceKey} (${pages.length}):\n`);

  // Build tree
  const byId = new Map();
  const roots = [];
  for (const p of pages) {
    byId.set(p.id, { ...p, children: [] });
  }
  for (const p of pages) {
    const node = byId.get(p.id);
    const parentId = p.ancestors?.[p.ancestors.length - 1]?.id;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  function printTree(nodes, indent = '') {
    for (const n of nodes) {
      console.log(`${indent}${n.title} (ID: ${n.id})`);
      printTree(n.children, indent + '  ');
    }
  }
  printTree(roots);
}

async function jiraSetup(configFile) {
  if (!configFile) { console.log('Usage: atl jira setup <config.mjs>'); return; }
  const configPath = path.resolve(process.cwd(), configFile);
  const config = await import(configPath);
  if (typeof config.default !== 'function' && typeof config.setup !== 'function') {
    console.log('Config must export a default function or named setup function.');
    return;
  }
  const fn = config.setup || config.default;
  await fn();
}

async function jiraList(projectKey) {
  if (!projectKey) { console.log('Usage: atl jira list <projectKey>'); return; }
  const { jira } = await import('../lib/jira.mjs');

  const issues = await jira.searchIssues(`project = ${projectKey} ORDER BY created DESC`, 50);
  console.log(`\nIssues in ${projectKey} (${issues.length}):\n`);
  for (const i of issues) {
    const type = i.fields.issuetype?.name || '?';
    const status = i.fields.status?.name || '?';
    const priority = i.fields.priority?.name || '?';
    console.log(`  ${i.key}  [${type}]  ${i.fields.summary}  (${status}, ${priority})`);
  }
}

async function screenshotRun(configFile) {
  if (!configFile) { console.log('Usage: atl screenshots <config.mjs>'); return; }
  const configPath = path.resolve(process.cwd(), configFile);
  const config = await import(configPath);
  if (typeof config.default !== 'function' && typeof config.run !== 'function') {
    console.log('Config must export a default function or named run function.');
    return;
  }
  const fn = config.run || config.default;
  await fn();
}

// ── Usage ──────────────────────────────────────────────────────

function usage() {
  console.log(`
Atlassian Toolkit CLI

Commands:
  atl test                              Test connection to Confluence + JIRA
  atl confluence setup <config.mjs>     Create spaces/pages from config module
  atl confluence update <space> <title> Update page body from stdin
  atl confluence list <space>           List all pages in a space (tree view)
  atl jira setup <config.mjs>          Create project + issues from config
  atl jira list <projectKey>           List issues in a project
  atl screenshots <config.mjs>        Take screenshots and optionally upload

Config:
  Copy .env.example to .env and fill in your Atlassian credentials.
  See examples/ directory for config file examples.
`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
