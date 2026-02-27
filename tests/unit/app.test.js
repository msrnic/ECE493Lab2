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
        { path: '/api/registrations', methods: ['post'] },
        { path: '/api/registrations/confirm', methods: ['get'] }
      ])
    );
  });

  it('executes root redirect route and registration route through app handlers', async () => {
    const app = createApp();
    const rootHandler = getRouteHandler(app, 'get', '/');
    const registrationHandler = getRouteHandler(app, 'post', '/api/registrations');

    const rootResponse = {
      statusCode: 0,
      location: '',
      status(code) {
        this.statusCode = code;
        return this;
      },
      redirect(location) {
        this.location = location;
        return this;
      }
    };

    rootHandler({}, rootResponse);
    expect(rootResponse.statusCode).toBe(302);
    expect(rootResponse.location).toBe('/register');

    const registrationResponse = await invokeHandler(registrationHandler, {
      body: validRegistrationPayload({ email: 'app-route@example.com' })
    });
    expect(registrationResponse.statusCode).toBe(201);
    expect(registrationResponse.body.emailDelivery).toBe('sent');
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
