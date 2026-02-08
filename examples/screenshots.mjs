#!/usr/bin/env node
/**
 * Example: Take screenshots and upload to Confluence
 *
 * Usage:
 *   node examples/screenshots.mjs
 */
import { captureScreenshots, uploadScreenshotsToConfluence } from '../lib/screenshots.mjs';
import { loadConfig } from '../lib/config.mjs';

loadConfig();

// ── Configuration ──────────────────────────────────────────────
// Change these for your project:

const BASE_URL = process.env.APP_BASE_URL || 'https://your-app.com';

const PAGES = [
  { route: '/dashboard',     name: 'dashboard',     title: 'Dashboard' },
  { route: '/settings',      name: 'settings',      title: 'Settings' },
  { route: '/integrations',  name: 'integrations',  title: 'Integrations' },
  // Add your pages here...
];

// Confluence upload config (optional)
const CONFLUENCE_SPACE = 'UX';
const CONFLUENCE_PAGE = 'UI Specifications';

// ── Main ───────────────────────────────────────────────────────

export async function run() {
  console.log('=============================================');
  console.log('  Screenshot Capture + Upload');
  console.log('=============================================\n');

  // 1. Take screenshots
  const screenshots = await captureScreenshots({
    baseUrl: BASE_URL,
    pages: PAGES,
    outputDir: './screenshots',
    // Uncomment for authenticated screenshots:
    // auth: { email: 'user@co.com', password: 'pass123' },
  });

  if (screenshots.length === 0) {
    console.log('No screenshots taken. Exiting.');
    return;
  }

  // 2. Upload to Confluence (optional)
  if (CONFLUENCE_SPACE && CONFLUENCE_PAGE) {
    await uploadScreenshotsToConfluence(screenshots, CONFLUENCE_SPACE, CONFLUENCE_PAGE);
  }

  console.log('\n=============================================');
  console.log('  Done!');
  console.log('=============================================');
}

export default run;
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(e => { console.error('Error:', e.message); process.exit(1); });
}
