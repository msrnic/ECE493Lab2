import { randomUUID } from 'node:crypto';

export function createAuditLogModel({
  repository,
  idFactory = () => randomUUID(),
  nowFn = () => new Date(),
  onWriteFailure
} = {}) {
  function recordPasswordChangeAttempt({
    attemptId,
    userId,
    outcome,
    failureCode,
    details
  } = {}) {
    if (!repository || typeof repository.createSecurityAuditEntry !== 'function') {
      return {
        auditId: null,
        degraded: true
      };
    }

    const auditEntry = {
      id: idFactory(),
      attemptId,
      userId,
      eventType: 'password_change_attempt',
      outcome,
      failureCode: failureCode ?? null,
      details: details ?? {},
      recordedAt: nowFn().toISOString()
    };

    try {
      const persisted = repository.createSecurityAuditEntry(auditEntry);
      return {
        auditId: persisted.id,
        degraded: false
      };
    } catch (error) {
      if (typeof onWriteFailure === 'function') {
        onWriteFailure(error);
      }

      return {
        auditId: null,
        degraded: true
      };
    }
  }

  return {
    recordPasswordChangeAttempt
  };
}
