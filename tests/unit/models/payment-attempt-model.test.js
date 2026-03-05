import { describe, expect, it } from 'vitest';
import { createPaymentAttempt } from '../../../src/models/payment-attempt-model.js';

describe('payment-attempt-model', () => {
  it('creates approved and declined attempts with finalization', () => {
    const approved = createPaymentAttempt({
      attemptId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      idempotencyKey: 'idem-key-1',
      paymentToken: 'tok_approve_1234',
      outcome: 'approved',
      submittedAt: '2026-02-01T00:00:00.000Z'
    });
    expect(approved.value.finalizedAt).toBe('2026-02-01T00:00:00.000Z');

    const declined = createPaymentAttempt({
      attemptId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      idempotencyKey: 'idem-key-2',
      paymentToken: 'tok_decline_1234',
      outcome: 'declined',
      declineReasonCode: 'declined_by_issuer',
      submittedAt: '2026-02-01T00:00:00.000Z'
    });
    expect(declined.value.declineReasonCode).toBe('declined_by_issuer');
  });

  it('supports valid transitions and rejects invalid ones', () => {
    const attempt = createPaymentAttempt({
      attemptId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      idempotencyKey: 'idem-key-3',
      paymentToken: 'tok_pending_1234'
    });

    const pending = attempt.transitionTo('pending');
    expect(pending.outcome).toBe('pending');

    const approved = attempt.transitionTo('approved', { now: '2026-02-01T10:00:00.000Z' });
    expect(approved.finalizedAt).toBe('2026-02-01T10:00:00.000Z');

    expect(() => attempt.transitionTo('declined', { declineReasonCode: 'x' }))
      .toThrow('Invalid payment outcome transition: approved -> declined');

    const forDecline = createPaymentAttempt({
      attemptId: '12121212-1212-4212-8212-121212121212',
      sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      idempotencyKey: 'idem-key-8',
      paymentToken: 'tok_pending_7654'
    });
    const declined = forDecline.transitionTo('declined', {
      declineReasonCode: 'insufficient_funds',
      now: '2026-02-01T12:00:00.000Z'
    });
    expect(declined.declineReasonCode).toBe('insufficient_funds');
  });

  it('validates outcomes and decline reason requirements', () => {
    expect(() => {
      createPaymentAttempt({
        attemptId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        idempotencyKey: 'idem-key-4',
        paymentToken: 'tok_decline_1234',
        outcome: 'declined'
      });
    }).toThrow('declineReasonCode is required for declined outcomes.');

    const processing = createPaymentAttempt({
      attemptId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      idempotencyKey: 'idem-key-5',
      paymentToken: 'tok_pending_1234'
    });

    expect(() => processing.transitionTo('invalid')).toThrow('Invalid payment outcome.');
    expect(() => processing.transitionTo('declined')).toThrow('declineReasonCode is required for declined outcomes.');
  });
});
