import {
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  assertNotificationStatusTransition
} from './notification-status.js';

function cloneNotification(notification) {
  return {
    ...notification
  };
}

function notFound(notificationId) {
  const error = new Error(`Notification not found: ${notificationId}`);
  error.status = 404;
  error.code = 'NOTIFICATION_NOT_FOUND';
  return error;
}

export function createDecisionNotificationModel({
  idFactory = () => crypto.randomUUID(),
  nowFn = () => new Date()
} = {}) {
  const notificationsById = new Map();
  const notificationIdByDedupeKey = new Map();

  function getById(notificationId) {
    const notification = notificationsById.get(notificationId);
    return notification ? cloneNotification(notification) : null;
  }

  function getByIdOrThrow(notificationId) {
    const notification = notificationsById.get(notificationId);
    if (!notification) {
      throw notFound(notificationId);
    }

    return notification;
  }

  function findByDedupeKey(dedupeKey) {
    const notificationId = notificationIdByDedupeKey.get(dedupeKey);
    if (!notificationId) {
      return null;
    }

    return getById(notificationId);
  }

  function createOrGetFromDecision({ decision, subject, bodyHtml }) {
    const existing = findByDedupeKey(decision.dedupeKey);
    if (existing) {
      return {
        created: false,
        notification: existing
      };
    }

    const nowIso = nowFn().toISOString();
    const notification = {
      notificationId: idFactory(),
      decisionId: decision.decisionId,
      submissionId: decision.submissionId,
      authorId: decision.authorId,
      channel: NOTIFICATION_CHANNEL.EMAIL,
      recipientEmail: decision.authorEmail,
      subject,
      bodyHtml,
      status: NOTIFICATION_STATUS.GENERATED,
      dedupeKey: decision.dedupeKey,
      retryDueAt: null,
      deliveredAt: null,
      lastFailureReason: null,
      providerMessageId: null,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    notificationsById.set(notification.notificationId, notification);
    notificationIdByDedupeKey.set(notification.dedupeKey, notification.notificationId);

    return {
      created: true,
      notification: cloneNotification(notification)
    };
  }

  function transition(notificationId, nextStatus, patch = {}) {
    const existing = getByIdOrThrow(notificationId);
    assertNotificationStatusTransition(existing.status, nextStatus);

    existing.status = nextStatus;
    Object.assign(existing, patch);
    existing.updatedAt = nowFn().toISOString();

    return cloneNotification(existing);
  }

  function markDeliveryInProgress(notificationId) {
    return transition(notificationId, NOTIFICATION_STATUS.DELIVERY_IN_PROGRESS);
  }

  function markDelivered(notificationId, providerMessageId, deliveredAt) {
    return transition(notificationId, NOTIFICATION_STATUS.DELIVERED, {
      deliveredAt,
      providerMessageId,
      retryDueAt: null,
      lastFailureReason: null
    });
  }

  function markRetryPending(notificationId, retryDueAt, failureReason) {
    return transition(notificationId, NOTIFICATION_STATUS.RETRY_PENDING, {
      retryDueAt,
      lastFailureReason: failureReason,
      providerMessageId: null
    });
  }

  function markUnresolvedFailure(notificationId, failureReason) {
    return transition(notificationId, NOTIFICATION_STATUS.UNRESOLVED_FAILURE, {
      retryDueAt: null,
      lastFailureReason: failureReason,
      providerMessageId: null
    });
  }

  function setRetryDueAt(notificationId, retryDueAt) {
    const existing = getByIdOrThrow(notificationId);
    existing.retryDueAt = retryDueAt;
    existing.updatedAt = nowFn().toISOString();
    return cloneNotification(existing);
  }

  function isRetryAllowed(notificationId) {
    const notification = getById(notificationId);
    return Boolean(notification && notification.status === NOTIFICATION_STATUS.RETRY_PENDING);
  }

  function listAll() {
    return Array.from(notificationsById.values()).map(cloneNotification);
  }

  return {
    getById,
    findByDedupeKey,
    createOrGetFromDecision,
    markDeliveryInProgress,
    markDelivered,
    markRetryPending,
    markUnresolvedFailure,
    setRetryDueAt,
    isRetryAllowed,
    listAll
  };
}
