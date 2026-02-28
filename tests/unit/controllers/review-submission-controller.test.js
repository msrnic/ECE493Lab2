import { describe, expect, it, vi } from 'vitest';
import { createReviewSubmissionController } from '../../../src/controllers/review-submission-controller.js';
import { createMockResponse } from '../../helpers/http-harness.js';

function createRequest({
  assignmentId = 'asg-1',
  reviewerId = 'account-reviewer-1',
  body = {},
  sessionId = 'session-1'
} = {}) {
  return {
    params: { assignmentId },
    body,
    headers: { 'x-session-id': sessionId },
    authenticatedReviewerId: reviewerId,
    authenticatedSession: { sessionId }
  };
}

describe('review-submission-controller', () => {
  it('returns 403 for forbidden and revoked access states', async () => {
    const controllerForbidden = createReviewSubmissionController({
      reviewSubmissionModel: { validate: vi.fn() },
      reviewRecordModel: { getStatus: vi.fn(), completeReview: vi.fn() },
      validationFeedbackModel: { toValidationErrorResponse: vi.fn() },
      reviewerPaperAssignmentModel: {
        resolveAccess: vi.fn(() => ({ allowed: false, reasonCode: 'ASSIGNMENT_FORBIDDEN' }))
      }
    });

    const statusRes = createMockResponse();
    await controllerForbidden.getReviewStatus(createRequest(), statusRes);
    expect(statusRes.statusCode).toBe(403);
    expect(statusRes.body.message).toContain('does not have access');

    const controllerRevoked = createReviewSubmissionController({
      reviewSubmissionModel: { validate: vi.fn() },
      reviewRecordModel: { getStatus: vi.fn(), completeReview: vi.fn() },
      validationFeedbackModel: { toValidationErrorResponse: vi.fn() },
      reviewerPaperAssignmentModel: {
        resolveAccess: vi.fn(() => ({ allowed: false, reasonCode: 'ASSIGNMENT_ACCESS_REVOKED' }))
      }
    });

    const submitRes = createMockResponse();
    await controllerRevoked.submitReview(createRequest(), submitRes);
    expect(submitRes.statusCode).toBe(403);
    expect(submitRes.body.message).toContain('revoked');
  });

  it('returns current review status for active assignments', async () => {
    const controller = createReviewSubmissionController({
      reviewSubmissionModel: { validate: vi.fn() },
      reviewRecordModel: {
        getStatus: vi.fn(() => ({ status: 'NOT_SUBMITTED', completedAt: null })),
        completeReview: vi.fn()
      },
      validationFeedbackModel: { toValidationErrorResponse: vi.fn() },
      reviewerPaperAssignmentModel: {
        resolveAccess: vi.fn(() => ({
          allowed: true,
          reasonCode: 'ACCESS_GRANTED',
          assignment: {
            assignmentId: 'asg-1',
            reviewerId: 'account-reviewer-1',
            paperId: 'paper-1',
            accessState: 'ACTIVE'
          }
        }))
      }
    });

    const res = createMockResponse();
    await controller.getReviewStatus(createRequest(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      assignmentId: 'asg-1',
      status: 'NOT_SUBMITTED',
      completedAt: null
    });
  });

  it('returns 400 for validation failures and preserves entered values', async () => {
    const controller = createReviewSubmissionController({
      reviewSubmissionModel: {
        validate: vi.fn(() => ({
          valid: false,
          missingFields: ['summary']
        }))
      },
      reviewRecordModel: {
        getStatus: vi.fn(),
        completeReview: vi.fn()
      },
      validationFeedbackModel: {
        toValidationErrorResponse: vi.fn(() => ({
          code: 'VALIDATION_FAILED',
          message: 'Required review fields are missing or invalid.',
          missingFields: ['summary'],
          fieldMessages: { summary: 'Provide a summary.' }
        }))
      },
      reviewerPaperAssignmentModel: {
        resolveAccess: vi.fn(() => ({
          allowed: true,
          reasonCode: 'ACCESS_GRANTED',
          assignment: {
            assignmentId: 'asg-1',
            reviewerId: 'account-reviewer-1',
            paperId: 'paper-1',
            accessState: 'ACTIVE'
          }
        }))
      }
    });

    const req = createRequest({
      body: {
        recommendation: 'ACCEPT',
        overallScore: 4,
        confidenceScore: 4,
        summary: ' '
      }
    });
    const res = createMockResponse();
    await controller.submitReview(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(
      controller.getPreservedValuesForSession({
        req,
        assignmentId: 'asg-1'
      })
    ).toEqual(req.body);
  });

  it('returns 201 for successful submissions and clears preserved values', async () => {
    const completeReview = vi.fn(async () => ({
      ok: true,
      reviewRecord: {
        reviewId: 'review-1',
        assignmentId: 'asg-1',
        status: 'COMPLETED',
        completedAt: '2026-02-08T12:00:00.000Z'
      }
    }));

    const controller = createReviewSubmissionController({
      reviewSubmissionModel: {
        validate: vi.fn(() => ({
          valid: true,
          value: {
            recommendation: 'ACCEPT',
            overallScore: 4,
            confidenceScore: 3,
            summary: 'Looks good.'
          }
        }))
      },
      reviewRecordModel: {
        getStatus: vi.fn(),
        completeReview
      },
      validationFeedbackModel: {
        toValidationErrorResponse: vi.fn()
      },
      reviewerPaperAssignmentModel: {
        resolveAccess: vi.fn(() => ({
          allowed: true,
          reasonCode: 'ACCESS_GRANTED',
          assignment: {
            assignmentId: 'asg-1',
            reviewerId: 'account-reviewer-1',
            paperId: 'paper-1',
            accessState: 'ACTIVE'
          }
        }))
      }
    });

    const req = createRequest({
      body: {
        recommendation: 'ACCEPT',
        overallScore: 4,
        confidenceScore: 3,
        summary: 'Looks good.'
      }
    });
    controller.preserveValuesForSession({
      req,
      assignmentId: 'asg-1',
      values: req.body
    });

    const res = createMockResponse();
    await controller.submitReview(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.reviewId).toBe('review-1');
    expect(completeReview).toHaveBeenCalledTimes(1);
    expect(
      controller.getPreservedValuesForSession({
        req,
        assignmentId: 'asg-1'
      })
    ).toBeNull();
  });

  it('maps conflict outcomes to 409 responses', async () => {
    const access = {
      resolveAccess: vi.fn(() => ({
        allowed: true,
        reasonCode: 'ACCESS_GRANTED',
        assignment: {
          assignmentId: 'asg-1',
          reviewerId: 'account-reviewer-1',
          paperId: 'paper-1',
          accessState: 'ACTIVE'
        }
      }))
    };

    const alreadyCompletedController = createReviewSubmissionController({
      reviewSubmissionModel: {
        validate: vi.fn(() => ({ valid: true, value: {} }))
      },
      reviewRecordModel: {
        getStatus: vi.fn(),
        completeReview: vi.fn(async () => ({
          ok: false,
          code: 'REVIEW_ALREADY_COMPLETED',
          existingReviewId: 'review-1'
        }))
      },
      validationFeedbackModel: {
        toValidationErrorResponse: vi.fn()
      },
      reviewerPaperAssignmentModel: access
    });

    const alreadyRes = createMockResponse();
    await alreadyCompletedController.submitReview(createRequest(), alreadyRes);
    expect(alreadyRes.statusCode).toBe(409);
    expect(alreadyRes.body.code).toBe('REVIEW_ALREADY_COMPLETED');

    const concurrentController = createReviewSubmissionController({
      reviewSubmissionModel: {
        validate: vi.fn(() => ({ valid: true, value: {} }))
      },
      reviewRecordModel: {
        getStatus: vi.fn(),
        completeReview: vi.fn(async () => ({
          ok: false,
          code: 'CONCURRENT_SUBMISSION_REJECTED'
        }))
      },
      validationFeedbackModel: {
        toValidationErrorResponse: vi.fn()
      },
      reviewerPaperAssignmentModel: access
    });

    const concurrentRes = createMockResponse();
    await concurrentController.submitReview(createRequest(), concurrentRes);
    expect(concurrentRes.statusCode).toBe(409);
    expect(concurrentRes.body.message).toContain('Concurrent submission rejected');
  });

  it('uses anonymous session fallback for preserved values when session identifiers are missing', () => {
    const controller = createReviewSubmissionController({
      reviewSubmissionModel: { validate: vi.fn() },
      reviewRecordModel: { getStatus: vi.fn(), completeReview: vi.fn() },
      validationFeedbackModel: { toValidationErrorResponse: vi.fn() },
      reviewerPaperAssignmentModel: { resolveAccess: vi.fn() }
    });

    const req = {
      params: { assignmentId: 'asg-anon' },
      headers: {},
      authenticatedReviewerId: 'account-reviewer-anon'
    };

    controller.preserveValuesForSession({
      req,
      assignmentId: 'asg-anon',
      values: undefined
    });

    expect(
      controller.getPreservedValuesForSession({
        req,
        assignmentId: 'asg-anon'
      })
    ).toEqual({});
  });
});
