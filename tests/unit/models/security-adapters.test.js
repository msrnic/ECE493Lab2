import { describe, expect, it, vi } from 'vitest';
import { createAuditLogModel } from '../../../src/models/audit-log-model.js';
import { createNotificationModel } from '../../../src/models/notification-model.js';
import { createInMemoryRepository } from '../../../src/models/repository.js';
import { createSessionModel } from '../../../src/models/session-model.js';

describe('session/notification/audit adapter models', () => {
  it('invalidates other sessions when session store supports it', () => {
    const invalidateOtherSessions = vi.fn().mockReturnValue(3);
    const sessionModel = createSessionModel({
      sessionStore: { invalidateOtherSessions },
      nowFn: () => new Date('2026-02-01T00:00:00.000Z')
    });

    const result = sessionModel.invalidateOtherActiveSessions({
      userId: 'usr-1',
      currentSessionId: 'session-current'
    });

    expect(result).toEqual({ invalidatedCount: 3 });
    expect(invalidateOtherSessions).toHaveBeenCalledWith(
      'usr-1',
      'session-current',
      new Date('2026-02-01T00:00:00.000Z')
    );
  });

  it('returns zero invalidations when session store hook is unavailable', () => {
    const sessionModel = createSessionModel({ sessionStore: null });

    expect(
      sessionModel.invalidateOtherActiveSessions({
        userId: 'usr-1',
        currentSessionId: 'session-current'
      })
    ).toEqual({ invalidatedCount: 0 });
  });

  it('uses default clock for session invalidation calls', () => {
    const invalidateOtherSessions = vi.fn().mockReturnValue(1);
    const sessionModel = createSessionModel({
      sessionStore: { invalidateOtherSessions }
    });

    sessionModel.invalidateOtherActiveSessions({
      userId: 'usr-1',
      currentSessionId: 'session-current'
    });

    expect(invalidateOtherSessions.mock.calls[0][2]).toBeInstanceOf(Date);
  });

  it('queues notifications only when repository and user are available', () => {
    const noRepositoryModel = createNotificationModel({ repository: null });
    expect(noRepositoryModel.queuePasswordChangeNotification({ userId: 'usr-1' })).toBeNull();

    const repository = createInMemoryRepository();
    const notificationModel = createNotificationModel({
      repository,
      idFactory: () => 'notify-1',
      nowFn: () => new Date('2026-02-01T00:00:00.000Z')
    });

    expect(notificationModel.queuePasswordChangeNotification({})).toBeNull();

    const queued = notificationModel.queuePasswordChangeNotification({
      userId: 'usr-1',
      channel: 'email'
    });

    expect(queued).toEqual({
      id: 'notify-1',
      userId: 'usr-1',
      channel: 'email',
      status: 'queued',
      queuedAt: '2026-02-01T00:00:00.000Z'
    });
    expect(repository.listSecurityNotifications()).toHaveLength(1);

    const defaultNotificationModel = createNotificationModel({ repository });
    const defaultNotification = defaultNotificationModel.queuePasswordChangeNotification({
      userId: 'usr-2'
    });

    expect(defaultNotification.channel).toBe('email');
    expect(typeof defaultNotification.id).toBe('string');
  });

  it('records audit entries and marks degraded mode when writes fail', () => {
    const noRepositoryAudit = createAuditLogModel({ repository: null });
    expect(
      noRepositoryAudit.recordPasswordChangeAttempt({
        attemptId: 'attempt-1',
        userId: 'usr-1',
        outcome: 'updated'
      })
    ).toEqual({
      auditId: null,
      degraded: true
    });

    const repository = createInMemoryRepository();
    const successAudit = createAuditLogModel({
      repository,
      idFactory: () => 'audit-1',
      nowFn: () => new Date('2026-02-01T00:00:00.000Z')
    });

    expect(
      successAudit.recordPasswordChangeAttempt({
        attemptId: 'attempt-1',
        userId: 'usr-1',
        outcome: 'updated',
        failureCode: null,
        details: { source: 'test' }
      })
    ).toEqual({
      auditId: 'audit-1',
      degraded: false
    });

    const onWriteFailure = vi.fn();
    const failingAudit = createAuditLogModel({
      repository: {
        createSecurityAuditEntry() {
          throw new Error('write failed');
        }
      },
      onWriteFailure
    });

    expect(
      failingAudit.recordPasswordChangeAttempt({
        attemptId: 'attempt-2',
        userId: 'usr-1',
        outcome: 'system_error'
      })
    ).toEqual({
      auditId: null,
      degraded: true
    });
    expect(onWriteFailure).toHaveBeenCalledTimes(1);
  });
});
