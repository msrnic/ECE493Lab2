import {
  deriveSessionState,
  isAuthenticatedSession
} from '../models/auth-session-model.js';

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

export async function fetchSessionStatus({ fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetchImpl must be provided');
  }

  const response = await fetchImpl('/api/auth/session', {
    method: 'GET',
    headers: {
      accept: 'application/json'
    }
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {
      authenticated: false
    };
  }

  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

export async function redirectAuthenticatedUser({
  fetchImpl = globalThis.fetch,
  locationRef = globalThis.location
} = {}) {
  const result = await fetchSessionStatus({ fetchImpl });
  const state = deriveSessionState(result.payload);

  if (result.ok && isAuthenticatedSession(state)) {
    assignLocation(locationRef, state.dashboardUrl);
    return {
      redirected: true,
      status: result.status,
      state
    };
  }

  return {
    redirected: false,
    status: result.status,
    state
  };
}
