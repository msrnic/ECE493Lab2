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

export function createAuthSessionStore({
  sessionIdFactory = () => randomUUID(),
  nowFn = () => new Date(),
  ttlMs = 60 * 60 * 1000
} = {}) {
  const sessions = new Map();

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

    if (new Date(session.expiresAt).getTime() <= now.getTime()) {
      sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  function clear() {
    sessions.clear();
  }

  return {
    createSession,
    getSession,
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

function isSecureEnvironment(nodeEnv) {
  return nodeEnv === 'production';
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
          secure: isSecureEnvironment(nodeEnv)
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

  return {
    login,
    getSession,
    getAuthenticatedSession,
    failedLoginTracker,
    sessionStore
  };
}
