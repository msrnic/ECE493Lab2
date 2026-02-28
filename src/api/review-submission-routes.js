export function registerReviewSubmissionRoutes({
  app,
  reviewSubmissionController,
  requireReviewerSession = (_req, _res, next) => next()
}) {
  if (!app) {
    throw new Error('app is required');
  }

  if (!reviewSubmissionController) {
    throw new Error('reviewSubmissionController is required');
  }

  app.get(
    '/api/reviewer-assignments/:assignmentId/review-status',
    requireReviewerSession,
    reviewSubmissionController.getReviewStatus
  );
  app.post(
    '/api/reviewer-assignments/:assignmentId/review-submissions',
    requireReviewerSession,
    reviewSubmissionController.submitReview
  );
}
