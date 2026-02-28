import { randomUUID } from 'node:crypto';
import { normalizeDraftFileReferences } from './draft-file-reference-model.js';

function draftError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

export function createDraftVersion(input, options = {}) {
  if (!input || typeof input !== 'object') {
    throw draftError('DRAFT_BAD_REQUEST', 'draft version payload is required');
  }

  const idFactory = options.idFactory ?? randomUUID;
  const now = options.now ?? (() => new Date().toISOString());

  if (!input.submissionId) {
    throw draftError('DRAFT_BAD_REQUEST', 'submissionId is required');
  }

  if (!input.savedByUserId) {
    throw draftError('DRAFT_BAD_REQUEST', 'savedByUserId is required');
  }

  if (!Number.isInteger(input.revision) || input.revision < 1) {
    throw draftError('DRAFT_BAD_REQUEST', 'revision must be a positive integer');
  }

  const metadataSnapshot = clone(input.metadataSnapshot ?? {});
  const files = normalizeDraftFileReferences(input.fileReferences ?? [], options);

  return Object.freeze({
    versionId: input.versionId ?? idFactory(),
    submissionId: input.submissionId,
    revision: input.revision,
    savedByUserId: input.savedByUserId,
    metadataSnapshot,
    fileReferences: files,
    restoredFromVersionId: input.restoredFromVersionId ?? null,
    createdAt: input.createdAt ?? now()
  });
}

export function toDraftVersionSummary(version) {
  return {
    versionId: version.versionId,
    revision: version.revision,
    savedAt: version.createdAt,
    savedByUserId: version.savedByUserId,
    restoredFromVersionId: version.restoredFromVersionId
  };
}

export function toDraftVersionPayload(version) {
  return {
    submissionId: version.submissionId,
    versionId: version.versionId,
    revision: version.revision,
    savedAt: version.createdAt,
    savedByUserId: version.savedByUserId,
    restoredFromVersionId: version.restoredFromVersionId,
    metadata: clone(version.metadataSnapshot),
    files: clone(version.fileReferences)
  };
}

export function restoreDraftVersionAsLatest(sourceVersion, input, options = {}) {
  if (!sourceVersion) {
    throw draftError('DRAFT_NOT_FOUND', 'source version does not exist');
  }

  return createDraftVersion(
    {
      submissionId: input.submissionId,
      revision: input.revision,
      savedByUserId: input.savedByUserId,
      metadataSnapshot: sourceVersion.metadataSnapshot,
      fileReferences: sourceVersion.fileReferences,
      restoredFromVersionId: sourceVersion.versionId
    },
    options
  );
}
