import { describe, expect, it } from 'vitest';
import { createAttemptThrottleModel } from '../../../src/models/attempt-throttle-model.js';

describe('attempt-throttle-model', () => {
  it('returns unblocked state for missing user ids', () => {
    const model = createAttemptThrottleModel();

    expect(model.getState('')).toEqual({
      blocked: false,
      retryAfterSeconds: 0,
      blockedUntil: null,
      failureCount: 0
    });

    expect(model.recordIncorrectAttempt(null)).toEqual({
      blocked: false,
      retryAfterSeconds: 0,
      blockedUntil: null,
      failureCount: 0
    });

    model.reset(undefined);
  });

  it('tracks failures, blocks after threshold, and unblocks after block window', () => {
    let nowMs = new Date('2026-02-01T00:00:00.000Z').getTime();
    const nowFn = () => new Date(nowMs);
    const model = createAttemptThrottleModel({ nowFn });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const state = model.recordIncorrectAttempt('usr-1', nowFn());
      expect(state.blocked).toBe(false);
    }

    const fifth = model.recordIncorrectAttempt('usr-1', nowFn());
    expect(fifth.blocked).toBe(true);
    expect(fifth.retryAfterSeconds).toBeGreaterThan(0);
    expect(fifth.blockedUntil).toBeDefined();

    const blockedState = model.getState('usr-1', nowFn());
    expect(blockedState.blocked).toBe(true);

    nowMs += 10 * 60 * 1000;

    const unblockedState = model.getState('usr-1', nowFn());
    expect(unblockedState).toEqual({
      blocked: false,
      retryAfterSeconds: 0,
      blockedUntil: null,
      failureCount: 0
    });
  });

  it('prunes rolling-window failures and supports numeric timestamps', () => {
    const model = createAttemptThrottleModel({
      maxFailures: 3,
      windowMs: 1_000,
      blockMs: 2_000
    });

    model.recordIncorrectAttempt('usr-2', 0);
    model.recordIncorrectAttempt('usr-2', 500);
    const activeState = model.getState('usr-2', 999);
    expect(activeState.failureCount).toBe(2);

    const prunedState = model.getState('usr-2', 2_000);
    expect(prunedState.failureCount).toBe(0);

    model.recordIncorrectAttempt('usr-2', 2_000);
    model.recordIncorrectAttempt('usr-2', 2_001);
    const blockedState = model.recordIncorrectAttempt('usr-2', 2_002);
    expect(blockedState.blocked).toBe(true);
    expect(blockedState.retryAfterSeconds).toBe(2);

    model.reset('usr-2');
    expect(model.getState('usr-2', 2_003)).toEqual({
      blocked: false,
      retryAfterSeconds: 0,
      blockedUntil: null,
      failureCount: 0
    });
  });
});
