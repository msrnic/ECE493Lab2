import { describe, expect, it, vi } from 'vitest';
import { registerReviewSubmissionRoutes } from '../../../src/api/review-submission-routes.js';

describe('review-submission-routes', () => {
  it('throws when required dependencies are missing', () => {
    expect(() => registerReviewSubmissionRoutes({})).toThrow(/app is required/);
    expect(() => registerReviewSubmissionRoutes({ app: {} })).toThrow(/reviewSubmissionController is required/);
  });

  it('registers review status and submission routes with middleware', () => {
    const app = {
      get: vi.fn(),
      post: vi.fn()
    };
    const requireReviewerSession = vi.fn();
    const controller = {
      getReviewStatus: vi.fn(),
      submitReview: vi.fn()
    };

    registerReviewSubmissionRoutes({
      app,
      reviewSubmissionController: controller,
      requireReviewerSession
    });

    expect(app.get).toHaveBeenCalledWith(
      '/api/reviewer-assignments/:assignmentId/review-status',
      requireReviewerSession,
      controller.getReviewStatus
    );
    expect(app.post).toHaveBeenCalledWith(
      '/api/reviewer-assignments/:assignmentId/review-submissions',
      requireReviewerSession,
      controller.submitReview
    );
  });

  it('uses default middleware when one is not provided', () => {
    const app = {
      get: vi.fn(),
      post: vi.fn()
    };
    const controller = {
      getReviewStatus: vi.fn(),
      submitReview: vi.fn()
    };

    registerReviewSubmissionRoutes({
      app,
      reviewSubmissionController: controller
    });

    const middleware = app.get.mock.calls[0][1];
    const next = vi.fn();
    middleware({}, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
