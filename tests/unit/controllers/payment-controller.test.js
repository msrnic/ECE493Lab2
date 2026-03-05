import { describe, expect, it } from 'vitest';
import { createPaymentController } from '../../../src/controllers/payment-controller.js';
import { createPaymentRepository } from '../../../src/models/payment-repository.js';
import { createGatewayClient } from '../../../src/controllers/gateway-client.js';

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

function createBaseRequest(overrides = {}) {
  return {
    params: {
      sessionId: '11111111-1111-4111-8111-111111111111'
    },
    headers: {
      'idempotency-key': 'idem-key-01',
      'x-attendee-id': '22222222-2222-4222-8222-222222222222'
    },
    body: {
      paymentToken: 'tok_approve_0001',
      gatewaySessionId: 'gw-session-1'
    },
    ...overrides
  };
}

describe('payment-controller', () => {
  it('returns validation errors', async () => {
    const repository = createPaymentRepository();
    const controller = createPaymentController({
      repository,
      gatewayClient: createGatewayClient(),
      nowFn: () => new Date('2026-02-01T00:00:00.000Z'),
      idFactory: () => '33333333-3333-4333-8333-333333333333'
    });

    const res = createMockResponse();
    await controller.submitPaymentAttempt(createBaseRequest({
      body: {
        paymentToken: 'tok_approve_0001',
        gatewaySessionId: 'gw-session-1',
        cardNumber: '4111111111111111'
      }
    }), res);
    expect(res.statusCode).toBe(422);
    expect(res.body.code).toBe('PCI_SCOPE_VIOLATION');

    const missingGatewaySession = createMockResponse();
    await controller.submitPaymentAttempt(createBaseRequest({
      body: {
        paymentToken: 'tok_approve_0001',
        gatewaySessionId: undefined
      }
    }), missingGatewaySession);
    expect(missingGatewaySession.statusCode).toBe(422);
    expect(missingGatewaySession.body.code).toBe('VALIDATION_FAILED');
  });

  it('maps unexpected errors to internal error responses', async () => {
    const controller = createPaymentController({
      repository: createPaymentRepository(),
      gatewayClient: createGatewayClient({
        submitPayment: async () => {
          throw {};
        }
      }),
      nowFn: () => new Date('2026-02-01T00:00:00.000Z'),
      idFactory: () => '33333333-3333-4333-8333-333333333333'
    });

    const res = createMockResponse();
    await controller.submitPaymentAttempt(createBaseRequest(), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('INTERNAL_ERROR');
    expect(res.body.message).toBe('Unexpected error.');
  });

  it('supports approved, declined, pending, idempotent replay, and blocked retries', async () => {
    const repository = createPaymentRepository();
    let calls = 0;
    const controller = createPaymentController({
      repository,
      gatewayClient: createGatewayClient({
        submitPayment: async () => {
          calls += 1;
          if (calls === 1) {
            return { outcome: 'approved', gatewayReference: 'gw-a1' };
          }
          if (calls === 2) {
            return { outcome: 'declined', gatewayReference: 'gw-d1', declineReasonCode: 'insufficient_funds' };
          }
          return { outcome: 'pending', gatewayReference: 'gw-p1' };
        }
      }),
      nowFn: () => new Date('2026-02-01T00:00:00.000Z'),
      idFactory: () => `33333333-3333-4333-8333-33333333333${calls}`
    });

    const approvedRes = createMockResponse();
    await controller.submitPaymentAttempt(createBaseRequest(), approvedRes);
    expect(approvedRes.statusCode).toBe(201);
    expect(approvedRes.body.outcome).toBe('approved');
    expect(approvedRes.body.registrationStatus).toBe('complete');

    const replayRes = createMockResponse();
    await controller.submitPaymentAttempt(createBaseRequest(), replayRes);
    expect(replayRes.statusCode).toBe(200);
    expect(replayRes.body.isIdempotentReplay).toBe(true);

    const declinedReq = createBaseRequest({
      headers: {
        'idempotency-key': 'idem-key-02',
        'x-attendee-id': '22222222-2222-4222-8222-222222222222'
      }
    });
    const declinedRes = createMockResponse();
    await controller.submitPaymentAttempt(declinedReq, declinedRes);
    expect(declinedRes.statusCode).toBe(201);
    expect(declinedRes.body.outcome).toBe('declined');

    const pendingReq = createBaseRequest({
      params: { sessionId: '99999999-9999-4999-8999-999999999999' },
      headers: {
        'idempotency-key': 'idem-key-03',
        'x-attendee-id': '88888888-8888-4888-8888-888888888888'
      }
    });
    const pendingRes = createMockResponse();
    await controller.submitPaymentAttempt(pendingReq, pendingRes);
    expect(pendingRes.statusCode).toBe(201);
    expect(pendingRes.body.outcome).toBe('pending');

    const blockedRes = createMockResponse();
    await controller.submitPaymentAttempt(createBaseRequest({
      params: { sessionId: '99999999-9999-4999-8999-999999999999' },
      headers: {
        'idempotency-key': 'idem-key-04',
        'x-attendee-id': '88888888-8888-4888-8888-888888888888'
      }
    }), blockedRes);
    expect(blockedRes.statusCode).toBe(409);
    expect(blockedRes.body.code).toBe('RETRY_BLOCKED');
  });

  it('uses default now/id factories when not injected', async () => {
    const repository = createPaymentRepository();
    const controller = createPaymentController({
      repository,
      gatewayClient: createGatewayClient({
        submitPayment: async () => ({ outcome: 'approved', gatewayReference: 'gw-default' })
      })
    });

    const res = createMockResponse();
    await controller.submitPaymentAttempt(createBaseRequest({
      headers: {
        'idempotency-key': 'idem-defaults',
        'x-attendee-id': '22222222-2222-4222-8222-222222222222'
      }
    }), res);

    expect(res.statusCode).toBe(201);
    expect(typeof res.body.attemptId).toBe('string');
    expect(res.body.attemptId.length).toBeGreaterThan(0);
  });

  it('uses default attendee id and null gateway reference fallbacks', async () => {
    const repository = createPaymentRepository();
    const controller = createPaymentController({
      repository,
      gatewayClient: createGatewayClient({
        submitPayment: async () => ({ outcome: 'approved' })
      }),
      nowFn: () => new Date('2026-02-01T00:00:00.000Z'),
      idFactory: () => '33333333-3333-4333-8333-333333333333'
    });

    const res = createMockResponse();
    const req = createBaseRequest({
      headers: {
        'idempotency-key': 'idem-default-attendee'
      }
    });
    delete req.headers['x-attendee-id'];
    await controller.submitPaymentAttempt(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.body.outcome).toBe('approved');
    expect(res.body.declineReasonCode).toBeNull();
  });
});
