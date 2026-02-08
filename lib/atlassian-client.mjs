/**
 * Generic Atlassian REST API client — works for both Confluence and JIRA
 */
import https from 'https';
import fs from 'fs';
import { loadConfig } from './config.mjs';

/**
 * Make an authenticated request to the Atlassian REST API
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} path - API path (e.g., /wiki/rest/api/content or /rest/api/3/issue)
 * @param {object|null} body - Request body (will be JSON-stringified)
 * @param {object} opts - Optional overrides { domain, auth, headers, retries }
 */
export function atlassianRequest(method, path, body = null, opts = {}) {
  const config = loadConfig();
  const domain = opts.domain || config.atlassian.domain;
  const auth = opts.auth || config.atlassian.auth;
  const maxRetries = opts.retries ?? 3;

  if (!domain) throw new Error('ATLASSIAN_DOMAIN not set. Configure in .env or environment.');
  if (!auth || auth === 'Og==') throw new Error('ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN not set.');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: domain,
      path,
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...opts.headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        } else if (res.statusCode === 429 && maxRetries > 0) {
          const retryAfter = parseInt(res.headers['retry-after'] || '5', 10);
          console.log(`  Rate limited. Retrying in ${retryAfter}s... (${maxRetries} retries left)`);
          setTimeout(() => {
            atlassianRequest(method, path, body, { ...opts, retries: maxRetries - 1 })
              .then(resolve).catch(reject);
          }, retryAfter * 1000);
        } else {
          const error = new Error(`HTTP ${res.statusCode}: ${data.substring(0, 500)}`);
          error.statusCode = res.statusCode;
          error.body = data;
          reject(error);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Upload a file as a multipart/form-data attachment to a Confluence page
 * @param {string} apiPath - The API path (e.g., /wiki/rest/api/content/{pageId}/child/attachment)
 * @param {string} filepath - Local file path
 * @param {string} filename - Name for the uploaded file
 */
export function uploadAttachment(apiPath, filepath, filename, opts = {}) {
  const config = loadConfig();
  const domain = opts.domain || config.atlassian.domain;
  const auth = opts.auth || config.atlassian.auth;

  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(filepath);
    const boundary = '----FormBoundary' + Math.random().toString(36).substr(2);
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const body = Buffer.concat([Buffer.from(header), fileData, Buffer.from(footer)]);

    const options = {
      hostname: domain,
      path: apiPath,
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Atlassian-Token': 'nocheck',
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        } else if (res.statusCode === 404 || res.statusCode === 400) {
          options.method = 'POST';
          const req2 = https.request(options, (res2) => {
            let data2 = '';
            res2.on('data', (chunk) => data2 += chunk);
            res2.on('end', () => {
              if (res2.statusCode >= 200 && res2.statusCode < 300) {
                try { resolve(JSON.parse(data2)); } catch { resolve(data2); }
              } else {
                reject(new Error(`Upload failed: HTTP ${res2.statusCode}: ${data2.substring(0, 200)}`));
              }
            });
          });
          req2.on('error', reject);
          req2.write(body);
          req2.end();
        } else {
          reject(new Error(`Upload failed: HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
