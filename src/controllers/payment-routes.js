export function registerPaymentRoutes({
  app,
  paymentController,
  paymentStatusController,
  gatewayWebhookController
}) {
  app.post(
    '/api/registration-sessions/:sessionId/payment-attempts',
    paymentController.submitPaymentAttempt
  );
  app.get(
    '/api/registration-sessions/:sessionId/payment-attempts/:attemptId',
    paymentStatusController.getPaymentAttempt
  );
  app.get(
    '/api/registration-sessions/:sessionId',
    paymentStatusController.getRegistrationSession
  );
  app.post(
    '/api/payments/webhooks/gateway',
    gatewayWebhookController.reconcilePendingAttempt
  );
}

