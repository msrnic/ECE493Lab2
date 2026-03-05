import { describe, expect, it, vi } from 'vitest';
import {
  createPricingModel,
  normalizePricingPayload,
  PRICING_OUTCOMES
} from '../../src/models/pricing-model.js';

function makeResponse({ ok = true, status = 200, payload, throws = false } = {}) {
  return {
    ok,
    status,
    async json() {
      if (throws) {
        throw new Error('bad-json');
      }
      return payload;
    }
  };
}

describe('pricing-model', () => {
  it('normalizes displayed payloads, filters incomplete rows, and sorts by display order', () => {
    const outcome = normalizePricingPayload({
      status: PRICING_OUTCOMES.DISPLAYED,
      currencyCode: 'CAD',
      items: [
        {
          itemId: 'B',
          label: 'Student',
          attendeeType: 'student',
          amountMinor: 12000,
          displayOrder: 2,
          discount: {
            label: 'Early',
            amountMinor: 2000
          }
        },
        {
          itemId: 'A',
          label: 'Standard',
          attendeeType: 'standard',
          amountMinor: 18000,
          displayOrder: 1,
          discount: {
            label: 'Invalid',
            amountMinor: 999999
          }
        },
        {
          itemId: '',
          label: 'Incomplete',
          attendeeType: 'other',
          amountMinor: 100,
          displayOrder: 5
        }
      ]
    });

    expect(outcome.status).toBe(PRICING_OUTCOMES.DISPLAYED);
    expect(outcome.items).toHaveLength(2);
    expect(outcome.items[0].itemId).toBe('A');
    expect(outcome.items[0].discount).toBeNull();
    expect(outcome.items[1].discount?.label).toBe('Early');

    const invalidDiscountLabel = normalizePricingPayload({
      status: PRICING_OUTCOMES.DISPLAYED,
      currencyCode: 'CAD',
      items: [{
        itemId: 'C',
        label: 'Other',
        attendeeType: 'other',
        amountMinor: 5000,
        displayOrder: 0,
        discount: {
          label: '   ',
          amountMinor: 500
        }
      }]
    });
    expect(invalidDiscountLabel.items[0].discount).toBeNull();
  });

  it('maps invalid/unsupported payloads to missing outcome', () => {
    expect(normalizePricingPayload(null).status).toBe(PRICING_OUTCOMES.MISSING);
    expect(normalizePricingPayload({ status: 'unknown' }).status).toBe(PRICING_OUTCOMES.MISSING);
    expect(normalizePricingPayload({
      status: PRICING_OUTCOMES.DISPLAYED,
      currencyCode: 'CADD',
      items: []
    }).status).toBe(PRICING_OUTCOMES.MISSING);
    expect(normalizePricingPayload({
      status: PRICING_OUTCOMES.DISPLAYED,
      currencyCode: 'CAD',
      items: {}
    }).status).toBe(PRICING_OUTCOMES.MISSING);
    expect(normalizePricingPayload({
      status: PRICING_OUTCOMES.DISPLAYED,
      currencyCode: 'CAD',
      items: [{
        itemId: 'X',
        label: 'Bad',
        attendeeType: 'unknown',
        amountMinor: 100,
        displayOrder: 0
      }]
    }).status).toBe(PRICING_OUTCOMES.MISSING);
    expect(normalizePricingPayload({
      status: PRICING_OUTCOMES.DISPLAYED,
      currencyCode: 'CAD',
      items: [null]
    }).status).toBe(PRICING_OUTCOMES.MISSING);
    expect(normalizePricingPayload({
      status: PRICING_OUTCOMES.DISPLAYED,
      currencyCode: 'CAD',
      items: [{
        itemId: 'X',
        label: 'Negative',
        attendeeType: 'standard',
        amountMinor: -1,
        displayOrder: 0
      }]
    }).status).toBe(PRICING_OUTCOMES.MISSING);
    expect(normalizePricingPayload({
      status: PRICING_OUTCOMES.DISPLAYED,
      currencyCode: 'CAD',
      items: [{
        itemId: 'X',
        label: 'Invalid order',
        attendeeType: 'standard',
        amountMinor: 100,
        displayOrder: -1
      }]
    }).status).toBe(PRICING_OUTCOMES.MISSING);
  });

  it('maps missing and temporary-unavailable statuses with fallback messages', () => {
    const missing = normalizePricingPayload({
      status: PRICING_OUTCOMES.MISSING,
      message: '  Missing pricing  '
    });
    expect(missing.status).toBe(PRICING_OUTCOMES.MISSING);
    expect(missing.message).toBe('Missing pricing');

    const unavailableFromPayload = normalizePricingPayload({
      status: PRICING_OUTCOMES.UNAVAILABLE,
      message: '  Retry later  '
    });
    expect(unavailableFromPayload.status).toBe(PRICING_OUTCOMES.UNAVAILABLE);
    expect(unavailableFromPayload.message).toBe('Retry later');

    const unavailableFrom503 = normalizePricingPayload({}, { httpStatus: 503 });
    expect(unavailableFrom503.status).toBe(PRICING_OUTCOMES.UNAVAILABLE);
    expect(unavailableFrom503.retryAllowed).toBe(true);
  });

  it('fetches pricing outcomes and maps http/network branches', async () => {
    const fetchOk = vi.fn().mockResolvedValue(makeResponse({
      ok: true,
      status: 200,
      payload: {
        status: PRICING_OUTCOMES.DISPLAYED,
        currencyCode: 'USD',
        items: [{
          itemId: 'ITEM-1',
          label: 'General',
          attendeeType: 'standard',
          amountMinor: 10000,
          displayOrder: 0
        }]
      }
    }));

    const model = createPricingModel({
      fetchImpl: fetchOk,
      endpoint: '/api/public/pricing'
    });

    const okOutcome = await model.fetchOutcome();
    expect(model.endpoint).toBe('/api/public/pricing');
    expect(fetchOk).toHaveBeenCalledOnce();
    expect(okOutcome.status).toBe(PRICING_OUTCOMES.DISPLAYED);

    const unavailableModel = createPricingModel({
      fetchImpl: vi.fn().mockRejectedValue(new Error('down'))
    });
    const networkOutcome = await unavailableModel.fetchOutcome();
    expect(networkOutcome.status).toBe(PRICING_OUTCOMES.UNAVAILABLE);

    const nonOkModel = createPricingModel({
      fetchImpl: vi.fn().mockResolvedValue(makeResponse({
        ok: false,
        status: 500,
        payload: { message: 'Server down' }
      }))
    });
    const nonOkOutcome = await nonOkModel.fetchOutcome();
    expect(nonOkOutcome.status).toBe(PRICING_OUTCOMES.UNAVAILABLE);
    expect(nonOkOutcome.message).toBe('Server down');

    const unavailable503Model = createPricingModel({
      fetchImpl: vi.fn().mockResolvedValue(makeResponse({
        ok: false,
        status: 503,
        payload: { message: 'Try again' }
      }))
    });
    const unavailable503 = await unavailable503Model.fetchOutcome();
    expect(unavailable503.status).toBe(PRICING_OUTCOMES.UNAVAILABLE);
    expect(unavailable503.message).toBe('Try again');

    const malformedJsonModel = createPricingModel({
      fetchImpl: vi.fn().mockResolvedValue(makeResponse({
        ok: false,
        status: 500,
        throws: true
      }))
    });
    const malformedOutcome = await malformedJsonModel.fetchOutcome();
    expect(malformedOutcome.status).toBe(PRICING_OUTCOMES.UNAVAILABLE);
  });

  it('requires a fetch implementation function', () => {
    expect(() => createPricingModel({ fetchImpl: null })).toThrow('fetchImpl must be a function.');
  });
});
