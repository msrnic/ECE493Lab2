function normalizeTime(now) {
  return now instanceof Date ? now.getTime() : Number(now);
}

function buildUnblockedState(failureCount = 0) {
  return {
    blocked: false,
    retryAfterSeconds: 0,
    blockedUntil: null,
    failureCount
  };
}

export function createAttemptThrottleModel({
  nowFn = () => new Date(),
  maxFailures = 5,
  windowMs = 10 * 60 * 1000,
  blockMs = 10 * 60 * 1000
} = {}) {
  const byUser = new Map();

  function getOrCreateState(userId) {
    const existing = byUser.get(userId);
    if (existing) {
      return existing;
    }

    const created = {
      failuresMs: [],
      blockedUntilMs: 0
    };
    byUser.set(userId, created);
    return created;
  }

  function pruneState(state, nowMs) {
    state.failuresMs = state.failuresMs.filter((attemptMs) => nowMs - attemptMs < windowMs);

    if (state.blockedUntilMs <= nowMs) {
      state.blockedUntilMs = 0;
    }
  }

  function describeState(state, nowMs) {
    if (state.blockedUntilMs > nowMs) {
      const retryAfterSeconds = Math.ceil((state.blockedUntilMs - nowMs) / 1000);
      return {
        blocked: true,
        retryAfterSeconds,
        blockedUntil: new Date(state.blockedUntilMs).toISOString(),
        failureCount: state.failuresMs.length
      };
    }

    return buildUnblockedState(state.failuresMs.length);
  }

  function getState(userId, now = nowFn()) {
    if (!userId) {
      return buildUnblockedState();
    }

    const nowMs = normalizeTime(now);
    const state = getOrCreateState(userId);
    pruneState(state, nowMs);
    return describeState(state, nowMs);
  }

  function recordIncorrectAttempt(userId, now = nowFn()) {
    if (!userId) {
      return buildUnblockedState();
    }

    const nowMs = normalizeTime(now);
    const state = getOrCreateState(userId);
    pruneState(state, nowMs);
    state.failuresMs.push(nowMs);

    if (state.failuresMs.length >= maxFailures && state.blockedUntilMs === 0) {
      state.blockedUntilMs = nowMs + blockMs;
    }

    return describeState(state, nowMs);
  }

  function reset(userId) {
    if (!userId) {
      return;
    }

    byUser.delete(userId);
  }

  return {
    getState,
    recordIncorrectAttempt,
    reset
  };
}
