import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { invokeHandler } from '../helpers/http-harness.js';
import {
  createClock,
  extractTokenFromConfirmationUrl,
  validRegistrationPayload
} from '../helpers/test-support.js';

function seedActiveAccount(repository, {
  id = 'usr-1',
  email = 'user@example.com',
  password = 'StrongPass!2026'
} = {}) {
  return repository.createUserAccount({
    id,
    fullName: 'User Example',
    emailNormalized: email,
    passwordHash: hashPassword(password),
    status: 'active',
    createdAt: '2026-02-01T00:00:00.000Z',
    activatedAt: '2026-02-01T00:00:00.000Z'
  });
}

function getSessionCookieHeader(response) {
  const setCookie = response.headers['Set-Cookie'];
  if (!setCookie) {
    return '';
  }

  return String(setCookie).split(';')[0];
}

function getRouteHandler(app, method, path) {
  const layer = app.router.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
  );

  return layer.route.stack[0].handle;
}

describe('integration: auth api', () => {
  it('serves browser module dependencies needed for login-page redirects', async () => {
    const app = createApp();
    const servesPath = (requestPath) =>
      app.router.stack.some(
        (layer) => !layer.route && layer.name === 'serveStatic' && layer.match(requestPath)
      );

    expect(servesPath('/assets/js/app.js')).toBe(true);
    expect(servesPath('/controllers/login-controller.js')).toBe(true);
    expect(servesPath('/controllers/session-controller.js')).toBe(true);
    expect(servesPath('/controllers/password-change-form-controller.js')).toBe(true);

    const appModuleSource = readFileSync(new URL('../../src/assets/js/app.js', import.meta.url), 'utf8');
    expect(appModuleSource).toContain('bootstrapLoginPage');
    expect(appModuleSource).toContain('password-change-form-controller.js');
    expect(appModuleSource).not.toContain('password-change-controller.js');

    const passwordChangeFormSource = readFileSync(
      new URL('../../src/controllers/password-change-form-controller.js', import.meta.url),
      'utf8'
    );
    expect(passwordChangeFormSource).not.toContain('password-change-model.js');
  });

  it('authenticates a newly registered account after confirmation', async () => {
    const app = createApp();
    const registrationHandler = getRouteHandler(app, 'post', '/api/registrations');
    const confirmationHandler = getRouteHandler(app, 'get', '/api/registrations/confirm');

    const registrationResponse = await invokeHandler(registrationHandler, {
      body: validRegistrationPayload({
        email: 'integration.fresh@example.com'
      })
    });

    expect(registrationResponse.statusCode).toBe(201);
    expect(typeof registrationResponse.body.confirmationUrl).toBe('string');

    const token = extractTokenFromConfirmationUrl(registrationResponse.body.confirmationUrl);
    const confirmationResponse = await invokeHandler(confirmationHandler, {
      headers: { accept: 'text/html' },
      query: { token }
    });

    expect(confirmationResponse.statusCode).toBe(302);
    expect(confirmationResponse.redirectLocation).toBe('/login?confirmed=1');

    const loginResponse = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'integration.fresh@example.com',
        password: 'StrongPass!2026'
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body.authenticated).toBe(true);
    expect(loginResponse.body.user.email).toBe('integration.fresh@example.com');
  });

  it('authenticates with valid credentials and returns session state', async () => {
    const clock = createClock('2026-02-01T00:00:00.000Z');
    const app = createApp({ nowFn: clock.now });
    seedActiveAccount(app.locals.repository);

    const loginResponse = await invokeHandler(app.locals.authController.login, {
      body: {
        email: '  USER@example.com  ',
        password: 'StrongPass!2026'
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body).toEqual({
      authenticated: true,
      user: {
        id: 'usr-1',
        email: 'user@example.com'
      },
      dashboardUrl: '/dashboard'
    });
    expect(loginResponse.body.challenge).toBeUndefined();
    expect(String(loginResponse.headers['Set-Cookie'])).toContain('cms_session=');
    expect(String(loginResponse.headers['Set-Cookie'])).toContain('HttpOnly');

    const sessionResponse = await invokeHandler(app.locals.authController.getSession, {
      headers: {
        cookie: getSessionCookieHeader(loginResponse)
      }
    });

    expect(sessionResponse.statusCode).toBe(200);
    expect(sessionResponse.body.authenticated).toBe(true);
    expect(sessionResponse.body.user.email).toBe('user@example.com');

    const logoutResponse = await invokeHandler(app.locals.authController.logout, {
      headers: {
        cookie: getSessionCookieHeader(loginResponse)
      }
    });

    expect(logoutResponse.statusCode).toBe(200);
    expect(logoutResponse.body).toEqual({
      authenticated: false,
      redirectUrl: '/'
    });
    expect(String(logoutResponse.headers['Set-Cookie'])).toContain('Max-Age=0');

    const sessionAfterLogout = await invokeHandler(app.locals.authController.getSession, {
      headers: {
        cookie: getSessionCookieHeader(loginResponse)
      }
    });
    expect(sessionAfterLogout.statusCode).toBe(401);

    const logoutWithoutSession = await invokeHandler(app.locals.authController.logout);
    expect(logoutWithoutSession.statusCode).toBe(200);
    expect(logoutWithoutSession.body.authenticated).toBe(false);
  });

  it('returns generic invalid credentials response and keeps session unauthenticated', async () => {
    const clock = createClock('2026-02-01T00:00:00.000Z');
    const app = createApp({ nowFn: clock.now });
    seedActiveAccount(app.locals.repository);

    const invalid = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'user@example.com',
        password: 'WrongPassword!2026'
      }
    });

    expect(invalid.statusCode).toBe(401);
    expect(invalid.body).toEqual({
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.'
    });

    const sessionResponse = await invokeHandler(app.locals.authController.getSession, {
      headers: {
        cookie: getSessionCookieHeader(invalid)
      }
    });

    expect(sessionResponse.statusCode).toBe(401);
    expect(sessionResponse.body).toEqual({ authenticated: false });
  });

  it('blocks additional attempts after five failures and returns retry metadata', async () => {
    const clock = createClock('2026-02-01T00:00:00.000Z');
    const app = createApp({ nowFn: clock.now });
    seedActiveAccount(app.locals.repository);

    for (let i = 0; i < 5; i += 1) {
      const response = await invokeHandler(app.locals.authController.login, {
        body: {
          email: 'user@example.com',
          password: 'WrongPassword!2026'
        }
      });

      expect(response.statusCode).toBe(401);
    }

    const blocked = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'user@example.com',
        password: 'WrongPassword!2026'
      }
    });

    expect(blocked.statusCode).toBe(429);
    expect(blocked.body.error).toBe('LOGIN_TEMPORARILY_BLOCKED');
    expect(blocked.body.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.body.blockedUntil).toBeDefined();
    expect(Number(blocked.headers['Retry-After'])).toBeGreaterThan(0);

    clock.advanceMs(10 * 60 * 1000 + 1);

    const unblocked = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'user@example.com',
        password: 'StrongPass!2026'
      }
    });

    expect(unblocked.statusCode).toBe(200);
  });

  it('resets failed-attempt counters immediately after successful login', async () => {
    const clock = createClock('2026-02-01T00:00:00.000Z');
    const app = createApp({ nowFn: clock.now });
    seedActiveAccount(app.locals.repository);

    for (let i = 0; i < 4; i += 1) {
      await invokeHandler(app.locals.authController.login, {
        body: {
          email: 'user@example.com',
          password: 'WrongPassword!2026'
        }
      });
    }

    const success = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'user@example.com',
        password: 'StrongPass!2026'
      }
    });

    expect(success.statusCode).toBe(200);

    const invalidAfterReset = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'user@example.com',
        password: 'WrongPassword!2026'
      }
    });

    expect(invalidAfterReset.statusCode).toBe(401);
  });

  it('keeps non-active accounts and malformed submissions denied', async () => {
    const app = createApp();
    app.locals.repository.createUserAccount({
      id: 'usr-pending',
      fullName: 'Pending User',
      emailNormalized: 'pending@example.com',
      passwordHash: hashPassword('StrongPass!2026'),
      status: 'pending',
      createdAt: '2026-02-01T00:00:00.000Z',
      activatedAt: null
    });

    const pendingResponse = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'pending@example.com',
        password: 'StrongPass!2026'
      }
    });
    expect(pendingResponse.statusCode).toBe(401);

    const malformed = await invokeHandler(app.locals.authController.login, {
      body: {
        email: '   '
      }
    });
    expect(malformed.statusCode).toBe(401);
  });

  it('uses secure auth cookies in production mode', async () => {
    const app = createApp({ authNodeEnv: 'production' });
    seedActiveAccount(app.locals.repository);

    const response = await invokeHandler(app.locals.authController.login, {
      headers: {
        'x-forwarded-proto': 'https'
      },
      body: {
        email: 'user@example.com',
        password: 'StrongPass!2026'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(String(response.headers['Set-Cookie'])).toContain('Secure');
  });

  it('does not force secure auth cookies on non-https production requests', async () => {
    const app = createApp({ authNodeEnv: 'production' });
    seedActiveAccount(app.locals.repository);

    const response = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'user@example.com',
        password: 'StrongPass!2026'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(String(response.headers['Set-Cookie'])).not.toContain('Secure');
  });

  it('expires old sessions by ttl when clock advances', async () => {
    const clock = createClock('2026-02-01T00:00:00.000Z');
    const app = createApp({
      nowFn: clock.now,
      authSessionTtlMs: 500
    });
    seedActiveAccount(app.locals.repository);

    const login = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'user@example.com',
        password: 'StrongPass!2026'
      }
    });
    expect(login.statusCode).toBe(200);

    clock.advanceMs(500);

    const session = await invokeHandler(app.locals.authController.getSession, {
      headers: {
        cookie: getSessionCookieHeader(login)
      }
    });

    expect(session.statusCode).toBe(401);
  });
});
