export const NOTIFICATION_CHANNEL = Object.freeze({
  EMAIL: 'email'
});

export const NOTIFICATION_STATUS = Object.freeze({
  GENERATED: 'generated',
  DELIVERY_IN_PROGRESS: 'delivery_in_progress',
  DELIVERED: 'delivered',
  RETRY_PENDING: 'retry_pending',
  UNRESOLVED_FAILURE: 'unresolved_failure'
});

export const DELIVERY_ATTEMPT_STATUS = Object.freeze({
  SUCCESS: 'success',
  FAILURE: 'failure'
});

const ALLOWED_TRANSITIONS = Object.freeze({
  [NOTIFICATION_STATUS.GENERATED]: [NOTIFICATION_STATUS.DELIVERY_IN_PROGRESS],
  [NOTIFICATION_STATUS.DELIVERY_IN_PROGRESS]: [
    NOTIFICATION_STATUS.DELIVERED,
    NOTIFICATION_STATUS.RETRY_PENDING,
    NOTIFICATION_STATUS.UNRESOLVED_FAILURE
  ],
  [NOTIFICATION_STATUS.RETRY_PENDING]: [NOTIFICATION_STATUS.DELIVERY_IN_PROGRESS],
  [NOTIFICATION_STATUS.DELIVERED]: [],
  [NOTIFICATION_STATUS.UNRESOLVED_FAILURE]: []
});

export function canTransitionNotificationStatus(fromStatus, toStatus) {
  if (fromStatus === toStatus) {
    return true;
  }

  const allowedTargets = ALLOWED_TRANSITIONS[fromStatus];
  if (!Array.isArray(allowedTargets)) {
    return false;
  }

  return allowedTargets.includes(toStatus);
}

export function assertNotificationStatusTransition(fromStatus, toStatus) {
  if (!canTransitionNotificationStatus(fromStatus, toStatus)) {
    const error = new Error(`Invalid notification transition: ${fromStatus} -> ${toStatus}`);
    error.status = 409;
    error.code = 'NOTIFICATION_STATUS_CONFLICT';
    throw error;
  }
}
