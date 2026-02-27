import { randomUUID } from 'node:crypto';
import {
  SUBMISSION_MESSAGES,
  SUBMISSION_OUTCOMES,
  SUBMISSION_STATUSES
} from '../config/submission-config.js';

function normalizeString(value) {
  return String(value ?? '').trim();
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => normalizeString(value))
    .filter((value) => value.length > 0);
}

export function normalizeMetadata(metadata = {}) {
  return {
    title: normalizeString(metadata.title),
    abstract: normalizeString(metadata.abstract),
    authorList: normalizeStringList(metadata.authorList),
    keywords: normalizeStringList(metadata.keywords)
  };
}

export function createDraftSubmission({
  submissionId = randomUUID(),
  authorId,
  actionSequenceId = randomUUID(),
  sessionId,
  metadata,
  now = new Date()
} = {}) {
  return {
    submissionId,
    authorId,
    actionSequenceId,
    sessionId,
    status: SUBMISSION_STATUSES.DRAFT,
    metadata: normalizeMetadata(metadata),
    validationErrors: [],
    confirmationCode: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

export function validateSubmissionMetadata(metadata = {}) {
  const normalizedMetadata = normalizeMetadata(metadata);
  const errors = [];

  if (!normalizedMetadata.title) {
    errors.push({
      code: 'REQUIRED_FIELD',
      field: 'title',
      message: 'Title is required.'
    });
  }

  if (!normalizedMetadata.abstract) {
    errors.push({
      code: 'REQUIRED_FIELD',
      field: 'abstract',
      message: 'Abstract is required.'
    });
  }

  if (normalizedMetadata.authorList.length === 0) {
    errors.push({
      code: 'REQUIRED_FIELD',
      field: 'authorList',
      message: 'At least one author is required.'
    });
  }

  return errors;
}

export function deriveSubmissionStatusFromErrors(errors = []) {
  if (errors.length === 0) {
    return SUBMISSION_STATUSES.DRAFT;
  }

  if (errors.some((error) => error.code === 'SCAN_FAILED')) {
    return SUBMISSION_STATUSES.SCAN_FAILED;
  }

  return SUBMISSION_STATUSES.VALIDATION_FAILED;
}

export function withValidationOutcome(submission, { errors = [], now = new Date() } = {}) {
  return {
    ...submission,
    status: deriveSubmissionStatusFromErrors(errors),
    validationErrors: errors,
    updatedAt: now.toISOString()
  };
}

export function markUploadFailed(submission, { now = new Date() } = {}) {
  return {
    ...submission,
    status: SUBMISSION_STATUSES.UPLOAD_FAILED,
    updatedAt: now.toISOString()
  };
}

export function markSaveFailed(submission, { now = new Date() } = {}) {
  return {
    ...submission,
    status: SUBMISSION_STATUSES.SAVE_FAILED,
    updatedAt: now.toISOString()
  };
}

export function markSubmitted(
  submission,
  {
    now = new Date(),
    confirmationCodeFactory = () => `CONF-${randomUUID().slice(0, 8).toUpperCase()}`
  } = {}
) {
  return {
    ...submission,
    status: SUBMISSION_STATUSES.SUBMITTED,
    validationErrors: [],
    confirmationCode: confirmationCodeFactory(submission),
    updatedAt: now.toISOString()
  };
}

export function statusToOutcome(status) {
  if (status === SUBMISSION_STATUSES.SUBMITTED) {
    return {
      outcome: SUBMISSION_OUTCOMES.SUBMITTED,
      message: SUBMISSION_MESSAGES.submitted
    };
  }

  if (status === SUBMISSION_STATUSES.UPLOAD_FAILED) {
    return {
      outcome: SUBMISSION_OUTCOMES.RETRY_REQUIRED,
      message: SUBMISSION_MESSAGES.uploadRetryRequired
    };
  }

  if (status === SUBMISSION_STATUSES.SAVE_FAILED) {
    return {
      outcome: SUBMISSION_OUTCOMES.RETRY_REQUIRED,
      message: SUBMISSION_MESSAGES.saveRetryRequired
    };
  }

  if (status === SUBMISSION_STATUSES.SCAN_FAILED) {
    return {
      outcome: SUBMISSION_OUTCOMES.REJECTED,
      message: SUBMISSION_MESSAGES.scanFailed
    };
  }

  return {
    outcome: SUBMISSION_OUTCOMES.REJECTED,
    message: SUBMISSION_MESSAGES.validationFailed
  };
}

export function createSubmissionResource({
  submission,
  files = [],
  retryAllowed = true
}) {
  const outcome = statusToOutcome(submission.status);

  return {
    submissionId: submission.submissionId,
    actionSequenceId: submission.actionSequenceId,
    status: submission.status,
    metadata: submission.metadata,
    files,
    retryAllowed,
    outcome: outcome.outcome,
    message: outcome.message,
    confirmationCode: submission.confirmationCode ?? undefined,
    updatedAt: submission.updatedAt
  };
}
