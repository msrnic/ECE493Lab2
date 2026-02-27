import { SUBMISSION_POLICY, SUBMISSION_STATUSES } from '../config/submission-config.js';

export function createSessionState({
  sessionId,
  submissionId,
  metadata,
  preservedFileIds = [],
  now = new Date(),
  ttlMs = SUBMISSION_POLICY.retryStateTtlMs
}) {
  return {
    sessionId,
    submissionId,
    preservedMetadata: metadata,
    preservedFileIds,
    expiresAt: new Date(now.getTime() + ttlMs).toISOString()
  };
}

export function mergeSessionState(current, {
  metadata,
  preservedFileIds,
  now = new Date(),
  ttlMs = SUBMISSION_POLICY.retryStateTtlMs
} = {}) {
  if (!current) {
    return null;
  }

  return {
    ...current,
    preservedMetadata: metadata ?? current.preservedMetadata,
    preservedFileIds: preservedFileIds ?? current.preservedFileIds,
    expiresAt: new Date(now.getTime() + ttlMs).toISOString()
  };
}

export function isRetryAllowed({ submissionStatus, sessionState }) {
  if (!sessionState) {
    return false;
  }

  return submissionStatus !== SUBMISSION_STATUSES.SUBMITTED;
}

export function shouldPreserveRetryData(submissionStatus) {
  return submissionStatus !== SUBMISSION_STATUSES.SUBMITTED;
}
