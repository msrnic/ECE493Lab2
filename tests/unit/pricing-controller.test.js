/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import { createPricingController } from '../../src/controllers/pricing-controller.js';
import { PRICING_OUTCOMES } from '../../src/models/pricing-model.js';

describe('pricing-controller', () => {
  it('returns not-mounted when the view root is unavailable', async () => {
    const controller = createPricingController({
      view: {
        mounted: false,
        renderLoading: vi.fn(),
        renderOutcome: vi.fn()
      }
    });

    const result = await controller.load();
    expect(controller.mounted).toBe(false);
    expect(result).toEqual({ mounted: false, rendered: false });
  });

  it('renders displayed outcomes and caps actions to outcome at two', async () => {
    const model = {
      fetchOutcome: vi
        .fn()
        .mockResolvedValueOnce({
          status: PRICING_OUTCOMES.DISPLAYED,
          currencyCode: 'CAD',
          items: [{
            itemId: 'ITEM-1',
            label: 'General',
            attendeeType: 'standard',
            amountMinor: 12000,
            displayOrder: 0,
            discount: null
          }]
        })
        .mockResolvedValueOnce({
          status: PRICING_OUTCOMES.DISPLAYED,
          currencyCode: 'CAD',
          items: [{
            itemId: 'ITEM-2',
            label: 'Student',
            attendeeType: 'student',
            amountMinor: 8000,
            displayOrder: 0,
            discount: null
          }]
        })
        .mockResolvedValueOnce({
          status: PRICING_OUTCOMES.DISPLAYED,
          currencyCode: 'CAD',
          items: [{
            itemId: 'ITEM-3',
            label: 'Late',
            attendeeType: 'other',
            amountMinor: 20000,
            displayOrder: 0,
            discount: null
          }]
        })
    };

    const view = {
      mounted: true,
      renderLoading: vi.fn(),
      renderOutcome: vi.fn()
    };

    const controller = createPricingController({ model, view });
    const first = await controller.load({ action: 'open-page' });
    const second = await controller.retry();
    const third = await controller.retry();

    expect(controller.mounted).toBe(true);
    expect(first.status).toBe(PRICING_OUTCOMES.DISPLAYED);
    expect(first.actionsToOutcome).toBe(1);
    expect(second.actionsToOutcome).toBe(2);
    expect(third.actionsToOutcome).toBe(2);
    expect(view.renderLoading).toHaveBeenCalledTimes(3);
    expect(view.renderOutcome).toHaveBeenCalledTimes(3);
    expect(view.renderOutcome.mock.calls[0][1]).toBeUndefined();
  });

  it('falls back to unavailable state for model errors and wires retry callback', async () => {
    const model = {
      fetchOutcome: vi
        .fn()
        .mockResolvedValueOnce({
          status: PRICING_OUTCOMES.UNAVAILABLE,
          message: 'Temporary issue.',
          retryAllowed: true
        })
        .mockRejectedValueOnce(new Error('crash'))
    };

    const view = {
      mounted: true,
      renderLoading: vi.fn(),
      renderOutcome: vi.fn()
    };

    const controller = createPricingController({ model, view });
    const unavailableResult = await controller.load();

    expect(unavailableResult.status).toBe(PRICING_OUTCOMES.UNAVAILABLE);
    expect(view.renderOutcome).toHaveBeenCalledTimes(1);

    const retryCallback = view.renderOutcome.mock.calls[0][1];
    expect(typeof retryCallback).toBe('function');

    retryCallback();
    await Promise.resolve();
    await Promise.resolve();

    expect(view.renderOutcome).toHaveBeenCalledTimes(2);
    expect(view.renderOutcome.mock.calls[1][0].status).toBe(PRICING_OUTCOMES.UNAVAILABLE);
    expect(view.renderOutcome.mock.calls[1][0].message).toContain('temporarily unavailable');
  });
});
