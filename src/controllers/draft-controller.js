import { randomUUID } from 'node:crypto';
import {
  appendVersion,
  applySavedVersion,
  assertSaveAllowed,
  ensureSubmission,
  getLatestVersion,
  getSubmission,
  markSubmissionFinalized,
  recordSaveAttempt
} from '../models/draft-submission-model.js';
import { createDraftVersion, toDraftVersionPayload } from '../models/draft-version-model.js';
import { createDraftSaveAttempt, DraftSaveOutcome } from '../models/draft-save-attempt-model.js';
import { normalizeDraftFileReferences } from '../models/draft-file-reference-model.js';
import { applyRetentionPrune } from '../models/draft-retention-policy.js';
import { mapDraftError, mapErrorToOutcome } from './draft-error-mapper.js';
import { canAccessDraftVersion } from '../models/draft-version-access-policy.js';

function draftError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function readHeader(req, name) {
  if (typeof req.get === 'function') {
    return req.get(name);
  }

  return req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
}

function parseActor(req, resolveRole) {
  const headerUserId = readHeader(req, 'x-user-id');
  const sessionUserId = req.submissionSession?.authorId;
  const userId = headerUserId ?? sessionUserId;
  if (!userId) {
    throw draftError('DRAFT_AUTH_REQUIRED', 'Authentication required.');
  }

  const headerRole = readHeader(req, 'x-user-role');
  const resolvedRole = typeof resolveRole === 'function' ? resolveRole(userId) : undefined;

  return {
    userId,
    role: headerRole ?? resolvedRole ?? 'author'
  };
}

function parseMetadata(rawMetadata) {
  if (rawMetadata === null || rawMetadata === undefined) {
    return {};
  }

  if (typeof rawMetadata === 'string') {
    try {
      return JSON.parse(rawMetadata);
    } catch {
      throw draftError('DRAFT_BAD_REQUEST', 'metadata must be valid JSON');
    }
  }

  if (typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)) {
    return rawMetadata;
  }

  throw draftError('DRAFT_BAD_REQUEST', 'metadata must be an object or JSON string');
}

function parseFiles(rawFiles, options) {
  if (typeof rawFiles === 'string') {
    try {
      return normalizeDraftFileReferences(JSON.parse(rawFiles), options);
    } catch (error) {
      if (error.code) {
        throw error;
      }

      throw draftError('DRAFT_BAD_REQUEST', 'files must be valid JSON');
    }
  }

  return normalizeDraftFileReferences(rawFiles, options);
}

function shouldSimulateSystemError(req, body) {
  return readHeader(req, 'x-force-system-error') === 'true' || body.forceSystemError === true;
}

export function createDraftController(options) {
  const state = options.state;
  const idFactory = options.idFactory ?? randomUUID;
  const now = options.now ?? (() => new Date().toISOString());
  const internalServiceToken = options.internalServiceToken ?? 'internal-token';
  const resolveRole = options.resolveRole;

  function recordAttemptSafely(submissionId, actorUserId, baseRevision, outcome, errorCode, createdVersionId) {
    if (!submissionId || !actorUserId) {
      return;
    }

    const safeBaseRevision = Number.isInteger(baseRevision) ? baseRevision : 0;
    try {
      recordSaveAttempt(
        state,
        createDraftSaveAttempt(
          {
            submissionId,
            actorUserId,
            baseRevision: safeBaseRevision,
            outcome,
            errorCode,
            createdVersionId
          },
          { idFactory, now }
        )
      );
    } catch {
      // Save-attempt recording should not hide primary response behavior.
    }
  }

  async function saveDraft(req, res) {
    let submission;
    let actor;
    let baseRevision;

    try {
      actor = parseActor(req, resolveRole);
      const submissionId = req.params.submissionId;
      const ownerUserId = readHeader(req, 'x-submission-owner-id') ?? actor.userId;
      submission = ensureSubmission(state, { submissionId, ownerUserId });

      if (submission.ownerUserId !== actor.userId) {
        throw draftError('DRAFT_FORBIDDEN', 'Only the owner can save this draft.');
      }

      baseRevision = Number(req.body?.baseRevision);
      const metadata = parseMetadata(req.body?.metadata);
      const fileReferences = parseFiles(req.body?.files, { idFactory, now });

      if (shouldSimulateSystemError(req, req.body ?? {})) {
        throw draftError('DRAFT_SAVE_FAILED', 'Draft was not saved due to a system error. Please retry.');
      }

      assertSaveAllowed(submission, baseRevision);

      const version = createDraftVersion(
        {
          submissionId,
          revision: submission.latestRevision + 1,
          savedByUserId: actor.userId,
          metadataSnapshot: metadata,
          fileReferences
        },
        { idFactory, now }
      );

      appendVersion(state, version);
      applySavedVersion(submission, version);
      recordAttemptSafely(submission.submissionId, actor.userId, baseRevision, DraftSaveOutcome.SUCCESS, null, version.versionId);

      return res.status(200).json({
        submissionId,
        versionId: version.versionId,
        revision: version.revision,
        savedAt: version.createdAt,
        message: 'Draft saved successfully.'
      });
    } catch (error) {
      const mapped = mapDraftError(error);
      const outcome = mapErrorToOutcome(mapped.body.code);
      recordAttemptSafely(submission?.submissionId ?? req.params.submissionId, actor?.userId, baseRevision, outcome, mapped.body.code, null);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function getLatestDraft(req, res) {
    try {
      const actor = parseActor(req, resolveRole);
      const submissionId = req.params.submissionId;
      const submission = getSubmission(state, submissionId);

      if (!submission) {
        throw draftError('DRAFT_NOT_FOUND', 'Submission not found.');
      }

      if (!canAccessDraftVersion(submission, actor.userId, actor.role)) {
        throw draftError('DRAFT_FORBIDDEN', 'You do not have permission for this action.');
      }

      const latestVersion = getLatestVersion(state, submissionId);
      if (!latestVersion) {
        throw draftError('DRAFT_NOT_FOUND', 'No saved draft exists for this submission.');
      }

      return res.status(200).json(toDraftVersionPayload(latestVersion));
    } catch (error) {
      const mapped = mapDraftError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function pruneRetention(req, res) {
    try {
      if (readHeader(req, 'x-internal-service-token') !== internalServiceToken) {
        throw draftError('DRAFT_AUTH_REQUIRED', 'Authentication required.');
      }

      const submissionId = req.params.submissionId;
      const submission = getSubmission(state, submissionId);
      if (!submission) {
        throw draftError('DRAFT_NOT_FOUND', 'Submission not found.');
      }

      if (req.body?.finalSubmissionId !== submissionId) {
        throw draftError('DRAFT_BAD_REQUEST', 'finalSubmissionId must match submissionId');
      }

      markSubmissionFinalized(submission, now());
      const result = applyRetentionPrune(state, submissionId);
      return res.status(200).json(result);
    } catch (error) {
      const mapped = mapDraftError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  return {
    saveDraft,
    getLatestDraft,
    pruneRetention
  };
}
