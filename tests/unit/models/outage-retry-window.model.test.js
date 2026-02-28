import { describe, expect, it } from 'vitest';
import { createOutageRetryWindowModel } from '../../../src/models/outage-retry-window.model.js';

describe('outage-retry-window.model', () => {
  it('allows one immediate retry and throttles additional retries inside 5 seconds', () => {
    const model = createOutageRetryWindowModel({ throttleWindowMs: 5000 });

    const first = model.registerTemporaryOutage({
      reviewerId: 'reviewer-1',
      paperId: 'paper-1',
      now: new Date('2026-02-08T00:00:00.000Z')
    });
    expect(first.outcome).toBe('temporarily-unavailable');

    const immediateRetry = model.registerTemporaryOutage({
      reviewerId: 'reviewer-1',
      paperId: 'paper-1',
      now: new Date('2026-02-08T00:00:00.500Z')
    });
    expect(immediateRetry.outcome).toBe('temporarily-unavailable');

    const throttled = model.registerTemporaryOutage({
      reviewerId: 'reviewer-1',
      paperId: 'paper-1',
      now: new Date('2026-02-08T00:00:01.000Z')
    });
    expect(throttled.outcome).toBe('throttled');
    expect(throttled.retryAfterSeconds).toBeGreaterThanOrEqual(1);

    const afterWindow = model.registerTemporaryOutage({
      reviewerId: 'reviewer-1',
      paperId: 'paper-1',
      now: new Date('2026-02-08T00:00:07.000Z')
    });
    expect(afterWindow.outcome).toBe('temporarily-unavailable');
  });

  it('returns and clears stored windows', () => {
    const model = createOutageRetryWindowModel();
    model.registerTemporaryOutage({ reviewerId: 'r2', paperId: 'p2', now: new Date('2026-02-08T02:00:00.000Z') });

    const window = model.getWindow('r2', 'p2');
    expect(window.reviewerId).toBe('r2');

    model.clearWindow('r2', 'p2');
    expect(model.getWindow('r2', 'p2')).toBeNull();

    expect(() => model.getWindow('', 'p2')).toThrow(/reviewerId/);
    expect(() => model.clearWindow('r2', '')).toThrow(/paperId/);

    const fromString = model.registerTemporaryOutage({
      reviewerId: 'r3',
      paperId: 'p3',
      now: '2026-02-08T03:00:00.000Z'
    });
    expect(fromString.outcome).toBe('temporarily-unavailable');
  });

  it('uses default nowFn when now is omitted', () => {
    const model = createOutageRetryWindowModel();
    const response = model.registerTemporaryOutage({ reviewerId: 'r-default', paperId: 'p-default' });
    expect(response.outcome).toBe('temporarily-unavailable');
  });
});
