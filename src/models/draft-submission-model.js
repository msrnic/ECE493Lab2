export const DraftSubmissionStatus = Object.freeze({
  IN_PROGRESS: 'IN_PROGRESS',
  FINAL_SUBMITTED: 'FINAL_SUBMITTED'
});

function draftError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

export function createDraftSubmission(input) {
  if (!input || typeof input !== 'object') {
    throw draftError('DRAFT_BAD_REQUEST', 'submission payload is required');
  }

  if (!input.submissionId || !input.ownerUserId) {
    throw draftError('DRAFT_BAD_REQUEST', 'submissionId and ownerUserId are required');
  }

  const status = input.status ?? DraftSubmissionStatus.IN_PROGRESS;
  if (!Object.values(DraftSubmissionStatus).includes(status)) {
    throw draftError('DRAFT_BAD_REQUEST', 'status is invalid');
  }

  return {
    submissionId: input.submissionId,
    ownerUserId: input.ownerUserId,
    status,
    latestVersionId: input.latestVersionId ?? null,
    latestRevision: input.latestRevision ?? 0,
    lastSavedAt: input.lastSavedAt ?? null,
    finalizedAt: input.finalizedAt ?? null
  };
}

export function createDraftState() {
  return {
    submissions: new Map(),
    versions: new Map(),
    saveAttempts: new Map()
  };
}

export function getSubmission(state, submissionId) {
  return state.submissions.get(submissionId) ?? null;
}

export function ensureSubmission(state, input) {
  const existing = getSubmission(state, input.submissionId);
  if (existing) {
    return existing;
  }

  const created = createDraftSubmission(input);
  state.submissions.set(created.submissionId, created);
  state.versions.set(created.submissionId, []);
  state.saveAttempts.set(created.submissionId, []);
  return created;
}

export function assertSaveAllowed(submission, baseRevision) {
  if (submission.status !== DraftSubmissionStatus.IN_PROGRESS) {
    throw draftError('DRAFT_BAD_REQUEST', 'submission is finalized');
  }

  if (!Number.isInteger(baseRevision) || baseRevision < 0) {
    throw draftError('DRAFT_BAD_REVISION', 'baseRevision must be >= 0');
  }

  if (baseRevision !== submission.latestRevision) {
    throw draftError('DRAFT_STALE', 'stale save attempt', {
      reloadRequired: true,
      latestRevision: submission.latestRevision,
      latestVersionId: submission.latestVersionId
    });
  }
}

export function applySavedVersion(submission, version) {
  submission.latestVersionId = version.versionId;
  submission.latestRevision = version.revision;
  submission.lastSavedAt = version.createdAt;
  return submission;
}

export function appendVersion(state, version) {
  const versions = state.versions.get(version.submissionId);
  if (!versions) {
    throw draftError('DRAFT_NOT_FOUND', 'submission version bucket does not exist');
  }

  versions.push(version);
  return version;
}

export function listVersions(state, submissionId) {
  return [...(state.versions.get(submissionId) ?? [])];
}

export function findVersion(state, submissionId, versionId) {
  return listVersions(state, submissionId).find((version) => version.versionId === versionId) ?? null;
}

export function getLatestVersion(state, submissionId) {
  const submission = getSubmission(state, submissionId);
  if (!submission?.latestVersionId) {
    return null;
  }

  return findVersion(state, submissionId, submission.latestVersionId);
}

export function recordSaveAttempt(state, attempt) {
  const attempts = state.saveAttempts.get(attempt.submissionId);
  if (!attempts) {
    throw draftError('DRAFT_NOT_FOUND', 'submission attempt bucket does not exist');
  }

  attempts.push(attempt);
  return attempt;
}

export function listSaveAttempts(state, submissionId) {
  return [...(state.saveAttempts.get(submissionId) ?? [])];
}

export function markSubmissionFinalized(submission, finalizedAt = new Date().toISOString()) {
  submission.status = DraftSubmissionStatus.FINAL_SUBMITTED;
  submission.finalizedAt = submission.finalizedAt ?? finalizedAt;
  return submission;
}
