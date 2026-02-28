function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderStatus(statusContainer, text) {
  statusContainer.innerHTML = `<p data-editor-reviews-outcome>${escapeHtml(text)}</p>`;
}

function renderAvailable(statusContainer, listContainer, payload) {
  const reviewsMarkup = payload.reviews
    .map((review) => {
      return `<article data-editor-review-item>
        <h3 data-editor-reviewer>${escapeHtml(review.reviewerName)} (${escapeHtml(review.reviewerId)})</h3>
        <p data-editor-review-score>Overall score: ${escapeHtml(review.overallScore)}</p>
        <p data-editor-review-comments>${escapeHtml(review.comments)}</p>
        <p data-editor-review-submitted-at>Submitted: ${escapeHtml(review.submittedAt)}</p>
      </article>`;
    })
    .join('');

  renderStatus(statusContainer, 'Completed reviews are available.');
  listContainer.innerHTML = `<section data-editor-review-list>${reviewsMarkup}</section>`;
}

function renderPending(statusContainer, listContainer) {
  renderStatus(statusContainer, 'Reviews are pending.');
  listContainer.innerHTML = '<p data-editor-review-pending>No completed reviews are currently available.</p>';
}

function renderUnavailable(statusContainer, listContainer, message = 'Paper reviews unavailable') {
  renderStatus(statusContainer, message);
  listContainer.innerHTML = '<p data-editor-review-unavailable>Paper reviews unavailable</p>';
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function bootstrapEditorReviewsPage({
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch
} = {}) {
  const root = documentRef?.querySelector?.('[data-editor-reviews-app]');
  const form = documentRef?.querySelector?.('[data-editor-reviews-form]');
  const paperSelect = documentRef?.querySelector?.('[data-editor-reviews-paper-select]');
  const statusContainer = documentRef?.querySelector?.('[data-editor-reviews-status]');
  const listContainer = documentRef?.querySelector?.('[data-editor-reviews-list]');

  if (!root || !form || !paperSelect || !statusContainer || !listContainer || typeof fetchImpl !== 'function') {
    return { enhanced: false };
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const paperId = String(paperSelect.value).trim();
    if (paperId.length === 0) {
      renderStatus(statusContainer, 'Select a paper before requesting reviews.');
      listContainer.innerHTML = '';
      return;
    }

    let response;
    let payload;

    try {
      response = await fetchImpl(`/api/papers/${encodeURIComponent(paperId)}/reviews`, {
        method: 'GET'
      });
      payload = await readJsonSafely(response);
    } catch {
      renderUnavailable(statusContainer, listContainer);
      return;
    }

    if (response.status === 200 && payload.status === 'available' && Array.isArray(payload.reviews) && payload.reviews.length > 0) {
      renderAvailable(statusContainer, listContainer, payload);
      return;
    }

    if (response.status === 200 && payload.status === 'pending') {
      renderPending(statusContainer, listContainer);
      return;
    }

    renderUnavailable(statusContainer, listContainer, payload.message);
  });

  return { enhanced: true };
}
