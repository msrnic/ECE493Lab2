export async function submitPasswordChangeRequest(
  credentials,
  { fetchImpl = globalThis.fetch } = {}
) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetchImpl must be provided');
  }

  const response = await fetchImpl('/api/v1/account/password-change', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify(credentials)
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {
      code: 'INVALID_RESPONSE',
      message: 'Unexpected response from server.'
    };
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
    retryAfter: response.headers?.get?.('Retry-After')
  };
}
