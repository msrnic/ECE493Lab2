import { renderAccessDeniedView } from './access-denied.view.js';
import { renderTemporaryUnavailableView } from './temporary-unavailable.view.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderPaperList(papers = [], selectedPaperId = null) {
  if (!Array.isArray(papers) || papers.length === 0) {
    return '<p data-reviewer-paper-empty>No assigned papers available.</p>';
  }

  const options = papers
    .map((paper) => {
      const selected = paper.paperId === selectedPaperId ? ' selected' : '';
      return `<option value="${escapeHtml(paper.paperId)}"${selected}>${escapeHtml(paper.title)}</option>`;
    })
    .join('');

  return `<label>
    Assigned paper
    <select name="paperId" data-reviewer-paper-select>
      ${options}
    </select>
  </label>`;
}

export function renderFileList(files = []) {
  if (!Array.isArray(files) || files.length === 0) {
    return '<p data-reviewer-file-empty>No files available.</p>';
  }

  const rows = files
    .map((file) => `<li data-reviewer-file-item="${escapeHtml(file.fileId)}">${escapeHtml(file.fileName)}</li>`)
    .join('');

  return `<ul data-reviewer-file-list>${rows}</ul>`;
}

export function renderOutcomePanel(payload = {}) {
  if (payload.outcome === 'denied-revoked') {
    const denied = renderAccessDeniedView(payload);
    return `<p data-reviewer-paper-outcome="denied">${escapeHtml(denied.message)}</p>`;
  }

  if (payload.outcome === 'temporarily-unavailable' || payload.outcome === 'throttled') {
    const unavailable = payload.outcome === 'throttled'
      ? renderTemporaryUnavailableView({ retryAfterSeconds: payload.retryAfterSeconds })
      : renderTemporaryUnavailableView();
    return `<p data-reviewer-paper-outcome="${escapeHtml(unavailable.outcome)}">${escapeHtml(unavailable.message)}</p>`;
  }

  return '<p data-reviewer-paper-outcome="granted">Files are available.</p>';
}

export function renderReviewerPaperAccessPage({
  userEmail,
  papers,
  selectedPaperId,
  files = [],
  renderedLatencyMs = 0,
  outcome = { outcome: 'granted' }
} = {}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reviewer Paper Access</title>
    <link rel="stylesheet" href="/assets/css/reviewer-paper-access.css" />
  </head>
  <body>
    <main data-reviewer-paper-access>
      <h1>Reviewer Paper Access</h1>
      <p data-reviewer-paper-user>Signed in as ${escapeHtml(userEmail ?? 'unknown reviewer')}.</p>
      <form data-reviewer-paper-form>
        ${renderPaperList(papers, selectedPaperId)}
        <button type="submit" data-reviewer-paper-load>Load files</button>
      </form>
      <section data-reviewer-paper-status>
        ${renderOutcomePanel(outcome)}
      </section>
      <section data-reviewer-paper-files>
        ${renderFileList(files)}
      </section>
      <p data-reviewer-paper-latency-ms>selection-to-render: ${escapeHtml(renderedLatencyMs)}ms</p>
      <p><a href="/dashboard">Back to dashboard</a></p>
    </main>
    <script type="module" src="/assets/js/reviewer-paper-access-page.js"></script>
  </body>
</html>`;
}
