import express from 'express';
import { describe, expect, it, vi } from 'vitest';
import { registerPaymentRoutes } from '../../../src/controllers/payment-routes.js';

function getRoutes(app) {
  return app.router.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
}

describe('payment-routes', () => {
  it('registers all UC-17 routes', () => {
    const app = express();
    const noop = vi.fn((_req, res) => res.status(200).json({ ok: true }));

    registerPaymentRoutes({
      app,
      paymentController: { submitPaymentAttempt: noop },
      paymentStatusController: { getPaymentAttempt: noop, getRegistrationSession: noop },
      gatewayWebhookController: { reconcilePendingAttempt: noop }
    });

    expect(getRoutes(app)).toEqual([
      'POST /api/registration-sessions/:sessionId/payment-attempts',
      'GET /api/registration-sessions/:sessionId/payment-attempts/:attemptId',
      'GET /api/registration-sessions/:sessionId',
      'POST /api/payments/webhooks/gateway'
    ]);
  });
});

