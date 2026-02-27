import { randomUUID } from 'node:crypto';
import {
  createAuditLogModel
} from './audit-log-model.js';
import { createAttemptThrottleModel } from './attempt-throttle-model.js';
import { createNotificationModel } from './notification-model.js';
import { validatePasswordChangeInput } from './password-policy-model.js';
import { createSessionModel } from './session-model.js';
import { hashPassword } from './user-account-model.js';

const MESSAGE_SUCCESS = 'Password updated successfully.';
const MESSAGE_AUTH_REQUIRED = 'Authentication is required.';
const MESSAGE_INVALID_REQUEST = 'Current password and new password are required.';
const MESSAGE_INCORRECT_CURRENT = 'Current password is incorrect.';
const MESSAGE_TEMPORARILY_BLOCKED = 'Too many incorrect password attempts. Try again later.';
const MESSAGE_INTERNAL_ERROR = 'Unexpected error.';

function toSubmission(payload, now = new Date()) {
  const body = payload && typeof payload === 'object' ? payload : {};

  return {
    currentPassword: String(body.currentPassword ?? ''),
    newPassword: String(body.newPassword ?? ''),
    submittedAt: now.toISOString()
  };
}

function toRejectedBody({
  code,
  message,
  auditId,
  retryAfterSeconds,
  blockExpiresAt,
  auditWriteDegraded
}) {
  const body = {
    status: 'rejected',
    code,
    message,
    auditId
  };

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    body.retryAfterSeconds = retryAfterSeconds;
  }

  if (blockExpiresAt) {
    body.blockExpiresAt = blockExpiresAt;
  }

  if (auditWriteDegraded) {
    body.auditWriteDegraded = true;
  }

  return body;
}

function toSuccessBody({
  changedAt,
  sessionsInvalidated,
  notificationQueued,
  auditId,
  auditWriteDegraded
}) {
  const body = {
    status: 'updated',
    message: MESSAGE_SUCCESS,
    changedAt,
    sessionsInvalidated,
    currentSessionRetained: true,
    notificationQueued,
    auditId
  };

  if (auditWriteDegraded) {
    body.auditWriteDegraded = true;
  }

  return body;
}

export function parsePasswordChangeSubmission(payload, now = new Date()) {
  return toSubmission(payload, now);
}

