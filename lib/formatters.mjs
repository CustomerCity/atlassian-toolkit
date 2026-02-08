/**
 * Confluence Storage Format helpers — generate professional-looking pages
 *
 * Two levels of helpers:
 *   cf.* — Basic macros (status, info, code, table, etc.)
 *   nx.* — Enhanced layout (columns, emoticons, panels, page properties)
 *
 * Usage:
 *   import { cf, nx } from './formatters.mjs';
 *   const body = `${nx.excerpt('Summary text')} ${cf.toc()} ${cf.table(['A','B'], [['1','2']])}`;
 */

// ── Basic Confluence Macros ────────────────────────────────────

export const cf = {
  /** Status lozenge: cf.status('Done', 'Green') */
  status(text, color) {
    return `<ac:structured-macro ac:name="status"><ac:parameter ac:name="title">${text}</ac:parameter><ac:parameter ac:name="colour">${color}</ac:parameter></ac:structured-macro>`;
  },

  /** Info panel: blue box with title */
  info(title, body) {
    return `<ac:structured-macro ac:name="info"><ac:parameter ac:name="title">${title}</ac:parameter><ac:rich-text-body>${body}</ac:rich-text-body></ac:structured-macro>`;
  },

  /** Warning panel: yellow box with title */
  warning(title, body) {
    return `<ac:structured-macro ac:name="warning"><ac:parameter ac:name="title">${title}</ac:parameter><ac:rich-text-body>${body}</ac:rich-text-body></ac:structured-macro>`;
  },

  /** Note panel: yellow-ish informational box */
  note(title, body) {
    return `<ac:structured-macro ac:name="note"><ac:parameter ac:name="title">${title}</ac:parameter><ac:rich-text-body>${body}</ac:rich-text-body></ac:structured-macro>`;
  },

  /** Tip panel: green box */
  tip(title, body) {
    return `<ac:structured-macro ac:name="tip"><ac:parameter ac:name="title">${title}</ac:parameter><ac:rich-text-body>${body}</ac:rich-text-body></ac:structured-macro>`;
  },

  /** Generic panel with title */
  panel(title, body) {
    return `<ac:structured-macro ac:name="panel"><ac:parameter ac:name="title">${title}</ac:parameter><ac:rich-text-body>${body}</ac:rich-text-body></ac:structured-macro>`;
  },

  /** Code block with syntax highlighting */
  code(lang, code) {
    return `<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">${lang}</ac:parameter><ac:plain-text-body><![CDATA[${code}]]></ac:plain-text-body></ac:structured-macro>`;
  },

  /** Table of contents */
  toc(maxLevel = 3) {
    return `<ac:structured-macro ac:name="toc"><ac:parameter ac:name="maxLevel">${maxLevel}</ac:parameter></ac:structured-macro>`;
  },

  /** Children pages listing */
  children() {
    return `<ac:structured-macro ac:name="children"><ac:parameter ac:name="all">true</ac:parameter></ac:structured-macro>`;
  },

  /** Expandable section */
  expand(title, body) {
    return `<ac:structured-macro ac:name="expand"><ac:parameter ac:name="title">${title}</ac:parameter><ac:rich-text-body>${body}</ac:rich-text-body></ac:structured-macro>`;
  },

  /** HTML table from arrays */
  table(headers, rows) {
    const ths = headers.map(h => `<th><p><strong>${h}</strong></p></th>`).join('');
    const trs = rows.map(row => `<tr>${row.map(cell => `<td><p>${cell}</p></td>`).join('')}</tr>`).join('');
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  },

  /** Inline image from attached file */
  image(filename, width = '100%') {
    return `<ac:image ac:width="${width}"><ri:attachment ri:filename="${filename}" /></ac:image>`;
  },

  /** Link to another Confluence page */
  pageLink(title) {
    return `<ac:link><ri:page ri:content-title="${title}" /></ac:link>`;
  },

  /** JIRA issue macro (renders as link to issue) */
  jiraIssue(key) {
    return `<ac:structured-macro ac:name="jira"><ac:parameter ac:name="key">${key}</ac:parameter></ac:structured-macro>`;
  },

  /** JIRA issues table macro (renders JQL results) */
  jiraTable(jql, columns = 'key,summary,status,priority,assignee') {
    return `<ac:structured-macro ac:name="jira"><ac:parameter ac:name="jqlQuery">${jql}</ac:parameter><ac:parameter ac:name="columns">${columns}</ac:parameter></ac:structured-macro>`;
  },
};


// ── Enhanced Layout Helpers ────────────────────────────────────

