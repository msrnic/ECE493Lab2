const WINDOW_MS = 15 * 60 * 1000;
const MAX_DECLINES_IN_WINDOW = 5;

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function isFutureIso(value, nowDate) {
  if (!value) {
    return false;
  }
  return new Date(value).getTime() > nowDate.getTime();
}

export function createRetryPolicyModel({ nowFn = () => new Date() } = {}) {
  return {
    trimWindow(timestamps = [], now = nowFn()) {
      const nowDate = toDate(now);
      return timestamps.filter((timestamp) => {
        return nowDate.getTime() - new Date(timestamp).getTime() < WINDOW_MS;
      });
    },
    getStatus({
      declinedAttemptTimestamps = [],
      cooldownUntil = null,
      pendingAttemptId = null
    } = {}, now = nowFn()) {
      const nowDate = toDate(now);
      const inWindow = this.trimWindow(declinedAttemptTimestamps, nowDate);
      const cooldownActive = isFutureIso(cooldownUntil, nowDate);
      const retryAllowed = !pendingAttemptId && !cooldownActive && inWindow.length < MAX_DECLINES_IN_WINDOW;

      return {
        declinedAttemptTimestamps: inWindow,
        declinedRetriesInWindow: inWindow.length,
        retriesRemaining: Math.max(MAX_DECLINES_IN_WINDOW - inWindow.length, 0),
        retryAllowed,
        cooldownUntil: cooldownActive ? cooldownUntil : null,
        blockedReason: pendingAttemptId ? 'pending_reconciliation' : (cooldownActive ? 'cooldown_active' : null)
      };
    },
    registerDecline(state = {}, now = nowFn()) {
      const nowDate = toDate(now);
      const inWindow = this.trimWindow(state.declinedAttemptTimestamps, nowDate);
      inWindow.push(nowDate.toISOString());
      const shouldStartCooldown = inWindow.length >= MAX_DECLINES_IN_WINDOW;

      return {
        ...state,
        declinedAttemptTimestamps: inWindow,
        cooldownUntil: shouldStartCooldown ? new Date(nowDate.getTime() + WINDOW_MS).toISOString() : null
      };
    },
    clearPending(state = {}) {
      return {
        ...state,
        pendingAttemptId: null
      };
    }
  };
}

