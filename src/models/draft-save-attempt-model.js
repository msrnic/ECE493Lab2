import { randomUUID } from 'node:crypto';

export const DraftSaveOutcome = Object.freeze({
  SUCCESS: 'SUCCESS',
  FAILED_SYSTEM: 'FAILED_SYSTEM',
  FAILED_STALE: 'FAILED_STALE',
  FAILED_AUTH: 'FAILED_AUTH'
});

function draftError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function isFailureOutcome(outcome) {
  return outcome !== DraftSaveOutcome.SUCCESS;
}

export function createDraftSaveAttempt(input, options = {}) {
  if (!input || typeof input !== 'object') {
    throw draftError('DRAFT_BAD_REQUEST', 'save attempt payload is required');
  }

  const idFactory = options.idFactory ?? randomUUID;
  const now = options.now ?? (() => new Date().toISOString());

  if (!input.submissionId || !input.actorUserId) {
    throw draftError('DRAFT_BAD_REQUEST', 'submissionId and actorUserId are required');
  }

  if (!Number.isInteger(input.baseRevision) || input.baseRevision < 0) {
    throw draftError('DRAFT_BAD_REQUEST', 'baseRevision must be >= 0');
  }

  if (!Object.values(DraftSaveOutcome).includes(input.outcome)) {
    throw draftError('DRAFT_BAD_REQUEST', 'outcome is invalid');
  }

  if (input.outcome === DraftSaveOutcome.SUCCESS && !input.createdVersionId) {
    throw draftError('DRAFT_BAD_REQUEST', 'createdVersionId is required for SUCCESS');
  }

  if (isFailureOutcome(input.outcome) && !input.errorCode) {
    throw draftError('DRAFT_BAD_REQUEST', 'errorCode is required for failed attempts');
  }

  return Object.freeze({
    attemptId: input.attemptId ?? idFactory(),
    submissionId: input.submissionId,
    actorUserId: input.actorUserId,
    baseRevision: input.baseRevision,
    outcome: input.outcome,
    errorCode: input.errorCode ?? null,
    createdVersionId: input.createdVersionId ?? null,
    attemptedAt: input.attemptedAt ?? now()
  });
}
