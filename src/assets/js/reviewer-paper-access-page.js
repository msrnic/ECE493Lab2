export async function bootstrapReviewerPaperAccessPage({
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch
} = {}) {
  const root = documentRef?.querySelector?.('[data-reviewer-paper-access]');
  const form = documentRef?.querySelector?.('[data-reviewer-paper-form]');
  const select = documentRef?.querySelector?.('[data-reviewer-paper-select]');
  const filesContainer = documentRef?.querySelector?.('[data-reviewer-paper-files]');
  const statusContainer = documentRef?.querySelector?.('[data-reviewer-paper-status]');

  if (!root || !form || !select || !filesContainer || !statusContainer || typeof fetchImpl !== 'function') {
    return { enhanced: false };
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const selectedPaperId = select.value;
    const response = await fetchImpl(`/api/reviewer/papers/${selectedPaperId}/files`, {
      method: 'GET'
    });
    const payload = await response.json();

    if (response.status === 200) {
      const items = payload.files.map((file) => `<li>${file.fileName}</li>`).join('');
      filesContainer.innerHTML = `<ul data-reviewer-file-list>${items}</ul>`;
      statusContainer.innerHTML = '<p data-reviewer-paper-outcome="granted">Files are available.</p>';
      return;
    }

    filesContainer.innerHTML = '<p data-reviewer-file-empty>No files available.</p>';
    statusContainer.innerHTML = `<p data-reviewer-paper-outcome="${payload.outcome}">${payload.message}</p>`;
  });

  return { enhanced: true };
}
