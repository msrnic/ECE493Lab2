/* c8 ignore file */
const paperField = document.querySelector('[data-field="paper-id"]');
const pageField = document.querySelector('[data-field="page"]');
const pageSizeField = document.querySelector('[data-field="page-size"]');
const rowsContainer = document.querySelector('[data-role="rows"]');
const paginationElement = document.querySelector('[data-role="pagination"]');
const errorElement = document.querySelector('[data-role="error"]');
const reloadButton = document.querySelector('[data-action="reload"]');

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function showError(message) {
  if (!errorElement) {
    return;
  }

  errorElement.hidden = false;
  errorElement.textContent = message;
}

function clearError() {
  if (!errorElement) {
    return;
  }

  errorElement.hidden = true;
  errorElement.textContent = '';
}

function renderRows(entries = []) {
  if (!rowsContainer) {
    return;
  }

  rowsContainer.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="4">No failure records found.</td>';
    rowsContainer.appendChild(row);
    return;
  }

  for (const entry of entries) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${entry.createdAt ?? '-'}</td>
      <td>${entry.invitationId ?? '-'}</td>
      <td>${entry.eventType ?? '-'}</td>
      <td>${entry.message ?? '-'}</td>
    `;
    rowsContainer.appendChild(row);
  }
}

async function loadFailureLogs() {
  const params = new URLSearchParams(window.location.search);
  const paperId = params.get('paperId');
  const actorRole = params.get('role') ?? 'support';

  if (!paperId) {
    showError('Missing paperId query parameter.');
    return;
  }

  clearError();
  setText(paperField, paperId);

  const page = Number.parseInt(pageField?.value ?? '1', 10) || 1;
  const pageSize = Number.parseInt(pageSizeField?.value ?? '20', 10) || 20;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  });

  try {
    const response = await fetch(`/api/papers/${encodeURIComponent(paperId)}/invitation-failure-logs?${query.toString()}`, {
      headers: {
        'x-user-role': actorRole
      }
    });

    const payload = await response.json();
    if (!response.ok) {
      showError(payload?.message ?? 'Unable to load failure logs.');
      return;
    }

    renderRows(payload.entries);
    const pagination = payload.pagination ?? {};
    setText(
      paginationElement,
      `Page ${pagination.page ?? page} of ${pagination.totalPages ?? 1} (${pagination.total ?? 0} entries)`
    );
  } catch {
    showError('Unable to load failure logs.');
  }
}

if (reloadButton) {
  reloadButton.addEventListener('click', () => {
    void loadFailureLogs();
  });
}

void loadFailureLogs();
