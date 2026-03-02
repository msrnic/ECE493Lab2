import { DELIVERY_ATTEMPT_STATUS } from '../models/notification-status.js';

function mapProviderResult(result) {
  if (result?.accepted === true && typeof result?.providerMessageId === 'string' && result.providerMessageId.trim().length > 0) {
    return {
      accepted: true,
      providerMessageId: result.providerMessageId.trim(),
      failureReason: null
    };
  }

  if (result?.accepted === true) {
    return {
      accepted: false,
      providerMessageId: null,
      failureReason: 'Provider accepted message without providerMessageId.'
    };
  }

  return {
    accepted: false,
    providerMessageId: result?.providerMessageId ?? null,
    failureReason: typeof result?.error === 'string' && result.error.trim().length > 0
      ? result.error.trim()
      : 'Notification delivery failed.'
  };
}

function mapThrownError(error) {
  if (error instanceof Error && typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return 'Notification delivery failed.';
}

function conflict(message) {
  const error = new Error(message);
  error.status = 409;
  error.code = 'NOTIFICATION_RETRY_CONFLICT';
  return error;
}

export function createNotificationEmailDeliveryService({
  sendEmail,
  decisionNotificationModel,
  deliveryAttemptModel,
  unresolvedFailureModel,
  retrySchedulerService,
  nowFn
} = {}) {
  if (typeof sendEmail !== 'function') {
    throw new Error('sendEmail must be a function');
  }

  if (!decisionNotificationModel || !deliveryAttemptModel || !unresolvedFailureModel || !retrySchedulerService) {
    throw new Error('decisionNotificationModel, deliveryAttemptModel, unresolvedFailureModel, and retrySchedulerService are required');
  }

  const resolvedNowFn = typeof nowFn === 'function' ? nowFn : () => new Date();

  async function sendNotification({ notificationId, attemptNumber }) {
    const notification = decisionNotificationModel.getById(notificationId);
    if (!notification) {
      const error = new Error(`Notification not found: ${notificationId}`);
      error.status = 404;
      error.code = 'NOTIFICATION_NOT_FOUND';
      throw error;
    }

    if (attemptNumber === 2 && !decisionNotificationModel.isRetryAllowed(notificationId)) {
      throw conflict('Retry not allowed for notification in current state');
    }

    decisionNotificationModel.markDeliveryInProgress(notificationId);
    const attemptStartedAt = resolvedNowFn().toISOString();
    let providerResult;

    try {
      providerResult = await sendEmail({
        notificationId,
        to: notification.recipientEmail,
        subject: notification.subject,
        html: notification.bodyHtml,
        attemptNumber
      });
    } catch (error) {
      providerResult = {
        accepted: false,
        error: mapThrownError(error)
      };
    }

    const normalized = mapProviderResult(providerResult);

    if (attemptNumber === 2) {
      retrySchedulerService.recordFailureToRetryLatency({
        failureAt: notification.updatedAt,
        retryStartedAt: attemptStartedAt
      });
    }

    if (normalized.accepted) {
      const attempt = deliveryAttemptModel.createAttempt({
        notificationId,
        attemptNumber,
        attemptedAt: attemptStartedAt,
        status: DELIVERY_ATTEMPT_STATUS.SUCCESS,
        providerMessageId: normalized.providerMessageId
      });
      const deliveredNotification = decisionNotificationModel.markDelivered(
        notificationId,
        normalized.providerMessageId,
        attemptStartedAt
      );

      if (attemptNumber === 1) {
        retrySchedulerService.recordFinalizeToAttemptLatency({
          finalizedAt: notification.finalizedAt,
          attemptStartedAt
        });
      }

      return {
        notification: deliveredNotification,
        attempt,
        result: 'delivered',
        failureRecordId: null
      };
    }

    const attempt = deliveryAttemptModel.createAttempt({
      notificationId,
      attemptNumber,
      attemptedAt: attemptStartedAt,
      status: DELIVERY_ATTEMPT_STATUS.FAILURE,
      failureReason: normalized.failureReason,
      providerMessageId: normalized.providerMessageId
    });

    if (attemptNumber === 1) {
      const retryDueAt = retrySchedulerService.scheduleRetry({
        notificationId,
        failedAt: attemptStartedAt
      });
      const pendingNotification = decisionNotificationModel.markRetryPending(
        notificationId,
        retryDueAt,
        normalized.failureReason
      );

      retrySchedulerService.recordFinalizeToAttemptLatency({
        finalizedAt: notification.finalizedAt,
        attemptStartedAt
      });

      return {
        notification: pendingNotification,
        attempt,
        result: 'retry_pending',
        failureRecordId: null
      };
    }

    const unresolvedNotification = decisionNotificationModel.markUnresolvedFailure(
      notificationId,
      normalized.failureReason
    );

    const failureRecord = unresolvedFailureModel.createRecord({
      notification: unresolvedNotification,
      attempt,
      failureReason: normalized.failureReason
    });

    return {
      notification: unresolvedNotification,
      attempt,
      result: 'unresolved_failure',
      failureRecordId: failureRecord.failureRecordId
    };
  }

  return {
    sendNotification
  };
}

export { mapProviderResult };
