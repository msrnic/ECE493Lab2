import { randomUUID } from 'node:crypto';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

function draftError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function normalizeFileName(fileName) {
  if (typeof fileName !== 'string') {
    throw draftError('DRAFT_BAD_REQUEST', 'fileName must be a string');
  }

  const normalized = fileName.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    throw draftError('DRAFT_BAD_REQUEST', 'fileName is required');
  }

  return normalized;
}

export function createDraftFileReference(rawFile, options = {}) {
  if (!rawFile || typeof rawFile !== 'object') {
    throw draftError('DRAFT_BAD_REQUEST', 'file reference must be an object');
  }

  const idFactory = options.idFactory ?? randomUUID;
  const fileName = normalizeFileName(rawFile.fileName);
  const mimeType = rawFile.mimeType;

  if (typeof mimeType !== 'string' || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw draftError('DRAFT_BAD_REQUEST', 'mimeType is invalid');
  }

  const sizeBytes = Number(rawFile.sizeBytes);
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > 25 * 1024 * 1024) {
    throw draftError('DRAFT_BAD_REQUEST', 'sizeBytes must be between 1 and 26214400');
  }

  if (typeof rawFile.checksum !== 'string' || !rawFile.checksum.trim()) {
    throw draftError('DRAFT_BAD_REQUEST', 'checksum is required');
  }

  if (typeof rawFile.storageKey !== 'string' || !rawFile.storageKey.trim()) {
    throw draftError('DRAFT_BAD_REQUEST', 'storageKey is required');
  }

  return Object.freeze({
    fileId: rawFile.fileId ?? idFactory(),
    fileName,
    mimeType,
    sizeBytes,
    checksum: rawFile.checksum.trim(),
    storageKey: rawFile.storageKey.trim(),
    uploadedAt: rawFile.uploadedAt ?? new Date().toISOString()
  });
}

export function normalizeDraftFileReferences(rawFiles, options = {}) {
  if (rawFiles === null || rawFiles === undefined) {
    return [];
  }

  if (!Array.isArray(rawFiles)) {
    throw draftError('DRAFT_BAD_REQUEST', 'files must be an array');
  }

  const seen = new Set();
  return rawFiles.map((rawFile) => {
    const normalized = createDraftFileReference(rawFile, options);
    const dedupeKey = `${normalized.fileName.toLowerCase()}::${normalized.checksum}`;

    if (seen.has(dedupeKey)) {
      throw draftError('DRAFT_BAD_REQUEST', 'duplicate file reference in snapshot');
    }

    seen.add(dedupeKey);
    return normalized;
  });
}

export function getAllowedDraftMimeTypes() {
  return [...ALLOWED_MIME_TYPES];
}
