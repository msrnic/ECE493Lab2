export function registerNotificationRoutes({
  app,
  notificationController,
  internalServiceAuth
} = {}) {
  app.post(
    '/api/internal/decisions/:decisionId/notifications',
    internalServiceAuth,
    notificationController.triggerDecisionNotification
  );
  app.post(
    '/api/internal/notifications/:notificationId/retry',
    internalServiceAuth,
    notificationController.retryNotificationDelivery
  );
}
