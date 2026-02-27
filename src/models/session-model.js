export function createSessionModel({ sessionStore, nowFn = () => new Date() } = {}) {
  function invalidateOtherActiveSessions({ userId, currentSessionId } = {}) {
    if (!sessionStore || typeof sessionStore.invalidateOtherSessions !== 'function') {
      return {
        invalidatedCount: 0
      };
    }

    const invalidatedCount = sessionStore.invalidateOtherSessions(userId, currentSessionId, nowFn());

    return {
      invalidatedCount
    };
  }

  return {
    invalidateOtherActiveSessions
  };
}
