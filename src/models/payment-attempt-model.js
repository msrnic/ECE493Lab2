import { validateIdempotencyKey, validatePaymentToken, validateUuid } from './payment-validation.js';

const FINAL_OUTCOMES = new Set(['approved', 'declined']);
const ALLOWED_TRANSITIONS = new Map([
  ['processing', new Set(['approved', 'declined', 'pending'])],
  ['pending', new Set(['approved', 'declined'])],
  ['approved', new Set()],
  ['declined', new Set()]
]);

function assertOutcome(outcome) {
  if (!ALLOWED_TRANSITIONS.has(outcome)) {
    throw new Error('Invalid payment outcome.');
  }
}

export function createPaymentAttempt({
  attemptId,
  sessionId,
  idempotencyKey,
  paymentToken,
  gatewayReference = null,
  outcome = 'processing',
  declineReasonCode = null,
  submittedAt,
  finalizedAt = null,
  isIdempotentReplay = false
}) {
  validateUuid(attemptId, 'attemptId');
  validateUuid(sessionId, 'sessionId');
  const normalizedIdempotencyKey = validateIdempotencyKey(idempotencyKey);
  const normalizedToken = validatePaymentToken(paymentToken);
  assertOutcome(outcome);

  if (outcome === 'declined' && !declineReasonCode) {
    throw new Error('declineReasonCode is required for declined outcomes.');
  }

  const nowIso = submittedAt ?? new Date().toISOString();
  const state = {
    attemptId,
    sessionId,
    idempotencyKey: normalizedIdempotencyKey,
    paymentToken: normalizedToken,
    gatewayReference,
    outcome,
    declineReasonCode,
    submittedAt: nowIso,
    finalizedAt,
    isIdempotentReplay
  };

  if (FINAL_OUTCOMES.has(state.outcome) && !state.finalizedAt) {
    state.finalizedAt = nowIso;
  }

  return {
    get value() {
      return { ...state };
    },
    transitionTo(nextOutcome, {
      declineReasonCode: nextDeclineReasonCode = null,
      gatewayReference: nextGatewayReference = state.gatewayReference,
      now = new Date().toISOString()
    } = {}) {
      assertOutcome(nextOutcome);
      const allowed = ALLOWED_TRANSITIONS.get(state.outcome);
      if (!allowed.has(nextOutcome)) {
        throw new Error(`Invalid payment outcome transition: ${state.outcome} -> ${nextOutcome}`);
      }
      if (nextOutcome === 'declined' && !nextDeclineReasonCode) {
        throw new Error('declineReasonCode is required for declined outcomes.');
      }

      state.outcome = nextOutcome;
      state.gatewayReference = nextGatewayReference;
      state.declineReasonCode = nextOutcome === 'declined' ? nextDeclineReasonCode : null;
      if (FINAL_OUTCOMES.has(nextOutcome)) {
        state.finalizedAt = now;
      }

      return { ...state };
    }
  };
}

