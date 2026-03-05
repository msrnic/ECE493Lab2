import { randomUUID } from 'node:crypto';
import { createPaymentAttempt } from '../models/payment-attempt-model.js';
import { createRetryPolicyModel } from '../models/retry-policy-model.js';
import {
  assertTokenOnlyPayload,
  readIdempotencyKey,
  validateIdempotencyKey,
  validatePaymentToken,
  validateUuid
} from '../models/payment-validation.js';

function errorPayload(error) {
  const status = Number(error?.status) || 500;
  return {
    status,
    body: {
      code: error?.code ?? 'INTERNAL_ERROR',
      message: error?.message ?? 'Unexpected error.',
      details: error?.details ?? {}
    }
  };
}

function toResponseBody(attempt, session, retryStatus) {
  return {
    attemptId: attempt.attemptId,
    sessionId: attempt.sessionId,
    outcome: attempt.outcome,
    registrationStatus: session.registrationStatus,
    declineReasonCode: attempt.declineReasonCode,
    isIdempotentReplay: Boolean(attempt.isIdempotentReplay),
    submittedAt: attempt.submittedAt,
    finalizedAt: attempt.finalizedAt,
    retryPolicy: {
      declinedRetriesInWindow: retryStatus.declinedRetriesInWindow,
      retriesRemaining: retryStatus.retriesRemaining,
      retryAllowed: retryStatus.retryAllowed,
      cooldownExpiresAt: retryStatus.cooldownUntil,
      blockedReason: retryStatus.blockedReason
    }
  };
}

export function createPaymentController({
  repository,
  gatewayClient,
  retryPolicyModel = createRetryPolicyModel(),
  nowFn = () => new Date(),
  idFactory = () => randomUUID()
}) {
  async function submitPaymentAttempt(req, res) {
    try {
      validateUuid(req.params?.sessionId, 'sessionId');
      const idempotencyKey = validateIdempotencyKey(readIdempotencyKey(req.headers));
      assertTokenOnlyPayload(req.body);
      const paymentToken = validatePaymentToken(req.body?.paymentToken);
      const gatewaySessionId = String(req.body?.gatewaySessionId ?? '').trim();
      if (!gatewaySessionId) {
        throw Object.assign(new Error('gatewaySessionId is required.'), { code: 'VALIDATION_FAILED', status: 422 });
      }

      const existing = repository.getAttemptBySessionAndIdempotency({
        sessionId: req.params.sessionId,
        idempotencyKey
      });
      if (existing) {
        const session = repository.getSession(req.params.sessionId);
        const retryState = repository.getRetryState(req.params.sessionId);
        const retryStatus = retryPolicyModel.getStatus(retryState, nowFn());
        res.status(200).json(toResponseBody({ ...existing, isIdempotentReplay: true }, session, retryStatus));
        return;
      }

      const session = repository.getOrCreateSession({
        sessionId: req.params.sessionId,
        attendeeId: String(req.headers?.['x-attendee-id'] ?? '00000000-0000-4000-8000-000000000001')
      });

      const retryState = repository.getRetryState(req.params.sessionId);
      const retryStatus = retryPolicyModel.getStatus(retryState, nowFn());
      if (!retryStatus.retryAllowed) {
        res.status(409).json({
          code: 'RETRY_BLOCKED',
          message: 'Retry is blocked until the current policy restriction is resolved.',
          details: {
            blockedReason: retryStatus.blockedReason,
            cooldownExpiresAt: retryStatus.cooldownUntil
          }
        });
        return;
      }

      const gatewayOutcome = await gatewayClient.submitPayment({
        paymentToken,
        gatewaySessionId,
        sessionId: req.params.sessionId,
        idempotencyKey
      });

      const nowIso = nowFn().toISOString();
      const attempt = createPaymentAttempt({
        attemptId: idFactory(),
        sessionId: req.params.sessionId,
        idempotencyKey,
        paymentToken,
        gatewayReference: gatewayOutcome.gatewayReference ?? null,
        outcome: gatewayOutcome.outcome,
        declineReasonCode: gatewayOutcome.declineReasonCode ?? null,
        submittedAt: nowIso,
        finalizedAt: gatewayOutcome.outcome === 'pending' ? null : nowIso
      }).value;
      repository.createAttempt(attempt);

      let nextSession = session;
      let nextRetryState = retryState;
      if (attempt.outcome === 'approved') {
        nextSession = repository.markSessionComplete(req.params.sessionId);
        nextRetryState = repository.saveRetryState(req.params.sessionId, {
          ...retryState,
          pendingAttemptId: null
        });
      } else if (attempt.outcome === 'declined') {
        nextRetryState = repository.saveRetryState(
          req.params.sessionId,
          retryPolicyModel.registerDecline({ ...retryState, pendingAttemptId: null }, nowFn())
        );
      } else {
        nextRetryState = repository.saveRetryState(req.params.sessionId, {
          ...retryState,
          pendingAttemptId: attempt.attemptId
        });
      }

      const nextRetryStatus = retryPolicyModel.getStatus(nextRetryState, nowFn());
      res.status(201).json(toResponseBody(attempt, nextSession, nextRetryStatus));
    } catch (error) {
      const payload = errorPayload(error);
      res.status(payload.status).json(payload.body);
    }
  }

  return {
    submitPaymentAttempt
  };
}

