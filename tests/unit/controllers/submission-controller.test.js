import { describe, expect, it } from 'vitest';
import { createSubmissionController } from '../../../src/controllers/submission-controller.js';
import { createDeduplicationModel } from '../../../src/models/deduplication-model.js';
import { createFileRepository } from '../../../src/repositories/file-repository.js';
import { createSessionStateRepository } from '../../../src/repositories/session-state-repository.js';
import { createSubmissionRepository } from '../../../src/repositories/submission-repository.js';
import { invokeHandler } from '../../helpers/http-harness.js';
import { createTempPersistencePaths } from '../../helpers/persistence-paths.js';
import { createClock } from '../../helpers/test-support.js';

function createControllerContext() {
  const paths = createTempPersistencePaths('submission-controller-');
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
  const deduplicationModel = createDeduplicationModel({
    databaseFilePath: paths.deduplicationDataFilePath
  });

  const controller = createSubmissionController({
    submissionRepository,
    fileRepository,
    sessionStateRepository,
    deduplicationModel,
    nowFn: clock.now,
    confirmationCodeFactory: () => 'CONF-0001'
  });

  const submissionSession = {
    sessionId: 'session-1',
    authorId: 'author-1'
  };

  return {
    clock,
    submissionRepository,
    fileRepository,
    sessionStateRepository,
    deduplicationModel,
    controller,
    submissionSession
  };
}

