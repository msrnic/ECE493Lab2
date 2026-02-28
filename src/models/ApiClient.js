function clientError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export function createApiClient({ fetchImpl = globalThis.fetch, baseUrl = '/api' } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw clientError('API_CLIENT_CONFIG', 'fetch implementation is required');
  }

  async function request(path, options = {}) {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        ...(options.headers ?? {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const payload = await parseResponseBody(response);
    if (!response.ok) {
      throw clientError(payload.code ?? 'API_ERROR', payload.message ?? 'Request failed', {
        status: response.status,
        payload
      });
    }

    return payload;
  }

  return {
    request
  };
}
