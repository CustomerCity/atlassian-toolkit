/**
 * JIRA API — projects, issues, boards, sprints, components, labels
 *
 * Usage:
 *   import { jira } from './jira.mjs';
 *   await jira.createProject('PROJ', 'My Project');
 *   await jira.createIssue('PROJ', 'Story', 'Build login page', 'Description here');
 */
import { atlassianRequest } from './atlassian-client.mjs';

const API_V3 = '/rest/api/3';
const API_V2 = '/rest/api/2';
const AGILE = '/rest/agile/1.0';

// ── Projects ───────────────────────────────────────────────────

export async function createProject(key, name, opts = {}) {
  console.log(`Creating JIRA project: ${name} (${key})`);
  const payload = {
    key,
    name,
    projectTypeKey: opts.type || 'software',
    leadAccountId: opts.leadAccountId,
    description: opts.description || '',
    projectTemplateKey: opts.template || 'com.pyxis.greenhopper.jira:gh-simplified-scrum-classic',
  };
  try {
    const result = await atlassianRequest('POST', `${API_V3}/project`, payload);
    console.log(`  Project created: ${result.key} (ID: ${result.id})`);
    return result;
  } catch (e) {
    if (e.statusCode === 409 || e.message.includes('already exists')) {
      console.log(`  Project ${key} already exists, fetching...`);
      return atlassianRequest('GET', `${API_V3}/project/${key}`);
    }
    throw e;
  }
}

export async function getProject(key) {
  return atlassianRequest('GET', `${API_V3}/project/${key}`);
}

export async function listProjects() {
  const result = await atlassianRequest('GET', `${API_V3}/project/search?maxResults=100`);
  return result.values || [];
}

export async function deleteProject(key) {
  return atlassianRequest('DELETE', `${API_V3}/project/${key}`);
}

// ── Issues ─────────────────────────────────────────────────────

export async function createIssue(projectKey, issueType, summary, description, opts = {}) {
  const payload = {
    fields: {
      project: { key: projectKey },
      issuetype: { name: issueType },
      summary,
      description: typeof description === 'string' ? {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
      } : description,
      ...opts.fields,
    },
  };

  if (opts.priority) payload.fields.priority = { name: opts.priority };
  if (opts.labels) payload.fields.labels = opts.labels;
  if (opts.components) payload.fields.components = opts.components.map(c => ({ name: c }));
  if (opts.parentKey) payload.fields.parent = { key: opts.parentKey };
  if (opts.assigneeId) payload.fields.assignee = { accountId: opts.assigneeId };
  if (opts.storyPoints) payload.fields.story_points = opts.storyPoints;

  const result = await atlassianRequest('POST', `${API_V3}/issue`, payload);
  console.log(`  Issue created: ${result.key} — ${summary}`);
  return result;
}

export async function updateIssue(issueKey, fields) {
  return atlassianRequest('PUT', `${API_V3}/issue/${issueKey}`, { fields });
}

export async function getIssue(issueKey) {
  return atlassianRequest('GET', `${API_V3}/issue/${issueKey}`);
}

export async function searchIssues(jql, maxResults = 50) {
  const result = await atlassianRequest('POST', `${API_V3}/search`, {
    jql,
    maxResults,
    fields: ['summary', 'status', 'priority', 'assignee', 'issuetype', 'labels', 'parent'],
  });
  return result.issues || [];
}

export async function transitionIssue(issueKey, transitionId) {
  return atlassianRequest('POST', `${API_V3}/issue/${issueKey}/transitions`, {
    transition: { id: transitionId },
  });
}

export async function addComment(issueKey, body) {
  const content = typeof body === 'string' ? {
    type: 'doc', version: 1,
    content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }],
  } : body;
  return atlassianRequest('POST', `${API_V3}/issue/${issueKey}/comment`, { body: content });
}

// ── Bulk Issue Creation ────────────────────────────────────────

/**
 * Create issues from a structured config.
 * Supports epics, stories, sub-tasks, and parent-child relationships.
 *
 * @param {string} projectKey
 * @param {Array<{type: string, summary: string, description: string, children?: Array, ...}>} issues
 * @param {number} delayMs - Delay between creations
 */
export async function createIssueTree(projectKey, issues, delayMs = 200) {
  const created = [];
  for (const issue of issues) {
    try {
      const result = await createIssue(projectKey, issue.type || 'Story', issue.summary, issue.description || '', {
        priority: issue.priority,
        labels: issue.labels,
        components: issue.components,
        fields: issue.fields,
      });
      created.push(result);

      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));

      // Create child issues (sub-tasks or stories under an epic)
      if (issue.children?.length) {
        for (const child of issue.children) {
          try {
            const childResult = await createIssue(projectKey, child.type || 'Sub-task', child.summary, child.description || '', {
              parentKey: result.key,
              priority: child.priority,
              labels: child.labels,
              components: child.components,
              fields: child.fields,
            });
            created.push(childResult);
            if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
          } catch (e) {
            console.log(`    Error creating child "${child.summary}": ${e.message}`);
          }
        }
      }
    } catch (e) {
      console.log(`  Error creating "${issue.summary}": ${e.message}`);
    }
  }
  return created;
}

// ── Boards & Sprints ───────────────────────────────────────────

export async function listBoards(projectKey) {
  const result = await atlassianRequest('GET', `${AGILE}/board?projectKeyOrId=${projectKey}`);
  return result.values || [];
}

export async function createSprint(boardId, name, opts = {}) {
  const payload = { name, originBoardId: boardId };
  if (opts.startDate) payload.startDate = opts.startDate;
  if (opts.endDate) payload.endDate = opts.endDate;
  if (opts.goal) payload.goal = opts.goal;

  const result = await atlassianRequest('POST', `${AGILE}/sprint`, payload);
  console.log(`  Sprint created: ${result.name} (ID: ${result.id})`);
  return result;
}

export async function moveToSprint(sprintId, issueKeys) {
  return atlassianRequest('POST', `${AGILE}/sprint/${sprintId}/issue`, {
    issues: issueKeys,
  });
}

export async function listSprints(boardId) {
  const result = await atlassianRequest('GET', `${AGILE}/board/${boardId}/sprint?state=active,future`);
  return result.values || [];
}

// ── Components ─────────────────────────────────────────────────

export async function createComponent(projectKey, name, description = '') {
  const result = await atlassianRequest('POST', `${API_V3}/component`, {
    project: projectKey, name, description,
  });
  console.log(`  Component created: ${result.name}`);
  return result;
}

export async function listComponents(projectKey) {
  return atlassianRequest('GET', `${API_V3}/project/${projectKey}/components`);
}

// ── Labels ─────────────────────────────────────────────────────

export async function getLabels() {
  const result = await atlassianRequest('GET', `${API_V2}/label?maxResults=1000`);
  return result.values || [];
}

// ── Users ──────────────────────────────────────────────────────

export async function searchUsers(query) {
  const result = await atlassianRequest('GET', `${API_V3}/user/search?query=${encodeURIComponent(query)}`);
  return result;
}

export async function getMyself() {
  return atlassianRequest('GET', `${API_V3}/myself`);
}

// ── Convenience exports ────────────────────────────────────────

export const jira = {
  createProject,
  getProject,
  listProjects,
  deleteProject,
  createIssue,
  updateIssue,
  getIssue,
  searchIssues,
  transitionIssue,
  addComment,
  createIssueTree,
  listBoards,
  createSprint,
  moveToSprint,
  listSprints,
  createComponent,
  listComponents,
  getLabels,
  searchUsers,
  getMyself,
};
