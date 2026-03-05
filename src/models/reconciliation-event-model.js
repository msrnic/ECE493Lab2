export function createReconciliationEvent({
  eventId,
  attemptId,
  source = 'webhook',
  resolvedOutcome,
  receivedAt = new Date().toISOString()
}) {
  if (typeof eventId !== 'string' || eventId.trim().length === 0) {
    throw new Error('eventId is required.');
  }
  if (typeof attemptId !== 'string' || attemptId.trim().length === 0) {
    throw new Error('attemptId is required.');
  }
  if (resolvedOutcome !== 'approved' && resolvedOutcome !== 'declined') {
    throw new Error('resolvedOutcome must be approved or declined.');
  }
  if (source !== 'webhook' && source !== 'poll') {
    throw new Error('source must be webhook or poll.');
  }

  return {
    eventId: eventId.trim(),
    attemptId: attemptId.trim(),
    source,
    resolvedOutcome,
    receivedAt
  };
}

