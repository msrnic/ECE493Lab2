import { afterEach, describe, expect, it } from 'vitest';

import { invokeApp } from '../setup/httpHarness.js';
import { createTestServer } from '../setup/testServer.js';

const cleanups = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()();
  }
});

describe('view routes', () => {
  it('serves home/register/login pages, admin/editor pages, and static assets', async () => {
    const context = createTestServer();
    cleanups.push(context.cleanup);

    const homePage = await invokeApp(context.app, { path: '/' });
    expect(homePage.status).toBe(200);
    expect(homePage.text).toContain('Conference Management System');
    expect(homePage.text).toContain('href="/register"');
    expect(homePage.text).toContain('href="/login"');
    expect(homePage.text).not.toContain('data-decision-workflow-app');

    const registerPage = await invokeApp(context.app, { path: '/register' });
    expect(registerPage.status).toBe(200);
    expect(registerPage.text).toContain('Register');

    const loginPage = await invokeApp(context.app, { path: '/login' });
    expect(loginPage.status).toBe(200);
    expect(loginPage.text).toContain('Login');

    const adminPage = await invokeApp(context.app, { path: '/admin/schedule-generation' });
    expect(adminPage.status).toBe(200);
    expect(adminPage.text).toContain('Generate Conference Schedule');

    const editorPage = await invokeApp(context.app, { path: '/editor/schedule-conflicts' });
    expect(editorPage.status).toBe(200);
    expect(editorPage.text).toContain('Schedule Conflict Review');

    const asset = await invokeApp(context.app, { path: '/assets/css/schedule-generation.css' });
    expect(asset.status).toBe(200);
    expect(asset.text).toContain('linear-gradient');
  });
});
