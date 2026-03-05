import { describe, expect, it } from 'vitest';
import { createGatewayWebhookController } from '../../../src/controllers/gateway-webhook-controller.js';
import { createPaymentRepository } from '../../../src/models/payment-repository.js';

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

describe('gateway-webhook-controller', () => {
  it('uses default now function when occurredAt is omitted', () => {
    const repository = createPaymentRepository();
    repository.getOrCreateSession({
      sessionId: '11111111-1111-4111-8111-111111111111',
      attendeeId: '22222222-2222-4222-8222-222222222222'
    });
    repository.createAttempt({
      attemptId: '33333333-3333-4333-8333-333333333333',
      sessionId: '11111111-1111-4111-8111-111111111111',
      idempotencyKey: 'idem-webhook',
      paymentToken: 'tok_pending_1000',
      outcome: 'pending',
      declineReasonCode: null,
      isIdempotentReplay: false,
      submittedAt: '2026-02-01T00:00:00.000Z',
      finalizedAt: null
    });
    repository.saveRetryState('11111111-1111-4111-8111-111111111111', {
      pendingAttemptId: '33333333-3333-4333-8333-333333333333'
    });

    const controller = createGatewayWebhookController({
      repository,
      gatewayClient: {
        verifySignature: () => true
      }
    });

    const res = createMockResponse();
    controller.reconcilePendingAttempt({
      headers: { 'x-gateway-signature': 'valid-signature' },
      body: {
        eventId: 'evt-default-now',
        attemptId: '33333333-3333-4333-8333-333333333333',
        outcome: 'approved'
      }
    }, res);

    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual({ accepted: true, duplicate: false });
  });
});

