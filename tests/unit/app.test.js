import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
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
        { path: '/dashboard', methods: ['get'] },
        { path: '/api/registrations', methods: ['post'] },
        { path: '/api/registrations/confirm', methods: ['get'] }
      ])
    );
  });

  it('executes root index route and registration/login routes through app handlers', async () => {
    const app = createApp();
    const rootHandler = getRouteHandler(app, 'get', '/');
    const loginPageHandler = getRouteHandler(app, 'get', '/login');
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
