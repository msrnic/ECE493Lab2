import { describe, expect, it } from 'vitest';
import { invokeHandler } from '../helpers/http-harness.js';
import {
  createPasswordChangeContext,
  loginUser,
  seedActiveAccount
} from '../integration/setup.js';

describe('UC-03-AS acceptance suite', () => {
  it('Given the user is logged in When valid current/new passwords are provided Then password is updated successfully', async () => {
    const { app, passwordChangeHandler } = createPasswordChangeContext();
    seedActiveAccount(app, {
      id: 'usr-accept-1',
      email: 'accept1@example.com',
      password: 'StrongPass!2026'
    });

    const login = await loginUser(app, {
      email: 'accept1@example.com',
      password: 'StrongPass!2026'
    });

    const response = await invokeHandler(passwordChangeHandler, {
      headers: {
        cookie: login.cookie
      },
      body: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('updated');
  });

  it('Given the current password is incorrect When a change is attempted Then password is unchanged and an error is displayed', async () => {
    const { app, passwordChangeHandler } = createPasswordChangeContext();
    seedActiveAccount(app, {
      id: 'usr-accept-2',
      email: 'accept2@example.com',
      password: 'StrongPass!2026'
    });

    const login = await loginUser(app, {
      email: 'accept2@example.com',
      password: 'StrongPass!2026'
    });

    const rejected = await invokeHandler(passwordChangeHandler, {
      headers: {
        cookie: login.cookie
      },
      body: {
        currentPassword: 'WrongPassword!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });

    expect(rejected.statusCode).toBe(422);
    expect(rejected.body.code).toBe('INCORRECT_CURRENT_PASSWORD');

    const oldPasswordLogin = await loginUser(app, {
      email: 'accept2@example.com',
      password: 'StrongPass!2026'
    });
    expect(oldPasswordLogin.response.statusCode).toBe(200);
  });

  it('Given a user has multiple active sessions When password change succeeds Then other sessions are invalidated and current remains active', async () => {
    const { app, passwordChangeHandler, dashboardHandler } = createPasswordChangeContext();
    seedActiveAccount(app, {
      id: 'usr-accept-3',
      email: 'accept3@example.com',
      password: 'StrongPass!2026'
    });

    const currentSession = await loginUser(app, {
      email: 'accept3@example.com',
      password: 'StrongPass!2026'
    });
    const otherSession = await loginUser(app, {
      email: 'accept3@example.com',
      password: 'StrongPass!2026'
    });

    const success = await invokeHandler(passwordChangeHandler, {
      headers: {
        cookie: currentSession.cookie
      },
      body: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });

    expect(success.statusCode).toBe(200);
    expect(success.body.sessionsInvalidated).toBe(1);
    expect(success.body.currentSessionRetained).toBe(true);

    const currentDashboard = await invokeHandler(dashboardHandler, {
      headers: { cookie: currentSession.cookie }
    });
    expect(currentDashboard.statusCode).toBe(200);
    expect(currentDashboard.text).toContain('data-dashboard-logout');

    const otherDashboard = await invokeHandler(dashboardHandler, {
      headers: { cookie: otherSession.cookie }
    });
    expect(otherDashboard.statusCode).toBe(302);
    expect(otherDashboard.redirectLocation).toBe('/login');
  });

  it('Given a valid password change succeeds When success response finalizes Then a security notification is generated', async () => {
    const { app, passwordChangeHandler } = createPasswordChangeContext();
    seedActiveAccount(app, {
      id: 'usr-accept-4',
      email: 'accept4@example.com',
      password: 'StrongPass!2026'
    });

    const login = await loginUser(app, {
      email: 'accept4@example.com',
      password: 'StrongPass!2026'
    });

    const response = await invokeHandler(passwordChangeHandler, {
      headers: {
        cookie: login.cookie
      },
      body: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.notificationQueued).toBe(true);
    expect(app.locals.repository.listSecurityNotifications()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 'usr-accept-4',
          status: 'queued'
        })
      ])
    );
  });

  it('Given five incorrect attempts in 10 minutes When another attempt occurs before expiry Then request is blocked with no credential update', async () => {
    const { app, clock, passwordChangeHandler } = createPasswordChangeContext();
    seedActiveAccount(app, {
      id: 'usr-accept-5',
      email: 'accept5@example.com',
      password: 'StrongPass!2026'
    });

    const login = await loginUser(app, {
      email: 'accept5@example.com',
      password: 'StrongPass!2026'
    });

    for (let i = 0; i < 5; i += 1) {
      const attempt = await invokeHandler(passwordChangeHandler, {
        headers: {
          cookie: login.cookie
        },
        body: {
          currentPassword: 'WrongPassword!2026',
          newPassword: 'NewStrongPass!2027'
        }
      });
      expect(attempt.statusCode).toBe(422);
    }

    const blocked = await invokeHandler(passwordChangeHandler, {
      headers: {
        cookie: login.cookie
      },
      body: {
        currentPassword: 'WrongPassword!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });

    expect(blocked.statusCode).toBe(429);
    expect(blocked.body.code).toBe('TEMPORARILY_BLOCKED');

    const stillOldPassword = await loginUser(app, {
      email: 'accept5@example.com',
      password: 'StrongPass!2026'
    });
    expect(stillOldPassword.response.statusCode).toBe(200);

    clock.advanceMs(10 * 60 * 1000 + 1);
    const afterWindow = await invokeHandler(passwordChangeHandler, {
      headers: {
        cookie: login.cookie
      },
      body: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'AnotherStrongPass!2028'
      }
    });
    expect(afterWindow.statusCode).toBe(200);
  });

  it('Given any password-change attempt outcome When outcome is committed Then matching audit entry is recorded', async () => {
    const { app, passwordChangeHandler } = createPasswordChangeContext();
    seedActiveAccount(app, {
      id: 'usr-accept-6',
      email: 'accept6@example.com',
      password: 'StrongPass!2026'
    });

    const login = await loginUser(app, {
      email: 'accept6@example.com',
      password: 'StrongPass!2026'
    });

    const rejected = await invokeHandler(passwordChangeHandler, {
      headers: {
        cookie: login.cookie
      },
      body: {
        currentPassword: 'WrongPassword!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });
    expect(rejected.statusCode).toBe(422);

    const success = await invokeHandler(passwordChangeHandler, {
      headers: {
        cookie: login.cookie
      },
      body: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'AnotherStrongPass!2028'
      }
    });
    expect(success.statusCode).toBe(200);

    const auditEntries = app.locals.repository.listSecurityAuditEntries();
    expect(auditEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ outcome: 'incorrect_current_password' }),
        expect.objectContaining({ outcome: 'updated' })
      ])
    );
  });
});
