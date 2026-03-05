# UC-17 Contract Mapping

- `POST /api/registration-sessions/{sessionId}/payment-attempts`
  maps to `src/controllers/payment-controller.js#submitPaymentAttempt`.
- `GET /api/registration-sessions/{sessionId}/payment-attempts/{attemptId}`
  maps to `src/controllers/payment-status-controller.js#getPaymentAttempt`.
- `GET /api/registration-sessions/{sessionId}`
  maps to `src/controllers/payment-status-controller.js#getRegistrationSession`.
- `POST /api/payments/webhooks/gateway`
  maps to `src/controllers/gateway-webhook-controller.js#reconcilePendingAttempt`.

