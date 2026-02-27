import { describe, expect, it } from 'vitest';
import {
  SESSION_INVALID_ERROR,
  SUBMISSION_MESSAGES,
  SUBMISSION_OUTCOMES,
  SUBMISSION_POLICY,
  SUBMISSION_STATUSES
} from '../../../src/config/submission-config.js';

describe('submission-config', () => {
  it('defines immutable submission constants', () => {
    expect(SUBMISSION_STATUSES.SUBMITTED).toBe('submitted');
    expect(SUBMISSION_OUTCOMES.RETRY_REQUIRED).toBe('retry_required');
    expect(SUBMISSION_POLICY.requiredMetadataFields).toContain('title');
    expect(SUBMISSION_POLICY.requiredFileCategories).toEqual(['manuscript']);
    expect(SUBMISSION_POLICY.allowedMimeTypes).toEqual(
      expect.arrayContaining(['application/pdf', 'text/plain'])
    );
    expect(SUBMISSION_POLICY.allowedFileExtensions).toEqual(
      expect.arrayContaining(['.pdf', '.txt'])
    );
    expect(SUBMISSION_POLICY.extensionFallbackMimeTypes).toContain('application/octet-stream');
    expect(SUBMISSION_POLICY.supportedFileTypeMessage).toContain('PDF (.pdf) or text (.txt)');
    expect(SUBMISSION_MESSAGES.validationFailed).toContain('Submission blocked');
    expect(SESSION_INVALID_ERROR.code).toBe('SESSION_INVALID');
  });
});
