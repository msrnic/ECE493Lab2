import { SESSION_INVALID_ERROR, SUBMISSION_MESSAGES } from '../config/submission-config.js';
import { collectPreservedFileIds, validateSubmissionFiles } from '../models/file-model.js';
import {
  createDraftSubmission,
  createSubmissionResource,
  markSaveFailed,
  markSubmitted,
  validateSubmissionMetadata,
  withValidationOutcome
} from '../models/submission-model.js';
import {
  createSessionState,
  shouldPreserveRetryData
} from '../models/session-state-model.js';

function resolveSessionId(req, bodySessionId) {
  const activeSessionId = req.submissionSession?.sessionId;
  if (typeof activeSessionId !== 'string' || activeSessionId.trim().length === 0) {
    return null;
  }

  if (bodySessionId === undefined || bodySessionId === null) {
    return activeSessionId;
  }

  if (typeof bodySessionId !== 'string') {
    return null;
  }

  const normalizedBodySessionId = bodySessionId.trim();
  if (normalizedBodySessionId.length === 0) {
    return activeSessionId;
  }

  return normalizedBodySessionId === activeSessionId ? activeSessionId : null;
}

function hasSubmissionAccess(req, submission) {
  return (
    submission &&
    submission.authorId === req.submissionSession?.authorId &&
    submission.sessionId === req.submissionSession?.sessionId
  );
}

function buildNotFoundResponse(res) {
  res.status(404).json({
    code: 'SUBMISSION_NOT_FOUND',
    message: 'Submission not found.'
  });
}

function upsertRetryState({
  sessionStateRepository,
  submission,
  files,
  metadata,
  now
}) {
  const state = createSessionState({
    sessionId: submission.sessionId,
    submissionId: submission.submissionId,
    metadata,
    preservedFileIds: collectPreservedFileIds(files),
    now
  });

  sessionStateRepository.upsert(state);
}

function runSubmissionValidation({ submission, files }) {
  const metadataErrors = validateSubmissionMetadata(submission.metadata);
  const fileErrors = validateSubmissionFiles({ files });
  const errors = [...metadataErrors, ...fileErrors];

  return {
    errors,
    valid: errors.length === 0
  };
}

export function createSubmissionController({
  submissionRepository,
  fileRepository,
  sessionStateRepository,
  deduplicationModel,
  nowFn = () => new Date(),
  confirmationCodeFactory
}) {
  async function createSubmission(req, res) {
    const sessionId = resolveSessionId(req, req.body?.sessionId);
    if (!sessionId) {
      res.status(401).json(SESSION_INVALID_ERROR);
      return;
    }

    const now = nowFn();
    const draft = createDraftSubmission({
      authorId: req.submissionSession.authorId,
      actionSequenceId: req.body?.actionSequenceId,
      sessionId,
      metadata: req.body?.metadata,
      now
    });

    let created;
    try {
      created = submissionRepository.create(draft);
    } catch {
      res.status(500).json({
        code: 'SUBMISSION_CREATE_FAILED',
        message: 'Failed to create submission.'
      });
      return;
    }

    upsertRetryState({
      sessionStateRepository,
      submission: created,
      files: [],
      metadata: created.metadata,
      now
    });

    res.status(201).json(
      createSubmissionResource({
        submission: created,
        files: [],
        retryAllowed: true
      })
    );
  }

  async function validateSubmission(req, res) {
    const sessionId = resolveSessionId(req, req.body?.sessionId);
    if (!sessionId) {
      res.status(401).json(SESSION_INVALID_ERROR);
      return;
    }

    const current = submissionRepository.findById(req.params.submissionId);
    if (!hasSubmissionAccess(req, current)) {
      buildNotFoundResponse(res);
      return;
    }

    const now = nowFn();
    let workingSubmission = current;
    if (req.body?.metadata) {
      workingSubmission = submissionRepository.replace({
        ...current,
        metadata: req.body.metadata,
        updatedAt: now.toISOString()
      });
    }

    const files = fileRepository.listBySubmissionId(current.submissionId);
    const validation = runSubmissionValidation({
      submission: workingSubmission,
      files
    });

    const updatedSubmission = submissionRepository.replace(
      withValidationOutcome(workingSubmission, {
        errors: validation.errors,
        now
      })
    );

    if (shouldPreserveRetryData(updatedSubmission.status)) {
      upsertRetryState({
        sessionStateRepository,
        submission: updatedSubmission,
        files,
        metadata: updatedSubmission.metadata,
        now
      });
    }

    res.status(200).json({
      submissionId: updatedSubmission.submissionId,
      valid: validation.valid,
      errors: validation.errors
    });
  }

  async function finalizeSubmission(req, res) {
    const sessionId = resolveSessionId(req, req.body?.sessionId);
    if (!sessionId) {
      res.status(401).json(SESSION_INVALID_ERROR);
      return;
    }

    const idempotencyKey = req.headers?.['idempotency-key'];
    if (!idempotencyKey) {
      res.status(422).json({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required.'
      });
      return;
    }

    const current = submissionRepository.findById(req.params.submissionId);
    if (!hasSubmissionAccess(req, current)) {
      buildNotFoundResponse(res);
      return;
    }

    const duplicate = deduplicationModel.checkDuplicate({
      actionSequenceId: current.actionSequenceId,
      idempotencyKey
    });

    if (duplicate.duplicate) {
      res.status(409).json({
        code: 'DUPLICATE_SUBMISSION',
        message: 'Submission already finalized for this action sequence.'
      });
      return;
    }

    const now = nowFn();
    const files = fileRepository.listBySubmissionId(current.submissionId);
    const validation = runSubmissionValidation({
      submission: current,
      files
    });

    if (!validation.valid) {
      const failedValidation = submissionRepository.replace(
        withValidationOutcome(current, {
          errors: validation.errors,
          now
        })
      );

      upsertRetryState({
        sessionStateRepository,
        submission: failedValidation,
        files,
        metadata: failedValidation.metadata,
        now
      });

      res.status(422).json({
        code: 'SUBMISSION_BLOCKED',
        message: SUBMISSION_MESSAGES.validationFailed,
        details: validation.errors
      });
      return;
    }

    let saved;
    try {
      const submitted = markSubmitted(current, {
        now,
        confirmationCodeFactory
      });
      saved = submissionRepository.replace(submitted);
    } catch {
      const saveFailed = submissionRepository.replace(markSaveFailed(current, { now }));
      upsertRetryState({
        sessionStateRepository,
        submission: saveFailed,
        files,
        metadata: saveFailed.metadata,
        now
      });

      res.status(503).json({
        submissionId: current.submissionId,
        outcome: 'retry_required',
        retryAllowed: true,
        message: SUBMISSION_MESSAGES.saveRetryRequired
      });
      return;
    }

    deduplicationModel.markFinalized({
      actionSequenceId: current.actionSequenceId,
      idempotencyKey,
      submissionId: current.submissionId
    });
    sessionStateRepository.deleteBySubmissionId(current.submissionId);

    res.status(200).json({
      submissionId: saved.submissionId,
      status: saved.status,
      outcome: 'submitted',
      message: SUBMISSION_MESSAGES.submitted,
      confirmationCode: saved.confirmationCode
    });
  }

  return {
    createSubmission,
    validateSubmission,
    finalizeSubmission
  };
}
