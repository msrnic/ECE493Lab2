import { describe, expect, it, vi } from 'vitest';
import {
  createEditorDecisionApiClient,
  createEditorDecisionController
} from '../../../src/controllers/editor-decision-controller.js';
import { createDecisionAuditModel } from '../../../src/models/decision-audit-model.js';
import { createDecisionModel } from '../../../src/models/decision-model.js';
import { createEditorAssignmentModel } from '../../../src/models/editor-assignment-model.js';
import { createPaperModel } from '../../../src/models/paper-model.js';
import { createReviewModel } from '../../../src/models/review-model.js';
import {
  createPaperScopeAssignment,
  createReviewVisibilityPaper,
  createSubmittedReview
} from '../../fixtures/review-visibility-fixtures.js';
import { createMockResponse } from '../../helpers/http-harness.js';

function createRequest(overrides = {}) {
  return {
    params: { paperId: 'PAPER-TEST-1' },
    headers: {},
    body: {},
    authenticatedSession: {
      user: {
        id: 'editor-1'
      }
    },
    authenticatedUserRole: 'editor',
    ...overrides
  };
}

function createController(overrides = {}) {
  return createEditorDecisionController({
    paperModel: createPaperModel({
      seedPapers: [createReviewVisibilityPaper()]
    }),
    reviewModel: createReviewModel({
      seedReviews: [createSubmittedReview()]
    }),
    editorAssignmentModel: createEditorAssignmentModel({
      seedAssignments: [createPaperScopeAssignment()]
    }),
    decisionModel: createDecisionModel(),
    decisionAuditModel: createDecisionAuditModel({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z'),
      idFactory: (() => {
        let index = 0;
        return () => `audit-${++index}`;
      })()
    }),
    nowFn: () => new Date('2026-02-08T00:00:00.000Z'),
    ...overrides
  });
}

describe('editor-decision-controller', () => {
  it('validates required constructor dependencies', () => {
    expect(() => createEditorDecisionController()).toThrow(/paperModel, reviewModel, and editorAssignmentModel are required/);
  });

  it('returns auth and access responses for workflow loading', async () => {
    const controller = createController();

    const unauthenticated = createMockResponse();
    await controller.getDecisionWorkflow(createRequest({ authenticatedSession: null }), unauthenticated);
    expect(unauthenticated.statusCode).toBe(401);

    const missingPaper = createMockResponse();
    await controller.getDecisionWorkflow(createRequest({ params: { paperId: 'PAPER-MISSING' } }), missingPaper);
    expect(missingPaper.statusCode).toBe(404);

    const blankPaper = createMockResponse();
    await controller.getDecisionWorkflow(createRequest({ params: { paperId: '   ' } }), blankPaper);
    expect(blankPaper.statusCode).toBe(404);

    const nonStringPaper = createMockResponse();
    await controller.getDecisionWorkflow(createRequest({ params: { paperId: 42 } }), nonStringPaper);
    expect(nonStringPaper.statusCode).toBe(404);

    const unassigned = createMockResponse();
    await controller.getDecisionWorkflow(createRequest({
      authenticatedSession: { user: { id: 'editor-2' } }
    }), unassigned);
    expect(unassigned.statusCode).toBe(403);

    const reviewerRole = createMockResponse();
    await controller.getDecisionWorkflow(createRequest({
      authenticatedUserRole: 'reviewer'
    }), reviewerRole);
    expect(reviewerRole.statusCode).toBe(403);

    const success = createMockResponse();
    await controller.getDecisionWorkflow(createRequest(), success);
    expect(success.statusCode).toBe(200);
    expect(success.body.paperId).toBe('PAPER-TEST-1');
    expect(success.body.reviewsAvailable).toBe(true);
    expect(success.body.evaluations).toHaveLength(1);
  });

  it('maps evaluation recommendations from review scores when comments are unavailable', async () => {
    const controller = createEditorDecisionController({
      paperModel: {
        getPaperById: () => ({
          paperId: 'PAPER-TEST-1',
          trackId: 'TRACK-1'
        })
      },
      reviewModel: {
        listSubmittedReviewSummaries: () => [{
          reviewId: 'REV-1',
          reviewerId: 'reviewer-1',
          comments: '',
          overallScore: 3.5,
          submittedAt: '2026-02-08T00:00:00.000Z'
        }, {
          reviewId: 'REV-2',
          reviewerId: 'reviewer-2',
          comments: '',
          overallScore: null,
          submittedAt: '2026-02-08T00:00:00.000Z'
        }]
      },
      editorAssignmentModel: {
        resolveAccess: () => ({ allowed: true })
      }
    });

    const response = createMockResponse();
    await controller.getDecisionWorkflow(createRequest(), response);
    expect(response.statusCode).toBe(200);
    expect(response.body.evaluations[0].recommendation).toBe('Score: 3.5');
    expect(response.body.evaluations[1].recommendation).toBe('Score: N/A');
  });

  it('saves decisions, enforces idempotency, and surfaces audit failures', async () => {
    const decisionAuditModel = createDecisionAuditModel({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z'),
      idFactory: (() => {
        let index = 0;
        return () => `audit-${++index}`;
      })()
    });
    const controller = createController({
      decisionAuditModel
    });

    const success = createMockResponse();
    await controller.savePaperDecision(createRequest({
      headers: { 'idempotency-key': 'dup-1' },
      body: {
        action: 'FINAL',
        finalOutcome: 'ACCEPT',
        expectedVersion: 1
      }
    }), success);
    expect(success.statusCode).toBe(200);
    expect(success.body.saved).toBe(true);
    expect(success.body.auditId).toBe('audit-1');

    const deduplicated = createMockResponse();
    await controller.savePaperDecision(createRequest({
      headers: { 'idempotency-key': 'dup-1' },
      body: {
        action: 'FINAL',
        finalOutcome: 'REJECT',
        expectedVersion: 1
      }
    }), deduplicated);
    expect(deduplicated.statusCode).toBe(200);
    expect(deduplicated.body.finalOutcome).toBe('ACCEPT');
    expect(decisionAuditModel.listEntries()).toHaveLength(1);

    const directHeaderDedupe = createMockResponse();
    await controller.savePaperDecision(createRequest({
      headers: { 'Idempotency-Key': 'dup-1' },
      body: {
        action: 'FINAL',
        finalOutcome: 'REJECT',
        expectedVersion: 1
      }
    }), directHeaderDedupe);
    expect(directHeaderDedupe.statusCode).toBe(200);
    expect(directHeaderDedupe.body.finalOutcome).toBe('ACCEPT');

    decisionAuditModel.setShouldFailPersist(true);
    const auditFailure = createMockResponse();
    await controller.savePaperDecision(createRequest({
      body: {
        action: 'DEFER',
        expectedVersion: 2
      }
    }), auditFailure);
    expect(auditFailure.statusCode).toBe(500);
    expect(auditFailure.body.code).toBe('AUDIT_WRITE_FAILED');
  });

  it('rejects unauthenticated save attempts and missing papers', async () => {
    const controller = createController();

    const unauthenticated = createMockResponse();
    await controller.savePaperDecision(createRequest({
      authenticatedSession: null,
      body: {
        action: 'DEFER',
        expectedVersion: 1
      }
    }), unauthenticated);
    expect(unauthenticated.statusCode).toBe(401);

    const missingPaper = createMockResponse();
    await controller.savePaperDecision(createRequest({
      params: { paperId: 'PAPER-DOES-NOT-EXIST' },
      body: {
        action: 'DEFER',
        expectedVersion: 1
      }
    }), missingPaper);
    expect(missingPaper.statusCode).toBe(404);
  });

  it('falls back actionAttempted to FINAL when decision evaluations omit it', async () => {
    const recordEntry = vi.fn().mockReturnValue({ auditId: 'audit-fallback' });
    const controller = createEditorDecisionController({
      paperModel: {
        getPaperById: () => ({
          paperId: 'PAPER-TEST-1',
          trackId: 'TRACK-1'
        })
      },
      reviewModel: {
        listSubmittedReviewSummaries: () => [{
          reviewId: 'REV-1',
          reviewerId: 'reviewer-1',
          comments: 'Available review',
          submittedAt: '2026-02-08T00:00:00.000Z'
        }]
      },
      editorAssignmentModel: {
        resolveAccess: () => ({ allowed: true })
      },
      decisionModel: {
        evaluateDecision: () => ({
          ok: false,
          statusCode: 422,
          auditOutcome: 'DENIED_INVALID',
          timestamp: '2026-02-08T00:00:00.000Z',
          error: {
            code: 'DENIED_INVALID',
            message: 'Invalid payload'
          }
        })
      },
      decisionAuditModel: {
        recordEntry
      }
    });

    const response = createMockResponse();
    await controller.savePaperDecision(createRequest({
      body: {
        action: 'FINAL',
        expectedVersion: 1,
        finalOutcome: 'MAYBE'
      }
    }), response);

    expect(response.statusCode).toBe(422);
    expect(recordEntry).toHaveBeenCalledWith(expect.objectContaining({
      actionAttempted: 'FINAL'
    }));
  });
});

