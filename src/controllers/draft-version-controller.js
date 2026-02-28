import { randomUUID } from 'node:crypto';
import {
  appendVersion,
  applySavedVersion,
  assertSaveAllowed,
  findVersion,
  getSubmission,
  listVersions
} from '../models/draft-submission-model.js';
import {
  restoreDraftVersionAsLatest,
  toDraftVersionPayload,
  toDraftVersionSummary
} from '../models/draft-version-model.js';
import { assertDraftVersionAccess } from '../models/draft-version-access-policy.js';
import { mapDraftError } from './draft-error-mapper.js';

function draftError(code, message) {
  const error = new Error(message);
  error.code = code;
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

export function createDraftVersionController(options) {
  const state = options.state;
  const idFactory = options.idFactory ?? randomUUID;
  const now = options.now ?? (() => new Date().toISOString());
  const resolveRole = options.resolveRole;

  async function listDraftVersions(req, res) {
    try {
      const actor = parseActor(req, resolveRole);
      const submission = getSubmission(state, req.params.submissionId);
      if (!submission) {
        throw draftError('DRAFT_NOT_FOUND', 'Submission not found.');
      }

      assertDraftVersionAccess(submission, actor.userId, actor.role);

      const versions = listVersions(state, submission.submissionId)
        .sort((left, right) => right.revision - left.revision)
        .map((version) => toDraftVersionSummary(version));

      return res.status(200).json({
        submissionId: submission.submissionId,
        latestRevision: submission.latestRevision,
        versions
      });
    } catch (error) {
      const mapped = mapDraftError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function getDraftVersion(req, res) {
    try {
      const actor = parseActor(req, resolveRole);
      const submission = getSubmission(state, req.params.submissionId);
      if (!submission) {
        throw draftError('DRAFT_NOT_FOUND', 'Submission not found.');
      }

      assertDraftVersionAccess(submission, actor.userId, actor.role);

      const version = findVersion(state, submission.submissionId, req.params.versionId);
      if (!version) {
        throw draftError('DRAFT_NOT_FOUND', 'Requested version not found.');
      }

      return res.status(200).json(toDraftVersionPayload(version));
    } catch (error) {
      const mapped = mapDraftError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function restoreDraftVersion(req, res) {
    try {
      const actor = parseActor(req, resolveRole);
      const submission = getSubmission(state, req.params.submissionId);
      if (!submission) {
        throw draftError('DRAFT_NOT_FOUND', 'Submission not found.');
      }

      assertDraftVersionAccess(submission, actor.userId, actor.role);

      const baseRevision = Number(req.body?.baseRevision);
      assertSaveAllowed(submission, baseRevision);

      const sourceVersion = findVersion(state, submission.submissionId, req.params.versionId);
      if (!sourceVersion) {
        throw draftError('DRAFT_NOT_FOUND', 'Requested version not found.');
      }

      const restoredVersion = restoreDraftVersionAsLatest(
        sourceVersion,
        {
          submissionId: submission.submissionId,
          revision: submission.latestRevision + 1,
          savedByUserId: actor.userId
        },
        { idFactory, now }
      );

      appendVersion(state, restoredVersion);
      applySavedVersion(submission, restoredVersion);

      return res.status(200).json({
        submissionId: submission.submissionId,
        versionId: restoredVersion.versionId,
        revision: restoredVersion.revision,
        savedAt: restoredVersion.createdAt,
        message: 'Draft saved successfully.'
      });
    } catch (error) {
      const mapped = mapDraftError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  return {
    listDraftVersions,
    getDraftVersion,
    restoreDraftVersion
  };
}
