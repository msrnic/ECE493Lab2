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
    expect(store.getSession('missing', nowFn())).toBeNull();
    expect(store.getSession('', nowFn())).toBeNull();

    nowMs += 1000;
    expect(store.getSession('session-1', nowFn())).toBeNull();

    store.createSession({ user: { id: 'usr-1', email: 'user@example.com' } });
    store.clear();
    expect(store.getSession('session-1', nowFn())).toBeNull();
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
});
