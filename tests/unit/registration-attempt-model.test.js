import { describe, expect, it } from 'vitest';
import { createInMemoryRepository } from '../../src/models/repository.js';
import {
  THROTTLE_WINDOW_MS,
  calculateThrottleState,
  getRegistrationThrottle,
  recordRegistrationAttempt
} from '../../src/models/registration-attempt-model.js';

describe('registration-attempt-model', () => {
  it('does not block when attempts are below threshold', () => {
    const now = Date.now();
    const attempts = [
      { attemptedAt: new Date(now - 1000).toISOString() },
      { attemptedAt: new Date(now - 2000).toISOString() }
    ];

    const result = calculateThrottleState(attempts, now);
    expect(result).toEqual({ blocked: false, retryAfterSeconds: 0 });
  });

  it('blocks when attempts reach threshold in rolling window', () => {
    const now = Date.now();
    const attempts = [0, 1, 2, 3, 4].map((index) => ({
      attemptedAt: new Date(now - index * 1000).toISOString()
    }));

    const result = calculateThrottleState(attempts, now);
    expect(result.blocked).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('ignores attempts outside rolling window', () => {
    const now = Date.now();
    const attempts = [
      { attemptedAt: new Date(now - THROTTLE_WINDOW_MS - 1).toISOString() },
      { attemptedAt: new Date(now - THROTTLE_WINDOW_MS - 2).toISOString() },
      { attemptedAt: new Date(now - THROTTLE_WINDOW_MS - 3).toISOString() },
      { attemptedAt: new Date(now - THROTTLE_WINDOW_MS - 4).toISOString() },
      { attemptedAt: new Date(now - THROTTLE_WINDOW_MS - 5).toISOString() }
    ];

    const result = calculateThrottleState(attempts, now);
    expect(result.blocked).toBe(false);
  });

  it('records attempts and computes throttle from repository', () => {
    const repository = createInMemoryRepository();
    const now = new Date('2026-01-01T00:00:00.000Z');

    for (let i = 0; i < 5; i += 1) {
      recordRegistrationAttempt(repository, {
        emailNormalized: 'test@example.com',
        outcome: 'validation_failed',
        now: new Date(now.getTime() + i * 1000)
      });
    }

    const throttle = getRegistrationThrottle(repository, 'test@example.com', new Date('2026-01-01T00:00:06.000Z'));

    expect(throttle.blocked).toBe(true);
    expect(throttle.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('persists blockUntil when provided', () => {
    const repository = createInMemoryRepository();
    const attempt = recordRegistrationAttempt(repository, {
      emailNormalized: 'test@example.com',
      outcome: 'throttled',
      blockUntil: '2026-01-01T00:10:00.000Z'
    });

    expect(attempt.blockUntil).toBe('2026-01-01T00:10:00.000Z');
  });
});
