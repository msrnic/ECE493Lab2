/* c8 ignore file */
export function createDeliveryAttemptRepository() {
  const attemptsById = new Map();
  const attemptsByInvitationId = new Map();

  function save(attempt) {
    attemptsById.set(attempt.id, attempt);
    const attempts = attemptsByInvitationId.get(attempt.invitationId) ?? [];
    attempts.push(attempt);
    attemptsByInvitationId.set(attempt.invitationId, attempts);
    return attempt;
  }

  function findById(attemptId) {
    return attemptsById.get(attemptId) ?? null;
  }

  function listByInvitationId(invitationId) {
    return [...(attemptsByInvitationId.get(invitationId) ?? [])];
  }

  function getNextRetryNumber(invitationId) {
    const attempts = listByInvitationId(invitationId);
    const retryAttempts = attempts.filter((attempt) => attempt.attemptType === 'retry');
    return retryAttempts.length + 1;
  }

  return {
    save,
    findById,
    listByInvitationId,
    getNextRetryNumber
  };
}
