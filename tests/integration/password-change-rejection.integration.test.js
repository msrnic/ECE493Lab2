import { describe, expect, it } from 'vitest';
import { invokeHandler } from '../helpers/http-harness.js';
import {
  createPasswordChangeContext,
  loginUser,
  seedActiveAccount
} from './setup.js';

describe('integration: password change rejection and throttle', () => {
  it('rejects incorrect current password and blocks subsequent attempts', async () => {
    const { app, clock, passwordChangeHandler } = createPasswordChangeContext();
    seedActiveAccount(app, {
      id: 'usr-reject-1',
      email: 'reject@example.com',
      password: 'StrongPass!2026'
    });

    const loggedIn = await loginUser(app, {
      email: 'reject@example.com',
      password: 'StrongPass!2026'
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await invokeHandler(passwordChangeHandler, {
        headers: {
          cookie: loggedIn.cookie
        },
        body: {
          currentPassword: 'WrongPassword!2026',
          newPassword: 'NewStrongPass!2027'
        }
      });

      expect(response.statusCode).toBe(422);
      expect(response.body.code).toBe('INCORRECT_CURRENT_PASSWORD');
    }

    const blocked = await invokeHandler(passwordChangeHandler, {
      headers: {
        cookie: loggedIn.cookie
      },
      body: {
        currentPassword: 'WrongPassword!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });

    expect(blocked.statusCode).toBe(429);
    expect(blocked.body.code).toBe('TEMPORARILY_BLOCKED');
    expect(Number(blocked.headers['Retry-After'])).toBeGreaterThan(0);

    expect(app.locals.repository.listSecurityNotifications()).toHaveLength(0);

    const auditEntries = app.locals.repository.listSecurityAuditEntries();
    expect(auditEntries).toHaveLength(6);
    expect(auditEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ outcome: 'incorrect_current_password' }),
        expect.objectContaining({ outcome: 'temporarily_blocked' })
      ])
    );

    clock.advanceMs(10 * 60 * 1000 + 1);

    const unblockedSuccess = await invokeHandler(passwordChangeHandler, {
      headers: {
        cookie: loggedIn.cookie
      },
      body: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'AnotherStrongPass!2028'
      }
    });

    expect(unblockedSuccess.statusCode).toBe(200);
  });

  it('returns auth, request, and policy validation errors and secures password-change page', async () => {
    const { app, passwordChangeHandler, passwordChangePageHandler } = createPasswordChangeContext();
    seedActiveAccount(app, {
      id: 'usr-reject-2',
      email: 'reject2@example.com',
      password: 'StrongPass!2026'
    });

    const unauthenticated = await invokeHandler(passwordChangeHandler, {
      body: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });
    expect(unauthenticated.statusCode).toBe(401);

    const loggedIn = await loginUser(app, {
      email: 'reject2@example.com',
      password: 'StrongPass!2026'
    });

    const invalidRequest = await invokeHandler(passwordChangeHandler, {
      headers: {
        cookie: loggedIn.cookie
      },
      body: {
        currentPassword: ''
      }
    });
    expect(invalidRequest.statusCode).toBe(400);

    const policyViolation = await invokeHandler(passwordChangeHandler, {
      headers: {
        cookie: loggedIn.cookie
      },
      body: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'StrongPass!2026'
      }
    });
    expect(policyViolation.statusCode).toBe(422);
    expect(policyViolation.body.code).toBe('NEW_PASSWORD_SAME_AS_CURRENT');

    const pageWhenUnauthenticated = await invokeHandler(passwordChangePageHandler);
    expect(pageWhenUnauthenticated.statusCode).toBe(302);
    expect(pageWhenUnauthenticated.redirectLocation).toBe('/login');

    const pageWhenAuthenticated = await invokeHandler(passwordChangePageHandler, {
      headers: {
        cookie: loggedIn.cookie
      }
    });
    expect(pageWhenAuthenticated.statusCode).toBe(200);
    expect(pageWhenAuthenticated.text).toContain('data-password-change-form');
  });
});
