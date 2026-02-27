import { describe, expect, it } from 'vitest';
import { createUploadController } from '../../../src/controllers/upload-controller.js';
import { createFileRepository } from '../../../src/repositories/file-repository.js';
import { createSessionStateRepository } from '../../../src/repositories/session-state-repository.js';
import { createSubmissionRepository } from '../../../src/repositories/submission-repository.js';
import { createScanService } from '../../../src/services/scan-service.js';
import { createStorageService } from '../../../src/services/storage-service.js';
import { invokeHandler } from '../../helpers/http-harness.js';
import { createTempPersistencePaths } from '../../helpers/persistence-paths.js';
import { createClock } from '../../helpers/test-support.js';

function buildContext() {
  const paths = createTempPersistencePaths('upload-controller-');
  const clock = createClock('2026-02-01T00:00:00.000Z');
  const submissionRepository = createSubmissionRepository({
    databaseFilePath: paths.submissionDataFilePath,
    idFactory: () => 'sub-1',
    nowFn: clock.now
  });
  const fileRepository = createFileRepository({
    databaseFilePath: paths.fileDataFilePath,
    idFactory: () => 'file-1'
  });
  const sessionStateRepository = createSessionStateRepository({
    databaseFilePath: paths.sessionStateDataFilePath,
    nowFn: clock.now
  });
  const storageService = createStorageService({
    uploadsDirectory: paths.uploadsDirectory,
    metadataFilePath: paths.storageDataFilePath,
    keyFactory: ({ submissionId }) => `${submissionId}/manuscript/file-1`
  });
  const scanService = createScanService();

  submissionRepository.create({
    submissionId: 'sub-1',
    authorId: 'author-1',
    actionSequenceId: 'action-1',
    sessionId: 'session-1',
    status: 'draft',
    metadata: {
      title: 'Title',
      abstract: 'Abstract',
      authorList: ['Author'],
      keywords: []
    },
    validationErrors: [],
    confirmationCode: null,
    createdAt: clock.now().toISOString(),
    updatedAt: clock.now().toISOString()
  });

  const controller = createUploadController({
    submissionRepository,
    fileRepository,
    storageService,
    scanService,
    sessionStateRepository,
    nowFn: clock.now
  });

  return {
    clock,
    submissionRepository,
    fileRepository,
    storageService,
    scanService,
    sessionStateRepository,
    controller,
    submissionSession: {
      sessionId: 'session-1',
      authorId: 'author-1'
    }
  };
}

