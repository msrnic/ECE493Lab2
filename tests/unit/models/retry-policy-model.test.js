import { describe, expect, it } from 'vitest';
import { createRetryPolicyModel } from '../../../src/models/retry-policy-model.js';

describe('retry-policy-model', () => {
  it('computes retry status for open, pending, and cooldown states', () => {
    const now = new Date('2026-02-01T00:10:00.000Z');
    const model = createRetryPolicyModel({ nowFn: () => now });

    const open = model.getStatus({
      declinedAttemptTimestamps: ['2026-02-01T00:01:00.000Z'],
      cooldownUntil: null,
      pendingAttemptId: null
    });
    expect(open.retryAllowed).toBe(true);
    expect(open.retriesRemaining).toBe(4);

    const pending = model.getStatus({
      declinedAttemptTimestamps: [],
      pendingAttemptId: 'attempt-1'
    });
    expect(pending.retryAllowed).toBe(false);
    expect(pending.blockedReason).toBe('pending_reconciliation');

    const cooldown = model.getStatus({
      declinedAttemptTimestamps: [],
      cooldownUntil: '2026-02-01T00:11:00.000Z'
    });
    expect(cooldown.retryAllowed).toBe(false);
    expect(cooldown.blockedReason).toBe('cooldown_active');
  });

  it('trims old declines and starts cooldown after fifth decline', () => {
    const now = new Date('2026-02-01T00:15:00.000Z');
    const model = createRetryPolicyModel({ nowFn: () => now });

    const trimmed = model.trimWindow([
      '2026-01-31T23:00:00.000Z',
      '2026-02-01T00:10:00.000Z'
    ], now);
    expect(trimmed).toEqual(['2026-02-01T00:10:00.000Z']);

    const declinedState = model.registerDecline({
      declinedAttemptTimestamps: [
        '2026-02-01T00:01:00.000Z',
        '2026-02-01T00:02:00.000Z',
        '2026-02-01T00:03:00.000Z',
        '2026-02-01T00:04:00.000Z'
      ]
    }, now);
    expect(declinedState.declinedAttemptTimestamps).toHaveLength(5);
    expect(declinedState.cooldownUntil).toBe('2026-02-01T00:30:00.000Z');

    const firstDecline = model.registerDecline({ declinedAttemptTimestamps: [] }, now);
    expect(firstDecline.cooldownUntil).toBeNull();
  });

  it('clears pending pointer', () => {
    const model = createRetryPolicyModel();
    const state = model.clearPending({ pendingAttemptId: 'attempt-2' });
    expect(state.pendingAttemptId).toBeNull();

    const status = model.getStatus({
      declinedAttemptTimestamps: [],
      cooldownUntil: null,
      pendingAttemptId: null
    });
    expect(status.retryAllowed).toBe(true);

    const fromStringNow = model.trimWindow(['2026-02-01T00:00:00.000Z'], '2026-02-01T00:05:00.000Z');
    expect(fromStringNow).toEqual(['2026-02-01T00:00:00.000Z']);
  });
});
