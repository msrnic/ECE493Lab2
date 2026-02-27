import { describe, expect, it } from 'vitest';
import {
  collectPreservedFileIds,
  createSubmissionFile,
  normalizeIncomingFile,
  validateFileForUpload,
  validateSubmissionFiles
} from '../../../src/models/file-model.js';

describe('file-model', () => {
  it('normalizes incoming files and defaults missing values', () => {
    expect(
      normalizeIncomingFile({
        originalname: 'paper.pdf',
        mimetype: 'application/pdf',
        size: 120
      })
    ).toEqual({
      originalFilename: 'paper.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 120
    });

    expect(normalizeIncomingFile(null)).toEqual({
      originalFilename: '',
      mimeType: '',
      sizeBytes: 0
    });
  });

  it('validates file upload policy and returns all matching errors', () => {
    const errors = validateFileForUpload({
      category: 'invalid',
      file: {
        originalname: '',
        mimetype: 'application/msword',
        size: 0
      }
    });

    expect(errors.map((error) => error.code)).toEqual([
      'INVALID_FILE_CATEGORY',
      'FILE_REQUIRED',
      'EMPTY_FILE'
    ]);

    const tooLarge = validateFileForUpload({
      category: 'manuscript',
      file: {
        originalname: 'paper.pdf',
        mimetype: 'application/pdf',
        size: 12 * 1024 * 1024
      }
    });
    expect(tooLarge).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FILE_TOO_LARGE'
        })
      ])
    );

    expect(
      validateFileForUpload({
        category: 'supplementary',
        file: {
          originalname: 'supplement.zip',
          mimetype: 'application/zip',
          size: 300
        }
      })
    ).toEqual([]);

    expect(
      validateFileForUpload({
        category: 'manuscript',
        file: {
          originalname: 'manuscript.txt',
          mimetype: 'text/plain',
          size: 300
        }
      })
    ).toEqual([]);

    expect(
      validateFileForUpload({
        category: 'manuscript',
        file: {
          originalname: 'manuscript.pdf',
          mimetype: 'application/octet-stream',
          size: 300
        }
      })
    ).toEqual([]);

    expect(
      validateFileForUpload({
        category: 'manuscript',
        file: {
          originalname: 'paper.docx',
          mimetype: 'application/msword',
          size: 300
        }
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNSUPPORTED_FILE_TYPE',
          message: expect.stringContaining('PDF (.pdf) or text (.txt)')
        })
      ])
    );

    expect(
      validateFileForUpload({
        category: 'manuscript',
        file: {
          originalname: 'manuscript',
          mimetype: 'application/octet-stream',
          size: 300
        }
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNSUPPORTED_FILE_TYPE'
        })
      ])
    );
  });

  it('creates file records and preserves only passed uploads for retry', () => {
    const now = new Date('2026-02-01T10:00:00.000Z');
    const created = createSubmissionFile({
      submissionId: 'sub-1',
      category: 'manuscript',
      file: {
        originalname: 'paper.pdf',
        mimetype: 'application/pdf',
        size: 20
      },
      storageKey: 'storage-key',
      scanStatus: 'passed',
      now
    });

    expect(created).toEqual({
      submissionId: 'sub-1',
      category: 'manuscript',
      originalFilename: 'paper.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 20,
      storageKey: 'storage-key',
      uploadStatus: 'uploaded',
      scanStatus: 'passed',
      uploadedAt: now.toISOString()
    });

    expect(
      collectPreservedFileIds([
        {
          fileId: 'f1',
          uploadStatus: 'uploaded',
          scanStatus: 'passed'
        },
        {
          fileId: 'f2',
          uploadStatus: 'uploaded',
          scanStatus: 'failed'
        },
        {
          fileId: 'f3',
          uploadStatus: 'upload_failed',
          scanStatus: 'passed'
        }
      ])
    ).toEqual(['f1']);
  });

  it('validates required manuscript presence and scan status', () => {
    expect(validateSubmissionFiles({ files: [] })).toEqual([
      {
        code: 'REQUIRED_FILE_MISSING',
        field: 'files.manuscript',
        message: 'A manuscript file is required.'
      }
    ]);

    expect(
      validateSubmissionFiles({
        files: [
          {
            fileId: 'f1',
            category: 'manuscript',
            uploadStatus: 'uploaded',
            scanStatus: 'failed'
          }
        ]
      })
    ).toEqual([
      {
        code: 'SCAN_FAILED',
        field: 'files.manuscript',
        message: 'A manuscript file failed security scanning.'
      }
    ]);

    expect(
      validateSubmissionFiles({
        files: [
          {
            fileId: 'f2',
            category: 'manuscript',
            uploadStatus: 'uploaded',
            scanStatus: 'pending'
          }
        ]
      })
    ).toEqual([
      {
        code: 'SCAN_PENDING',
        field: 'files.manuscript',
        message: 'A manuscript file is still pending security scanning.'
      }
    ]);

    expect(
      validateSubmissionFiles({
        files: [
          {
            fileId: 'f3',
            category: 'manuscript',
            uploadStatus: 'uploaded',
            scanStatus: 'passed'
          }
        ]
      })
    ).toEqual([]);
  });
});
