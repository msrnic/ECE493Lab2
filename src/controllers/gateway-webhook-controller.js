import { createReconciliationEvent } from '../models/reconciliation-event-model.js';
import { createRetryPolicyModel } from '../models/retry-policy-model.js';

export function createGatewayWebhookController({
  repository,
  gatewayClient,
  retryPolicyModel = createRetryPolicyModel(),
  nowFn = () => new Date()
}) {
  return {
    reconcilePendingAttempt(req, res) {
      const signature = req.headers?.['x-gateway-signature'];
      if (!gatewayClient.verifySignature(signature, req.body)) {
        res.status(401).json({ code: 'SIGNATURE_INVALID', message: 'Gateway signature validation failed.' });
        return;
      }

      let event;
      try {
        event = createReconciliationEvent({
          eventId: req.body?.eventId,
          attemptId: req.body?.attemptId,
          source: 'webhook',
          resolvedOutcome: req.body?.outcome,
          receivedAt: req.body?.occurredAt ?? nowFn().toISOString()
        });
      } catch (error) {
        res.status(422).json({ code: 'VALIDATION_FAILED', message: error.message });
        return;
      }

      if (repository.hasProcessedReconciliationEvent(event.eventId)) {
        res.status(202).json({ accepted: true, duplicate: true });
        return;
      }

      const attempt = repository.getAttempt(event.attemptId);
      if (!attempt) {
        res.status(404).json({ code: 'NOT_FOUND', message: 'Payment attempt not found.' });
        return;
      }
      if (attempt.outcome !== 'pending') {
        repository.recordReconciliationEvent(event);
        res.status(202).json({ accepted: true, duplicate: false, noChange: true });
        return;
      }

      const finalizedAt = nowFn().toISOString();
      repository.updateAttempt(event.attemptId, {
        outcome: event.resolvedOutcome,
        finalizedAt,
        declineReasonCode: event.resolvedOutcome === 'declined' ? (attempt.declineReasonCode ?? 'declined_by_issuer') : null
      });

      if (event.resolvedOutcome === 'approved') {
        repository.markSessionComplete(attempt.sessionId);
        const retryState = repository.getRetryState(attempt.sessionId);
        repository.saveRetryState(attempt.sessionId, retryPolicyModel.clearPending(retryState));
      } else {
        const retryState = repository.getRetryState(attempt.sessionId);
        repository.saveRetryState(
          attempt.sessionId,
          retryPolicyModel.registerDecline(
            {
              ...retryPolicyModel.clearPending(retryState),
              pendingAttemptId: null
            },
            nowFn()
          )
        );
      }

      repository.recordReconciliationEvent(event);
      res.status(202).json({ accepted: true, duplicate: false });
    }
  };
}

