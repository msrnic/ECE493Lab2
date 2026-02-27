import { describe, expect, it } from 'vitest';
import { createStatusController } from '../../../src/controllers/status-controller.js';
import { createFileRepository } from '../../../src/repositories/file-repository.js';
import { createSessionStateRepository } from '../../../src/repositories/session-state-repository.js';
import { createSubmissionRepository } from '../../../src/repositories/submission-repository.js';
import { invokeHandler } from '../../helpers/http-harness.js';
import { createTempPersistencePaths } from '../../helpers/persistence-paths.js';
import { createClock } from '../../helpers/test-support.js';

function buildContext() {
  const paths = createTempPersistencePaths('status-controller-');
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

  const controller = createStatusController({
    submissionRepository,
    fileRepository,
    sessionStateRepository,
    nowFn: clock.now
  });

  return {
    clock,
    submissionRepository,
    fileRepository,
    sessionStateRepository,
    controller,
    submissionSession: {
      sessionId: 'session-1',
      authorId: 'author-1'
    }
  };
}

describe('status-controller', () => {
  it('uses default nowFn when none is provided', async () => {
    const paths = createTempPersistencePaths('status-controller-default-now-');
    const submissionRepository = createSubmissionRepository({
      databaseFilePath: paths.submissionDataFilePath
    });
    const fileRepository = createFileRepository({
      databaseFilePath: paths.fileDataFilePath
    });
    const sessionStateRepository = createSessionStateRepository({
      databaseFilePath: paths.sessionStateDataFilePath
    });

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

    const controller = createStatusController({
      submissionRepository,
      fileRepository,
      sessionStateRepository
    });

    const response = await invokeHandler(controller.getSubmission, {
      params: {
        submissionId: 'sub-default-now'
      },
      request: {
        submissionSession: {
          sessionId: 'session-default-now',
          authorId: 'author-default-now'
        }
      }
    });

    expect(response.statusCode).toBe(200);
  });

  it('returns 404 for missing or unauthorized submissions', async () => {
    const context = buildContext();

    const missing = await invokeHandler(context.controller.getSubmission, {
      params: {
        submissionId: 'missing'
      },
      request: {
        submissionSession: context.submissionSession
      }
    });
    expect(missing.statusCode).toBe(404);

    const unauthorized = await invokeHandler(context.controller.getSubmission, {
      params: {
        submissionId: 'sub-1'
      },
      request: {
        submissionSession: {
          sessionId: 'session-2',
          authorId: 'author-1'
        }
      }
    });
    expect(unauthorized.statusCode).toBe(404);
  });

  it('returns submission resources with retry state', async () => {
    const context = buildContext();

    context.fileRepository.create({
      fileId: 'file-1',
      submissionId: 'sub-1',
      category: 'manuscript',
      uploadStatus: 'uploaded',
      scanStatus: 'passed',
      originalFilename: 'paper.pdf'
    });

    context.sessionStateRepository.upsert({
      sessionId: 'session-1',
      submissionId: 'sub-1',
      preservedMetadata: {
        title: 'Title'
      },
      preservedFileIds: ['file-1'],
      expiresAt: '2026-02-01T01:00:00.000Z'
    });

    const response = await invokeHandler(context.controller.getSubmission, {
      params: {
        submissionId: 'sub-1'
      },
      request: {
        submissionSession: context.submissionSession
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        submissionId: 'sub-1',
        retryAllowed: true,
        files: [
          expect.objectContaining({
            fileId: 'file-1'
          })
        ]
      })
    );

    context.submissionRepository.update('sub-1', {
      status: 'submitted',
      confirmationCode: 'CONF-7777'
    });
    context.sessionStateRepository.deleteBySessionId('session-1');

    const submitted = await invokeHandler(context.controller.getSubmission, {
      params: {
        submissionId: 'sub-1'
      },
      request: {
        submissionSession: context.submissionSession
      }
    });

    expect(submitted.statusCode).toBe(200);
    expect(submitted.body.retryAllowed).toBe(false);
    expect(submitted.body.outcome).toBe('submitted');
  });
});