export const nx = {
  // ── Layout Sections ──
  twoEqual(left, right) {
    return `<ac:layout><ac:layout-section ac:type="two_equal"><ac:layout-cell>${left}</ac:layout-cell><ac:layout-cell>${right}</ac:layout-cell></ac:layout-section></ac:layout>`;
  },
  twoLeftSidebar(left, right) {
    return `<ac:layout><ac:layout-section ac:type="two_left_sidebar"><ac:layout-cell>${left}</ac:layout-cell><ac:layout-cell>${right}</ac:layout-cell></ac:layout-section></ac:layout>`;
  },
  twoRightSidebar(left, right) {
    return `<ac:layout><ac:layout-section ac:type="two_right_sidebar"><ac:layout-cell>${left}</ac:layout-cell><ac:layout-cell>${right}</ac:layout-cell></ac:layout-section></ac:layout>`;
  },
  threeEqual(a, b, c) {
    return `<ac:layout><ac:layout-section ac:type="three_equal"><ac:layout-cell>${a}</ac:layout-cell><ac:layout-cell>${b}</ac:layout-cell><ac:layout-cell>${c}</ac:layout-cell></ac:layout-section></ac:layout>`;
  },
  single(content) {
    return `<ac:layout><ac:layout-section ac:type="single"><ac:layout-cell>${content}</ac:layout-cell></ac:layout-section></ac:layout>`;
  },

  // ── Emoticons ──
  tick: '<ac:emoticon ac:name="tick" />',
  cross: '<ac:emoticon ac:name="cross" />',
  warn: '<ac:emoticon ac:name="warning" />',
  info: '<ac:emoticon ac:name="information" />',
  light: '<ac:emoticon ac:name="light-on" />',
  star: '<ac:emoticon ac:name="star_yellow" />',
  blueStar: '<ac:emoticon ac:name="blue-star" />',
  plus: '<ac:emoticon ac:name="plus" />',
  minus: '<ac:emoticon ac:name="minus" />',
  question: '<ac:emoticon ac:name="question" />',
  heart: '<ac:emoticon ac:name="heart" />',

  // ── Panels (shorthand) ──
  infoPanel(title, body) { return cf.info(title, body); },
  notePanel(title, body) { return cf.note(title, body); },
  warnPanel(title, body) { return cf.warning(title, body); },
  tipPanel(title, body) { return cf.tip(title, body); },

  // ── Page Properties (metadata table) ──
  pageProperties(pairs) {
    const rows = pairs.map(([k, v]) => `<tr><th><p>${k}</p></th><td><p>${v}</p></td></tr>`).join('');
    return `<ac:structured-macro ac:name="details"><ac:rich-text-body><table><tbody>${rows}</tbody></table></ac:rich-text-body></ac:structured-macro>`;
  },

  // ── Excerpt (shown in children macro and search) ──
  excerpt(text) {
    return `<ac:structured-macro ac:name="excerpt"><ac:parameter ac:name="atlassian-macro-output-type">BLOCK</ac:parameter><ac:rich-text-body><p>${text}</p></ac:rich-text-body></ac:structured-macro>`;
  },

  // ── Shorthand ──
  hr: '<hr />',
  s(text, color) { return cf.status(text, color); },
  t(headers, rows) { return cf.table(headers, rows); },
  h2e(emoji, text) { return `<h2>${emoji} ${text}</h2>`; },
  h3e(emoji, text) { return `<h3>${emoji} ${text}</h3>`; },
};


// ── JIRA ADF (Atlassian Document Format) Helpers ───────────────

export const adf = {
  /** Create a simple text document */
  doc(...blocks) {
    return { type: 'doc', version: 1, content: blocks };
  },

  /** Paragraph with text */
  paragraph(text) {
    return { type: 'paragraph', content: [{ type: 'text', text }] };
  },

  /** Bold text node */
  bold(text) {
    return { type: 'text', text, marks: [{ type: 'strong' }] };
  },

  /** Heading (level 1-6) */
  heading(level, text) {
    return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] };
  },

  /** Bullet list */
  bulletList(items) {
    return {
      type: 'bulletList',
      content: items.map(item => ({
        type: 'listItem',
        content: [typeof item === 'string' ? adf.paragraph(item) : item],
      })),
    };
  },

  /** Ordered list */
  orderedList(items) {
    return {
      type: 'orderedList',
      content: items.map(item => ({
        type: 'listItem',
        content: [typeof item === 'string' ? adf.paragraph(item) : item],
      })),
    };
  },

  /** Code block */
  codeBlock(text, language = 'text') {
    return {
      type: 'codeBlock',
      attrs: { language },
      content: [{ type: 'text', text }],
    };
  },

  /** Table */
  table(headers, rows) {
    const headerRow = {
      type: 'tableRow',
      content: headers.map(h => ({
        type: 'tableHeader',
        content: [adf.paragraph(h)],
      })),
    };
    const dataRows = rows.map(row => ({
      type: 'tableRow',
      content: row.map(cell => ({
        type: 'tableCell',
        content: [adf.paragraph(String(cell))],
      })),
    }));
    return { type: 'table', content: [headerRow, ...dataRows] };
  },

  /** Horizontal rule */
  rule() {
    return { type: 'rule' };
  },

  /** Panel (info, note, warning, error, success, custom) */
  panel(type, ...content) {
    return {
      type: 'panel',
      attrs: { panelType: type },
      content,
    };
  },
};
