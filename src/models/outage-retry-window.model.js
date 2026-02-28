import {
  assertIsoDateString,
  assertNonEmptyString,
  cloneRecord
} from './model-validation.js';

function buildScopeKey(reviewerId, paperId) {
  return `${reviewerId}::${paperId}`;
}

function normalizeNow(value) {
  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
}

export function createOutageRetryWindowModel({ throttleWindowMs = 5000, nowFn = () => new Date() } = {}) {
  const windows = new Map();

  function getWindow(reviewerId, paperId) {
    assertNonEmptyString(reviewerId, 'reviewerId');
    assertNonEmptyString(paperId, 'paperId');

    const stored = windows.get(buildScopeKey(reviewerId, paperId));
    return stored ? cloneRecord(stored) : null;
  }

  function clearWindow(reviewerId, paperId) {
    assertNonEmptyString(reviewerId, 'reviewerId');
    assertNonEmptyString(paperId, 'paperId');

    windows.delete(buildScopeKey(reviewerId, paperId));
  }

  function registerTemporaryOutage({ reviewerId, paperId, now = nowFn() }) {
    const normalizedReviewerId = assertNonEmptyString(reviewerId, 'reviewerId');
    const normalizedPaperId = assertNonEmptyString(paperId, 'paperId');
    const normalizedNow = normalizeNow(now);
    const nowIso = assertIsoDateString(normalizedNow.toISOString(), 'now');
    const scopeKey = buildScopeKey(normalizedReviewerId, normalizedPaperId);

    const existing = windows.get(scopeKey) ?? {
      reviewerId: normalizedReviewerId,
      paperId: normalizedPaperId,
      firstOutageAt: nowIso,
      immediateRetryUsed: false,
      nextAllowedRetryAt: null
    };

    if (!windows.has(scopeKey)) {
      windows.set(scopeKey, existing);

      return {
        outcome: 'temporarily-unavailable',
        reasonCode: 'TEMPORARY_OUTAGE',
        immediateRetryAllowed: true
      };
    }

    if (!existing.immediateRetryUsed) {
      existing.immediateRetryUsed = true;
      existing.nextAllowedRetryAt = new Date(normalizedNow.getTime() + throttleWindowMs).toISOString();
      windows.set(scopeKey, existing);

      return {
        outcome: 'temporarily-unavailable',
        reasonCode: 'TEMPORARY_OUTAGE',
        immediateRetryAllowed: true
      };
    }

    const nextAllowedEpoch = Date.parse(existing.nextAllowedRetryAt);
    const nowEpoch = normalizedNow.getTime();

    if (nowEpoch < nextAllowedEpoch) {
      const remainingSeconds = Math.max(1, Math.ceil((nextAllowedEpoch - nowEpoch) / 1000));
      windows.set(scopeKey, existing);

      return {
        outcome: 'throttled',
        reasonCode: 'TEMP_OUTAGE_THROTTLED',
        retryAfterSeconds: remainingSeconds
      };
    }

    existing.nextAllowedRetryAt = new Date(nowEpoch + throttleWindowMs).toISOString();
    windows.set(scopeKey, existing);

    return {
      outcome: 'temporarily-unavailable',
      reasonCode: 'TEMPORARY_OUTAGE',
      immediateRetryAllowed: true
    };
  }

  return {
    getWindow,
    clearWindow,
    registerTemporaryOutage
  };
}
