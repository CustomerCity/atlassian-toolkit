/**
 * Playwright screenshot utility — capture app pages and upload to Confluence
 *
 * Usage:
 *   import { captureScreenshots } from './screenshots.mjs';
 *
 *   const shots = await captureScreenshots({
 *     baseUrl: 'https://app.example.com',
 *     pages: [
 *       { route: '/dashboard', name: 'dashboard', title: 'Dashboard' },
 *       { route: '/settings', name: 'settings', title: 'Settings' },
 *     ],
 *     auth: { email: 'user@co.com', password: 'pass' },  // optional
 *     viewport: { width: 1440, height: 900 },
 *     scale: 2,
 *   });
 */
import fs from 'fs';
import path from 'path';
import { loadConfig } from './config.mjs';

/**
 * Capture screenshots of web app pages using Playwright
 */
export async function captureScreenshots(opts = {}) {
  const config = loadConfig();
  const baseUrl = opts.baseUrl || config.screenshot.baseUrl;
  const pages = opts.pages || [];
  const outputDir = opts.outputDir || config.screenshot.dir;
  const width = opts.viewport?.width || config.screenshot.width;
  const height = opts.viewport?.height || config.screenshot.height;
  const scale = opts.scale || config.screenshot.scale;
  const authConfig = opts.auth || config.auth;
  const waitMs = opts.waitMs ?? 2000;
  const fullPage = opts.fullPage ?? false;

  if (!baseUrl) throw new Error('No baseUrl. Set APP_BASE_URL in .env or pass baseUrl option.');
  if (pages.length === 0) throw new Error('No pages to screenshot. Pass pages array.');

  // Dynamic import so playwright is only needed when screenshots are used
  const { chromium } = await import('playwright');

  fs.mkdirSync(outputDir, { recursive: true });

  console.log('Launching Playwright browser...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
  });
  const page = await context.newPage();
  const screenshots = [];

  // Optional: Sign in first
  if (authConfig?.email && authConfig?.password) {
    console.log('  Signing in...');
    try {
      await signIn(page, baseUrl, authConfig);
      console.log('  Signed in successfully\n');
    } catch (e) {
      console.log(`  Sign-in failed: ${e.message}`);
      console.log('  Continuing without auth...\n');
    }
  }

  // Dismiss common onboarding popups/tours via localStorage
  const tourKeys = opts.tourDismissKeys || [
    'product-tour-completed',
    'onboarding-completed',
    'tour-dismissed',
  ];
  await page.evaluate((keys) => {
    for (const key of keys) localStorage.setItem(key, 'true');
  }, tourKeys);

  // Take screenshots
  for (const p of pages) {
    try {
      console.log(`  Capturing ${p.title} (${p.route})...`);
      await page.goto(`${baseUrl}${p.route}`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(waitMs);

      // Try to dismiss any modal/popup
      try {
        const closeBtn = page.locator('button:has-text("Skip"), button:has-text("Close"), [aria-label="Close"]').first();
        await closeBtn.click({ timeout: 1000 });
        await page.waitForTimeout(500);
      } catch { /* no popup */ }

      const filepath = path.join(outputDir, `${p.name}.png`);
      await page.screenshot({ path: filepath, fullPage });
      const stats = fs.statSync(filepath);
      console.log(`    Saved: ${p.name}.png (${Math.round(stats.size / 1024)}KB)`);
      screenshots.push({ ...p, filepath });
    } catch (e) {
      console.log(`    Failed: ${e.message}`);
    }
  }

  await browser.close();
  console.log(`\nTotal screenshots: ${screenshots.length}\n`);
  return screenshots;
}

/**
 * Sign in via Clerk (email + password flow)
 */
async function signIn(page, baseUrl, auth) {
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const emailInput = page.locator('input[name="identifier"]').first();
  await emailInput.waitFor({ timeout: 5000 });
  await emailInput.fill(auth.email);

  const continueBtn = page.locator('button:has-text("Continue")').first();
  await continueBtn.click();
  await page.waitForTimeout(3000);

  const passwordInput = page.locator('input[type="password"]:visible').first();
  await passwordInput.waitFor({ timeout: 10000 });
  await passwordInput.fill(auth.password);

  const signInBtn = page.locator('button:has-text("Continue")').first();
  await signInBtn.click();
  await page.waitForTimeout(8000);

  if (!page.url().includes('/dashboard')) {
    throw new Error(`Expected dashboard, got: ${page.url()}`);
  }
}

/**
 * Upload screenshots to a Confluence page as attachments + embed in page body
 */
export async function uploadScreenshotsToConfluence(screenshots, spaceKey, pageTitle) {
  const { confluence } = await import('./confluence.mjs');
  const { cf } = await import('./formatters.mjs');

  const page = await confluence.getPage(spaceKey, pageTitle);
  if (!page) {
    console.log(`Page "${pageTitle}" not found in ${spaceKey}`);
    return;
  }

  console.log(`Uploading ${screenshots.length} screenshots to ${spaceKey}/${pageTitle}...`);

  for (const ss of screenshots) {
    try {
      console.log(`  Uploading ${ss.name}.png...`);
      await confluence.uploadPageAttachment(page.id, ss.filepath, `${ss.name}.png`);
      console.log(`    Uploaded`);
    } catch (e) {
      console.log(`    Failed: ${e.message}`);
    }
  }

  // Build page body with embedded screenshots
  let body = `
<p>Live screenshots captured on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</p>
<p>Resolution: 1440 x 900 @2x (Retina)</p>
${cf.toc()}
<hr />
`;
  for (const ss of screenshots) {
    body += `
<h2>${ss.title}</h2>
<p><code>${ss.route || '/'}</code></p>
<p>${cf.image(`${ss.name}.png`)}</p>
<hr />
`;
  }

  await confluence.updatePage(spaceKey, pageTitle, body);
  console.log(`\nPage updated with embedded screenshots`);
}
