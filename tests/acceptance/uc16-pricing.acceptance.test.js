import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute } from '../helpers/http-harness.js';

describe('UC-16-AS view conference pricing acceptance', () => {
  it('shows configured pricing details for public users with no login requirement', async () => {
    const app = createApp({
      pricingOutcomeProvider: vi.fn().mockResolvedValue({
        status: 'pricing-displayed',
        currencyCode: 'USD',
        items: [
          {
            itemId: 'STANDARD',
            label: 'Standard Registration',
            attendeeType: 'standard',
            amountMinor: 20000,
            amountDisplay: '$200.00',
            displayOrder: 0,
            discount: {
              label: 'Early Bird Discount',
              amountMinor: 5000,
              amountDisplay: '$50.00'
            }
          },
          {
            itemId: 'STUDENT',
            label: 'Student Registration',
            attendeeType: 'student',
            amountMinor: 12000,
            amountDisplay: '$120.00',
            displayOrder: 1
          }
        ]
      })
    });

    const homePage = await invokeAppRoute(app, {
      method: 'get',
      path: '/'
    });
    expect(homePage.statusCode).toBe(200);
    expect(homePage.text).toContain('Conference Pricing');
    expect(homePage.text).toContain('data-pricing-root');
    expect(homePage.text).toContain('href="/payment-portal"');

    const paymentPortal = await invokeAppRoute(app, {
      method: 'get',
      path: '/payment-portal'
    });
    expect(paymentPortal.statusCode).toBe(302);
    expect(paymentPortal.redirectLocation).toBe('https://payments.conference.example.com/portal');

    const page = await invokeAppRoute(app, {
      method: 'get',
      path: '/pricing'
    });

    expect(page.statusCode).toBe(200);
    expect(page.text).toContain('<h1>Conference Pricing</h1>');

    const api = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/public/pricing'
    });

    expect(api.statusCode).toBe(200);
    expect(api.body.status).toBe('pricing-displayed');
    expect(api.body.currencyCode).toBe('USD');
    expect(api.body.items).toHaveLength(2);
    expect(api.body.items[0].discount.label).toBe('Early Bird Discount');
  });

  it('returns distinct outcomes for missing and temporary-unavailable pricing plus retry semantics', async () => {
    const rotatingOutcome = vi
      .fn()
      .mockResolvedValueOnce({
        status: 'pricing-missing',
        message: 'Pricing not published yet.'
      })
      .mockResolvedValueOnce({
        status: 'pricing-temporarily-unavailable',
        message: 'Please try again shortly.'
      })
      .mockResolvedValueOnce({
        status: 'pricing-displayed',
        currencyCode: 'CAD',
        items: [{
          itemId: 'GENERAL',
          label: 'General',
          attendeeType: 'standard',
          amountMinor: 15000,
          amountDisplay: '$150.00',
          displayOrder: 0
        }]
      });

    const app = createApp({
      pricingOutcomeProvider: rotatingOutcome
    });

    const missing = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/public/pricing'
    });
    expect(missing.statusCode).toBe(200);
    expect(missing.body.status).toBe('pricing-missing');

    const unavailable = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/public/pricing'
    });
    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.body.status).toBe('pricing-temporarily-unavailable');
    expect(unavailable.body.retryAllowed).toBe(true);

    const retried = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/public/pricing'
    });
    expect(retried.statusCode).toBe(200);
    expect(retried.body.status).toBe('pricing-displayed');

    expect(rotatingOutcome).toHaveBeenCalledTimes(3);
  });
});
