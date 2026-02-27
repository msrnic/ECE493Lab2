import { describe, expect, it } from 'vitest';
import { invokeHandler } from '../helpers/http-harness.js';
import {
  createPasswordChangeContext,
  loginUser,
  seedActiveAccount
} from './setup.js';

describe('integration: password change success', () => {
  it('updates credentials, invalidates other sessions, queues notifications, and records audit', async () => {
    const { app, passwordChangeHandler, dashboardHandler } = createPasswordChangeContext();
    seedActiveAccount(app, {
      id: 'usr-success-1',
      email: 'success@example.com',
      password: 'StrongPass!2026'
    });

    const currentLogin = await loginUser(app, {
      email: 'success@example.com',
      password: 'StrongPass!2026'
    });
    const otherLogin = await loginUser(app, {
      email: 'success@example.com',
      password: 'StrongPass!2026'
    });

    const changeResponse = await invokeHandler(passwordChangeHandler, {
      headers: {
        cookie: currentLogin.cookie,
        'user-agent': 'integration-test'
      },
      body: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });

    expect(changeResponse.statusCode).toBe(200);
    expect(changeResponse.body.status).toBe('updated');
    expect(changeResponse.body.currentSessionRetained).toBe(true);
    expect(changeResponse.body.sessionsInvalidated).toBe(1);
    expect(changeResponse.body.notificationQueued).toBe(true);
    expect(changeResponse.body.auditId).toBeDefined();

    const currentDashboard = await invokeHandler(dashboardHandler, {
      headers: {
        cookie: currentLogin.cookie
      }
    });
    expect(currentDashboard.statusCode).toBe(200);

    const revokedDashboard = await invokeHandler(dashboardHandler, {
      headers: {
        cookie: otherLogin.cookie
      }
    });
    expect(revokedDashboard.statusCode).toBe(302);
    expect(revokedDashboard.redirectLocation).toBe('/login');

    const oldPasswordLogin = await loginUser(app, {
      email: 'success@example.com',
      password: 'StrongPass!2026'
    });
    expect(oldPasswordLogin.response.statusCode).toBe(401);

    const newPasswordLogin = await loginUser(app, {
      email: 'success@example.com',
      password: 'NewStrongPass!2027'
    });
    expect(newPasswordLogin.response.statusCode).toBe(200);

    expect(app.locals.repository.listSecurityNotifications()).toHaveLength(1);
    expect(app.locals.repository.listSecurityAuditEntries()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          outcome: 'updated',
          eventType: 'password_change_attempt',
          userId: 'usr-success-1'
        })
      ])
    );
  });
});
