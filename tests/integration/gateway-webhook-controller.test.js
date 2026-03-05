import { afterEach, describe, expect, it } from 'vitest';
import { invokeApp } from './setup/httpHarness.js';
import { createTestServer } from './setup/testServer.js';

const cleanups = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()();
  }
});

describe('gateway-webhook-controller integration', () => {
  it('rejects invalid signatures', async () => {
    const context = createTestServer();
    cleanups.push(context.cleanup);

    const response = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/payments/webhooks/gateway',
      headers: { 'x-gateway-signature': 'bad-signature' },
      body: {
        eventId: 'evt-1',
        attemptId: '11111111-1111-4111-8111-111111111111',
        outcome: 'approved',
        occurredAt: '2026-02-01T00:00:00.000Z'
      }
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('SIGNATURE_INVALID');
  });

  it('returns validation errors for malformed webhook payloads', async () => {
    const context = createTestServer();
    cleanups.push(context.cleanup);

    const response = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/payments/webhooks/gateway',
      headers: { 'x-gateway-signature': 'valid-signature' },
      body: {
        eventId: '',
        attemptId: '',
        outcome: 'pending',
        occurredAt: '2026-02-01T00:00:00.000Z'
      }
    });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('reconciles pending attempts and treats duplicate events idempotently', async () => {
    const context = createTestServer();
    cleanups.push(context.cleanup);

    const submit = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/registration-sessions/11111111-1111-4111-8111-111111111111/payment-attempts',
      headers: {
        'idempotency-key': 'idem-key-pending',
        'x-attendee-id': '22222222-2222-4222-8222-222222222222'
      },
      body: {
        paymentToken: 'tok_pending_0001',
        gatewaySessionId: 'gw-1'
      }
    });
    expect(submit.status).toBe(201);
    expect(submit.body.outcome).toBe('pending');

    const reconcile = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/payments/webhooks/gateway',
      headers: { 'x-gateway-signature': 'valid-signature' },
      body: {
        eventId: 'evt-2',
        attemptId: submit.body.attemptId,
        outcome: 'approved'
      }
    });
    expect(reconcile.status).toBe(202);
    expect(reconcile.body).toEqual({ accepted: true, duplicate: false });

    const session = await invokeApp(context.app, {
      path: '/api/registration-sessions/11111111-1111-4111-8111-111111111111'
    });
    expect(session.status).toBe(200);
    expect(session.body.registrationStatus).toBe('complete');

    const duplicate = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/payments/webhooks/gateway',
      headers: { 'x-gateway-signature': 'valid-signature' },
      body: {
        eventId: 'evt-2',
        attemptId: submit.body.attemptId,
        outcome: 'approved',
        occurredAt: '2026-02-01T00:01:00.000Z'
      }
    });
    expect(duplicate.status).toBe(202);
    expect(duplicate.body).toEqual({ accepted: true, duplicate: true });
  });

  it('handles missing attempts and no-op reconciliation for finalized attempts', async () => {
    const context = createTestServer();
    cleanups.push(context.cleanup);

    const missing = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/payments/webhooks/gateway',
      headers: { 'x-gateway-signature': 'valid-signature' },
      body: {
        eventId: 'evt-missing',
        attemptId: '33333333-3333-4333-8333-333333333333',
        outcome: 'approved',
        occurredAt: '2026-02-01T00:00:00.000Z'
      }
    });
    expect(missing.status).toBe(404);

    const approved = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/registration-sessions/44444444-4444-4444-8444-444444444444/payment-attempts',
      headers: {
        'idempotency-key': 'idem-key-approved',
        'x-attendee-id': '55555555-5555-4555-8555-555555555555'
      },
      body: {
        paymentToken: 'tok_approve_1234',
        gatewaySessionId: 'gw-2'
      }
    });
    expect(approved.status).toBe(201);
    expect(approved.body.outcome).toBe('approved');

    const noChange = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/payments/webhooks/gateway',
      headers: { 'x-gateway-signature': 'valid-signature' },
      body: {
        eventId: 'evt-noop',
        attemptId: approved.body.attemptId,
        outcome: 'declined',
        occurredAt: '2026-02-01T00:05:00.000Z'
      }
    });
    expect(noChange.status).toBe(202);
    expect(noChange.body).toEqual({ accepted: true, duplicate: false, noChange: true });
  });
});
