export function initEditorScheduleConflicts({
  documentRef = document,
  fetchImpl = fetch
} = {}) {
  const button = documentRef.querySelector('#load-conflicts');
  const scheduleIdInput = documentRef.querySelector('#schedule-id');
  const statusElement = documentRef.querySelector('#conflict-status');
  const outputElement = documentRef.querySelector('#conflict-output');

  if (!button || !scheduleIdInput || !statusElement || !outputElement) {
    return false;
  }

  button.addEventListener('click', async () => {
    const scheduleId = scheduleIdInput.value.trim();

    if (!scheduleId) {
      statusElement.textContent = 'Enter a schedule ID.';
      outputElement.textContent = '';
      return;
    }

    statusElement.textContent = 'Loading conflicts...';

    try {
      const response = await fetchImpl(`/api/schedules/${scheduleId}/conflicts`);
      const body = await response.json();

      if (!response.ok) {
        statusElement.textContent = body.message;
        outputElement.textContent = '';
        return;
      }

      statusElement.textContent = `Loaded ${body.items.length} conflict(s).`;
      outputElement.textContent = JSON.stringify(body.items, null, 2);
    } catch {
      statusElement.textContent = 'Network error while loading conflicts.';
      outputElement.textContent = '';
    }
  });

  return true;
}

if (typeof document !== 'undefined') {
  initEditorScheduleConflicts();
}
