const DEFAULT_URL = '/api/final-schedule';

async function safeExtractErrorMessage(response) {
  try {
    const payload = await response.json();
    if (payload && typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message.trim();
    }
  } catch {
    // Ignore JSON parsing errors and fall through to status-based message.
  }

  if (typeof response.status === 'number' && response.status > 0) {
    return `Request failed with status ${response.status}`;
  }

  return 'Request failed for final schedule API';
}

export async function fetchFinalSchedule({ fetchImpl = fetch, url = DEFAULT_URL } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('fetchImpl must be a function');
  }

  const response = await fetchImpl(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response || response.ok !== true) {
    const message = response ? await safeExtractErrorMessage(response) : 'No response received';
    throw new Error(message);
  }

  try {
    return await response.json();
  } catch {
    throw new Error('Invalid JSON response from final schedule API');
  }
}