export function createPasswordChangeModel({
  repository,
  nowFn = () => new Date(),
  hashPasswordFn = hashPassword,
  attemptIdFactory = () => randomUUID(),
  passwordPolicyValidator = validatePasswordChangeInput,
  attemptThrottleModel = createAttemptThrottleModel({ nowFn }),
  sessionModel,
  notificationModel,
  auditLogModel
} = {}) {
  if (!repository) {
    throw new Error('repository is required');
  }

  const effectiveSessionModel =
    sessionModel ??
    createSessionModel({
      sessionStore: {
        invalidateOtherSessions() {
          return 0;
        }
      },
      nowFn
    });

  const effectiveNotificationModel =
    notificationModel ?? createNotificationModel({ repository, nowFn });

  const effectiveAuditLogModel =
    auditLogModel ?? createAuditLogModel({ repository, nowFn });

  function recordAudit({ attemptId, userId, outcome, failureCode, details }) {
    return effectiveAuditLogModel.recordPasswordChangeAttempt({
      attemptId,
      userId,
      outcome,
      failureCode,
      details
    });
  }

  async function changePassword({ userId, sessionId, payload, clientMetadata } = {}) {
    const now = nowFn();
    const nowIso = now.toISOString();
    const submission = toSubmission(payload, now);
    const attemptId = attemptIdFactory();

    if (!userId || !sessionId) {
      return {
        httpStatus: 401,
        body: {
          code: 'NOT_AUTHENTICATED',
          message: MESSAGE_AUTH_REQUIRED
        }
      };
    }

    if (!submission.currentPassword || !submission.newPassword) {
      return {
        httpStatus: 400,
        body: {
          code: 'INVALID_REQUEST',
          message: MESSAGE_INVALID_REQUEST
        }
      };
    }

    const throttleState = attemptThrottleModel.getState(userId, now);
    if (throttleState.blocked) {
      const audit = recordAudit({
        attemptId,
        userId,
        outcome: 'temporarily_blocked',
        failureCode: 'TEMPORARILY_BLOCKED',
        details: {
          clientMetadata
        }
      });

      return {
        httpStatus: 429,
        headers: {
          'Retry-After': String(throttleState.retryAfterSeconds)
        },
        body: toRejectedBody({
          code: 'TEMPORARILY_BLOCKED',
          message: MESSAGE_TEMPORARILY_BLOCKED,
          retryAfterSeconds: throttleState.retryAfterSeconds,
          blockExpiresAt: throttleState.blockedUntil,
          auditId: audit.auditId,
          auditWriteDegraded: audit.degraded
        })
      };
    }

    const account = repository.findUserById(userId);
    const currentPasswordHash = hashPasswordFn(submission.currentPassword);
    const validCurrentPassword =
      Boolean(account) &&
      account.status === 'active' &&
      account.passwordHash === currentPasswordHash;

    if (!validCurrentPassword) {
      attemptThrottleModel.recordIncorrectAttempt(userId, now);
      const audit = recordAudit({
        attemptId,
        userId,
        outcome: 'incorrect_current_password',
        failureCode: 'INCORRECT_CURRENT_PASSWORD',
        details: {
          clientMetadata
        }
      });

      return {
        httpStatus: 422,
        body: toRejectedBody({
          code: 'INCORRECT_CURRENT_PASSWORD',
          message: MESSAGE_INCORRECT_CURRENT,
          auditId: audit.auditId,
          auditWriteDegraded: audit.degraded
        })
      };
    }

    const validation = passwordPolicyValidator({
      currentPassword: submission.currentPassword,
      newPassword: submission.newPassword
    });

    if (!validation.valid) {
      const audit = recordAudit({
        attemptId,
        userId,
        outcome: 'policy_violation',
        failureCode: validation.code,
        details: {
          issues: validation.issues,
          clientMetadata
        }
      });

      return {
        httpStatus: 422,
        body: toRejectedBody({
          code: validation.code,
          message: validation.message,
          auditId: audit.auditId,
          auditWriteDegraded: audit.degraded
        })
      };
    }

    const updatedAccount = {
      ...account,
      passwordHash: hashPasswordFn(submission.newPassword),
      passwordUpdatedAt: nowIso,
      credentialVersion:
        typeof account.credentialVersion === 'number' ? account.credentialVersion + 1 : 1
    };

    const persisted = repository.updateUserAccount(account.id, updatedAccount);
    if (!persisted) {
      recordAudit({
        attemptId,
        userId,
        outcome: 'system_error',
        failureCode: 'UPDATE_FAILED',
        details: {
          clientMetadata
        }
      });

      return {
        httpStatus: 500,
        body: {
          code: 'INTERNAL_ERROR',
          message: MESSAGE_INTERNAL_ERROR
        }
      };
    }

    attemptThrottleModel.reset(userId);

    try {
      const sessionInvalidation = effectiveSessionModel.invalidateOtherActiveSessions({
        userId,
        currentSessionId: sessionId
      });

      const notification = effectiveNotificationModel.queuePasswordChangeNotification({
        userId
      });

      const audit = recordAudit({
        attemptId,
        userId,
        outcome: 'updated',
        details: {
          clientMetadata
        }
      });

      return {
        httpStatus: 200,
        body: toSuccessBody({
          changedAt: nowIso,
          sessionsInvalidated: sessionInvalidation.invalidatedCount,
          notificationQueued: Boolean(notification),
          auditId: audit.auditId,
          auditWriteDegraded: audit.degraded
        })
      };
    } catch {
      recordAudit({
        attemptId,
        userId,
        outcome: 'system_error',
        failureCode: 'POST_UPDATE_FAILURE',
        details: {
          clientMetadata
        }
      });

      return {
        httpStatus: 500,
        body: {
          code: 'INTERNAL_ERROR',
          message: MESSAGE_INTERNAL_ERROR
        }
      };
    }
  }

  return {
    changePassword
  };
}