describe('submission-controller', () => {
  it('uses default nowFn when none is provided', async () => {
    const paths = createTempPersistencePaths('submission-controller-default-now-');
    const submissionRepository = createSubmissionRepository({
      databaseFilePath: paths.submissionDataFilePath
    });
    const fileRepository = createFileRepository({
      databaseFilePath: paths.fileDataFilePath
    });
    const sessionStateRepository = createSessionStateRepository({
      databaseFilePath: paths.sessionStateDataFilePath
    });
    const deduplicationModel = createDeduplicationModel({
      databaseFilePath: paths.deduplicationDataFilePath
    });
    const controller = createSubmissionController({
      submissionRepository,
      fileRepository,
      sessionStateRepository,
      deduplicationModel
    });

    const response = await invokeHandler(controller.createSubmission, {
      body: {
        actionSequenceId: 'action-default-now',
        metadata: {
          title: 'Default now',
          abstract: 'Default now abstract',
          authorList: ['Author']
        }
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

  it('creates submission drafts and stores retry session state', async () => {
    const context = createControllerContext();

    const response = await invokeHandler(context.controller.createSubmission, {
      body: {
        actionSequenceId: 'action-1',
        metadata: {
          title: ' Paper ',
          abstract: ' Abstract ',
          authorList: [' Author A '],
          keywords: [' test ']
        }
      },
      request: {
        submissionSession: context.submissionSession
      }
    });

    expect(response.statusCode).toBe(201);
    expect(typeof response.body.submissionId).toBe('string');
    expect(response.body.submissionId.length).toBeGreaterThan(0);
    expect(response.body.status).toBe('draft');
    expect(response.body.retryAllowed).toBe(true);
    expect(response.body.metadata).toEqual({
      title: 'Paper',
      abstract: 'Abstract',
      authorList: ['Author A'],
      keywords: ['test']
    });

    expect(context.sessionStateRepository.findBySessionId('session-1', context.clock.now())).toEqual(
      expect.objectContaining({
        submissionId: response.body.submissionId
      })
    );
  });

  it('returns session and persistence errors during create', async () => {
    const context = createControllerContext();

    const missingActiveSessionId = await invokeHandler(context.controller.createSubmission, {
      body: {
        actionSequenceId: 'action-1',
        metadata: {}
      },
      request: {
        submissionSession: {
          sessionId: '   ',
          authorId: 'author-1'
        }
      }
    });
    expect(missingActiveSessionId.statusCode).toBe(401);

    const invalidBodySessionType = await invokeHandler(context.controller.createSubmission, {
      body: {
        actionSequenceId: 'action-1',
        sessionId: 101,
        metadata: {}
      },
      request: {
        submissionSession: context.submissionSession
      }
    });
    expect(invalidBodySessionType.statusCode).toBe(401);

    const blankBodySession = await invokeHandler(context.controller.createSubmission, {
      body: {
        actionSequenceId: 'action-1',
        sessionId: '   ',
        metadata: {}
      },
      request: {
        submissionSession: context.submissionSession
      }
    });
    expect(blankBodySession.statusCode).toBe(201);

    const invalidSession = await invokeHandler(context.controller.createSubmission, {
      body: {
        actionSequenceId: 'action-1',
        sessionId: 'wrong-session',
        metadata: {}
      },
      request: {
        submissionSession: context.submissionSession
      }
    });
    expect(invalidSession.statusCode).toBe(401);

    context.submissionRepository.setFailNextPersist();
    const persistenceFailure = await invokeHandler(context.controller.createSubmission, {
      body: {
        actionSequenceId: 'action-1',
        metadata: {}
      },
      request: {
        submissionSession: context.submissionSession
      }
    });
    expect(persistenceFailure.statusCode).toBe(500);
    expect(persistenceFailure.body.code).toBe('SUBMISSION_CREATE_FAILED');
  });

  it('validates submissions and updates validation status and retry data', async () => {
    const context = createControllerContext();
    const created = context.submissionRepository.create({
      submissionId: 'sub-1',
      authorId: 'author-1',
      actionSequenceId: 'action-1',
      sessionId: 'session-1',
      status: 'draft',
      metadata: {
        title: '',
        abstract: '',
        authorList: [],
        keywords: []
      },
      validationErrors: [],
      confirmationCode: null,
      createdAt: context.clock.now().toISOString(),
      updatedAt: context.clock.now().toISOString()
    });
    expect(created.submissionId).toBe('sub-1');

    const notFound = await invokeHandler(context.controller.validateSubmission, {
      params: {
        submissionId: 'missing'
      },
      body: {
        sessionId: 'session-1'
      },
      request: {
        submissionSession: context.submissionSession
      }
    });
    expect(notFound.statusCode).toBe(404);

    const invalidSession = await invokeHandler(context.controller.validateSubmission, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'other-session'
      },
      request: {
        submissionSession: context.submissionSession
      }
    });
    expect(invalidSession.statusCode).toBe(401);

    const validationFailure = await invokeHandler(context.controller.validateSubmission, {
      params: {
        submissionId: 'sub-1'
      },
      body: {},
      request: {
        submissionSession: context.submissionSession
      }
    });

    expect(validationFailure.statusCode).toBe(200);
    expect(validationFailure.body.valid).toBe(false);
    expect(validationFailure.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'title' }),
        expect.objectContaining({ field: 'abstract' }),
        expect.objectContaining({ field: 'authorList' })
      ])
    );

    const updated = context.submissionRepository.findById('sub-1');
    expect(updated.status).toBe('validation_failed');

    const metadataUpdate = await invokeHandler(context.controller.validateSubmission, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'session-1',
        metadata: {
          title: 'Updated title',
          abstract: 'Updated abstract',
          authorList: ['Author A'],
          keywords: []
        }
      },
      request: {
        submissionSession: context.submissionSession
      }
    });

    expect(metadataUpdate.statusCode).toBe(200);
    expect(metadataUpdate.body.valid).toBe(false);
    expect(metadataUpdate.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'REQUIRED_FILE_MISSING' })
      ])
    );
    expect(
      context.sessionStateRepository.findBySessionId('session-1', context.clock.now())
    ).toEqual(expect.objectContaining({ submissionId: 'sub-1' }));
  });

  it('finalizes submissions, blocks duplicates, and handles failures', async () => {
    const context = createControllerContext();

    context.submissionRepository.create({
      submissionId: 'sub-1',
      authorId: 'author-1',
      actionSequenceId: 'action-1',
      sessionId: 'session-1',
      status: 'draft',
      metadata: {
        title: 'Valid title',
        abstract: 'Valid abstract',
        authorList: ['Author'],
        keywords: []
      },
      validationErrors: [],
      confirmationCode: null,
      createdAt: context.clock.now().toISOString(),
      updatedAt: context.clock.now().toISOString()
    });

    const missingKey = await invokeHandler(context.controller.finalizeSubmission, {
      params: {
        submissionId: 'sub-1'
      },
      body: {},
      request: {
        submissionSession: context.submissionSession,
        headers: {}
      }
    });
    expect(missingKey.statusCode).toBe(422);

    const blocked = await invokeHandler(context.controller.finalizeSubmission, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'session-1'
      },
      request: {
        submissionSession: context.submissionSession,
        headers: {
          'idempotency-key': 'idem-1'
        }
      }
    });
    expect(blocked.statusCode).toBe(422);
    expect(blocked.body.code).toBe('SUBMISSION_BLOCKED');

    context.fileRepository.create({
      fileId: 'file-1',
      submissionId: 'sub-1',
      category: 'manuscript',
      originalFilename: 'paper.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      storageKey: 'key-1',
      uploadStatus: 'uploaded',
      scanStatus: 'passed',
      uploadedAt: context.clock.now().toISOString()
    });

    context.submissionRepository.setFailNextPersist();
    const saveFailure = await invokeHandler(context.controller.finalizeSubmission, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'session-1'
      },
      request: {
        submissionSession: context.submissionSession,
        headers: {
          'idempotency-key': 'idem-2'
        }
      }
    });
    expect(saveFailure.statusCode).toBe(503);
    expect(saveFailure.body.outcome).toBe('retry_required');

    const success = await invokeHandler(context.controller.finalizeSubmission, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'session-1'
      },
      request: {
        submissionSession: context.submissionSession,
        headers: {
          'idempotency-key': 'idem-3'
        }
      }
    });

    expect(success.statusCode).toBe(200);
    expect(success.body).toEqual({
      submissionId: 'sub-1',
      status: 'submitted',
      outcome: 'submitted',
      message: 'Submission complete.',
      confirmationCode: 'CONF-0001'
    });
    expect(context.sessionStateRepository.list()).toEqual([]);

    const duplicate = await invokeHandler(context.controller.finalizeSubmission, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'session-1'
      },
      request: {
        submissionSession: context.submissionSession,
        headers: {
          'idempotency-key': 'idem-4'
        }
      }
    });

    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.body.code).toBe('DUPLICATE_SUBMISSION');

    const invalidSession = await invokeHandler(context.controller.finalizeSubmission, {
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'wrong'
      },
      request: {
        submissionSession: context.submissionSession,
        headers: {
          'idempotency-key': 'idem-5'
        }
      }
    });
    expect(invalidSession.statusCode).toBe(401);

    const notFound = await invokeHandler(context.controller.finalizeSubmission, {
      params: {
        submissionId: 'missing'
      },
      body: {
        sessionId: 'session-1'
      },
      request: {
        submissionSession: context.submissionSession,
        headers: {
          'idempotency-key': 'idem-6'
        }
      }
    });
    expect(notFound.statusCode).toBe(404);
  });
});
