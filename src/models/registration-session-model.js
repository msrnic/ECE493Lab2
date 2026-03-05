import { validateUuid } from './payment-validation.js';

function requireStatus(status) {
  if (status !== 'incomplete' && status !== 'complete') {
    throw new Error('registrationStatus must be incomplete or complete.');
  }
}

export function createRegistrationCheckoutSession({
  sessionId,
  attendeeId,
  registrationStatus = 'incomplete',
  completedAt = null,
  createdAt,
  updatedAt
}) {
  validateUuid(sessionId, 'sessionId');
  validateUuid(attendeeId, 'attendeeId');
  requireStatus(registrationStatus);

  const nowIso = createdAt ?? new Date().toISOString();
  const state = {
    sessionId,
    attendeeId,
    registrationStatus,
    completedAt,
    createdAt: nowIso,
    updatedAt: updatedAt ?? nowIso
  };

  return {
    get value() {
      return { ...state };
    },
    markComplete(now = new Date().toISOString()) {
      if (state.registrationStatus === 'complete') {
        return { ...state };
      }
      state.registrationStatus = 'complete';
      state.completedAt = now;
      state.updatedAt = now;
      return { ...state };
    }
  };
}

