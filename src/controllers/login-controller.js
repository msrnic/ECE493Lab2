import {
  parseCredentialSubmission,
  validateCredentialSubmission
} from '../models/credential-submission-model.js';
import {
  deriveSessionState,
  isAuthenticatedSession
} from '../models/auth-session-model.js';
import { resolveLoginErrorMessage } from '../views/login-view.js';

function assignLocation(locationRef, url) {
  if (!locationRef) {
    return;
  }

  if (typeof locationRef.assign === 'function') {
    locationRef.assign(url);
    return;
  }

  locationRef.href = url;
}

export async function submitLoginRequest(credentials, { fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetchImpl must be provided');
  }

  const response = await fetchImpl('/api/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(credentials)
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {
      error: 'INVALID_RESPONSE',
      message: 'Unexpected response from server.'
    };
  }

  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

export function enhanceLoginForm({
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch,
  locationRef = globalThis.location,
  nowFn = () => new Date()
} = {}) {
  if (!documentRef) {
    return null;
  }

  const form = documentRef.querySelector('[data-login-form]');
  const statusNode = documentRef.querySelector('[data-login-status]');

  if (!form || !statusNode) {
    return null;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    statusNode.textContent = '';

    const values = Object.fromEntries(new FormData(form).entries());
    const submission = parseCredentialSubmission(values, nowFn());
    const errors = validateCredentialSubmission(submission);

    if (errors.length > 0) {
      statusNode.textContent = 'Email and password are required.';
      return;
    }

    const result = await submitLoginRequest(
      {
        email: submission.email,
        password: submission.password
      },
      { fetchImpl }
    );

    const state = deriveSessionState(result.payload);

    if (result.ok && isAuthenticatedSession(state)) {
      statusNode.textContent = 'Login successful.';
      form.reset();
      assignLocation(locationRef, state.dashboardUrl);
      return;
    }

    statusNode.textContent = resolveLoginErrorMessage(result.payload);
  };

  form.addEventListener('submit', onSubmit);

  return {
    form,
    statusNode,
    onSubmit
  };
}
