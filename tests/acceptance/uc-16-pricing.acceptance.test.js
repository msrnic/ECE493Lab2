import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { bootstrapPricingPage } from '../../src/assets/js/pricing-page.js';
import { invokeApp } from '../integration/setup/httpHarness.js';

function createPricingDocument() {
  const dom = new JSDOM(`
    <main data-pricing-root data-state="loading">
      <p data-pricing-live></p>
      <p data-pricing-message></p>
      <p data-pricing-currency hidden></p>
      <ul data-pricing-list></ul>
      <button type="button" data-pricing-retry hidden>Try Again</button>
    </main>
  `);

  return dom.window.document;
}

function createFetchHarness(app, counters = { calls: 0 }) {
  return async (url, options = {}) => {
    counters.calls += 1;
    const response = await invokeApp(app, {
      method: options.method ?? 'GET',
      path: url,
      headers: options.headers ?? {}
    });

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.body
    };
  };
}

describe('UC-16-AS acceptance suite', () => {
  it('Given pricing is configured When pricing page is viewed Then pricing information is displayed', async () => {
    const app = createApp({
      pricingOutcomeProvider: async () => ({
        status: 'pricing-displayed',
        currencyCode: 'USD',
        items: [
          {
            itemId: 'standard',
            label: 'Standard Pass',
            attendeeType: 'standard',
            amountMinor: 25000,
            discount: {
              label: 'Early bird',
              amountMinor: 5000
            }
          }
        ]
      })
    });

    const pricingPage = await invokeApp(app, { path: '/pricing' });
    expect(pricingPage.status).toBe(200);
    expect(pricingPage.text).toContain('data-pricing-root');

    const documentRef = createPricingDocument();
    await bootstrapPricingPage({
      documentRef,
      fetchImpl: createFetchHarness(app)
    });

    expect(documentRef.querySelector('[data-pricing-root]').dataset.state).toBe('pricing-displayed');
    expect(documentRef.querySelector('[data-pricing-list]').textContent).toContain('Standard Pass');
    expect(documentRef.querySelector('[data-pricing-list]').textContent).toContain('Early bird');
  });

  it('Given pricing is missing When accessed Then an informational message is shown', async () => {
    const app = createApp();

    const pricingPage = await invokeApp(app, { path: '/pricing' });
    expect(pricingPage.status).toBe(200);

    const documentRef = createPricingDocument();
    await bootstrapPricingPage({
      documentRef,
      fetchImpl: createFetchHarness(app)
    });

    expect(documentRef.querySelector('[data-pricing-root]').dataset.state).toBe('pricing-missing');
    expect(documentRef.querySelector('[data-pricing-message]').textContent).toBe('Pricing is currently unavailable.');
    expect(documentRef.querySelector('[data-pricing-retry]').hidden).toBe(true);
  });

  it('Given pricing retrieval is temporarily unavailable When Try Again is clicked Then one manual retry re-requests pricing', async () => {
    let attempts = 0;
    const app = createApp({
      pricingOutcomeProvider: async () => {
        attempts += 1;
        if (attempts === 1) {
          return {
            status: 'pricing-temporarily-unavailable',
            message: 'Please try again soon.'
          };
        }

        return {
          status: 'pricing-displayed',
          currencyCode: 'CAD',
          items: [
            {
              itemId: 'student',
              label: 'Student Pass',
              attendeeType: 'student',
              amountMinor: 10000
            }
          ]
        };
      }
    });

    const counters = { calls: 0 };
    const documentRef = createPricingDocument();
    await bootstrapPricingPage({
      documentRef,
      fetchImpl: createFetchHarness(app, counters)
    });

    expect(documentRef.querySelector('[data-pricing-root]').dataset.state).toBe('pricing-temporarily-unavailable');
    expect(counters.calls).toBe(1);

    documentRef.querySelector('[data-pricing-retry]').click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(counters.calls).toBe(2);
    expect(documentRef.querySelector('[data-pricing-root]').dataset.state).toBe('pricing-displayed');
    expect(documentRef.querySelector('[data-pricing-list]').textContent).toContain('Student Pass');
  });
});
