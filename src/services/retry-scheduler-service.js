function computeLatencyMs(startIso, endIso) {
  return Math.max(0, Date.parse(endIso) - Date.parse(startIso));
}

function normalizeIso(value, fallbackIso) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallbackIso;
  }

  return date.toISOString();
}

export function createRetrySchedulerService({
  decisionNotificationModel,
  nowFn = () => new Date(),
  retryDelayMs = 60 * 1000
} = {}) {
  if (!decisionNotificationModel) {
    throw new Error('decisionNotificationModel is required');
  }

  const latencyMeasurements = [];

  function scheduleRetry({ notificationId, failedAt }) {
    const baseIso = normalizeIso(failedAt, nowFn().toISOString());
    const dueAt = new Date(Date.parse(baseIso) + retryDelayMs).toISOString();
    decisionNotificationModel.setRetryDueAt(notificationId, dueAt);
    return dueAt;
  }

  function isRetryDue(notification, runAt = nowFn().toISOString()) {
    if (!notification?.retryDueAt) {
      return false;
    }

    return Date.parse(runAt) >= Date.parse(notification.retryDueAt);
  }

  function recordFinalizeToAttemptLatency({ finalizedAt, attemptStartedAt }) {
    const latencyMs = computeLatencyMs(finalizedAt, attemptStartedAt);
    latencyMeasurements.push({
      metric: 'finalize_to_attempt1_ms',
      latencyMs,
      targetMs: 30_000,
      metTarget: latencyMs <= 30_000
    });

    return latencyMs;
  }

  function recordFailureToRetryLatency({ failureAt, retryStartedAt }) {
    const latencyMs = computeLatencyMs(failureAt, retryStartedAt);
    latencyMeasurements.push({
      metric: 'failure_to_retry_ms',
      latencyMs,
      targetMs: 60_000,
      metTarget: latencyMs <= 60_000
    });

    return latencyMs;
  }

  function getLatencyMeasurements() {
    return latencyMeasurements.map((measurement) => ({ ...measurement }));
  }

  return {
    scheduleRetry,
    isRetryDue,
    recordFinalizeToAttemptLatency,
    recordFailureToRetryLatency,
    getLatencyMeasurements
  };
}
