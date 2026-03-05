import { createRetryPolicyModel } from '../models/retry-policy-model.js';
import { validateUuid } from '../models/payment-validation.js';

function toRetryPayload(retryStatus) {
  return {
    declinedRetriesInWindow: retryStatus.declinedRetriesInWindow,
    retriesRemaining: retryStatus.retriesRemaining,
    retryAllowed: retryStatus.retryAllowed,
    cooldownExpiresAt: retryStatus.cooldownUntil,
    blockedReason: retryStatus.blockedReason
  };
}

export function createPaymentStatusController({
  repository,
  retryPolicyModel = createRetryPolicyModel(),
  nowFn = () => new Date()
}) {
  return {
    getRegistrationSession(req, res) {
      try {
        validateUuid(req.params?.sessionId, 'sessionId');
        const session = repository.getSession(req.params.sessionId);
        if (!session) {
          res.status(404).json({ code: 'NOT_FOUND', message: 'Registration session not found.' });
          return;
        }
        res.status(200).json(session);
      } catch {
        res.status(422).json({ code: 'VALIDATION_FAILED', message: 'Invalid sessionId.' });
      }
    },
    getPaymentAttempt(req, res) {
      try {
        validateUuid(req.params?.sessionId, 'sessionId');
        validateUuid(req.params?.attemptId, 'attemptId');
        const session = repository.getSession(req.params.sessionId);
        const attempt = repository.getAttempt(req.params.attemptId);
        if (!session || !attempt || attempt.sessionId !== req.params.sessionId) {
          res.status(404).json({ code: 'NOT_FOUND', message: 'Payment attempt not found.' });
          return;
        }
        const retryState = repository.getRetryState(req.params.sessionId);
        const retryStatus = retryPolicyModel.getStatus(retryState, nowFn());
        res.status(200).json({
          ...attempt,
          registrationStatus: session.registrationStatus,
          retryPolicy: toRetryPayload(retryStatus)
        });
      } catch {
        res.status(422).json({ code: 'VALIDATION_FAILED', message: 'Invalid request path parameters.' });
      }
    }
  };
}

