import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import {
  createHttpIntegrationContext,
  invokeHandler
} from '../helpers/http-harness.js';

function getRouteHandler(app, method, path) {
  const layer = app.router.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
  );

  return layer.route.stack[0].handle;
}

describe('contract: GET /register', () => {
  it('returns html chooser page at / with links to register and login', async () => {
    const app = createApp();
    const rootHandler = getRouteHandler(app, 'get', '/');
    const response = await invokeHandler(rootHandler);

    expect(response.statusCode).toBe(200);
    expect(response.contentType).toBe('html');
    expect(response.text).toContain('href="/register"');
    expect(response.text).toContain('href="/login"');
  });

  it('returns html registration page', async () => {
    const { registrationPageController } = createHttpIntegrationContext();

    const response = await invokeHandler(registrationPageController);

    expect(response.statusCode).toBe(200);
    expect(response.contentType).toBe('html');
    expect(response.text).toContain('<form');
    expect(response.text).toContain('name="fullName"');
  });
});
