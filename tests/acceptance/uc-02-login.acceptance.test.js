import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { invokeHandler } from '../helpers/http-harness.js';
import {
  createClock,
  extractTokenFromConfirmationUrl,
  validRegistrationPayload
} from '../helpers/test-support.js';

function seedActiveAccount(app, {
  email = 'user@example.com',
  password = 'StrongPass!2026'
} = {}) {
  app.locals.repository.createUserAccount({
    id: 'usr-acceptance',
    fullName: 'Acceptance User',
    emailNormalized: email,
    passwordHash: hashPassword(password),
    status: 'active',
    createdAt: '2026-02-01T00:00:00.000Z',
    activatedAt: '2026-02-01T00:00:00.000Z'
  });
}

function getRouteHandler(app, method, path) {
  const layer = app.router.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
  );

  return layer.route.stack[0].handle;
}

function getSessionCookieHeader(response) {
  const setCookie = response.headers['Set-Cookie'];
  if (!setCookie) {
    return '';
  }

  return String(setCookie).split(';')[0];
}

describe('UC-02-AS acceptance suite', () => {
  it('Given the login page is opened, When browser assets are requested, Then login bootstrap dependencies are available', async () => {
    const app = createApp();
    const loginPageHandler = getRouteHandler(app, 'get', '/login');
    const loginPage = await invokeHandler(loginPageHandler);
    expect(loginPage.statusCode).toBe(200);
    expect(loginPage.text).toContain('/assets/js/app.js');

    const servesPath = (requestPath) =>
      app.router.stack.some(
        (layer) => !layer.route && layer.name === 'serveStatic' && layer.match(requestPath)
      );

    expect(servesPath('/assets/js/app.js')).toBe(true);
    expect(servesPath('/controllers/login-controller.js')).toBe(true);
    expect(servesPath('/controllers/session-controller.js')).toBe(true);
  });

  it('Given valid credentials, When the user logs in, Then the user is authenticated and redirected to dashboard', async () => {
    const app = createApp();
    seedActiveAccount(app);

    const loginResponse = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'user@example.com',
        password: 'StrongPass!2026'
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body.authenticated).toBe(true);
    expect(loginResponse.body.dashboardUrl).toBe('/dashboard');

    const dashboardHandler = getRouteHandler(app, 'get', '/dashboard');
    const dashboardResponse = await invokeHandler(dashboardHandler, {
      headers: {
        cookie: getSessionCookieHeader(loginResponse)
      }
    });

    expect(dashboardResponse.statusCode).toBe(200);
    expect(dashboardResponse.text).toContain('Dashboard');
  });

  it('Given an authenticated dashboard session, When the user logs out, Then the user is redirected to the first page and dashboard access is revoked', async () => {
    const app = createApp();
    seedActiveAccount(app);

    const loginResponse = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'user@example.com',
        password: 'StrongPass!2026'
      }
    });
    expect(loginResponse.statusCode).toBe(200);

    const logoutHandler = getRouteHandler(app, 'post', '/logout');
    const logoutResponse = await invokeHandler(logoutHandler, {
      headers: {
        cookie: getSessionCookieHeader(loginResponse)
      }
    });

    expect(logoutResponse.statusCode).toBe(302);
    expect(logoutResponse.redirectLocation).toBe('/');

    const homeHandler = getRouteHandler(app, 'get', '/');
    const homeResponse = await invokeHandler(homeHandler);
    expect(homeResponse.statusCode).toBe(200);
    expect(homeResponse.text).toContain('Conference Management System');

    const dashboardHandler = getRouteHandler(app, 'get', '/dashboard');
    const dashboardAfterLogout = await invokeHandler(dashboardHandler, {
      headers: {
        cookie: getSessionCookieHeader(loginResponse)
      }
    });
    expect(dashboardAfterLogout.statusCode).toBe(302);
    expect(dashboardAfterLogout.redirectLocation).toBe('/login');
  });

  it('allows a newly registered user to login after confirmation', async () => {
    const app = createApp();
    const registrationHandler = getRouteHandler(app, 'post', '/api/registrations');
    const confirmationHandler = getRouteHandler(app, 'get', '/api/registrations/confirm');
    const dashboardHandler = getRouteHandler(app, 'get', '/dashboard');

    const registrationResponse = await invokeHandler(registrationHandler, {
      body: validRegistrationPayload({
        email: 'new.user@example.com'
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
        email: 'new.user@example.com',
        password: 'StrongPass!2026'
      }
    });
    expect(loginResponse.statusCode).toBe(200);

    const dashboardResponse = await invokeHandler(dashboardHandler, {
      headers: {
        cookie: getSessionCookieHeader(loginResponse)
      }
    });
    expect(dashboardResponse.statusCode).toBe(200);
  });

  it('Given invalid credentials, When login is attempted, Then access is denied and an error message is shown', async () => {
    const app = createApp();
    seedActiveAccount(app);

    const response = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'user@example.com',
        password: 'WrongPassword!2026'
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Invalid email or password.');

    const dashboardHandler = getRouteHandler(app, 'get', '/dashboard');
    const dashboardResponse = await invokeHandler(dashboardHandler);
    expect(dashboardResponse.statusCode).toBe(302);
    expect(dashboardResponse.redirectLocation).toBe('/login');
  });

  it('Given an account has reached 5 failed login attempts, When login is attempted before 10 minutes have passed, Then access is denied and a temporary-block message is shown', async () => {
    const clock = createClock('2026-02-01T00:00:00.000Z');
    const app = createApp({ nowFn: clock.now });
    seedActiveAccount(app);

    for (let i = 0; i < 5; i += 1) {
      const attempt = await invokeHandler(app.locals.authController.login, {
        body: {
          email: 'user@example.com',
          password: 'WrongPassword!2026'
        }
      });
      expect(attempt.statusCode).toBe(401);
    }

    const blockedAttempt = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'user@example.com',
        password: 'WrongPassword!2026'
      }
    });

    expect(blockedAttempt.statusCode).toBe(429);
    expect(blockedAttempt.body.message).toBe('Too many failed login attempts. Try again later.');
    expect(blockedAttempt.body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('Given an account has prior failed login attempts, When the user logs in with valid credentials, Then authentication succeeds and the failed-attempt counter is reset', async () => {
    const app = createApp();
    seedActiveAccount(app);

    for (let i = 0; i < 4; i += 1) {
      await invokeHandler(app.locals.authController.login, {
        body: {
          email: 'user@example.com',
          password: 'WrongPassword!2026'
        }
      });
    }

    const successfulLogin = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'user@example.com',
        password: 'StrongPass!2026'
      }
    });

    expect(successfulLogin.statusCode).toBe(200);
    expect(successfulLogin.body.authenticated).toBe(true);

    const firstFailureAfterReset = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'user@example.com',
        password: 'WrongPassword!2026'
      }
    });

    expect(firstFailureAfterReset.statusCode).toBe(401);
  });

  it('enforces SC-007 by completing successful login with only email and password (no extra challenge)', async () => {
    const app = createApp();
    seedActiveAccount(app);

    const response = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'user@example.com',
        password: 'StrongPass!2026'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.challenge).toBeUndefined();
    expect(response.body.mfaRequired).toBeUndefined();
  });
});
