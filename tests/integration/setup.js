import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { invokeHandler } from '../helpers/http-harness.js';
import { createClock } from '../helpers/test-support.js';

export function getRouteHandler(app, method, path) {
  const layer = app.router.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
  );

  return layer?.route?.stack?.[0]?.handle;
}

export function getSessionCookieHeader(response) {
  const setCookie = response.headers['Set-Cookie'];
  if (!setCookie) {
    return '';
  }

  return String(setCookie).split(';')[0];
}

export function seedActiveAccount(app, {
  id = 'usr-password-1',
  email = 'user@example.com',
  password = 'StrongPass!2026'
} = {}) {
  app.locals.repository.createUserAccount({
    id,
    fullName: 'Password User',
    emailNormalized: email,
    passwordHash: hashPassword(password),
    status: 'active',
    credentialVersion: 0,
    createdAt: '2026-02-01T00:00:00.000Z',
    activatedAt: '2026-02-01T00:00:00.000Z'
  });

  return {
    id,
    email,
    password
  };
}

export async function loginUser(app, {
  email = 'user@example.com',
  password = 'StrongPass!2026'
} = {}) {
  const response = await invokeHandler(app.locals.authController.login, {
    body: {
      email,
      password
    }
  });

  return {
    response,
    cookie: getSessionCookieHeader(response)
  };
}

export function createPasswordChangeContext({ start = '2026-02-01T00:00:00.000Z' } = {}) {
  const clock = createClock(start);
  const app = createApp({ nowFn: clock.now });

  return {
    app,
    clock,
    passwordChangeHandler: getRouteHandler(app, 'post', '/api/v1/account/password-change'),
    passwordChangePageHandler: getRouteHandler(app, 'get', '/account/password-change'),
    dashboardHandler: getRouteHandler(app, 'get', '/dashboard')
  };
}
