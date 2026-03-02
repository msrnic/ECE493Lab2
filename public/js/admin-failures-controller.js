function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderRows(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '<p data-empty="true">No unresolved failures found.</p>';
  }

  const rows = items.map((item) => {
    return `<tr><td>${escapeHtml(item.failureRecordId)}</td><td>${escapeHtml(item.submissionId)}</td><td>${escapeHtml(item.authorId)}</td><td>${escapeHtml(item.failureReason)}</td></tr>`;
  }).join('');

  return `<table><thead><tr><th>Record</th><th>Submission</th><th>Author</th><th>Reason</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function loadFailures({ submissionId = '', authorId = '', page = 1 } = {}) {
  const params = new URLSearchParams();
  if (submissionId) {
    params.set('submissionId', submissionId);
  }

  if (authorId) {
    params.set('authorId', authorId);
  }

  params.set('page', String(page));

  const response = await fetch(`/api/admin/notification-failures?${params.toString()}`);
  return response.ok ? response.json() : { items: [], page: 1, total: 0, pageSize: 25 };
}

async function bootstrap() {
  const container = document.querySelector('[data-admin-failure-table]');
  const form = document.querySelector('[data-admin-failure-filter-form]');
  const pagination = document.querySelector('[data-admin-failure-pagination]');

  if (!container || !form || !pagination) {
    return;
  }

  const render = async ({ submissionId = '', authorId = '', page = 1 } = {}) => {
    const result = await loadFailures({ submissionId, authorId, page });
    container.innerHTML = renderRows(result.items);
    pagination.textContent = `Page ${result.page} (${result.total} total)`;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    void render({
      submissionId: String(formData.get('submissionId') ?? '').trim(),
      authorId: String(formData.get('authorId') ?? '').trim(),
      page: 1
    });
  });

  await render();
}

void bootstrap();
