import { afterEach, describe, expect, it } from 'vitest';
import { invokeApp } from '../integration/setup/httpHarness.js';
import { createTestServer } from '../integration/setup/testServer.js';

const cleanups = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()();
  }
});

describe('UC-17 acceptance: registration payment', () => {
  it('serves the portal page and supports approved payment completion', async () => {
    const context = createTestServer();
    cleanups.push(context.cleanup);

    const portal = await invokeApp(context.app, { path: '/payment-portal' });
    expect(portal.status).toBe(200);
    expect(portal.text).toContain('data-payment-form');
    expect(portal.text).toContain('name="cardNumber"');
    expect(portal.text).toContain('name="expiry"');
    expect(portal.text).toContain('name="securityNumber"');
    const confirmation = await invokeApp(context.app, { path: '/portal/confirmation' });
    expect(confirmation.status).toBe(200);
    expect(confirmation.text).toContain('Registration Confirmed');

    const approved = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/registration-sessions/11111111-1111-4111-8111-111111111111/payment-attempts',
      headers: {
        'idempotency-key': 'idem-accept-01',
        'x-attendee-id': '22222222-2222-4222-8222-222222222222'
      },
      body: {
        paymentToken: 'tok_approve_1000',
        gatewaySessionId: 'gw-accept-1'
      }
    });

    expect(approved.status).toBe(201);
    expect(approved.body.outcome).toBe('approved');
    expect(approved.body.registrationStatus).toBe('complete');
  });

  it('returns decline, pending reconciliation block, idempotent replay, and retry recovery', async () => {
    const context = createTestServer();
    cleanups.push(context.cleanup);

    const declined = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/registration-sessions/33333333-3333-4333-8333-333333333333/payment-attempts',
      headers: {
        'idempotency-key': 'idem-decline-1',
        'x-attendee-id': '44444444-4444-4444-8444-444444444444'
      },
      body: {
        paymentToken: 'tok_decline_1000',
        gatewaySessionId: 'gw-decline-1'
      }
    });
    expect(declined.status).toBe(201);
    expect(declined.body.outcome).toBe('declined');
    expect(declined.body.registrationStatus).toBe('incomplete');

    const first = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/registration-sessions/55555555-5555-4555-8555-555555555555/payment-attempts',
      headers: {
        'idempotency-key': 'idem-idem-1',
        'x-attendee-id': '66666666-6666-4666-8666-666666666666'
      },
      body: {
        paymentToken: 'tok_approve_2000',
        gatewaySessionId: 'gw-idem-1'
      }
    });
    const replay = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/registration-sessions/55555555-5555-4555-8555-555555555555/payment-attempts',
      headers: {
        'idempotency-key': 'idem-idem-1',
        'x-attendee-id': '66666666-6666-4666-8666-666666666666'
      },
      body: {
        paymentToken: 'tok_approve_2000',
        gatewaySessionId: 'gw-idem-1'
      }
    });
    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(replay.body.isIdempotentReplay).toBe(true);
    expect(replay.body.attemptId).toBe(first.body.attemptId);

    const pending = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/registration-sessions/77777777-7777-4777-8777-777777777777/payment-attempts',
      headers: {
        'idempotency-key': 'idem-pending-1',
        'x-attendee-id': '88888888-8888-4888-8888-888888888888'
      },
      body: {
        paymentToken: 'tok_pending_1000',
        gatewaySessionId: 'gw-pending-1'
      }
    });
    expect(pending.status).toBe(201);
    expect(pending.body.outcome).toBe('pending');

    const blocked = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/registration-sessions/77777777-7777-4777-8777-777777777777/payment-attempts',
      headers: {
        'idempotency-key': 'idem-pending-2',
        'x-attendee-id': '88888888-8888-4888-8888-888888888888'
      },
      body: {
        paymentToken: 'tok_approve_1000',
        gatewaySessionId: 'gw-pending-2'
      }
    });
    expect(blocked.status).toBe(409);
    expect(blocked.body.details.blockedReason).toBe('pending_reconciliation');

    const reconcile = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/payments/webhooks/gateway',
      headers: { 'x-gateway-signature': 'valid-signature' },
      body: {
        eventId: 'evt-pending-final',
        attemptId: pending.body.attemptId,
        outcome: 'declined',
        occurredAt: '2026-02-01T00:10:00.000Z'
      }
    });
    expect(reconcile.status).toBe(202);

    const retryAfterReconcile = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/registration-sessions/77777777-7777-4777-8777-777777777777/payment-attempts',
      headers: {
        'idempotency-key': 'idem-pending-3',
        'x-attendee-id': '88888888-8888-4888-8888-888888888888'
      },
      body: {
        paymentToken: 'tok_approve_1111',
        gatewaySessionId: 'gw-pending-3'
      }
    });
    expect(retryAfterReconcile.status).toBe(201);
    expect(retryAfterReconcile.body.outcome).toBe('approved');
  });

  it('enforces 5-in-15 decline policy and blocks the sixth retry during cooldown', async () => {
    const context = createTestServer();
    cleanups.push(context.cleanup);
    const path = '/api/registration-sessions/99999999-9999-4999-8999-999999999999/payment-attempts';

    for (let index = 1; index <= 5; index += 1) {
      const declined = await invokeApp(context.app, {
        method: 'POST',
        path,
        headers: {
          'idempotency-key': `idem-cooldown-${index}`,
          'x-attendee-id': 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
        },
        body: {
          paymentToken: `tok_decline_200${index}`,
          gatewaySessionId: 'gw-cooldown-1'
        }
      });
      expect(declined.status).toBe(201);
      expect(declined.body.outcome).toBe('declined');
    }

    const sixth = await invokeApp(context.app, {
      method: 'POST',
      path,
      headers: {
        'idempotency-key': 'idem-cooldown-6',
        'x-attendee-id': 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      },
      body: {
        paymentToken: 'tok_approve_3000',
        gatewaySessionId: 'gw-cooldown-2'
      }
    });
    expect(sixth.status).toBe(409);
    expect(sixth.body.details.blockedReason).toBe('cooldown_active');
  });

  it('enforces token-only handling and rejects raw cardholder fields', async () => {
    const context = createTestServer();
    cleanups.push(context.cleanup);

    const response = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/registration-sessions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/payment-attempts',
      headers: {
        'idempotency-key': 'idem-pci-0001',
        'x-attendee-id': 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
      },
      body: {
        paymentToken: 'tok_approve_4000',
        gatewaySessionId: 'gw-pci-1',
        cardNumber: '4111111111111111'
      }
    });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('PCI_SCOPE_VIOLATION');
  });
});
