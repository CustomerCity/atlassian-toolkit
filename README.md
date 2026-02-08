# Atlassian Toolkit

Reusable toolkit for automating **Confluence documentation**, **JIRA project setup**, and **Playwright screenshots** — designed to be portable across projects and clients.

## Quick Start

```bash
# 1. Copy this directory to your project
cp -r atlassian-toolkit/ ~/my-project/tools/atlassian/

# 2. Install dependencies
cd atlassian-toolkit && npm install

# 3. Configure credentials
cp .env.example .env
# Edit .env with your Atlassian domain, email, and API token

# 4. Test connection
node bin/cli.mjs test

# 5. Run an example
node examples/confluence-setup.mjs
node examples/jira-setup.mjs
node examples/screenshots.mjs
```

## Getting Your API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy the token into your `.env` file as `ATLASSIAN_API_TOKEN`

## What's Included

### Confluence (`lib/confluence.mjs`)
- `createSpace(key, name, description)` — Create a Confluence space
- `createPage(spaceKey, title, body, parentId?, labels?)` — Create a page
- `updatePage(spaceKey, title, body)` — Update an existing page by title
- `getPage(spaceKey, title)` — Get a page with content
- `deletePage(pageId)` — Delete a page
- `listPages(spaceKey)` — List all pages in a space
- `findPage(spaceKey, searchTerm)` — Search for a page by title
- `uploadPageAttachment(pageId, filepath, filename)` — Upload a file attachment
- `buildPageTree(spaceKey, parentId, pages, delayMs?)` — Create a hierarchy of pages

### JIRA (`lib/jira.mjs`)
- `createProject(key, name, opts?)` — Create a JIRA project
- `createIssue(projectKey, issueType, summary, description, opts?)` — Create an issue
- `createIssueTree(projectKey, issues, delayMs?)` — Bulk create epics/stories/sub-tasks
- `searchIssues(jql, maxResults?)` — Search issues with JQL
- `updateIssue(issueKey, fields)` — Update issue fields
- `transitionIssue(issueKey, transitionId)` — Move issue to new status
- `addComment(issueKey, body)` — Add a comment
- `createSprint(boardId, name, opts?)` — Create a sprint
- `moveToSprint(sprintId, issueKeys)` — Move issues to a sprint
- `createComponent(projectKey, name, description?)` — Create a component

### Formatters (`lib/formatters.mjs`)

#### Confluence Storage Format (`cf.*`)
```js
import { cf, nx } from './lib/formatters.mjs';

cf.status('Done', 'Green')       // Status lozenge
cf.info('Title', '<p>body</p>')  // Blue info panel
cf.warning('Title', 'body')      // Yellow warning panel
cf.tip('Title', 'body')          // Green tip panel
cf.code('bash', 'npm install')   // Code block with syntax highlighting
cf.table(['H1', 'H2'], [['a', 'b']])  // HTML table
cf.toc()                         // Table of contents
cf.children()                    // Children page listing
cf.expand('Title', 'body')       // Expandable section
cf.image('file.png', '100%')     // Inline image from attachment
cf.jiraIssue('PROJ-123')         // Embedded JIRA issue link
cf.jiraTable('project = PROJ')   // Embedded JIRA issues table
```

#### Enhanced Layouts (`nx.*`)
```js
nx.twoEqual(left, right)         // Two-column equal layout
nx.threeEqual(a, b, c)           // Three-column layout
nx.twoLeftSidebar(left, right)   // Left sidebar layout
nx.pageProperties([['Key', 'Value']])  // Metadata properties table
nx.excerpt('Summary text')       // Page excerpt (shown in search)
nx.tick / nx.cross / nx.warn     // Emoticons
nx.h2e(nx.star, 'Title')         // Heading with emoticon
```

#### JIRA ADF (`adf.*`)
```js
import { adf } from './lib/formatters.mjs';

adf.doc(                          // Atlassian Document Format
  adf.heading(1, 'Title'),
  adf.paragraph('Hello world'),
  adf.bulletList(['Item 1', 'Item 2']),
  adf.codeBlock('console.log("hi")', 'javascript'),
  adf.table(['Col A', 'Col B'], [['1', '2']]),
)
```

### Screenshots (`lib/screenshots.mjs`)
```js
import { captureScreenshots, uploadScreenshotsToConfluence } from './lib/screenshots.mjs';

const shots = await captureScreenshots({
  baseUrl: 'https://app.example.com',
  pages: [
    { route: '/dashboard', name: 'dashboard', title: 'Dashboard' },
  ],
  outputDir: './screenshots',
  auth: { email: 'user@co.com', password: 'pass' },  // optional
  viewport: { width: 1440, height: 900 },
  scale: 2,  // Retina
});

await uploadScreenshotsToConfluence(shots, 'UX', 'UI Specifications');
```

## CLI

```bash
# Test connection
node bin/cli.mjs test

# Confluence
node bin/cli.mjs confluence list ENG                    # List pages in space
node bin/cli.mjs confluence setup examples/confluence-setup.mjs  # Create pages
echo '<p>Hello</p>' | node bin/cli.mjs confluence update ENG "Page Title"

# JIRA
node bin/cli.mjs jira list PROJ                         # List issues
node bin/cli.mjs jira setup examples/jira-setup.mjs     # Create project + issues

# Screenshots
node bin/cli.mjs screenshots examples/screenshots.mjs
```

## Using for a New Client

1. Copy this entire directory to your new project
2. Create a `.env` file with the client's Atlassian credentials
3. Copy and customize the example files in `examples/`:
   - `confluence-setup.mjs` — define your space structure and page content
   - `jira-setup.mjs` — define your project, epics, stories, sprints
   - `screenshots.mjs` — define your app pages to screenshot
4. Run the setup scripts

## Directory Structure

```
atlassian-toolkit/
  .env.example          — Credential template
  index.mjs             — Main entry (import all modules)
  package.json          — Dependencies
  bin/
    cli.mjs             — CLI tool
  lib/
    config.mjs          — Env/config loader
    atlassian-client.mjs — Low-level REST client
    confluence.mjs      — Confluence API (spaces, pages, attachments)
    jira.mjs            — JIRA API (projects, issues, boards, sprints)
    formatters.mjs      — Confluence & JIRA formatting helpers
    screenshots.mjs     — Playwright screenshot capture + upload
  examples/
    confluence-setup.mjs — Example: set up Confluence docs
    jira-setup.mjs      — Example: set up JIRA project
    screenshots.mjs     — Example: take + upload screenshots
```

## Requirements

- Node.js 18+
- Playwright (installed automatically via `npm install`)
- Atlassian Cloud account with API token
