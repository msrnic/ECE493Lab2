import { DELIVERY_ATTEMPT_STATUS } from './notification-status.js';

function cloneAttempt(attempt) {
  return {
    ...attempt
  };
}

function badRequest(message, code = 'INVALID_DELIVERY_ATTEMPT') {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  return error;
}

function conflict(message, code = 'DELIVERY_ATTEMPT_CONFLICT') {
  const error = new Error(message);
  error.status = 409;
  error.code = code;
  return error;
}

export function createDeliveryAttemptModel({
  idFactory = () => crypto.randomUUID(),
  nowFn = () => new Date(),
  maxAttempts = 2
} = {}) {
  const attemptsById = new Map();
  const attemptsByNotificationId = new Map();

  function listAttempts(notificationId) {
    const attempts = attemptsByNotificationId.get(notificationId) ?? [];
    return attempts.map(cloneAttempt);
  }

  function getAttemptCount(notificationId) {
    return listAttempts(notificationId).length;
  }

  function getAttempt(notificationId, attemptNumber) {
    return listAttempts(notificationId).find((attempt) => attempt.attemptNumber === attemptNumber) ?? null;
  }

  function getLatestAttempt(notificationId) {
    const attempts = listAttempts(notificationId);
    return attempts.at(-1) ?? null;
  }

  function validateAttempt({ notificationId, attemptNumber, status, failureReason }) {
    if (typeof notificationId !== 'string' || notificationId.trim().length === 0) {
      throw badRequest('notificationId is required');
    }

    if (!Number.isInteger(attemptNumber) || attemptNumber < 1 || attemptNumber > maxAttempts) {
      throw badRequest(`attemptNumber must be an integer between 1 and ${maxAttempts}`);
    }

    if (![DELIVERY_ATTEMPT_STATUS.SUCCESS, DELIVERY_ATTEMPT_STATUS.FAILURE].includes(status)) {
      throw badRequest('status must be success or failure');
    }

    if (status === DELIVERY_ATTEMPT_STATUS.FAILURE
      && (typeof failureReason !== 'string' || failureReason.trim().length === 0)) {
      throw badRequest('failureReason is required for failed attempts');
    }

    if (status === DELIVERY_ATTEMPT_STATUS.SUCCESS && typeof failureReason === 'string' && failureReason.trim().length > 0) {
      throw badRequest('failureReason must be empty for successful attempts');
    }

    const existingAttempt = getAttempt(notificationId, attemptNumber);
    if (existingAttempt) {
      throw conflict(`attempt ${attemptNumber} already exists for notification ${notificationId}`);
    }

    if (attemptNumber === 2) {
      const firstAttempt = getAttempt(notificationId, 1);
      if (!firstAttempt) {
        throw conflict('attempt 1 must exist before attempt 2');
      }

      if (firstAttempt.status !== DELIVERY_ATTEMPT_STATUS.FAILURE) {
        throw conflict('attempt 2 is allowed only after attempt 1 fails');
      }
    }
  }

  function createAttempt({
    notificationId,
    attemptNumber,
    status,
    failureReason = null,
    providerMessageId = null,
    attemptedAt = nowFn().toISOString()
  }) {
    validateAttempt({ notificationId, attemptNumber, status, failureReason });

    const attempt = {
      attemptId: idFactory(),
      notificationId,
      attemptNumber,
      attemptedAt,
      status,
      failureReason: status === DELIVERY_ATTEMPT_STATUS.FAILURE ? failureReason.trim() : null,
      providerMessageId
    };

    attemptsById.set(attempt.attemptId, attempt);
    const attempts = attemptsByNotificationId.get(notificationId) ?? [];
    attempts.push(attempt);
    attemptsByNotificationId.set(notificationId, attempts);

    return cloneAttempt(attempt);
  }

  return {
    createAttempt,
    getAttempt,
    getLatestAttempt,
    getAttemptCount,
    listAttempts
  };
}
