import { describe, expect, it, vi } from 'vitest';
import { createReviewApiController } from '../../src/controllers/review-api-controller.js';
import { createEditorAssignmentModel } from '../../src/models/editor-assignment-model.js';
import { createPaperModel } from '../../src/models/paper-model.js';
import { createReviewAccessAuditModel } from '../../src/models/review-access-audit-model.js';
import { createReviewModel } from '../../src/models/review-model.js';
import {
  createPaperScopeAssignment,
  createReviewVisibilityPaper,
  createSubmittedReview
} from '../fixtures/review-visibility-fixtures.js';
import { createMockResponse } from '../helpers/http-harness.js';

function createRequest(overrides = {}) {
  return {
    params: { paperId: 'PAPER-TEST-1' },
    headers: { 'x-request-id': 'req-1' },
    authenticatedSession: {
      user: {
        id: 'editor-1'
      }
    },
    authenticatedUserRole: 'editor',
    ...overrides
  };
}

describe('review-api-controller', () => {
  it('returns authentication required for missing session', async () => {
    const controller = createReviewApiController({
      paperModel: createPaperModel({ seedPapers: [] }),
      reviewModel: createReviewModel({ seedReviews: [] }),
      editorAssignmentModel: createEditorAssignmentModel({ seedAssignments: [] }),
      reviewAccessAuditModel: createReviewAccessAuditModel({ idFactory: () => 'audit-1' })
    });

    const res = createMockResponse();
    await controller.getPaperReviews({ authenticatedSession: null }, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ message: 'Authentication required' });
    expect(controller.getTraceEntries()).toEqual([]);
  });

  it('returns unavailable for invalid access paths and captures trace outcomes', async () => {
    const traceSink = vi.fn();
    const controller = createReviewApiController({
      paperModel: createPaperModel({ seedPapers: [] }),
      reviewModel: createReviewModel({ seedReviews: [] }),
      editorAssignmentModel: createEditorAssignmentModel({ seedAssignments: [] }),
      reviewAccessAuditModel: createReviewAccessAuditModel({ idFactory: () => 'audit-1' }),
      nowFn: () => new Date('2026-02-08T00:00:00.000Z'),
      requestIdFactory: () => 'generated-req-id',
      traceSink
    });

    const nonEditorRes = createMockResponse();
    await controller.getPaperReviews(createRequest({ authenticatedUserRole: 'reviewer' }), nonEditorRes);
    expect(nonEditorRes.statusCode).toBe(404);

    const missingPaperIdRes = createMockResponse();
    await controller.getPaperReviews(createRequest({ params: { paperId: '   ' }, headers: {} }), missingPaperIdRes);
    expect(missingPaperIdRes.statusCode).toBe(404);

    const missingPaperRes = createMockResponse();
    await controller.getPaperReviews(createRequest({ params: { paperId: 'PAPER-MISSING' } }), missingPaperRes);
    expect(missingPaperRes.statusCode).toBe(404);

    const nonStringPaperIdRes = createMockResponse();
    await controller.getPaperReviews(createRequest({ params: { paperId: 42 } }), nonStringPaperIdRes);
    expect(nonStringPaperIdRes.statusCode).toBe(404);

    expect(controller.getTraceEntries().every((entry) => entry.outcome === 'unavailable')).toBe(true);
    expect(traceSink).toHaveBeenCalledTimes(4);
    expect(controller.getTraceEntries()[1].requestId).toBe('generated-req-id');
  });

  it('returns unavailable for unauthorized editors and available for authorized editors', async () => {
    const paperModel = createPaperModel({
      seedPapers: [createReviewVisibilityPaper()]
    });
    const reviewModel = createReviewModel({
      seedReviews: [createSubmittedReview()]
    });
    const editorAssignmentModel = createEditorAssignmentModel({
      seedAssignments: [createPaperScopeAssignment()]
    });
    const reviewAccessAuditModel = createReviewAccessAuditModel({
      idFactory: (() => {
        let count = 0;
        return () => `audit-${++count}`;
      })()
    });

    const controller = createReviewApiController({
      paperModel,
      reviewModel,
      editorAssignmentModel,
      reviewAccessAuditModel,
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });

    const unauthorizedRes = createMockResponse();
    await controller.getPaperReviews(createRequest({
      authenticatedSession: {
        user: { id: 'editor-2' }
      }
    }), unauthorizedRes);

    expect(unauthorizedRes.statusCode).toBe(404);
    expect(reviewAccessAuditModel.listEntries()).toHaveLength(0);

    const authorizedRes = createMockResponse();
    await controller.getPaperReviews(createRequest(), authorizedRes);

    expect(authorizedRes.statusCode).toBe(200);
    expect(authorizedRes.body.status).toBe('available');
    expect(authorizedRes.body.reviews).toHaveLength(1);
    expect(reviewAccessAuditModel.listEntries()).toHaveLength(1);
    expect(controller.getTraceEntries().at(-1).outcome).toBe('available');
  });

  it('returns pending when completed reviews do not exist and supports trace reset', async () => {
    const controller = createReviewApiController({
      paperModel: createPaperModel({
        seedPapers: [createReviewVisibilityPaper()]
      }),
      reviewModel: createReviewModel({ seedReviews: [] }),
      editorAssignmentModel: createEditorAssignmentModel({
        seedAssignments: [createPaperScopeAssignment()]
      }),
      reviewAccessAuditModel: createReviewAccessAuditModel({ idFactory: () => 'audit-pending' }),
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });

    const res = createMockResponse();
    await controller.getPaperReviews(createRequest(), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      paperId: 'PAPER-TEST-1',
      status: 'pending',
      reviews: []
    });

    expect(controller.getTraceEntries()).toHaveLength(1);
    controller.resetTraceEntries();
    expect(controller.getTraceEntries()).toHaveLength(0);
  });

  it('validates constructor dependencies', () => {
    expect(() => createReviewApiController()).toThrow(/paperModel, reviewModel, editorAssignmentModel, and reviewAccessAuditModel are required/);
  });

  it('executes default nowFn when not overridden', async () => {
    const controller = createReviewApiController({
      paperModel: createPaperModel({ seedPapers: [createReviewVisibilityPaper()] }),
      reviewModel: createReviewModel({ seedReviews: [createSubmittedReview()] }),
      editorAssignmentModel: createEditorAssignmentModel({ seedAssignments: [createPaperScopeAssignment()] }),
      reviewAccessAuditModel: createReviewAccessAuditModel({ idFactory: () => 'audit-default-now' })
    });

    const res = createMockResponse();
    await controller.getPaperReviews(createRequest(), res);
    expect(res.statusCode).toBe(200);
  });
});
