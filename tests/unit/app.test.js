import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { invokeAppRoute, invokeHandler } from '../helpers/http-harness.js';
import { validRegistrationPayload } from '../helpers/test-support.js';
import { createTempPersistencePaths } from '../helpers/persistence-paths.js';

function extractInputValue(html, inputName) {
  const match = html.match(new RegExp(`<input[^>]*name="${inputName}"[^>]*value="([^"]*)"`, 'i'));
  return match ? match[1] : null;
}

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
        { path: '/submit-paper', methods: ['get'] },
        { path: '/logout', methods: ['post'] },
        { path: '/account/role', methods: ['post'] },
        { path: '/account/password-change', methods: ['get'] },
        { path: '/dashboard', methods: ['get'] },
        { path: '/api/registrations', methods: ['post'] },
        { path: '/api/registrations/confirm', methods: ['get'] },
        { path: '/api/v1/account/password-change', methods: ['post'] },
        { path: '/api/submissions/:submissionId/draft', methods: ['put'] },
        { path: '/api/submissions/:submissionId/draft', methods: ['get'] },
        { path: '/api/submissions/:submissionId/draft/versions', methods: ['get'] },
        { path: '/api/submissions/:submissionId/draft/versions/:versionId', methods: ['get'] },
        { path: '/api/submissions/:submissionId/draft/versions/:versionId/restore', methods: ['post'] },
        { path: '/api/submissions/:submissionId/draft/retention/prune', methods: ['post'] }
      ])
    );
  });

  it('executes root index route and registration/login routes through app handlers', async () => {
    const app = createApp();
    const rootHandler = getRouteHandler(app, 'get', '/');
    const loginPageHandler = getRouteHandler(app, 'get', '/login');
    const submitPaperHandler = getRouteHandler(app, 'get', '/submit-paper');
    const logoutHandler = getRouteHandler(app, 'post', '/logout');
    const roleHandler = getRouteHandler(app, 'post', '/account/role');
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
    expect(rootResponse.text).not.toContain('href="/assign-reviewers"');

    const loginResponse = await invokeHandler(loginPageHandler);
    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.contentType).toBe('html');
    expect(loginResponse.text).toContain('data-login-form');

    const submitPaperResponse = await invokeHandler(submitPaperHandler);
    expect(submitPaperResponse.statusCode).toBe(302);
    expect(submitPaperResponse.redirectLocation).toBe('/login');

    const assignReviewersRedirect = await invokeAppRoute(app, {
      method: 'get',
      path: '/assign-reviewers'
    });
    expect(assignReviewersRedirect.statusCode).toBe(302);
    expect(assignReviewersRedirect.redirectLocation).toBe('/login');

    const passwordPageRedirect = await invokeHandler(passwordPageHandler);
    expect(passwordPageRedirect.statusCode).toBe(302);
    expect(passwordPageRedirect.redirectLocation).toBe('/login');

    app.locals.repository.createUserAccount({
      id: 'usr-app-pw',
      fullName: 'Password Route User',
      emailNormalized: 'pw-route@example.com',
      passwordHash: hashPassword('StrongPass!2026'),
      role: 'editor',
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
    const sessionCookie = String(loginApiResponse.headers['Set-Cookie']).split(';')[0];
    const sessionId = sessionCookie.split('=')[1];
    const passwordChangeResponse = await invokeHandler(passwordApiHandler, {
      headers: {
        cookie: sessionCookie
      },
      body: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });
    expect(passwordChangeResponse.statusCode).toBe(200);
    expect(passwordChangeResponse.body.status).toBe('updated');

    const dashboardEditor = await invokeHandler(dashboardHandler, {
      headers: {
        cookie: sessionCookie
      }
    });
    expect(dashboardEditor.statusCode).toBe(200);
    expect(dashboardEditor.text).toContain('Current role: Editor');
    expect(dashboardEditor.text).toContain('data-dashboard-submit-paper-disabled');
    expect(dashboardEditor.text).toContain('data-dashboard-assign-reviewers');
    expect(dashboardEditor.text).not.toContain('data-dashboard-assign-reviewers-disabled');

    const submitPaperAsEditor = await invokeHandler(submitPaperHandler, {
      headers: {
        cookie: sessionCookie
      }
    });
    expect(submitPaperAsEditor.statusCode).toBe(302);
    expect(submitPaperAsEditor.redirectLocation).toBe('/dashboard?roleUpdated=author_required');

    const assignReviewersAsEditor = await invokeAppRoute(app, {
      method: 'get',
      path: '/assign-reviewers',
      headers: {
        cookie: sessionCookie
      }
    });
    expect(assignReviewersAsEditor.statusCode).toBe(200);
    expect(assignReviewersAsEditor.text).toContain('data-assignment-root');

    const roleUpdate = await invokeHandler(roleHandler, {
      headers: {
        cookie: sessionCookie
      },
      body: {
        role: 'author'
      }
    });
    expect(roleUpdate.statusCode).toBe(302);
    expect(roleUpdate.redirectLocation).toBe('/dashboard?roleUpdated=updated');

    const dashboardAuthor = await invokeHandler(dashboardHandler, {
      headers: {
        cookie: sessionCookie
      },
      query: {
        roleUpdated: 'updated'
      }
    });
    expect(dashboardAuthor.statusCode).toBe(200);
    expect(dashboardAuthor.text).toContain('Current role: Author');
    expect(dashboardAuthor.text).toContain('Role updated successfully.');
    expect(dashboardAuthor.text).toContain('data-dashboard-submit-paper');
    expect(dashboardAuthor.text).toContain('data-dashboard-assign-reviewers-disabled');

    const submitPaperAsAuthor = await invokeHandler(submitPaperHandler, {
      headers: {
        cookie: sessionCookie
      }
    });
    expect(submitPaperAsAuthor.statusCode).toBe(200);
    expect(submitPaperAsAuthor.contentType).toBe('html');
    expect(submitPaperAsAuthor.text).toContain('data-submit-paper-form');
    expect(extractInputValue(submitPaperAsAuthor.text, 'sessionId')).toBe(sessionId);
    expect(extractInputValue(submitPaperAsAuthor.text, 'actionSequenceId')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(submitPaperAsAuthor.text).toContain('Current role: Author.');
    expect(submitPaperAsAuthor.text).toContain('data-submit-paper-role-change');
    expect(submitPaperAsAuthor.text).toContain('Open dashboard role settings');
    expect(submitPaperAsAuthor.text).toContain('data-submit-paper-role-form');
    expect(submitPaperAsAuthor.text).toContain('data-submit-paper-role-select');
    expect(submitPaperAsAuthor.text).toContain('data-submit-paper-role-submit');
    expect(submitPaperAsAuthor.text).toContain('data-submit-paper-draft');
    expect(submitPaperAsAuthor.text).toContain('data-draft-save');
    expect(submitPaperAsAuthor.text).toContain('data-draft-load');
    expect(submitPaperAsAuthor.text).toContain('data-draft-history-refresh');
    expect(submitPaperAsAuthor.text).toContain('data-draft-history-list');

    const assignReviewersAsAuthor = await invokeAppRoute(app, {
      method: 'get',
      path: '/assign-reviewers',
      headers: {
        cookie: sessionCookie
      }
    });
    expect(assignReviewersAsAuthor.statusCode).toBe(302);
    expect(assignReviewersAsAuthor.redirectLocation).toBe('/dashboard?roleUpdated=editor_required');

    const logoutResponse = await invokeHandler(logoutHandler, {
      headers: {
        cookie: sessionCookie
      }
    });
    expect(logoutResponse.statusCode).toBe(302);
    expect(logoutResponse.redirectLocation).toBe('/');
    expect(String(logoutResponse.headers['Set-Cookie'])).toContain('Max-Age=0');

    const dashboardAfterLogout = await invokeHandler(dashboardHandler, {
      headers: {
        cookie: sessionCookie
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
    const paths = createTempPersistencePaths('ece493-app-prod-');
    const app = createApp({
      authNodeEnv: 'production',
      databaseDirectory: paths.databaseDirectory,
      uploadsDirectory: paths.uploadsDirectory
    });
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
