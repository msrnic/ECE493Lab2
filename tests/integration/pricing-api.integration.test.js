import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute } from '../helpers/http-harness.js';

describe('integration: pricing api', () => {
  it('serves pricing page shell and displayed pricing payload with filtered/sorted items', async () => {
    const app = createApp({
      pricingOutcomeProvider: vi.fn().mockResolvedValue({
        status: 'pricing-displayed',
        currencyCode: 'CAD',
        items: [
          {
            itemId: 'ITEM-B',
            label: 'Student',
            attendeeType: 'student',
            amountMinor: 9000,
            amountDisplay: '$90.00',
            displayOrder: 2
          },
          {
            itemId: '',
            label: 'Invalid',
            attendeeType: 'student',
            amountMinor: 9000,
            amountDisplay: '$90.00',
            displayOrder: 1
          },
          {
            itemId: 'ITEM-A',
            label: 'General',
            attendeeType: 'standard',
            amountMinor: 15000,
            amountDisplay: '$150.00',
            displayOrder: 1,
            discount: {
              label: 'Early Bird',
              amountMinor: 2000,
              amountDisplay: '$20.00'
            }
          },
          {
            itemId: 'ITEM-C',
            label: 'Late Registration',
            attendeeType: 'other',
            amountMinor: 21000,
            discount: {
              label: 'Promo',
              amountMinor: 1000
            }
          }
        ]
      })
    });

    const page = await invokeAppRoute(app, {
      method: 'get',
      path: '/pricing'
    });

    expect(page.statusCode).toBe(200);
    expect(page.text).toContain('data-pricing-root');
    expect(page.text).toContain('/assets/js/pricing-page.js');

    const api = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/public/pricing'
    });

    expect(api.statusCode).toBe(200);
    expect(api.body.status).toBe('pricing-displayed');
    expect(api.body.items).toHaveLength(3);
    expect(api.body.items[0].itemId).toBe('ITEM-A');
    expect(api.body.items[0].discount.label).toBe('Early Bird');
    expect(api.body.items[2].itemId).toBe('ITEM-C');
    expect(api.body.items[2].amountDisplay).toBe('');
    expect(api.body.items[2].discount.amountDisplay).toBe('');
  });

  it('maps malformed/missing pricing to missing and provider failures to unavailable', async () => {
    const malformedApp = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'pricing-displayed',
        currencyCode: 'BAD',
        items: []
      })
    });

    const missingResponse = await invokeAppRoute(malformedApp, {
      method: 'get',
      path: '/api/public/pricing'
    });

    expect(missingResponse.statusCode).toBe(200);
    expect(missingResponse.body.status).toBe('pricing-missing');

    const explicitMissingApp = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'pricing-missing',
        message: '  No pricing configured  '
      })
    });

    const explicitMissing = await invokeAppRoute(explicitMissingApp, {
      method: 'get',
      path: '/api/public/pricing'
    });

    expect(explicitMissing.statusCode).toBe(200);
    expect(explicitMissing.body.message).toBe('No pricing configured');

    const unavailableApp = createApp({
      pricingOutcomeProvider: async () => {
        throw new Error('temporary outage');
      }
    });

    const unavailable = await invokeAppRoute(unavailableApp, {
      method: 'get',
      path: '/api/public/pricing'
    });

    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.body.status).toBe('pricing-temporarily-unavailable');
    expect(unavailable.body.retryAllowed).toBe(true);
  });

  it('uses default provider fallback and maps unknown statuses to missing', async () => {
    const defaultApp = createApp();
    const defaultResponse = await invokeAppRoute(defaultApp, {
      method: 'get',
      path: '/api/public/pricing'
    });
    expect(defaultResponse.statusCode).toBe(200);
    expect(defaultResponse.body.status).toBe('pricing-missing');

    const unknownStatusApp = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'unexpected-state',
        currencyCode: 'CAD',
        items: []
      })
    });

    const unknownStatus = await invokeAppRoute(unknownStatusApp, {
      method: 'get',
      path: '/api/public/pricing'
    });
    expect(unknownStatus.statusCode).toBe(200);
    expect(unknownStatus.body.status).toBe('pricing-missing');
  });

  it('normalizes explicit unavailable responses from provider', async () => {
    const app = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'pricing-temporarily-unavailable',
        message: '  Retry soon  '
      })
    });

    const response = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/public/pricing'
    });

    expect(response.statusCode).toBe(503);
    expect(response.body.message).toBe('Retry soon');
    expect(response.body.retryAllowed).toBe(true);
  });

  it('uses fallback messages when provider returns empty messages or invalid payload', async () => {
    const emptyUnavailableMessageApp = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'pricing-temporarily-unavailable',
        message: '   '
      })
    });
    const unavailable = await invokeAppRoute(emptyUnavailableMessageApp, {
      method: 'get',
      path: '/api/public/pricing'
    });
    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.body.message).toBe('Pricing is temporarily unavailable. Please try again.');

    const emptyMissingMessageApp = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'pricing-missing',
        message: '   '
      })
    });
    const missing = await invokeAppRoute(emptyMissingMessageApp, {
      method: 'get',
      path: '/api/public/pricing'
    });
    expect(missing.statusCode).toBe(200);
    expect(missing.body.message).toBe('Pricing information is not available yet.');

    const invalidPayloadApp = createApp({
      pricingOutcomeProvider: async () => null
    });
    const invalidPayload = await invokeAppRoute(invalidPayloadApp, {
      method: 'get',
      path: '/api/public/pricing'
    });
    expect(invalidPayload.statusCode).toBe(200);
    expect(invalidPayload.body.status).toBe('pricing-missing');

    const nonArrayItemsApp = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'pricing-displayed',
        currencyCode: 'CAD',
        items: null
      })
    });
    const nonArrayItems = await invokeAppRoute(nonArrayItemsApp, {
      method: 'get',
      path: '/api/public/pricing'
    });
    expect(nonArrayItems.statusCode).toBe(200);
    expect(nonArrayItems.body.status).toBe('pricing-missing');

    const missingCurrencyApp = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'pricing-displayed',
        items: []
      })
    });
    const missingCurrency = await invokeAppRoute(missingCurrencyApp, {
      method: 'get',
      path: '/api/public/pricing'
    });
    expect(missingCurrency.statusCode).toBe(200);
    expect(missingCurrency.body.status).toBe('pricing-missing');
  });
});
