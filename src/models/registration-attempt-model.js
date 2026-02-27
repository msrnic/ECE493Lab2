export const THROTTLE_MAX_ATTEMPTS = 5;
export const THROTTLE_WINDOW_MS = 10 * 60 * 1000;

export function calculateThrottleState(
  attempts,
  nowMs,
  maxAttempts = THROTTLE_MAX_ATTEMPTS,
  windowMs = THROTTLE_WINDOW_MS
) {
  const windowStart = nowMs - windowMs;
  const recentAttempts = attempts.filter(
    (attempt) => new Date(attempt.attemptedAt).getTime() > windowStart
  );

  if (recentAttempts.length < maxAttempts) {
    return {
      blocked: false,
      retryAfterSeconds: 0
    };
  }

  const oldestAttemptMs = Math.min(
    ...recentAttempts.map((attempt) => new Date(attempt.attemptedAt).getTime())
  );
  const retryAfterMs = Math.max(1, windowMs - (nowMs - oldestAttemptMs));

  return {
    blocked: true,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000)
  };
}

export function getRegistrationThrottle(repository, emailNormalized, now = new Date()) {
  const attempts = repository.listRegistrationAttemptsByEmail(emailNormalized);
  return calculateThrottleState(attempts, now.getTime());
}

export function recordRegistrationAttempt(
  repository,
  { emailNormalized, outcome, now = new Date(), blockUntil = null }
) {
  return repository.createRegistrationAttempt({
    emailNormalized,
    outcome,
    attemptedAt: now.toISOString(),
    blockUntil
  });
}
