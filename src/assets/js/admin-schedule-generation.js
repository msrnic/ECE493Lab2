export async function pollRun(runId, fetchImpl, statusElement, outputElement) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await fetchImpl(`/api/schedule-runs/${runId}`);
    const body = await response.json();

    if (!response.ok) {
      statusElement.textContent = body.message;
      return;
    }

    if (body.status === 'completed') {
      statusElement.textContent = 'Generation completed.';
      outputElement.textContent = JSON.stringify(body, null, 2);
      return;
    }

    if (body.status === 'failed') {
      statusElement.textContent = body.failureReason ?? 'Generation failed.';
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 25);
    });
  }

  statusElement.textContent = 'Generation status polling timed out.';
}

export function initAdminScheduleGeneration({
  documentRef = document,
  fetchImpl = fetch
} = {}) {
  const form = documentRef.querySelector('#generation-form');
  const statusElement = documentRef.querySelector('#status-message');
  const outputElement = documentRef.querySelector('#schedule-output');

  if (!form || !statusElement || !outputElement) {
    return false;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    statusElement.textContent = 'Starting generation...';

    const notes = documentRef.querySelector('#notes')?.value ?? '';

    try {
      const response = await fetchImpl('/api/schedule-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });

      const body = await response.json();

      if (response.status === 202) {
        statusElement.textContent = body.inProgressMessage ?? 'Generation started.';
        await pollRun(body.runId, fetchImpl, statusElement, outputElement);
        return;
      }

      if (response.status === 409 || response.status === 422 || response.status === 403) {
        statusElement.textContent = body.message;
        return;
      }

      statusElement.textContent = 'Unexpected response while starting generation.';
    } catch {
      statusElement.textContent = 'Network error while starting generation.';
    }
  });

  return true;
}

if (typeof document !== 'undefined') {
  initAdminScheduleGeneration();
}
