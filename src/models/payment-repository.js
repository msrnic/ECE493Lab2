import { createRegistrationCheckoutSession } from './registration-session-model.js';

function keyFor(sessionId, idempotencyKey) {
  return `${sessionId}::${idempotencyKey}`;
}

function createDefaultRetryState(sessionId) {
  return {
    sessionId,
    declinedAttemptTimestamps: [],
    cooldownUntil: null,
    pendingAttemptId: null
  };
}

export function createPaymentRepository({ nowFn = () => new Date().toISOString() } = {}) {
  const sessions = new Map();
  const attempts = new Map();
  const sessionAttempts = new Map();
  const idempotencyKeys = new Map();
  const retryStates = new Map();
  const reconciliationEvents = new Map();

  return {
    getOrCreateSession({ sessionId, attendeeId }) {
      if (!sessions.has(sessionId)) {
        const session = createRegistrationCheckoutSession({
          sessionId,
          attendeeId,
          createdAt: nowFn(),
          updatedAt: nowFn()
        }).value;
        sessions.set(sessionId, session);
      }
      return { ...sessions.get(sessionId) };
    },
    getSession(sessionId) {
      const session = sessions.get(sessionId);
      return session ? { ...session } : null;
    },
    saveSession(session) {
      sessions.set(session.sessionId, { ...session });
      return { ...session };
    },
    markSessionComplete(sessionId) {
      const existing = sessions.get(sessionId);
      if (!existing) {
        return null;
      }
      const updated = createRegistrationCheckoutSession(existing).markComplete(nowFn());
      sessions.set(sessionId, updated);
      return { ...updated };
    },
    createAttempt(attempt) {
      attempts.set(attempt.attemptId, { ...attempt });
      const list = sessionAttempts.get(attempt.sessionId) ?? [];
      list.push(attempt.attemptId);
      sessionAttempts.set(attempt.sessionId, list);
      idempotencyKeys.set(keyFor(attempt.sessionId, attempt.idempotencyKey), attempt.attemptId);
      return { ...attempt };
    },
    updateAttempt(attemptId, patch) {
      const existing = attempts.get(attemptId);
      if (!existing) {
        return null;
      }
      const updated = { ...existing, ...patch };
      attempts.set(attemptId, updated);
      return { ...updated };
    },
    getAttempt(attemptId) {
      const attempt = attempts.get(attemptId);
      return attempt ? { ...attempt } : null;
    },
    getAttemptBySessionAndIdempotency({ sessionId, idempotencyKey }) {
      const attemptId = idempotencyKeys.get(keyFor(sessionId, idempotencyKey));
      if (!attemptId) {
        return null;
      }
      return this.getAttempt(attemptId);
    },
    listAttemptsBySession(sessionId) {
      const list = sessionAttempts.get(sessionId) ?? [];
      return list.map((attemptId) => ({ ...attempts.get(attemptId) }));
    },
    getRetryState(sessionId) {
      const state = retryStates.get(sessionId) ?? createDefaultRetryState(sessionId);
      return { ...state, declinedAttemptTimestamps: [...state.declinedAttemptTimestamps] };
    },
    saveRetryState(sessionId, retryState) {
      const state = {
        ...createDefaultRetryState(sessionId),
        ...retryState,
        declinedAttemptTimestamps: [...(retryState.declinedAttemptTimestamps ?? [])]
      };
      retryStates.set(sessionId, state);
      return { ...state, declinedAttemptTimestamps: [...state.declinedAttemptTimestamps] };
    },
    hasProcessedReconciliationEvent(eventId) {
      return reconciliationEvents.has(eventId);
    },
    recordReconciliationEvent(event) {
      reconciliationEvents.set(event.eventId, { ...event });
      return { ...event };
    }
  };
}

