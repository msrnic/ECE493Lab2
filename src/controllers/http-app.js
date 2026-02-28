/* c8 ignore file */
export function registerInvitationHttpRoutes({
  app,
  invitationController,
  requireReviewerSession = (_req, _res, next) => next()
}) {
  app.post('/api/invitations/:invitationId/dispatch', invitationController.dispatch);
  app.post('/api/invitations/:invitationId/retry', invitationController.retry);
  app.get('/api/invitations/:invitationId', invitationController.getStatus);
  app.post('/api/invitations/:invitationId/cancel', invitationController.cancel);
  app.get('/api/invitations/:invitationId/failure-log', invitationController.getFailureLog);

  app.post('/api/reviewer-assignments/:assignmentId/invitations', invitationController.triggerByAssignment);
  app.get('/api/review-invitations/:invitationId', invitationController.getContractStatus);
  app.post('/api/review-invitations/:invitationId/delivery-events', invitationController.recordDeliveryEvent);
  app.post('/api/reviewer-assignments/:assignmentId/invitations/cancel', invitationController.cancelByAssignment);
  app.post('/api/internal/review-invitations/retry-due', invitationController.retryDue);
  app.get('/api/papers/:paperId/invitation-failure-logs', invitationController.listFailureLogsByPaper);

  app.get('/api/reviewer/invitations', requireReviewerSession, invitationController.listReviewerInbox);
  app.post(
    '/api/reviewer/invitations/:invitationId/accept',
    requireReviewerSession,
    invitationController.acceptReviewerInvitation
  );
  app.post(
    '/api/reviewer/invitations/:invitationId/decline',
    requireReviewerSession,
    invitationController.declineReviewerInvitation
  );
}
