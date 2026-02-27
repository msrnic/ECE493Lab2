import { describe, expect, it } from 'vitest';
import {
  createFailedLoginTracker,
  normalizeTrackerEmail
} from '../../../src/models/failed-login-tracker-model.js';

describe('failed-login-tracker-model', () => {
  it('normalizes tracker email key', () => {
    expect(normalizeTrackerEmail('  USER@example.com  ')).toBe('user@example.com');
    expect(normalizeTrackerEmail(undefined)).toBe('');
  });

  it('returns empty state for blank keys', () => {
    const tracker = createFailedLoginTracker();
    expect(tracker.getState('', new Date('2026-02-01T00:00:00.000Z'))).toEqual({
      email: '',
      failedCount: 0,
      blocked: false,
      blockedUntil: null,
      retryAfterSeconds: 0
    });
    expect(tracker.recordFailure('', new Date('2026-02-01T00:00:00.000Z'))).toEqual({
      email: '',
      failedCount: 0,
      blocked: false,
      blockedUntil: null,
      retryAfterSeconds: 0
    });
  });

  it('records failures and blocks after threshold', () => {
    const tracker = createFailedLoginTracker({ blockThreshold: 5, blockWindowMs: 10 * 60 * 1000 });
    const now = new Date('2026-02-01T00:00:00.000Z');

    for (let i = 0; i < 4; i += 1) {
      const state = tracker.recordFailure('user@example.com', now);
      expect(state.blocked).toBe(false);
      expect(state.failedCount).toBe(i + 1);
    }

    const fifth = tracker.recordFailure('user@example.com', now);
    expect(fifth.failedCount).toBe(5);
    expect(fifth.blocked).toBe(true);
    expect(fifth.retryAfterSeconds).toBe(600);

    const blockedState = tracker.getState('user@example.com', new Date('2026-02-01T00:05:00.000Z'));
    expect(blockedState.blocked).toBe(true);
    expect(blockedState.retryAfterSeconds).toBe(300);
  });

  it('clears expired blocks and supports reset', () => {
    const tracker = createFailedLoginTracker({ blockThreshold: 2, blockWindowMs: 1000 });
    const now = new Date('2026-02-01T00:00:00.000Z');

    tracker.recordFailure('user@example.com', now);
    tracker.recordFailure('user@example.com', now);

    const activeBlock = tracker.getState('user@example.com', new Date('2026-02-01T00:00:00.500Z'));
    expect(activeBlock.blocked).toBe(true);

    const expired = tracker.getState('user@example.com', new Date('2026-02-01T00:00:01.001Z'));
    expect(expired).toEqual({
      email: 'user@example.com',
      failedCount: 0,
      blocked: false,
      blockedUntil: null,
      retryAfterSeconds: 0
    });

    tracker.recordFailure('user@example.com', now);
    expect(tracker.getState('user@example.com', now).failedCount).toBe(1);
    tracker.reset('user@example.com');

    expect(tracker.getState('user@example.com', now).failedCount).toBe(0);
    tracker.reset('');
  });
});
