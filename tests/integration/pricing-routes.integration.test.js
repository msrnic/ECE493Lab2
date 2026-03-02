import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeApp } from './setup/httpHarness.js';

describe('pricing routes integration', () => {
  it('serves the public pricing page without authentication', async () => {
    const app = createApp();
    const response = await invokeApp(app, { path: '/pricing' });

    expect(response.status).toBe(200);
    expect(response.text).toContain('<title>Conference Pricing</title>');
    expect(response.text).toContain('data-pricing-root');
    expect(response.text).toContain('/assets/js/pricing-page.js');
  });

  it('returns missing-pricing outcome by default', async () => {
    const app = createApp();
    const response = await invokeApp(app, { path: '/api/public/pricing' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'pricing-missing',
      message: 'Pricing is currently unavailable.'
    });
  });

  it('returns configured pricing and filters invalid items/discounts', async () => {
    const app = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'pricing-displayed',
        currencyCode: 'usd',
        items: [
          {
            itemId: 'student',
            label: 'Student',
            attendeeType: 'student',
            amountMinor: 10000,
            discount: {
              label: 'Early bird',
              amountMinor: 1500
            }
          },
          {
            itemId: 'invalid-discount',
            label: 'Standard',
            attendeeType: 'standard',
            amountMinor: 20000,
            discount: {
              label: '',
              amountMinor: 200
            }
          },
          {
            itemId: '',
            label: 'Broken',
            attendeeType: 'other',
            amountMinor: 100
          }
        ]
      })
    });

    const response = await invokeApp(app, { path: '/api/public/pricing' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'pricing-displayed',
      currencyCode: 'USD',
      items: [
        {
          itemId: 'student',
          label: 'Student',
          attendeeType: 'student',
          amountMinor: 10000,
          discount: {
            label: 'Early bird',
            amountMinor: 1500
          }
        },
        {
          itemId: 'invalid-discount',
          label: 'Standard',
          attendeeType: 'standard',
          amountMinor: 20000
        }
      ]
    });
  });

  it('maps invalid configured pricing to missing-pricing outcome', async () => {
    const app = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'pricing-displayed',
        currencyCode: 'invalid',
        items: []
      })
    });

    const response = await invokeApp(app, { path: '/api/public/pricing' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'pricing-missing',
      message: 'Pricing is currently unavailable.'
    });
  });

  it('maps non-string currency configured pricing to missing-pricing outcome', async () => {
    const app = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'pricing-displayed',
        currencyCode: 123,
        items: [
          {
            itemId: 'std',
            label: 'Standard',
            attendeeType: 'standard',
            amountMinor: 10000
          }
        ]
      })
    });

    const response = await invokeApp(app, { path: '/api/public/pricing' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'pricing-missing',
      message: 'Pricing is currently unavailable.'
    });
  });

  it('maps non-array configured items to missing-pricing outcome', async () => {
    const app = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'pricing-displayed',
        currencyCode: 'USD',
        items: null
      })
    });

    const response = await invokeApp(app, { path: '/api/public/pricing' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'pricing-missing',
      message: 'Pricing is currently unavailable.'
    });
  });

  it('returns temporary failure and supports provider-thrown errors', async () => {
    const unavailableApp = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'pricing-temporarily-unavailable',
        message: 'Pricing service unavailable.'
      })
    });

    const unavailable = await invokeApp(unavailableApp, { path: '/api/public/pricing' });
    expect(unavailable.status).toBe(503);
    expect(unavailable.body).toEqual({
      status: 'pricing-temporarily-unavailable',
      message: 'Pricing service unavailable.',
      retryAllowed: true
    });

    const emptyMessageApp = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'pricing-temporarily-unavailable',
        message: ''
      })
    });
    const emptyMessageResponse = await invokeApp(emptyMessageApp, { path: '/api/public/pricing' });
    expect(emptyMessageResponse.status).toBe(503);
    expect(emptyMessageResponse.body).toEqual({
      status: 'pricing-temporarily-unavailable',
      message: 'Pricing is temporarily unavailable. Please try again.',
      retryAllowed: true
    });

    const thrownApp = createApp({
      pricingOutcomeProvider: async () => {
        throw new Error('database offline');
      }
    });

    const thrown = await invokeApp(thrownApp, { path: '/api/public/pricing' });
    expect(thrown.status).toBe(503);
    expect(thrown.body).toEqual({
      status: 'pricing-temporarily-unavailable',
      message: 'Pricing is temporarily unavailable. Please try again.',
      retryAllowed: true
    });
  });
});
