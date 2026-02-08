/**
 * Confluence API — spaces, pages, attachments, search
 *
 * Usage:
 *   import { confluence } from './confluence.mjs';
 *   await confluence.createSpace('ENG', 'Engineering', 'Engineering docs');
 *   await confluence.createPage('ENG', 'Getting Started', '<p>Hello</p>');
 */
import { atlassianRequest, uploadAttachment } from './atlassian-client.mjs';

const API = '/wiki/rest/api';

// ── Core CRUD ──────────────────────────────────────────────────

export async function createSpace(key, name, description) {
  console.log(`Creating space: ${name} (${key})`);
  try {
    const result = await atlassianRequest('POST', `${API}/space`, {
      key, name,
      description: { plain: { value: description, representation: 'plain' } },
    });
    console.log(`  Space created. Homepage ID: ${result.homepage?.id || 'N/A'}`);
    return result;
  } catch (e) {
    if (e.message.includes('already exists') || e.statusCode === 409) {
      console.log(`  Space ${key} already exists, fetching...`);
      return atlassianRequest('GET', `${API}/space/${key}?expand=homepage`);
    }
    throw e;
  }
}

export async function createPage(spaceKey, title, body, parentId = null, labels = []) {
  console.log(`  Creating page: ${title}${parentId ? ` (under ${parentId})` : ''}`);
  const payload = {
    type: 'page',
    title,
    space: { key: spaceKey },
    body: { storage: { value: body, representation: 'storage' } },
  };
  if (parentId) payload.ancestors = [{ id: parentId }];

  const result = await atlassianRequest('POST', `${API}/content`, payload);
  console.log(`    Page created: ID=${result.id}`);

  if (labels.length > 0) {
    try {
      await atlassianRequest('POST', `${API}/content/${result.id}/label`,
        labels.map(l => ({ prefix: 'global', name: l })));
    } catch { /* ignore label errors */ }
  }
  return result;
}

export async function updatePage(spaceKey, title, body) {
  const encoded = encodeURIComponent(title);
  const result = await atlassianRequest('GET', `${API}/content?spaceKey=${spaceKey}&title=${encoded}&expand=version`);
  const pages = result.results || [];
  if (pages.length === 0) {
    console.log(`  Page "${title}" not found in ${spaceKey}, skipping`);
    return null;
  }
  const page = pages[0];
  const v = page.version.number + 1;
  await atlassianRequest('PUT', `${API}/content/${page.id}`, {
    type: 'page', title: page.title,
    body: { storage: { value: body, representation: 'storage' } },
    version: { number: v },
  });
  console.log(`  Updated: ${spaceKey}/${title} → v${v}`);
  return page;
}

export async function getPage(spaceKey, title) {
  const encoded = encodeURIComponent(title);
  const result = await atlassianRequest('GET', `${API}/content?spaceKey=${spaceKey}&title=${encoded}&expand=version,body.storage`);
  return result.results?.[0] || null;
}

export async function getPageById(pageId) {
  return atlassianRequest('GET', `${API}/content/${pageId}?expand=version,body.storage`);
}

export async function deletePage(pageId) {
  return atlassianRequest('DELETE', `${API}/content/${pageId}`);
}

export async function listPages(spaceKey) {
  const result = await atlassianRequest('GET', `${API}/content?spaceKey=${spaceKey}&type=page&limit=500&expand=ancestors`);
  return result.results || [];
}

export async function findPage(spaceKey, searchTerm) {
  const encoded = encodeURIComponent(searchTerm);
  const result = await atlassianRequest('GET', `${API}/content?spaceKey=${spaceKey}&title=${encoded}&expand=version`);
  return result.results || [];
}

export async function uploadPageAttachment(pageId, filepath, filename) {
  return uploadAttachment(`${API}/content/${pageId}/child/attachment`, filepath, filename);
}

// ── Tree Builder ───────────────────────────────────────────────

/**
 * Build a page tree from a hierarchical config object.
 *
 * @param {string} spaceKey
 * @param {string} parentId - ID of the parent page (usually space homepage)
 * @param {Array<{title: string, body: string, labels?: string[], children?: Array}>} pages
 * @param {number} delayMs - Delay between page creations (avoid rate limiting)
 */
export async function buildPageTree(spaceKey, parentId, pages, delayMs = 300) {
  for (const page of pages) {
    try {
      const created = await createPage(spaceKey, page.title, page.body, parentId, page.labels || []);
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));

      if (page.children?.length) {
        await buildPageTree(spaceKey, created.id, page.children, delayMs);
      }
    } catch (e) {
      console.log(`    Error creating "${page.title}": ${e.message}`);
    }
  }
}

// ── Convenience exports ────────────────────────────────────────

export const confluence = {
  createSpace,
  createPage,
  updatePage,
  getPage,
  getPageById,
  deletePage,
  listPages,
  findPage,
  uploadPageAttachment,
  buildPageTree,
};