describe('editor-decision-api-client', () => {
  it('loads and saves workflow payloads and tolerates invalid json payloads', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ paperId: 'PAPER-1' })
      })
      .mockResolvedValueOnce({
        status: 422,
        json: async () => {
          throw new Error('bad json');
        }
      });
    const client = createEditorDecisionApiClient({
      fetchImpl,
      idempotencyKeyFactory: () => 'generated-idempotency'
    });

    const loadResult = await client.loadWorkflow('PAPER-1');
    expect(loadResult.ok).toBe(true);
    expect(loadResult.payload.paperId).toBe('PAPER-1');

    const saveResult = await client.saveDecision('PAPER-1', {
      action: 'DEFER',
      expectedVersion: 1
    }, {
      idempotencyKey: ''
    });
    expect(saveResult.ok).toBe(false);
    expect(saveResult.status).toBe(422);
    expect(saveResult.payload).toEqual({});
    expect(fetchImpl).toHaveBeenCalledWith('/api/papers/PAPER-1/decisions', expect.objectContaining({
      headers: expect.objectContaining({
        'Idempotency-Key': 'generated-idempotency'
      })
    }));

    fetchImpl.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ saved: true })
    });
    await client.saveDecision('PAPER-1', {
      action: 'DEFER',
      expectedVersion: 1
    }, {
      idempotencyKey: 'manual-key'
    });
    expect(fetchImpl).toHaveBeenLastCalledWith('/api/papers/PAPER-1/decisions', expect.objectContaining({
      headers: expect.objectContaining({
        'Idempotency-Key': 'manual-key'
      })
    }));
  });

  it('requires a fetch implementation', () => {
    expect(() => createEditorDecisionApiClient({
      fetchImpl: null
    })).toThrow(/fetchImpl must be a function/);
  });

  it('uses the default idempotency key factory when none is provided', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ saved: true })
    });
    const client = createEditorDecisionApiClient({
      fetchImpl
    });

    await client.saveDecision('PAPER-1', {
      action: 'DEFER',
      expectedVersion: 1
    });

    const requestOptions = fetchImpl.mock.calls[0][1];
    expect(typeof requestOptions.headers['Idempotency-Key']).toBe('string');
    expect(requestOptions.headers['Idempotency-Key'].length).toBeGreaterThan(0);
  });
});
