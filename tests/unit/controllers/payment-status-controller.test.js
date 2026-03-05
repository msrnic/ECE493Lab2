import { describe, expect, it } from 'vitest';
import { createPaymentRepository } from '../../../src/models/payment-repository.js';
import { createPaymentStatusController } from '../../../src/controllers/payment-status-controller.js';

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

describe('payment-status-controller', () => {
  it('returns session and attempt payloads', () => {
    const repository = createPaymentRepository();
    const session = repository.getOrCreateSession({
      sessionId: '11111111-1111-4111-8111-111111111111',
      attendeeId: '22222222-2222-4222-8222-222222222222'
    });
    repository.createAttempt({
      attemptId: '33333333-3333-4333-8333-333333333333',
      sessionId: session.sessionId,
      idempotencyKey: 'idem-key-01',
      paymentToken: 'tok_pending_0001',
      outcome: 'pending',
      declineReasonCode: null,
      isIdempotentReplay: false,
      submittedAt: '2026-02-01T00:00:00.000Z',
      finalizedAt: null
    });

    const controller = createPaymentStatusController({ repository, nowFn: () => new Date('2026-02-01T00:00:00.000Z') });
    const sessionRes = createMockResponse();
    controller.getRegistrationSession({ params: { sessionId: session.sessionId } }, sessionRes);
    expect(sessionRes.statusCode).toBe(200);
    expect(sessionRes.body.sessionId).toBe(session.sessionId);

    const attemptRes = createMockResponse();
    controller.getPaymentAttempt({
      params: {
        sessionId: session.sessionId,
        attemptId: '33333333-3333-4333-8333-333333333333'
      }
    }, attemptRes);
    expect(attemptRes.statusCode).toBe(200);
    expect(attemptRes.body.retryPolicy.blockedReason).toBeNull();
  });

  it('handles not found and validation failures', () => {
    const controller = createPaymentStatusController({
      repository: createPaymentRepository(),
      nowFn: () => new Date('2026-02-01T00:00:00.000Z')
    });

    const missingSession = createMockResponse();
    controller.getRegistrationSession({ params: { sessionId: '11111111-1111-4111-8111-111111111111' } }, missingSession);
    expect(missingSession.statusCode).toBe(404);

    const invalidSession = createMockResponse();
    controller.getRegistrationSession({ params: { sessionId: 'bad' } }, invalidSession);
    expect(invalidSession.statusCode).toBe(422);

    const missingAttempt = createMockResponse();
    controller.getPaymentAttempt({
      params: {
        sessionId: '11111111-1111-4111-8111-111111111111',
        attemptId: '33333333-3333-4333-8333-333333333333'
      }
    }, missingAttempt);
    expect(missingAttempt.statusCode).toBe(404);

    const invalid = createMockResponse();
    controller.getPaymentAttempt({ params: { sessionId: 'bad', attemptId: 'also-bad' } }, invalid);
    expect(invalid.statusCode).toBe(422);
  });

  it('uses default nowFn when not provided', () => {
    const repository = createPaymentRepository();
    repository.getOrCreateSession({
      sessionId: '11111111-1111-4111-8111-111111111111',
      attendeeId: '22222222-2222-4222-8222-222222222222'
    });
    repository.createAttempt({
      attemptId: '33333333-3333-4333-8333-333333333333',
      sessionId: '11111111-1111-4111-8111-111111111111',
      idempotencyKey: 'idem-status-default',
      paymentToken: 'tok_pending_0001',
      outcome: 'pending',
      declineReasonCode: null,
      isIdempotentReplay: false,
      submittedAt: '2026-02-01T00:00:00.000Z',
      finalizedAt: null
    });
    const controller = createPaymentStatusController({ repository });
    const response = createMockResponse();
    controller.getPaymentAttempt({
      params: {
        sessionId: '11111111-1111-4111-8111-111111111111',
        attemptId: '33333333-3333-4333-8333-333333333333'
      }
    }, response);
    expect(response.statusCode).toBe(200);
  });
});
