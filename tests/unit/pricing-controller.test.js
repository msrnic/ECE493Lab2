import { describe, expect, it, vi } from 'vitest';
import { createPricingController } from '../../src/controllers/pricing-controller.js';
import { PRICING_OUTCOMES } from '../../src/models/pricing-model.js';

function createViewMock(overrides = {}) {
  return {
    renderLoading: vi.fn(),
    renderOutcome: vi.fn(),
    bindRetry: vi.fn(() => () => {}),
    ...overrides
  };
}

describe('pricing-controller', () => {
  it('validates required dependencies', () => {
    expect(() => createPricingController({ view: null })).toThrow('view with renderLoading and renderOutcome is required');

    expect(() => createPricingController({
      view: createViewMock(),
      fetchOutcome: null
    })).toThrow('fetchOutcome must be provided');
  });

  it('loads pricing and renders successful outcomes', async () => {
    const view = createViewMock();
    const fetchOutcome = vi.fn().mockResolvedValue({
      status: PRICING_OUTCOMES.DISPLAYED,
      currencyCode: 'USD',
      items: []
    });

    const controller = createPricingController({ view, fetchOutcome });
    const result = await controller.initialize();

    expect(fetchOutcome).toHaveBeenCalledTimes(1);
    expect(view.renderLoading).toHaveBeenCalledTimes(1);
    expect(view.renderOutcome).toHaveBeenCalledWith({
      status: PRICING_OUTCOMES.DISPLAYED,
      currencyCode: 'USD',
      items: []
    });
    expect(result.status).toBe(PRICING_OUTCOMES.DISPLAYED);
  });

  it('maps fetch errors to temporary-unavailable fallback outcome', async () => {
    const view = createViewMock();
    const fetchOutcome = vi.fn().mockRejectedValue(new Error('backend down'));

    const controller = createPricingController({ view, fetchOutcome });
    const result = await controller.initialize();

    expect(result).toEqual({
      status: PRICING_OUTCOMES.TEMPORARILY_UNAVAILABLE,
      message: 'Pricing is temporarily unavailable. Please try again.',
      retryAllowed: true
    });
    expect(view.renderOutcome).toHaveBeenCalledWith(result);

    const syncThrowController = createPricingController({
      view: createViewMock(),
      fetchOutcome: vi.fn(() => {
        throw new Error('sync failure');
      })
    });

    const syncResult = await syncThrowController.initialize();
    expect(syncResult).toEqual({
      status: PRICING_OUTCOMES.TEMPORARILY_UNAVAILABLE,
      message: 'Pricing is temporarily unavailable. Please try again.',
      retryAllowed: true
    });
  });

  it('de-duplicates concurrent loads', async () => {
    const view = createViewMock();
    let resolveFetch;
    const fetchOutcome = vi.fn().mockImplementation(() => new Promise((resolve) => {
      resolveFetch = resolve;
    }));

    const controller = createPricingController({ view, fetchOutcome });
    const first = controller.initialize();
    const second = controller.retry();

    expect(fetchOutcome).toHaveBeenCalledTimes(1);

    resolveFetch({ status: PRICING_OUTCOMES.MISSING, message: 'N/A' });
    await expect(first).resolves.toEqual({ status: PRICING_OUTCOMES.MISSING, message: 'N/A' });
    await expect(second).resolves.toEqual({ status: PRICING_OUTCOMES.MISSING, message: 'N/A' });

    const third = controller.retry();
    resolveFetch({ status: PRICING_OUTCOMES.MISSING, message: 'N/A' });
    await third;
    expect(fetchOutcome).toHaveBeenCalledTimes(2);
  });

  it('binds retry handler when available and unbinds on destroy', () => {
    const unbind = vi.fn();
    const view = createViewMock({
      bindRetry: vi.fn((retryHandler) => {
        retryHandler();
        return unbind;
      })
    });
    const fetchOutcome = vi.fn().mockResolvedValue({
      status: PRICING_OUTCOMES.MISSING,
      message: 'N/A'
    });

    const controller = createPricingController({ view, fetchOutcome });
    expect(view.bindRetry).toHaveBeenCalledTimes(1);
    expect(fetchOutcome).toHaveBeenCalledTimes(1);

    controller.destroy();
    expect(unbind).toHaveBeenCalledTimes(1);
  });

  it('supports views without bindRetry', async () => {
    const view = createViewMock({ bindRetry: undefined });
    const fetchOutcome = vi.fn().mockResolvedValue({
      status: PRICING_OUTCOMES.MISSING,
      message: 'N/A'
    });

    const controller = createPricingController({ view, fetchOutcome });
    await controller.initialize();
    expect(fetchOutcome).toHaveBeenCalledTimes(1);

    expect(() => controller.destroy()).not.toThrow();
  });
});
