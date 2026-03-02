function mapError(error) {
  return {
    status: error?.status ?? 500,
    body: {
      code: error?.code ?? 'INTERNAL_ERROR',
      message: error?.message ?? 'Unexpected error.'
    }
  };
}

function normalizeDecisionPathId(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function mapDispatchStatus(notificationStatus) {
  if (notificationStatus === 'delivered') {
    return 'delivered';
  }

  if (notificationStatus === 'unresolved_failure') {
    return 'unresolved_failure';
  }

  return 'queued';
}

export function createNotificationController({
  finalizedDecisionModel,
  decisionNotificationModel,
  deliveryAttemptModel,
  emailDeliveryService
} = {}) {
  if (!finalizedDecisionModel || !decisionNotificationModel || !deliveryAttemptModel || !emailDeliveryService) {
    throw new Error('finalizedDecisionModel, decisionNotificationModel, deliveryAttemptModel, and emailDeliveryService are required');
  }

  async function triggerDecisionNotification(req, res) {
    try {
      const decisionId = normalizeDecisionPathId(req.params?.decisionId);
      if (!decisionId) {
        return res.status(400).json({
          code: 'INVALID_DECISION_PAYLOAD',
          message: 'decisionId is required'
        });
      }

      const finalizedDecision = finalizedDecisionModel.createFinalizedDecision({
        decisionId,
        submissionId: req.body?.submissionId,
        authorId: req.body?.authorId,
        authorEmail: req.body?.authorEmail,
        decisionOutcome: req.body?.decisionOutcome,
        finalizedAt: req.body?.finalizedAt
      });

      const existingNotification = decisionNotificationModel.findByDedupeKey(finalizedDecision.dedupeKey);
      if (existingNotification) {
        return res.status(200).json({
          notificationId: existingNotification.notificationId,
          status: mapDispatchStatus(existingNotification.status) === 'queued'
            ? 'already_processed'
            : mapDispatchStatus(existingNotification.status),
          attemptsUsed: deliveryAttemptModel.getAttemptCount(existingNotification.notificationId)
        });
      }

      const emailContent = finalizedDecisionModel.createEmailContent(finalizedDecision);
      const created = decisionNotificationModel.createOrGetFromDecision({
        decision: finalizedDecision,
        subject: emailContent.subject,
        bodyHtml: emailContent.bodyHtml
      });

      const delivery = await emailDeliveryService.sendNotification({
        notificationId: created.notification.notificationId,
        attemptNumber: 1
      });

      return res.status(202).json({
        notificationId: delivery.notification.notificationId,
        status: delivery.result === 'retry_pending' ? 'queued' : mapDispatchStatus(delivery.notification.status),
        attemptsUsed: deliveryAttemptModel.getAttemptCount(delivery.notification.notificationId)
      });
    } catch (error) {
      const mapped = mapError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function retryNotificationDelivery(req, res) {
    try {
      const notificationId = normalizeDecisionPathId(req.params?.notificationId);
      if (!notificationId) {
        return res.status(400).json({
          code: 'INVALID_RETRY_REQUEST',
          message: 'notificationId is required'
        });
      }

      if (req.body?.attemptNumber !== 2) {
        return res.status(400).json({
          code: 'INVALID_RETRY_REQUEST',
          message: 'attemptNumber must be 2'
        });
      }

      const delivery = await emailDeliveryService.sendNotification({
        notificationId,
        attemptNumber: 2
      });

      return res.status(200).json({
        notificationId: delivery.notification.notificationId,
        attemptNumber: 2,
        result: delivery.result,
        failureRecordId: delivery.failureRecordId
      });
    } catch (error) {
      const mapped = mapError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  return {
    triggerDecisionNotification,
    retryNotificationDelivery
  };
}
