import { describe, expect, it, vi } from 'vitest';
import { PRICING_OUTCOMES, fetchPricingOutcome } from '../../src/models/pricing-model.js';

describe('pricing-model', () => {
  it('requires a fetch implementation', async () => {
    await expect(fetchPricingOutcome({ fetchImpl: null })).rejects.toThrow('fetchImpl must be provided');
  });

  it('maps network failures to temporarily unavailable outcome', async () => {
    const outcome = await fetchPricingOutcome({
      fetchImpl: vi.fn().mockRejectedValue(new Error('network down'))
    });

    expect(outcome).toEqual({
      status: PRICING_OUTCOMES.TEMPORARILY_UNAVAILABLE,
      message: 'Pricing is temporarily unavailable. Please try again.',
      retryAllowed: true
    });
  });

  it('normalizes configured pricing and filters incomplete items and discounts', async () => {
    const outcome = await fetchPricingOutcome({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: PRICING_OUTCOMES.DISPLAYED,
          currencyCode: 'cad',
          items: [
            null,
            {
              itemId: 'late',
              label: 'Late registration',
              attendeeType: 'standard',
              amountMinor: 19999,
              displayOrder: 5,
              discount: {
                label: 'Invalid discount',
                amountMinor: 30000
              }
            },
            {
              itemId: 'regular',
              label: 'Regular registration',
              attendeeType: 'other',
              amountMinor: 15000
            },
            {
              itemId: 'early',
              label: 'Early bird',
              attendeeType: 'student',
              amountMinor: 0,
              displayOrder: 1,
              discount: {
                label: 'Scholarship',
                amountMinor: 0
              }
            },
            {
              itemId: '', 
              label: 'Incomplete',
              attendeeType: 'other',
              amountMinor: 100,
              displayOrder: 2
            },
            {
              itemId: 'invalid-number',
              label: 'Invalid Number',
              attendeeType: 'other',
              amountMinor: -1,
              displayOrder: 3
            }
          ]
        })
      })
    });

    expect(outcome).toEqual({
      status: PRICING_OUTCOMES.DISPLAYED,
      currencyCode: 'CAD',
      items: [
        {
          itemId: 'regular',
          label: 'Regular registration',
          attendeeType: 'other',
          amountMinor: 15000,
          discount: null
        },
        {
          itemId: 'early',
          label: 'Early bird',
          attendeeType: 'student',
          amountMinor: 0,
          discount: {
            label: 'Scholarship',
            amountMinor: 0
          }
        },
        {
          itemId: 'late',
          label: 'Late registration',
          attendeeType: 'standard',
          amountMinor: 19999,
          discount: null
        }
      ]
    });
  });

  it('maps invalid displayed payloads to missing outcome when response is ok', async () => {
    const invalidCurrency = await fetchPricingOutcome({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: PRICING_OUTCOMES.DISPLAYED,
          currencyCode: 'invalid',
          items: []
        })
      })
    });

    expect(invalidCurrency).toEqual({
      status: PRICING_OUTCOMES.MISSING,
      message: 'Pricing is currently unavailable.'
    });

    const emptyItems = await fetchPricingOutcome({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: PRICING_OUTCOMES.DISPLAYED,
          currencyCode: 'USD',
          items: []
        })
      })
    });

    expect(emptyItems).toEqual({
      status: PRICING_OUTCOMES.MISSING,
      message: 'Pricing is currently unavailable.'
    });

    const missingCurrency = await fetchPricingOutcome({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: PRICING_OUTCOMES.DISPLAYED,
          items: []
        })
      })
    });

    expect(missingCurrency).toEqual({
      status: PRICING_OUTCOMES.MISSING,
      message: 'Pricing is currently unavailable.'
    });

    const nonArrayItems = await fetchPricingOutcome({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: PRICING_OUTCOMES.DISPLAYED,
          currencyCode: 'USD',
          items: null
        })
      })
    });

    expect(nonArrayItems).toEqual({
      status: PRICING_OUTCOMES.MISSING,
      message: 'Pricing is currently unavailable.'
    });
  });

  it('maps missing outcome with default message when payload message is absent', async () => {
    const outcome = await fetchPricingOutcome({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: PRICING_OUTCOMES.MISSING
        })
      })
    });

    expect(outcome).toEqual({
      status: PRICING_OUTCOMES.MISSING,
      message: 'Pricing is currently unavailable.'
    });
  });

  it('maps explicit temporary unavailability payload and json parse failures', async () => {
    const first = await fetchPricingOutcome({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          status: PRICING_OUTCOMES.TEMPORARILY_UNAVAILABLE,
          message: 'Service degraded.'
        })
      })
    });

    expect(first).toEqual({
      status: PRICING_OUTCOMES.TEMPORARILY_UNAVAILABLE,
      message: 'Service degraded.',
      retryAllowed: true
    });

    const second = await fetchPricingOutcome({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error('bad json');
        }
      })
    });

    expect(second).toEqual({
      status: PRICING_OUTCOMES.TEMPORARILY_UNAVAILABLE,
      message: 'Pricing is temporarily unavailable. Please try again.',
      retryAllowed: true
    });
  });

  it('maps non-ok non-503 responses to temporary unavailability', async () => {
    const outcome = await fetchPricingOutcome({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({})
      })
    });

    expect(outcome).toEqual({
      status: PRICING_OUTCOMES.TEMPORARILY_UNAVAILABLE,
      message: 'Pricing is temporarily unavailable. Please try again.',
      retryAllowed: true
    });
  });

  it('handles responses without json function', async () => {
    const outcome = await fetchPricingOutcome({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200
      })
    });

    expect(outcome).toEqual({
      status: PRICING_OUTCOMES.MISSING,
      message: 'Pricing is currently unavailable.'
    });
  });
});
