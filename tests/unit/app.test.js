import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { invokeHandler } from '../helpers/http-harness.js';
import { validRegistrationPayload } from '../helpers/test-support.js';

function getRouteHandler(app, method, path) {
  const layer = app.router.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
  );

  return layer.route.stack[0].handle;
}

function getErrorMiddleware(app) {
  return app.router.stack.find((entry) => !entry.route && entry.handle.length === 4).handle;
}

describe('app bootstrap', () => {
  it('creates app with repository and email delivery service locals', () => {
    const app = createApp();

    expect(typeof app).toBe('function');
    expect(app.locals.repository).toBeDefined();
    expect(app.locals.emailDeliveryService).toBeDefined();
    expect(typeof app.locals.emailDeliveryService.deliverRegistrationConfirmation).toBe('function');
    expect(app.locals.passwordChangeModel).toBeDefined();
    expect(app.locals.attemptThrottleModel).toBeDefined();
    expect(app.locals.notificationModel).toBeDefined();
    expect(app.locals.auditLogModel).toBeDefined();
  });

  it('registers expected routes', () => {
    const app = createApp();
    const routeEntries = app.router.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }));

    expect(routeEntries).toEqual(
      expect.arrayContaining([
        { path: '/', methods: ['get'] },
        { path: '/register', methods: ['get'] },
        { path: '/login', methods: ['get'] },
        { path: '/logout', methods: ['post'] },
        { path: '/account/password-change', methods: ['get'] },
        { path: '/dashboard', methods: ['get'] },
        { path: '/api/registrations', methods: ['post'] },
        { path: '/api/registrations/confirm', methods: ['get'] },
        { path: '/api/v1/account/password-change', methods: ['post'] }
      ])
    );
  });

  it('executes root index route and registration/login routes through app handlers', async () => {
    const app = createApp();
    const rootHandler = getRouteHandler(app, 'get', '/');
    const loginPageHandler = getRouteHandler(app, 'get', '/login');
    const logoutHandler = getRouteHandler(app, 'post', '/logout');
    const passwordPageHandler = getRouteHandler(app, 'get', '/account/password-change');
    const dashboardHandler = getRouteHandler(app, 'get', '/dashboard');
    const passwordApiHandler = getRouteHandler(app, 'post', '/api/v1/account/password-change');
    const registrationHandler = getRouteHandler(app, 'post', '/api/registrations');
    const rootResponse = await invokeHandler(rootHandler);
    expect(rootResponse.statusCode).toBe(200);
    expect(rootResponse.contentType).toBe('html');
    expect(rootResponse.text).toContain('Conference Management System');
    expect(rootResponse.text).toContain('href="/register"');
    expect(rootResponse.text).toContain('href="/login"');

    const loginResponse = await invokeHandler(loginPageHandler);
    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.contentType).toBe('html');
    expect(loginResponse.text).toContain('data-login-form');

    const passwordPageRedirect = await invokeHandler(passwordPageHandler);
    expect(passwordPageRedirect.statusCode).toBe(302);
    expect(passwordPageRedirect.redirectLocation).toBe('/login');

    app.locals.repository.createUserAccount({
      id: 'usr-app-pw',
      fullName: 'Password Route User',
      emailNormalized: 'pw-route@example.com',
      passwordHash: hashPassword('StrongPass!2026'),
      status: 'active',
      credentialVersion: 0,
      createdAt: '2026-02-01T00:00:00.000Z',
      activatedAt: '2026-02-01T00:00:00.000Z'
    });
    const loginApiResponse = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'pw-route@example.com',
        password: 'StrongPass!2026'
      }
    });
    const passwordChangeResponse = await invokeHandler(passwordApiHandler, {
      headers: {
        cookie: String(loginApiResponse.headers['Set-Cookie']).split(';')[0]
      },
      body: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });
    expect(passwordChangeResponse.statusCode).toBe(200);
    expect(passwordChangeResponse.body.status).toBe('updated');

    const logoutResponse = await invokeHandler(logoutHandler, {
      headers: {
        cookie: String(loginApiResponse.headers['Set-Cookie']).split(';')[0]
      }
    });
    expect(logoutResponse.statusCode).toBe(302);
    expect(logoutResponse.redirectLocation).toBe('/');
    expect(String(logoutResponse.headers['Set-Cookie'])).toContain('Max-Age=0');

    const dashboardAfterLogout = await invokeHandler(dashboardHandler, {
      headers: {
        cookie: String(loginApiResponse.headers['Set-Cookie']).split(';')[0]
      }
    });
    expect(dashboardAfterLogout.statusCode).toBe(302);
    expect(dashboardAfterLogout.redirectLocation).toBe('/login');

    const registrationResponse = await invokeHandler(registrationHandler, {
      body: validRegistrationPayload({ email: 'app-route@example.com' })
    });
    expect(registrationResponse.statusCode).toBe(201);
    expect(registrationResponse.body.emailDelivery).toBe('sent');
    expect(registrationResponse.body.confirmationUrl).toContain('/api/registrations/confirm?token=');
  });

  it('omits registration confirmationUrl in production mode', async () => {
    const app = createApp({ authNodeEnv: 'production' });
    const registrationHandler = getRouteHandler(app, 'post', '/api/registrations');

    const registrationResponse = await invokeHandler(registrationHandler, {
      body: validRegistrationPayload({ email: 'prod-route@example.com' })
    });

    expect(registrationResponse.statusCode).toBe(201);
    expect(registrationResponse.body.confirmationUrl).toBeUndefined();
  });

  it('executes app error middleware', () => {
    const app = createApp();
    const errorMiddleware = getErrorMiddleware(app);

    const response = {
      statusCode: 0,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      }
    };

    errorMiddleware(new Error('boom'), {}, response, () => {});

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error.'
    });
  });
});
