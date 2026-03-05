import { describe, expect, it } from 'vitest';
import { createPaymentRepository } from '../../../src/models/payment-repository.js';

describe('payment-repository', () => {
  it('creates, updates, and queries sessions and attempts', () => {
    const repository = createPaymentRepository({ nowFn: () => '2026-02-01T00:00:00.000Z' });
    const session = repository.getOrCreateSession({
      sessionId: '11111111-1111-4111-8111-111111111111',
      attendeeId: '22222222-2222-4222-8222-222222222222'
    });
    expect(session.registrationStatus).toBe('incomplete');

    repository.createAttempt({
      attemptId: '33333333-3333-4333-8333-333333333333',
      sessionId: session.sessionId,
      idempotencyKey: 'idem-1234',
      paymentToken: 'tok_approve_1234',
      outcome: 'approved',
      isIdempotentReplay: false,
      submittedAt: '2026-02-01T00:00:00.000Z',
      finalizedAt: '2026-02-01T00:00:00.000Z'
    });

    expect(repository.getAttemptBySessionAndIdempotency({
      sessionId: session.sessionId,
      idempotencyKey: 'idem-1234'
    })?.attemptId).toBe('33333333-3333-4333-8333-333333333333');
    expect(repository.listAttemptsBySession(session.sessionId)).toHaveLength(1);

    repository.updateAttempt('33333333-3333-4333-8333-333333333333', { outcome: 'declined' });
    expect(repository.getAttempt('33333333-3333-4333-8333-333333333333')?.outcome).toBe('declined');

    const complete = repository.markSessionComplete(session.sessionId);
    expect(complete?.registrationStatus).toBe('complete');

    const saved = repository.saveSession({
      ...complete,
      updatedAt: '2026-02-01T00:00:01.000Z'
    });
    expect(saved.updatedAt).toBe('2026-02-01T00:00:01.000Z');
  });

  it('handles retry state and reconciliation event storage', () => {
    const repository = createPaymentRepository();
    expect(repository.getSession('missing')).toBeNull();
    expect(repository.updateAttempt('missing', {})).toBeNull();
    expect(repository.markSessionComplete('missing')).toBeNull();

    const savedState = repository.saveRetryState('session-1', {
      declinedAttemptTimestamps: ['2026-02-01T00:00:00.000Z'],
      pendingAttemptId: 'attempt-1'
    });
    expect(savedState.declinedAttemptTimestamps).toEqual(['2026-02-01T00:00:00.000Z']);

    const event = repository.recordReconciliationEvent({
      eventId: 'evt-1',
      attemptId: 'attempt-1',
      source: 'webhook',
      resolvedOutcome: 'approved',
      receivedAt: '2026-02-01T00:00:00.000Z'
    });
    expect(event.eventId).toBe('evt-1');
    expect(repository.hasProcessedReconciliationEvent('evt-1')).toBe(true);
    expect(repository.listAttemptsBySession('missing')).toEqual([]);
    expect(repository.getAttemptBySessionAndIdempotency({ sessionId: 'missing', idempotencyKey: 'none' })).toBeNull();

    const defaultTimestampState = repository.saveRetryState('session-2', {
      pendingAttemptId: null
    });
    expect(defaultTimestampState.declinedAttemptTimestamps).toEqual([]);
  });
});
