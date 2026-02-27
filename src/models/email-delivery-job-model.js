export const EMAIL_JOB_TEMPLATE = 'registration_confirmation';

export function createEmailDeliveryJob({
  userAccountId,
  now = new Date(),
  template = EMAIL_JOB_TEMPLATE
}) {
  return {
    userAccountId,
    template,
    status: 'queued',
    attemptCount: 0,
    nextAttemptAt: now.toISOString(),
    lastError: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

export function markEmailDeliverySent(job, now = new Date()) {
  return {
    ...job,
    status: 'sent',
    updatedAt: now.toISOString(),
    nextAttemptAt: now.toISOString(),
    lastError: null
  };
}

export function markEmailDeliveryFailure(
  job,
  { error, now = new Date(), maxAttempts = 2, backoffMs = 60 * 1000 }
) {
  const attemptCount = job.attemptCount + 1;

  if (attemptCount >= maxAttempts) {
    return {
      ...job,
      status: 'failed_terminal',
      attemptCount,
      nextAttemptAt: now.toISOString(),
      lastError: error instanceof Error ? error.message : String(error),
      updatedAt: now.toISOString()
    };
  }

  return {
    ...job,
    status: 'queued_retry',
    attemptCount,
    nextAttemptAt: new Date(now.getTime() + backoffMs).toISOString(),
    lastError: error instanceof Error ? error.message : String(error),
    updatedAt: now.toISOString()
  };
}
