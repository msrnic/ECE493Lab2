import { describe, expect, it, vi } from 'vitest';
import { createOutageRetryController } from '../../../src/controllers/outage-retry.controller.js';

describe('outage-retry.controller', () => {
  it('delegates outage evaluation and clear operations', () => {
    const model = {
      registerTemporaryOutage: vi.fn(() => ({ outcome: 'temporarily-unavailable', reasonCode: 'TEMPORARY_OUTAGE' })),
      clearWindow: vi.fn()
    };

    const controller = createOutageRetryController({ outageRetryWindowModel: model });

    expect(controller.evaluateOutage({ reviewerId: 'reviewer-1', paperId: 'paper-1' }).outcome).toBe('temporarily-unavailable');
    expect(model.registerTemporaryOutage).toHaveBeenCalledTimes(1);

    controller.clearOutageWindow({ reviewerId: 'reviewer-1', paperId: 'paper-1' });
    expect(model.clearWindow).toHaveBeenCalledWith('reviewer-1', 'paper-1');
  });
});
