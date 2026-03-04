export async function fetchFinalSchedulePayload({
  fetchImpl = globalThis.fetch,
  endpoint = '/api/final-schedule'
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetchImpl must be provided');
  }

  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      accept: 'application/json'
    }
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Final schedule endpoint returned an invalid JSON response.');
  }

  if (!response.ok) {
    const message = typeof payload?.message === 'string'
      ? payload.message
      : 'Unable to load final schedule.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}
