export const SUBMISSION_STATUSES = Object.freeze({
  DRAFT: 'draft',
  UPLOAD_FAILED: 'upload_failed',
  VALIDATION_FAILED: 'validation_failed',
  SCAN_FAILED: 'scan_failed',
  SAVE_FAILED: 'save_failed',
  SUBMITTED: 'submitted'
});

export const SUBMISSION_OUTCOMES = Object.freeze({
  SUBMITTED: 'submitted',
  REJECTED: 'rejected',
  RETRY_REQUIRED: 'retry_required'
});

export const SUBMISSION_POLICY = Object.freeze({
  requiredMetadataFields: Object.freeze(['title', 'abstract', 'authorList']),
  requiredFileCategories: Object.freeze(['manuscript']),
  allowedFileCategories: Object.freeze(['manuscript', 'supplementary']),
  allowedMimeTypes: Object.freeze(['application/pdf', 'text/plain', 'application/zip']),
  allowedFileExtensions: Object.freeze(['.pdf', '.txt', '.zip']),
  extensionFallbackMimeTypes: Object.freeze(['', 'application/octet-stream']),
  supportedFileTypeMessage: 'Unsupported file type. Upload a PDF (.pdf) or text (.txt).',
  maxFileSizeBytes: 10 * 1024 * 1024,
  retryStateTtlMs: 60 * 60 * 1000
});

export const SUBMISSION_MESSAGES = Object.freeze({
  submitted: 'Submission complete.',
  uploadRetryRequired: 'File upload failed. Please retry.',
  saveRetryRequired: 'Submission save failed. Please retry.',
  validationFailed: 'Submission blocked until validation errors are resolved.',
  scanFailed: 'Submission blocked because a file failed security scanning.'
});

export const SESSION_INVALID_ERROR = Object.freeze({
  code: 'SESSION_INVALID',
  message: 'Session is invalid or expired; author must re-authenticate.'
});
