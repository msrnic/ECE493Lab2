import { describe, expect, it } from 'vitest';
import {
  createAuthController,
  createAuthSessionStore,
  parseCookieHeader
} from '../../../src/controllers/auth-controller.js';
import { createInMemoryRepository } from '../../../src/models/repository.js';
import { hashPassword } from '../../../src/models/user-account-model.js';
import { createMockResponse, invokeHandler } from '../../helpers/http-harness.js';

describe('auth-controller helpers', () => {
  it('parses cookie headers', () => {
    expect(parseCookieHeader('')).toEqual({});
    expect(parseCookieHeader('invalid')).toEqual({});
    expect(parseCookieHeader('a=1; cms_session=abc123; spaced=value')).toEqual({
      a: '1',
      cms_session: 'abc123',
      spaced: 'value'
    });
  });

  it('creates and expires session records', () => {
    let nowMs = new Date('2026-02-01T00:00:00.000Z').getTime();
    const nowFn = () => new Date(nowMs);

    const store = createAuthSessionStore({
      sessionIdFactory: () => 'session-1',
      nowFn,
      ttlMs: 1000
    });

    const session = store.createSession({ user: { id: 'usr-1', email: 'user@example.com' } });
    expect(session.sessionId).toBe('session-1');
    expect(store.getSession('session-1', nowFn())).toEqual(session);
    expect(store.destroySession('missing')).toBe(false);
    expect(store.destroySession('session-1')).toBe(true);
    expect(store.getSession('session-1', nowFn())).toBeNull();

    const recreated = store.createSession({ user: { id: 'usr-1', email: 'user@example.com' } });
    expect(recreated.sessionId).toBe('session-1');
    expect(store.getSession('missing', nowFn())).toBeNull();
    expect(store.getSession('', nowFn())).toBeNull();

    nowMs += 1000;
    expect(store.getSession('session-1', nowFn())).toBeNull();

    store.createSession({ user: { id: 'usr-1', email: 'user@example.com' } });
    store.clear();
    expect(store.getSession('session-1', nowFn())).toBeNull();
  });

  it('lists active user sessions and invalidates non-current sessions', () => {
    let nowMs = new Date('2026-02-01T00:00:00.000Z').getTime();
    const nowFn = () => new Date(nowMs);
    let sequence = 0;
    const store = createAuthSessionStore({
      sessionIdFactory: () => `session-${++sequence}`,
      nowFn,
      ttlMs: 500
    });

    const current = store.createSession({
      user: { id: 'usr-1', email: 'user@example.com' }
    });
    const other = store.createSession({
      user: { id: 'usr-1', email: 'user@example.com' }
    });
    store.createSession({
      user: { id: 'usr-2', email: 'other@example.com' }
    });

    expect(store.listActiveSessionsByUser('usr-1', nowFn())).toHaveLength(2);
    expect(store.invalidateOtherSessions('usr-1', current.sessionId, nowFn())).toBe(1);
    expect(store.getSession(current.sessionId, nowFn())).toBeTruthy();
    expect(store.getSession(current.sessionId, nowMs)).toBeTruthy();
    expect(store.getSession(other.sessionId, nowFn())).toBeNull();

    const mismatchedUserSession = store.createSession({
      user: { id: 'usr-4', email: 'user4@example.com' }
    });
    mismatchedUserSession.user.id = 'usr-missing-index';
    expect(store.invalidateOtherSessions('usr-4', 'not-current', nowFn())).toBe(1);

    const mutatedSessionIdSession = store.createSession({
      user: { id: 'usr-5', email: 'user5@example.com' }
    });
    mutatedSessionIdSession.sessionId = 'session-mutated';
    expect(store.invalidateOtherSessions('usr-5', 'not-current', nowFn())).toBe(0);

    nowMs += 500;
    expect(store.listActiveSessionsByUser('usr-1', nowFn())).toHaveLength(0);
    expect(store.invalidateOtherSessions('missing-user', 'anything', nowFn())).toBe(0);
  });

  it('supports default clock paths for session store and auth controller', async () => {
    const defaultStore = createAuthSessionStore();
    const defaultSession = defaultStore.createSession({
      user: { id: 'usr-default', email: 'default@example.com' }
    });
    expect(defaultStore.getSession(defaultSession.sessionId)).toEqual(defaultSession);

    const repository = createInMemoryRepository();
    repository.createUserAccount({
      id: 'usr-default',
      fullName: 'Default User',
      emailNormalized: 'default@example.com',
      passwordHash: hashPassword('StrongPass!2026'),
      status: 'active',
      createdAt: '2026-02-01T00:00:00.000Z',
      activatedAt: '2026-02-01T00:00:00.000Z'
    });

    const controller = createAuthController({ repository });
    const validationFailure = await invokeHandler(controller.login, {
      body: { email: 'default@example.com' }
    });
    expect(validationFailure.statusCode).toBe(401);

    const success = await invokeHandler(controller.login, {
      body: {
        email: 'default@example.com',
        password: 'StrongPass!2026'
      }
    });
    expect(success.statusCode).toBe(200);
  });

  it('marks cookies secure for production requests flagged as secure', async () => {
    const repository = createInMemoryRepository();
    repository.createUserAccount({
      id: 'usr-secure',
      fullName: 'Secure User',
      emailNormalized: 'secure@example.com',
      passwordHash: hashPassword('StrongPass!2026'),
      status: 'active',
      createdAt: '2026-02-01T00:00:00.000Z',
      activatedAt: '2026-02-01T00:00:00.000Z'
    });

    const controller = createAuthController({
      repository,
      nodeEnv: 'production'
    });

    const req = {
      secure: true,
      headers: {},
      body: {
        email: 'secure@example.com',
        password: 'StrongPass!2026'
      }
    };
    const res = createMockResponse();

    await controller.login(req, res);

    expect(res.statusCode).toBe(200);
    expect(String(res.headers['Set-Cookie'])).toContain('Secure');
  });

  it('clears sessions on logout and supports redirect logout flow', async () => {
    const repository = createInMemoryRepository();
    repository.createUserAccount({
      id: 'usr-logout',
      fullName: 'Logout User',
      emailNormalized: 'logout@example.com',
      passwordHash: hashPassword('StrongPass!2026'),
      status: 'active',
      createdAt: '2026-02-01T00:00:00.000Z',
      activatedAt: '2026-02-01T00:00:00.000Z'
    });

    const controller = createAuthController({
      repository,
      nodeEnv: 'production'
    });

    const loginResponse = await invokeHandler(controller.login, {
      headers: {
        'x-forwarded-proto': 'https'
      },
      body: {
        email: 'logout@example.com',
        password: 'StrongPass!2026'
      }
    });

    const cookieHeader = String(loginResponse.headers['Set-Cookie']).split(';')[0];
    const logoutResponse = await invokeHandler(controller.logout, {
      headers: {
        cookie: cookieHeader,
        'x-forwarded-proto': 'https'
      }
    });

    expect(logoutResponse.statusCode).toBe(200);
    expect(logoutResponse.body).toEqual({
      authenticated: false,
      redirectUrl: '/'
    });
    expect(String(logoutResponse.headers['Set-Cookie'])).toContain('Max-Age=0');
    expect(String(logoutResponse.headers['Set-Cookie'])).toContain('Secure');

    const sessionAfterLogout = await invokeHandler(controller.getSession, {
      headers: {
        cookie: cookieHeader
      }
    });
    expect(sessionAfterLogout.statusCode).toBe(401);

    const redirectLogout = await invokeHandler(controller.logoutAndRedirect, {
      headers: {
        cookie: '',
        'x-forwarded-proto': 'https'
      }
    });
    expect(redirectLogout.statusCode).toBe(302);
    expect(redirectLogout.redirectLocation).toBe('/');
    expect(String(redirectLogout.headers['Set-Cookie'])).toContain('Max-Age=0');
  });
});
