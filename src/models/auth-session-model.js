const DEFAULT_DASHBOARD_URL = '/dashboard';

export function createUnauthenticatedSessionState() {
  return {
    authenticated: false
  };
}

export function createAuthenticatedSessionState({ id, email, dashboardUrl = DEFAULT_DASHBOARD_URL }) {
  return {
    authenticated: true,
    user: {
      id,
      email
    },
    dashboardUrl
  };
}

export function deriveSessionState(payload) {
  if (!payload || payload.authenticated !== true) {
    return createUnauthenticatedSessionState();
  }

  if (!payload.user) {
    return createUnauthenticatedSessionState();
  }

  if (typeof payload.user.id !== 'string' || payload.user.id.length === 0) {
    return createUnauthenticatedSessionState();
  }

  if (typeof payload.user.email !== 'string' || payload.user.email.length === 0) {
    return createUnauthenticatedSessionState();
  }

  return createAuthenticatedSessionState({
    id: payload.user.id,
    email: payload.user.email,
    dashboardUrl: payload.dashboardUrl ?? DEFAULT_DASHBOARD_URL
  });
}

export function isAuthenticatedSession(state) {
  if (!state || state.authenticated !== true) {
    return false;
  }

  if (!state.user) {
    return false;
  }

  if (typeof state.user.id !== 'string' || state.user.id.length === 0) {
    return false;
  }

  if (typeof state.user.email !== 'string' || state.user.email.length === 0) {
    return false;
  }

  return true;
}
