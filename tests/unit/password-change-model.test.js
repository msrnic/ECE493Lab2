import { describe, expect, it, vi } from 'vitest';
import { createPasswordChangeModel, parsePasswordChangeSubmission } from '../../src/models/password-change-model.js';
import { createInMemoryRepository } from '../../src/models/repository.js';

function hashPasswordFn(value) {
  return `hash:${value}`;
}

function seedActiveAccount(repository, {
  id = 'usr-1',
  email = 'user@example.com',
  password = 'StrongPass!2026'
} = {}) {
  repository.createUserAccount({
    id,
    fullName: 'User Example',
    emailNormalized: email,
    passwordHash: hashPasswordFn(password),
    status: 'active',
    credentialVersion: 0,
    createdAt: '2026-02-01T00:00:00.000Z',
    activatedAt: '2026-02-01T00:00:00.000Z'
  });
}

describe('password-change-model', () => {
  it('parses submissions from payloads and fallback values', () => {
    expect(parsePasswordChangeSubmission(null, new Date('2026-02-01T00:00:00.000Z'))).toEqual({
      currentPassword: '',
      newPassword: '',
      submittedAt: '2026-02-01T00:00:00.000Z'
    });

    expect(
      parsePasswordChangeSubmission(
        {
          currentPassword: 'StrongPass!2026',
          newPassword: 'NewStrongPass!2027'
        },
        new Date('2026-02-01T00:00:00.000Z')
      )
    ).toEqual({
      currentPassword: 'StrongPass!2026',
      newPassword: 'NewStrongPass!2027',
      submittedAt: '2026-02-01T00:00:00.000Z'
    });
  });

  it('requires repository dependency', () => {
    expect(() => createPasswordChangeModel()).toThrow('repository is required');
  });

  it('returns auth and request validation errors before processing', async () => {
    const repository = createInMemoryRepository();
    seedActiveAccount(repository);

    const model = createPasswordChangeModel({
      repository,
      hashPasswordFn
    });

    await expect(model.changePassword({})).resolves.toEqual({
      httpStatus: 401,
      body: {
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication is required.'
      }
    });

    await expect(
      model.changePassword({
        userId: 'usr-1',
        sessionId: 'session-1',
        payload: { currentPassword: '' }
      })
    ).resolves.toEqual({
      httpStatus: 400,
      body: {
        code: 'INVALID_REQUEST',
        message: 'Current password and new password are required.'
      }
    });
  });

  it('returns temporary-block response and retry metadata when throttle is active', async () => {
    const repository = createInMemoryRepository();
    seedActiveAccount(repository);

    const result = await createPasswordChangeModel({
      repository,
      hashPasswordFn,
      attemptIdFactory: () => 'attempt-1',
      attemptThrottleModel: {
        getState: () => ({
          blocked: true,
          retryAfterSeconds: 30,
          blockedUntil: '2026-02-01T00:10:00.000Z',
          failureCount: 5
        }),
        recordIncorrectAttempt: vi.fn(),
        reset: vi.fn()
      },
      auditLogModel: {
        recordPasswordChangeAttempt: vi.fn().mockReturnValue({
          auditId: 'audit-1',
          degraded: true
        })
      }
    }).changePassword({
      userId: 'usr-1',
      sessionId: 'session-1',
      payload: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });

    expect(result.httpStatus).toBe(429);
    expect(result.headers).toEqual({ 'Retry-After': '30' });
    expect(result.body).toEqual({
      status: 'rejected',
      code: 'TEMPORARILY_BLOCKED',
      message: 'Too many incorrect password attempts. Try again later.',
      retryAfterSeconds: 30,
      blockExpiresAt: '2026-02-01T00:10:00.000Z',
      auditId: 'audit-1',
      auditWriteDegraded: true
    });
  });

  it('rejects incorrect current password and policy violations', async () => {
    const repository = createInMemoryRepository();
    seedActiveAccount(repository);

    const recordIncorrectAttempt = vi.fn();
    const baseModel = createPasswordChangeModel({
      repository,
      hashPasswordFn,
      attemptIdFactory: () => 'attempt-2',
      attemptThrottleModel: {
        getState: () => ({ blocked: false, retryAfterSeconds: 0, blockedUntil: null, failureCount: 0 }),
        recordIncorrectAttempt,
        reset: vi.fn()
      },
      auditLogModel: {
        recordPasswordChangeAttempt: vi.fn().mockReturnValue({
          auditId: 'audit-2',
          degraded: false
        })
      }
    });

    const incorrectCurrent = await baseModel.changePassword({
      userId: 'usr-1',
      sessionId: 'session-1',
      payload: {
        currentPassword: 'WrongPassword!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });

    expect(recordIncorrectAttempt).toHaveBeenCalledWith('usr-1', expect.any(Date));
    expect(incorrectCurrent).toEqual({
      httpStatus: 422,
      body: {
        status: 'rejected',
        code: 'INCORRECT_CURRENT_PASSWORD',
        message: 'Current password is incorrect.',
        auditId: 'audit-2'
      }
    });

    const policyViolation = await baseModel.changePassword({
      userId: 'usr-1',
      sessionId: 'session-1',
      payload: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'StrongPass!2026'
      }
    });

    expect(policyViolation).toEqual({
      httpStatus: 422,
      body: {
        status: 'rejected',
        code: 'NEW_PASSWORD_SAME_AS_CURRENT',
        message: 'New password must be different from current password.',
        auditId: 'audit-2'
      }
    });
  });

  it('returns internal error when credential persistence or post-update actions fail', async () => {
    const repository = createInMemoryRepository();
    seedActiveAccount(repository);

    const updateSpy = vi.spyOn(repository, 'updateUserAccount').mockReturnValue(null);

    const updateFailureModel = createPasswordChangeModel({
      repository,
      hashPasswordFn,
      attemptThrottleModel: {
        getState: () => ({ blocked: false, retryAfterSeconds: 0, blockedUntil: null, failureCount: 0 }),
        recordIncorrectAttempt: vi.fn(),
        reset: vi.fn()
      },
      auditLogModel: {
        recordPasswordChangeAttempt: vi.fn().mockReturnValue({ auditId: 'audit-3', degraded: false })
      }
    });

    await expect(
      updateFailureModel.changePassword({
        userId: 'usr-1',
        sessionId: 'session-1',
        payload: {
          currentPassword: 'StrongPass!2026',
          newPassword: 'NewStrongPass!2027'
        }
      })
    ).resolves.toEqual({
      httpStatus: 500,
      body: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected error.'
      }
    });

    updateSpy.mockRestore();

    const postUpdateFailureModel = createPasswordChangeModel({
      repository,
      hashPasswordFn,
      attemptThrottleModel: {
        getState: () => ({ blocked: false, retryAfterSeconds: 0, blockedUntil: null, failureCount: 0 }),
        recordIncorrectAttempt: vi.fn(),
        reset: vi.fn()
      },
      sessionModel: {
        invalidateOtherActiveSessions() {
          throw new Error('session invalidation failed');
        }
      },
      notificationModel: {
        queuePasswordChangeNotification: vi.fn()
      },
      auditLogModel: {
        recordPasswordChangeAttempt: vi.fn().mockReturnValue({ auditId: 'audit-4', degraded: false })
      }
    });

    await expect(
      postUpdateFailureModel.changePassword({
        userId: 'usr-1',
        sessionId: 'session-1',
        payload: {
          currentPassword: 'StrongPass!2026',
          newPassword: 'AnotherStrongPass!2028'
        }
      })
    ).resolves.toEqual({
      httpStatus: 500,
      body: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected error.'
      }
    });
  });

  it('updates password, resets throttle, invalidates sessions, queues notification, and records audit', async () => {
    const now = new Date('2026-02-01T00:00:00.000Z');
    const repository = createInMemoryRepository();
    seedActiveAccount(repository);

    const reset = vi.fn();
    const model = createPasswordChangeModel({
      repository,
      nowFn: () => now,
      hashPasswordFn,
      attemptThrottleModel: {
        getState: () => ({ blocked: false, retryAfterSeconds: 0, blockedUntil: null, failureCount: 0 }),
        recordIncorrectAttempt: vi.fn(),
        reset
      },
      sessionModel: {
        invalidateOtherActiveSessions: vi.fn().mockReturnValue({ invalidatedCount: 2 })
      },
      notificationModel: {
        queuePasswordChangeNotification: vi.fn().mockReturnValue(null)
      },
      auditLogModel: {
        recordPasswordChangeAttempt: vi.fn().mockReturnValue({
          auditId: 'audit-5',
          degraded: false
        })
      }
    });

    const result = await model.changePassword({
      userId: 'usr-1',
      sessionId: 'session-current',
      payload: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'NewStrongPass!2027'
      },
      clientMetadata: {
        ip: '127.0.0.1'
      }
    });

    expect(result).toEqual({
      httpStatus: 200,
      body: {
        status: 'updated',
        message: 'Password updated successfully.',
        changedAt: '2026-02-01T00:00:00.000Z',
        sessionsInvalidated: 2,
        currentSessionRetained: true,
        notificationQueued: false,
        auditId: 'audit-5'
      }
    });

    const updatedAccount = repository.findUserById('usr-1');
    expect(updatedAccount.passwordHash).toBe('hash:NewStrongPass!2027');
    expect(updatedAccount.credentialVersion).toBe(1);
    expect(updatedAccount.passwordUpdatedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(reset).toHaveBeenCalledWith('usr-1');
  });

  it('supports default adapter construction path and surfaces degraded audit flag', async () => {
    const repository = createInMemoryRepository();
    seedActiveAccount(repository);
    const account = repository.findUserById('usr-1');
    delete account.credentialVersion;
    repository.updateUserAccount('usr-1', account);

    const model = createPasswordChangeModel({
      repository,
      hashPasswordFn,
      auditLogModel: {
        recordPasswordChangeAttempt: vi.fn().mockReturnValue({
          auditId: 'audit-6',
          degraded: true
        })
      }
    });

    const result = await model.changePassword({
      userId: 'usr-1',
      sessionId: 'session-current',
      payload: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'AnotherStrongPass!2028'
      }
    });

    expect(result.httpStatus).toBe(200);
    expect(result.body.auditWriteDegraded).toBe(true);
    expect(result.body.notificationQueued).toBe(true);
    expect(repository.findUserById('usr-1').credentialVersion).toBe(1);
  });
});
