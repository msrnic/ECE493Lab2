import {
  assertArray,
  assertEnum,
  assertInteger,
  assertIsoDateString,
  assertNonEmptyString,
  cloneRecord
} from './model-validation.js';

export const PAPER_FILE_AVAILABILITY_STATUSES = Object.freeze(['available', 'temporarily-unavailable']);

export function createPaperFile(file) {
  const normalized = {
    fileId: assertNonEmptyString(file?.fileId, 'fileId'),
    fileName: assertNonEmptyString(file?.fileName, 'fileName'),
    contentType: assertNonEmptyString(file?.contentType, 'contentType'),
    sizeBytes: assertInteger(file?.sizeBytes, 'sizeBytes', { min: 0 }),
    checksum: file?.checksum === null || file?.checksum === undefined
      ? null
      : assertNonEmptyString(file.checksum, 'checksum')
  };

  return normalized;
}

export function createPaperFileBundle(
  {
    paperId,
    files = [],
    availabilityStatus = 'available',
    generatedAt
  },
  { nowFn = () => new Date() } = {}
) {
  const normalizedFiles = assertArray(files, 'files').map((file) => createPaperFile(file));
  const normalized = {
    paperId: assertNonEmptyString(paperId, 'paperId'),
    files: normalizedFiles,
    availabilityStatus: assertEnum(
      availabilityStatus,
      'availabilityStatus',
      PAPER_FILE_AVAILABILITY_STATUSES
    ),
    generatedAt: assertIsoDateString(generatedAt ?? nowFn().toISOString(), 'generatedAt')
  };

  if (normalized.availabilityStatus === 'available' && normalized.files.length === 0) {
    throw new Error('files must be non-empty when availabilityStatus is available');
  }

  return normalized;
}

export function markTemporarilyUnavailable(bundle, { generatedAt, nowFn = () => new Date() } = {}) {
  return createPaperFileBundle(
    {
      ...cloneRecord(bundle),
      files: [],
      availabilityStatus: 'temporarily-unavailable',
      generatedAt: generatedAt ?? nowFn().toISOString()
    },
    { nowFn }
  );
}

export function markAvailable(bundle, files, { generatedAt, nowFn = () => new Date() } = {}) {
  return createPaperFileBundle(
    {
      ...cloneRecord(bundle),
      files,
      availabilityStatus: 'available',
      generatedAt: generatedAt ?? nowFn().toISOString()
    },
    { nowFn }
  );
}
