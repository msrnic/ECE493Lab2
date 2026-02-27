const DEFAULT_BLOCK_THRESHOLD = 5;
const DEFAULT_BLOCK_WINDOW_MS = 10 * 60 * 1000;

export function normalizeTrackerEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function createEmptyState(email = '') {
  return {
    email,
    failedCount: 0,
    blocked: false,
    blockedUntil: null,
    retryAfterSeconds: 0
  };
}

function isStillBlocked(blockedUntil, nowMs) {
  if (!blockedUntil) {
    return false;
  }

  return new Date(blockedUntil).getTime() > nowMs;
}

export function createFailedLoginTracker({
  blockThreshold = DEFAULT_BLOCK_THRESHOLD,
  blockWindowMs = DEFAULT_BLOCK_WINDOW_MS
} = {}) {
  const entries = new Map();

  function clearExpiredEntry(email, nowMs) {
    const entry = entries.get(email);
    if (!entry) {
      return;
    }

    if (!isStillBlocked(entry.blockedUntil, nowMs)) {
      if (entry.blockedUntil) {
        entries.delete(email);
      }
    }
  }

  function getState(email, now = new Date()) {
    const normalizedEmail = normalizeTrackerEmail(email);
    const nowMs = now.getTime();

    if (!normalizedEmail) {
      return createEmptyState('');
    }

    clearExpiredEntry(normalizedEmail, nowMs);

    const entry = entries.get(normalizedEmail);
    if (!entry) {
      return createEmptyState(normalizedEmail);
    }

    const blocked = isStillBlocked(entry.blockedUntil, nowMs);
    if (!blocked) {
      return {
        ...createEmptyState(normalizedEmail),
        failedCount: entry.failedCount
      };
    }

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((new Date(entry.blockedUntil).getTime() - nowMs) / 1000)
    );

    return {
      email: normalizedEmail,
      failedCount: entry.failedCount,
      blocked,
      blockedUntil: entry.blockedUntil,
      retryAfterSeconds
    };
  }

  function recordFailure(email, now = new Date()) {
    const normalizedEmail = normalizeTrackerEmail(email);

    if (!normalizedEmail) {
      return createEmptyState('');
    }

    const nowMs = now.getTime();
    clearExpiredEntry(normalizedEmail, nowMs);

    const existing = entries.get(normalizedEmail) ?? {
      failedCount: 0,
      blockedUntil: null
    };

    const failedCount = existing.failedCount + 1;
    let blockedUntil = null;

    if (failedCount >= blockThreshold) {
      blockedUntil = new Date(nowMs + blockWindowMs).toISOString();
    }

    entries.set(normalizedEmail, {
      failedCount,
      blockedUntil
    });

    return getState(normalizedEmail, now);
  }

  function reset(email) {
    const normalizedEmail = normalizeTrackerEmail(email);
    if (!normalizedEmail) {
      return;
    }

    entries.delete(normalizedEmail);
  }

  return {
    getState,
    recordFailure,
    reset
  };
}
