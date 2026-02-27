import { randomUUID } from 'node:crypto';
import {
  parseCredentialSubmission,
  validateCredentialSubmission
} from '../models/credential-submission-model.js';
import { createFailedLoginTracker } from '../models/failed-login-tracker-model.js';
import { hashPassword } from '../models/user-account-model.js';

const SESSION_COOKIE_NAME = 'cms_session';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const BLOCKED_MESSAGE = 'Too many failed login attempts. Try again later.';
const DASHBOARD_URL = '/dashboard';
const HOME_URL = '/';

export function createAuthSessionStore({
  sessionIdFactory = () => randomUUID(),
  nowFn = () => new Date(),
  ttlMs = 60 * 60 * 1000
} = {}) {
  const sessions = new Map();
  const sessionsByUser = new Map();

  function toEpochMs(value) {
    if (value instanceof Date) {
      return value.getTime();
    }

    return Number(value);
  }

  function addSessionToUserIndex(userId, sessionId) {
    const current = sessionsByUser.get(userId) ?? new Set();
    current.add(sessionId);
    sessionsByUser.set(userId, current);
  }

  function removeSessionFromUserIndex(userId, sessionId) {
    const current = sessionsByUser.get(userId);
    if (!current) {
      return;
    }

    current.delete(sessionId);
    if (current.size === 0) {
      sessionsByUser.delete(userId);
    }
  }

  function removeSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      return false;
    }

    sessions.delete(sessionId);
    if (session.user?.id) {
      removeSessionFromUserIndex(session.user.id, sessionId);
    }

    return true;
  }

  function createSession({ user }) {
    const createdAt = nowFn();
    const session = {
      sessionId: sessionIdFactory(),
      user,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + ttlMs).toISOString(),
      authenticated: true
    };

    sessions.set(session.sessionId, session);
    if (user?.id) {
      addSessionToUserIndex(user.id, session.sessionId);
    }

    return session;
  }

  function getSession(sessionId, now = nowFn()) {
    if (!sessionId) {
      return null;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (new Date(session.expiresAt).getTime() <= toEpochMs(now)) {
      removeSession(sessionId);
      return null;
    }

    return session;
  }

  function listActiveSessionsByUser(userId, now = nowFn()) {
    const indexedSessionIds = Array.from(sessionsByUser.get(userId) ?? []);
    return indexedSessionIds
      .map((sessionId) => getSession(sessionId, now))
      .filter(Boolean);
  }

  function invalidateOtherSessions(userId, currentSessionId, now = nowFn()) {
    const activeSessions = listActiveSessionsByUser(userId, now);
    let invalidatedCount = 0;

    for (const session of activeSessions) {
      if (session.sessionId === currentSessionId) {
        continue;
      }

      if (removeSession(session.sessionId)) {
        invalidatedCount += 1;
      }
    }

    return invalidatedCount;
  }

  function clear() {
    sessions.clear();
    sessionsByUser.clear();
  }

  return {
    createSession,
    getSession,
    listActiveSessionsByUser,
    invalidateOtherSessions,
    destroySession: removeSession,
    clear
  };
}

export function parseCookieHeader(cookieHeader = '') {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((result, pair) => {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex === -1) {
        return result;
      }

      const key = pair.slice(0, separatorIndex);
      const value = pair.slice(separatorIndex + 1);
      result[key] = value;
      return result;
    }, {});
}

function requestUsesHttps(req) {
  if (req?.secure === true) {
    return true;
  }

  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase();

  return forwardedProto === 'https';
}

function shouldUseSecureCookie(req, nodeEnv) {
  return nodeEnv === 'production' && requestUsesHttps(req);
}

function createSessionCookieValue(sessionId, { secure } = {}) {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${sessionId}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];

  if (secure) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}

function createExpiredSessionCookieValue({ secure } = {}) {
  const attributes = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ];

  if (secure) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}

function blockedPayload(state) {
  return {
    error: 'LOGIN_TEMPORARILY_BLOCKED',
    message: BLOCKED_MESSAGE,
    retryAfterSeconds: state.retryAfterSeconds,
    blockedUntil: state.blockedUntil
  };
}

function invalidCredentialsPayload() {
  return {
    error: 'INVALID_CREDENTIALS',
    message: INVALID_CREDENTIALS_MESSAGE
  };
}

export function createAuthController({
  repository,
  nowFn = () => new Date(),
  hashPasswordFn = hashPassword,
  failedLoginTracker = createFailedLoginTracker(),
  sessionStoreTtlMs,
  sessionStore = createAuthSessionStore({ nowFn, ttlMs: sessionStoreTtlMs }),
  nodeEnv = process.env.NODE_ENV
}) {
  function clearSession(req) {
    const cookies = parseCookieHeader(req.headers?.cookie ?? '');
    const sessionId = cookies[SESSION_COOKIE_NAME];

    if (!sessionId) {
      return;
    }

    sessionStore.destroySession(sessionId);
  }

  function getAuthenticatedSession(req) {
    const cookies = parseCookieHeader(req.headers?.cookie ?? '');
    const sessionId = cookies[SESSION_COOKIE_NAME];
    return sessionStore.getSession(sessionId, nowFn());
  }

  async function login(req, res) {
    const now = nowFn();
    const submission = parseCredentialSubmission(req.body, now);
    const validationErrors = validateCredentialSubmission(submission);

    if (validationErrors.length > 0) {
      if (submission.email) {
        failedLoginTracker.recordFailure(submission.email, now);
      }

      res.status(401).json(invalidCredentialsPayload());
      return;
    }

    const throttleState = failedLoginTracker.getState(submission.email, now);
    if (throttleState.blocked) {
      res
        .status(429)
        .set('Retry-After', String(throttleState.retryAfterSeconds))
        .json(blockedPayload(throttleState));
      return;
    }

    const account = repository.findUserByNormalizedEmail(submission.email);
    const passwordHash = hashPasswordFn(submission.password);
    const validAccount =
      Boolean(account) &&
      account.status === 'active' &&
      account.passwordHash === passwordHash;

    if (!validAccount) {
      failedLoginTracker.recordFailure(submission.email, now);
      res.status(401).json(invalidCredentialsPayload());
      return;
    }

    failedLoginTracker.reset(submission.email);

    const session = sessionStore.createSession({
      user: {
        id: account.id,
        email: account.emailNormalized
      }
    });

    res
      .set(
        'Set-Cookie',
        createSessionCookieValue(session.sessionId, {
          secure: shouldUseSecureCookie(req, nodeEnv)
        })
      )
      .status(200)
      .json({
        authenticated: true,
        user: session.user,
        dashboardUrl: DASHBOARD_URL
      });
  }

  async function getSession(req, res) {
    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ authenticated: false });
      return;
    }

    res.status(200).json({
      authenticated: true,
      user: session.user,
      dashboardUrl: DASHBOARD_URL
    });
  }

  async function logout(req, res) {
    clearSession(req);

    res
      .set(
        'Set-Cookie',
        createExpiredSessionCookieValue({
          secure: shouldUseSecureCookie(req, nodeEnv)
        })
      )
      .status(200)
      .json({
        authenticated: false,
        redirectUrl: HOME_URL
      });
  }

  async function logoutAndRedirect(req, res) {
    clearSession(req);

    res
      .set(
        'Set-Cookie',
        createExpiredSessionCookieValue({
          secure: shouldUseSecureCookie(req, nodeEnv)
        })
      )
      .redirect(HOME_URL);
  }

  return {
    login,
    getSession,
    logout,
    logoutAndRedirect,
    getAuthenticatedSession,
    failedLoginTracker,
    sessionStore
  };
}
