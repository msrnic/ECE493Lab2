import { DraftSubmissionStatus } from './draft-submission-model.js';

function draftError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function pruneVersionsForSubmission(submission, versions) {
  if (!submission || !Array.isArray(versions)) {
    throw draftError('DRAFT_BAD_REQUEST', 'submission and versions are required');
  }

  if (submission.status !== DraftSubmissionStatus.FINAL_SUBMITTED) {
    return {
      retainedVersionId: submission.latestVersionId,
      retainedVersions: versions,
      prunedVersions: []
    };
  }

  if (versions.length <= 1) {
    return {
      retainedVersionId: submission.latestVersionId,
      retainedVersions: versions,
      prunedVersions: []
    };
  }

  const retained =
    versions.find((version) => version.versionId === submission.latestVersionId) ??
    versions.reduce((latest, current) => (current.revision > latest.revision ? current : latest), versions[0]);

  return {
    retainedVersionId: retained.versionId,
    retainedVersions: [retained],
    prunedVersions: versions.filter((version) => version.versionId !== retained.versionId)
  };
}

export function applyRetentionPrune(state, submissionId) {
  const submission = state.submissions.get(submissionId);
  if (!submission) {
    throw draftError('DRAFT_NOT_FOUND', 'submission not found');
  }

  const versions = state.versions.get(submissionId) ?? [];
  const pruneResult = pruneVersionsForSubmission(submission, versions);
  state.versions.set(submissionId, pruneResult.retainedVersions);
  submission.latestVersionId = pruneResult.retainedVersionId;

  return {
    submissionId,
    retainedVersionId: pruneResult.retainedVersionId,
    prunedVersionCount: pruneResult.prunedVersions.length
  };
}
