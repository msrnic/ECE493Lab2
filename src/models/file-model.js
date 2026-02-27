import { SUBMISSION_POLICY } from '../config/submission-config.js';

function toTrimmedString(value) {
  return String(value ?? '').trim();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMimeType(value) {
  return toTrimmedString(value).toLowerCase();
}

function getFileExtension(filename) {
  const normalized = toTrimmedString(filename).toLowerCase();
  const lastDot = normalized.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === normalized.length - 1) {
    return '';
  }

  return normalized.slice(lastDot);
}

function isSupportedMimeType(mimeType, policy) {
  return policy.allowedMimeTypes.includes(mimeType);
}

function canUseExtensionFallback(mimeType, policy) {
  return policy.extensionFallbackMimeTypes.includes(mimeType);
}

function isSupportedExtension(filename, policy) {
  return policy.allowedFileExtensions.includes(getFileExtension(filename));
}

function isAllowedFileType(file, policy) {
  if (isSupportedMimeType(file.mimeType, policy)) {
    return true;
  }

  if (!canUseExtensionFallback(file.mimeType, policy)) {
    return false;
  }

  return isSupportedExtension(file.originalFilename, policy);
}

export function normalizeIncomingFile(file) {
  return {
    originalFilename: toTrimmedString(file?.originalname ?? file?.name),
    mimeType: normalizeMimeType(file?.mimetype ?? file?.type),
    sizeBytes: toNumber(file?.size)
  };
}

export function validateFileForUpload({ category, file, policy = SUBMISSION_POLICY } = {}) {
  const errors = [];
  const normalizedFile = normalizeIncomingFile(file);

  if (!policy.allowedFileCategories.includes(category)) {
    errors.push({
      code: 'INVALID_FILE_CATEGORY',
      field: 'category',
      message: 'File category is invalid.'
    });
  }

  if (!normalizedFile.originalFilename) {
    errors.push({
      code: 'FILE_REQUIRED',
      field: 'file',
      message: 'File is required.'
    });
  }

  if (normalizedFile.originalFilename && !isAllowedFileType(normalizedFile, policy)) {
    errors.push({
      code: 'UNSUPPORTED_FILE_TYPE',
      field: 'file',
      message: policy.supportedFileTypeMessage
    });
  }

  if (normalizedFile.sizeBytes <= 0) {
    errors.push({
      code: 'EMPTY_FILE',
      field: 'file',
      message: 'File size must be greater than zero.'
    });
  } else if (normalizedFile.sizeBytes > policy.maxFileSizeBytes) {
    errors.push({
      code: 'FILE_TOO_LARGE',
      field: 'file',
      message: 'File exceeds the maximum allowed size.'
    });
  }

  return errors;
}

export function createSubmissionFile({
  submissionId,
  category,
  file,
  storageKey,
  scanStatus = 'pending',
  now = new Date()
}) {
  const normalized = normalizeIncomingFile(file);
  return {
    submissionId,
    category,
    originalFilename: normalized.originalFilename,
    mimeType: normalized.mimeType,
    sizeBytes: normalized.sizeBytes,
    storageKey,
    uploadStatus: 'uploaded',
    scanStatus,
    uploadedAt: now.toISOString()
  };
}

export function collectPreservedFileIds(files = []) {
  return files
    .filter((file) => file.uploadStatus === 'uploaded' && file.scanStatus === 'passed')
    .map((file) => file.fileId);
}

export function validateSubmissionFiles({ files = [], policy = SUBMISSION_POLICY } = {}) {
  const errors = [];

  for (const category of policy.requiredFileCategories) {
    const filesInCategory = files.filter((file) => file.category === category);
    if (filesInCategory.length === 0) {
      errors.push({
        code: 'REQUIRED_FILE_MISSING',
        field: `files.${category}`,
        message: `A ${category} file is required.`
      });
      continue;
    }

    const hasPassedFile = filesInCategory.some(
      (file) => file.uploadStatus === 'uploaded' && file.scanStatus === 'passed'
    );
    if (!hasPassedFile) {
      const hasFailedScan = filesInCategory.some((file) => file.scanStatus === 'failed');
      errors.push({
        code: hasFailedScan ? 'SCAN_FAILED' : 'SCAN_PENDING',
        field: `files.${category}`,
        message: hasFailedScan
          ? `A ${category} file failed security scanning.`
          : `A ${category} file is still pending security scanning.`
      });
    }
  }

  return errors;
}
