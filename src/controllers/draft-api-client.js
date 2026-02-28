function clientError(status, code, message, details = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  Object.assign(error, details);
  return error;
}

async function parseResponse(response) {
  const bodyText = await response.text();
  if (!bodyText) {
    return {};
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    throw clientError(response.status, 'DRAFT_BAD_RESPONSE', 'Response body was not valid JSON.');
  }
}

export class DraftApiClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl ?? '';
    const resolvedFetch = options.fetchImpl === undefined ? globalThis.fetch : options.fetchImpl;
    this.fetchImpl = typeof resolvedFetch === 'function' ? resolvedFetch.bind(globalThis) : resolvedFetch;

    if (typeof this.fetchImpl !== 'function') {
      throw clientError(0, 'DRAFT_BAD_CLIENT', 'A fetch implementation is required.');
    }
  }

  async request(path, init = {}) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: {
        'content-type': 'application/json',
        ...(init.headers ?? {})
      },
      ...init
    });

    const payload = await parseResponse(response);
    if (!response.ok) {
      throw clientError(response.status, payload.code ?? 'DRAFT_API_ERROR', payload.message ?? 'Draft API request failed.', payload);
    }

    return payload;
  }

  saveDraft(submissionId, payload) {
    return this.request(`/api/submissions/${submissionId}/draft`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  getLatestDraft(submissionId) {
    return this.request(`/api/submissions/${submissionId}/draft`, {
      method: 'GET'
    });
  }

  listDraftVersions(submissionId) {
    return this.request(`/api/submissions/${submissionId}/draft/versions`, {
      method: 'GET'
    });
  }

  getDraftVersion(submissionId, versionId) {
    return this.request(`/api/submissions/${submissionId}/draft/versions/${versionId}`, {
      method: 'GET'
    });
  }

  restoreDraftVersion(submissionId, versionId, payload) {
    return this.request(`/api/submissions/${submissionId}/draft/versions/${versionId}/restore`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  pruneDraftRetention(submissionId, payload) {
    return this.request(`/api/submissions/${submissionId}/draft/retention/prune`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}
