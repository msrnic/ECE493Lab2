import { describe, expect, it } from 'vitest';
import {
  createDraftSubmission,
  createSubmissionResource,
  deriveSubmissionStatusFromErrors,
  markSaveFailed,
  markSubmitted,
  markUploadFailed,
  normalizeMetadata,
  statusToOutcome,
  validateSubmissionMetadata,
  withValidationOutcome
} from '../../../src/models/submission-model.js';
import { SUBMISSION_STATUSES } from '../../../src/config/submission-config.js';

describe('submission-model', () => {
  it('normalizes metadata and builds draft submissions', () => {
    const metadata = normalizeMetadata({
      title: '  My Paper  ',
      abstract: '  Abstract text  ',
      authorList: [' Alice ', '', 'Bob'],
      keywords: [' ai ', '  ']
    });

    expect(metadata).toEqual({
      title: 'My Paper',
      abstract: 'Abstract text',
      authorList: ['Alice', 'Bob'],
      keywords: ['ai']
    });

    const now = new Date('2026-02-01T10:00:00.000Z');
    const draft = createDraftSubmission({
      submissionId: 'sub-1',
      authorId: 'author-1',
      actionSequenceId: 'action-1',
      sessionId: 'session-1',
      metadata,
      now
    });

    expect(draft).toEqual({
      submissionId: 'sub-1',
      authorId: 'author-1',
      actionSequenceId: 'action-1',
      sessionId: 'session-1',
      status: 'draft',
      metadata,
      validationErrors: [],
      confirmationCode: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });
  });

  it('validates required metadata fields', () => {
    expect(
      validateSubmissionMetadata({
        title: ' ',
        abstract: ' ',
        authorList: []
      }).map((error) => error.field)
    ).toEqual(['title', 'abstract', 'authorList']);

    expect(
      validateSubmissionMetadata({
        title: 'Valid title',
        abstract: 'Valid abstract',
        authorList: ['Author']
      })
    ).toEqual([]);
  });

  it('derives validation statuses and applies outcomes', () => {
    expect(deriveSubmissionStatusFromErrors([])).toBe('draft');
    expect(
      deriveSubmissionStatusFromErrors([
        {
          code: 'SCAN_FAILED'
        }
      ])
    ).toBe('scan_failed');
    expect(
      deriveSubmissionStatusFromErrors([
        {
          code: 'REQUIRED_FIELD'
        }
      ])
    ).toBe('validation_failed');

    const now = new Date('2026-02-01T11:00:00.000Z');
    const updated = withValidationOutcome(
      {
        submissionId: 'sub-2',
        status: SUBMISSION_STATUSES.DRAFT,
        validationErrors: []
      },
      {
        errors: [
          {
            code: 'REQUIRED_FIELD',
            field: 'title',
            message: 'Title is required.'
          }
        ],
        now
      }
    );

    expect(updated.status).toBe('validation_failed');
    expect(updated.validationErrors).toHaveLength(1);
    expect(updated.updatedAt).toBe(now.toISOString());
  });

  it('marks upload/save failures and submitted status', () => {
    const base = {
      submissionId: 'sub-3',
      status: SUBMISSION_STATUSES.DRAFT,
      validationErrors: []
    };
    const now = new Date('2026-02-01T12:00:00.000Z');

    const uploadFailed = markUploadFailed(base, { now });
    expect(uploadFailed.status).toBe('upload_failed');

    const saveFailed = markSaveFailed(base, { now });
    expect(saveFailed.status).toBe('save_failed');

    const submitted = markSubmitted(base, {
      now,
      confirmationCodeFactory: () => 'CONF-1234'
    });
    expect(submitted).toEqual({
      submissionId: 'sub-3',
      status: 'submitted',
      validationErrors: [],
      confirmationCode: 'CONF-1234',
      updatedAt: now.toISOString()
    });
  });

  it('maps status to user-visible outcomes and submission resources', () => {
    expect(statusToOutcome('submitted')).toEqual({
      outcome: 'submitted',
      message: 'Submission complete.'
    });
    expect(statusToOutcome('upload_failed')).toEqual({
      outcome: 'retry_required',
      message: 'File upload failed. Please retry.'
    });
    expect(statusToOutcome('save_failed')).toEqual({
      outcome: 'retry_required',
      message: 'Submission save failed. Please retry.'
    });
    expect(statusToOutcome('scan_failed')).toEqual({
      outcome: 'rejected',
      message: 'Submission blocked because a file failed security scanning.'
    });
    expect(statusToOutcome('validation_failed')).toEqual({
      outcome: 'rejected',
      message: 'Submission blocked until validation errors are resolved.'
    });

    const resource = createSubmissionResource({
      submission: {
        submissionId: 'sub-4',
        actionSequenceId: 'action-4',
        status: 'submitted',
        metadata: {
          title: 'Title',
          abstract: 'Abstract',
          authorList: ['A'],
          keywords: []
        },
        confirmationCode: 'CONF-7777',
        updatedAt: '2026-02-01T00:00:00.000Z'
      },
      files: [
        {
          fileId: 'file-1'
        }
      ],
      retryAllowed: false
    });

    expect(resource).toEqual({
      submissionId: 'sub-4',
      actionSequenceId: 'action-4',
      status: 'submitted',
      metadata: {
        title: 'Title',
        abstract: 'Abstract',
        authorList: ['A'],
        keywords: []
      },
      files: [
        {
          fileId: 'file-1'
        }
      ],
      retryAllowed: false,
      outcome: 'submitted',
      message: 'Submission complete.',
      confirmationCode: 'CONF-7777',
      updatedAt: '2026-02-01T00:00:00.000Z'
    });
  });
});
