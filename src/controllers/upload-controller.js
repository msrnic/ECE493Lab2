import { SESSION_INVALID_ERROR, SUBMISSION_MESSAGES } from '../config/submission-config.js';
import {
  collectPreservedFileIds,
  createSubmissionFile,
  validateFileForUpload
} from '../models/file-model.js';
import { markUploadFailed, withValidationOutcome } from '../models/submission-model.js';
import { createSessionState } from '../models/session-state-model.js';

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

function extractUploadFile(req) {
  return req.file ?? req.body?.file ?? null;
}

function resolvePolicyViolationMessage(validationErrors) {
  const unsupportedType = validationErrors.find((error) => error.code === 'UNSUPPORTED_FILE_TYPE');
  if (unsupportedType?.message) {
    return unsupportedType.message;
  }

  return validationErrors[0].message;
}

export function createUploadController({
  submissionRepository,
  fileRepository,
  storageService,
  scanService,
  sessionStateRepository,
  nowFn = () => new Date()
}) {
  async function uploadSubmissionFile(req, res) {
    const sessionId = resolveSessionId(req, req.body?.sessionId);
    if (!sessionId) {
      res.status(401).json(SESSION_INVALID_ERROR);
      return;
    }

    const submission = submissionRepository.findById(req.params.submissionId);
    if (!hasSubmissionAccess(req, submission)) {
      buildNotFoundResponse(res);
      return;
    }

    const uploadFile = extractUploadFile(req);
    const validationErrors = validateFileForUpload({
      category: req.body?.category,
      file: uploadFile
    });

    if (validationErrors.length > 0) {
      res.status(400).json({
        code: 'FILE_POLICY_VIOLATION',
        message: resolvePolicyViolationMessage(validationErrors),
        details: validationErrors
      });
      return;
    }

    const now = nowFn();
    let storageResult;
    try {
      storageResult = await storageService.saveFile({
        submissionId: submission.submissionId,
        category: req.body?.category,
        file: uploadFile
      });
    } catch {
      const failedSubmission = submissionRepository.replace(markUploadFailed(submission, { now }));
      const existingFiles = fileRepository.listBySubmissionId(submission.submissionId);
      sessionStateRepository.upsert(
        createSessionState({
          sessionId: failedSubmission.sessionId,
          submissionId: failedSubmission.submissionId,
          metadata: failedSubmission.metadata,
          preservedFileIds: collectPreservedFileIds(existingFiles),
          now
        })
      );

      res.status(503).json({
        submissionId: submission.submissionId,
        outcome: 'retry_required',
        retryAllowed: true,
        message: SUBMISSION_MESSAGES.uploadRetryRequired
      });
      return;
    }

    const scanResult = await scanService.scanFile(uploadFile);
    const createdFile = fileRepository.create(
      createSubmissionFile({
        submissionId: submission.submissionId,
        category: req.body?.category,
        file: uploadFile,
        storageKey: storageResult.storageKey,
        scanStatus: scanResult.status,
        now
      })
    );

    const files = fileRepository.listBySubmissionId(submission.submissionId);
    const preservedFileIds = collectPreservedFileIds(files);

    sessionStateRepository.upsert(
      createSessionState({
        sessionId: submission.sessionId,
        submissionId: submission.submissionId,
        metadata: submission.metadata,
        preservedFileIds,
        now
      })
    );

    if (scanResult.status === 'failed') {
      submissionRepository.replace(
        withValidationOutcome(submission, {
          errors: [
            {
              code: 'SCAN_FAILED',
              field: `files.${req.body?.category}`,
              message: `A ${req.body?.category} file failed security scanning.`
            }
          ],
          now
        })
      );
    }

    res.status(201).json({
      submissionId: submission.submissionId,
      file: createdFile
    });
  }

  return {
    uploadSubmissionFile
  };
}
