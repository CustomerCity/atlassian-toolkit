/**
 * Atlassian Toolkit — main entry point
 *
 * Reusable toolkit for:
 *  - Confluence: spaces, pages, formatting, attachments
 *  - JIRA: projects, issues, boards, sprints
 *  - Screenshots: Playwright capture + upload to Confluence
 */

export { loadConfig, resetConfig } from './lib/config.mjs';
export { atlassianRequest, uploadAttachment } from './lib/atlassian-client.mjs';
export { confluence } from './lib/confluence.mjs';
export { jira } from './lib/jira.mjs';
export { cf, nx, adf } from './lib/formatters.mjs';
export { captureScreenshots, uploadScreenshotsToConfluence } from './lib/screenshots.mjs';