describe('upload-controller', () => {
  it('uses default nowFn when none is provided', async () => {
    const paths = createTempPersistencePaths('upload-controller-default-now-');
    const submissionRepository = createSubmissionRepository({
      databaseFilePath: paths.submissionDataFilePath
    });
    const fileRepository = createFileRepository({
      databaseFilePath: paths.fileDataFilePath
    });
    const sessionStateRepository = createSessionStateRepository({
      databaseFilePath: paths.sessionStateDataFilePath
    });
    const storageService = createStorageService({
      uploadsDirectory: paths.uploadsDirectory,
      metadataFilePath: paths.storageDataFilePath
    });
    const scanService = createScanService();

    submissionRepository.create({
      submissionId: 'sub-default-now',
      authorId: 'author-default-now',
      actionSequenceId: 'action-default-now',
      sessionId: 'session-default-now',
      status: 'draft',
      metadata: {
        title: 'Title',
        abstract: 'Abstract',
        authorList: ['Author'],
        keywords: []
      },
      validationErrors: [],
      confirmationCode: null
    });

    const controller = createUploadController({
      submissionRepository,
      fileRepository,
      storageService,
      scanService,
      sessionStateRepository
    });

    const response = await invokeHandler(controller.uploadSubmissionFile, {
      params: {
        submissionId: 'sub-default-now'
      },
      body: {
        category: 'manuscript'
      },
      file: {
        originalname: 'paper.pdf',
        mimetype: 'application/pdf',
        size: 42
      },
      request: {
        submissionSession: {
          sessionId: 'session-default-now',
          authorId: 'author-default-now'
        }
      }
    });

    expect(response.statusCode).toBe(201);
  });

  it('handles session mismatch, missing submissions, and file policy violations', async () => {
    const context = buildContext();

    const missingActiveSessionId = await invokeHandler(context.controller.uploadSubmissionFile, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        category: 'manuscript'
      },
      request: {
        submissionSession: {
          sessionId: '  ',
          authorId: 'author-1'
        }
      }
    });
    expect(missingActiveSessionId.statusCode).toBe(401);

    const invalidBodySessionType = await invokeHandler(context.controller.uploadSubmissionFile, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 1001,
        category: 'manuscript'
      },
      request: {
        submissionSession: context.submissionSession
      }
    });
    expect(invalidBodySessionType.statusCode).toBe(401);

    const blankBodySession = await invokeHandler(context.controller.uploadSubmissionFile, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: '   ',
        category: 'manuscript'
      },
      request: {
        submissionSession: context.submissionSession
      }
    });
    expect(blankBodySession.statusCode).toBe(400);

    const sessionMismatch = await invokeHandler(context.controller.uploadSubmissionFile, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'other-session',
        category: 'manuscript'
      },
      request: {
        submissionSession: context.submissionSession
      }
    });
    expect(sessionMismatch.statusCode).toBe(401);

    const notFound = await invokeHandler(context.controller.uploadSubmissionFile, {
      params: {
        submissionId: 'missing'
      },
      body: {
        sessionId: 'session-1',
        category: 'manuscript'
      },
      request: {
        submissionSession: context.submissionSession
      }
    });
    expect(notFound.statusCode).toBe(404);

    const policyViolation = await invokeHandler(context.controller.uploadSubmissionFile, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'session-1',
        category: 'manuscript',
        file: {
          originalname: 'paper.docx',
          mimetype: 'application/msword',
          size: 42
        }
      },
      request: {
        submissionSession: context.submissionSession
      }
    });
    expect(policyViolation.statusCode).toBe(400);
    expect(policyViolation.body.code).toBe('FILE_POLICY_VIOLATION');
    expect(policyViolation.body.message).toContain('PDF (.pdf) or text (.txt)');
    expect(policyViolation.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNSUPPORTED_FILE_TYPE'
        })
      ])
    );

    const nonTypePolicyViolation = await invokeHandler(context.controller.uploadSubmissionFile, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'session-1',
        category: 'invalid-category',
        file: {
          originalname: 'paper.pdf',
          mimetype: 'application/pdf',
          size: 42
        }
      },
      request: {
        submissionSession: context.submissionSession
      }
    });
    expect(nonTypePolicyViolation.statusCode).toBe(400);
    expect(nonTypePolicyViolation.body.message).toBe('File category is invalid.');
    expect(nonTypePolicyViolation.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_FILE_CATEGORY'
        })
      ])
    );

    const missingFile = await invokeHandler(context.controller.uploadSubmissionFile, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'session-1',
        category: 'manuscript'
      },
      request: {
        submissionSession: context.submissionSession
      }
    });
    expect(missingFile.statusCode).toBe(400);
    expect(missingFile.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FILE_REQUIRED'
        })
      ])
    );
  });

  it('returns retry_required when storage fails and preserves valid files', async () => {
    const context = buildContext();

    context.fileRepository.create({
      fileId: 'existing-file',
      submissionId: 'sub-1',
      category: 'manuscript',
      uploadStatus: 'uploaded',
      scanStatus: 'passed'
    });

    context.storageService.setFailNextSave();
    const response = await invokeHandler(context.controller.uploadSubmissionFile, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'session-1',
        category: 'manuscript',
        file: {
          originalname: 'paper.pdf',
          mimetype: 'application/pdf',
          size: 42
        }
      },
      request: {
        submissionSession: context.submissionSession
      }
    });

    expect(response.statusCode).toBe(503);
    expect(response.body).toEqual({
      submissionId: 'sub-1',
      outcome: 'retry_required',
      retryAllowed: true,
      message: 'File upload failed. Please retry.'
    });

    expect(context.submissionRepository.findById('sub-1').status).toBe('upload_failed');
    expect(
      context.sessionStateRepository.findBySessionId('session-1', context.clock.now())
    ).toEqual(
      expect.objectContaining({
        preservedFileIds: ['existing-file']
      })
    );
  });

  it('stores uploaded files and marks scan failures for the submission', async () => {
    const context = buildContext();

    context.scanService.setForcedResult('virus.pdf', 'failed');

    const failedScanUpload = await invokeHandler(context.controller.uploadSubmissionFile, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'session-1',
        category: 'manuscript',
        file: {
          originalname: 'virus.pdf',
          mimetype: 'application/pdf',
          size: 52
        }
      },
      request: {
        submissionSession: context.submissionSession
      }
    });

    expect(failedScanUpload.statusCode).toBe(201);
    expect(failedScanUpload.body.file.scanStatus).toBe('failed');
    expect(context.submissionRepository.findById('sub-1').status).toBe('scan_failed');

    context.scanService.clearForcedResults();
    const cleanUpload = await invokeHandler(context.controller.uploadSubmissionFile, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        category: 'manuscript',
        file: {
          originalname: 'clean.txt',
          mimetype: 'text/plain',
          size: 60
        }
      },
      request: {
        submissionSession: context.submissionSession
      }
    });

    expect(cleanUpload.statusCode).toBe(201);
    expect(cleanUpload.body.file).toEqual(
      expect.objectContaining({
        originalFilename: 'clean.txt',
        scanStatus: 'passed'
      })
    );
  });
});
