import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import {
  createPricingView,
  formatMinorAmount,
  renderPricingItemsMarkup
} from '../../src/views/pricing-view.js';
import { PRICING_OUTCOMES } from '../../src/models/pricing-model.js';

function createDocument() {
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

describe('pricing-view', () => {
  it('returns enhanced false when expected DOM nodes are missing', () => {
    const dom = new JSDOM('<main></main>');
    const view = createPricingView({ documentRef: dom.window.document });

    expect(view.enhanced).toBe(false);
    expect(() => view.renderLoading()).not.toThrow();
    expect(() => view.renderOutcome({ status: PRICING_OUTCOMES.MISSING, message: 'N/A' })).not.toThrow();
    expect(typeof view.bindRetry(() => {})).toBe('function');
  });

  it('formats currency amounts and falls back when formatter fails', () => {
    const formatted = formatMinorAmount(12345, 'CAD');
    expect(formatted).toContain('123');

    const fallback = formatMinorAmount(250, 'USD', {
      numberFormatFactory: () => {
        throw new Error('formatter unavailable');
      }
    });
    expect(fallback).toBe('USD 2.50');

    const invalidCurrencyFallback = formatMinorAmount(100, 'not-valid');
    expect(invalidCurrencyFallback).toContain('1');
  });

  it('renders pricing items including discount rows', () => {
    const markup = renderPricingItemsMarkup([
      {
        itemId: 'student',
        label: 'Student',
        amountMinor: 5000,
        discount: {
          label: 'Early bird',
          amountMinor: 1000
        }
      },
      {
        itemId: 'standard',
        label: 'Standard',
        amountMinor: 12000,
        discount: null
      }
    ], 'USD');

    expect(markup).toContain('data-pricing-item="student"');
    expect(markup).toContain('data-pricing-discount');
    expect(markup).toContain('data-pricing-item="standard"');
  });

  it('renders loading, displayed, missing, temporary-unavailable, and default states', () => {
    const documentRef = createDocument();
    const view = createPricingView({
      documentRef,
      numberFormatFactory: (_currency) => ({ format: (value) => `amount:${value.toFixed(2)}` })
    });

    view.renderLoading();
    expect(documentRef.querySelector('[data-pricing-root]').dataset.state).toBe('loading');
    expect(documentRef.querySelector('[data-pricing-message]').textContent).toBe('Loading pricing information.');

    view.renderOutcome({
      status: PRICING_OUTCOMES.DISPLAYED,
      currencyCode: 'USD',
      items: [
        {
          itemId: 'free',
          label: 'Community pass',
          amountMinor: 0,
          discount: {
            label: 'Included',
            amountMinor: 0
          }
        }
      ]
    });

    expect(documentRef.querySelector('[data-pricing-root]').dataset.state).toBe(PRICING_OUTCOMES.DISPLAYED);
    expect(documentRef.querySelector('[data-pricing-currency]').hidden).toBe(false);
    expect(documentRef.querySelector('[data-pricing-list]').textContent).toContain('amount:0.00');
    expect(documentRef.querySelector('[data-pricing-retry]').hidden).toBe(true);

    view.renderOutcome({
      status: PRICING_OUTCOMES.MISSING,
      message: 'Pricing is currently unavailable.'
    });
    expect(documentRef.querySelector('[data-pricing-root]').dataset.state).toBe(PRICING_OUTCOMES.MISSING);
    expect(documentRef.querySelector('[data-pricing-currency]').hidden).toBe(true);
    expect(documentRef.querySelector('[data-pricing-retry]').hidden).toBe(true);

    view.renderOutcome({
      status: PRICING_OUTCOMES.TEMPORARILY_UNAVAILABLE,
      message: 'Please try again soon.',
      retryAllowed: true
    });
    expect(documentRef.querySelector('[data-pricing-root]').dataset.state).toBe(PRICING_OUTCOMES.TEMPORARILY_UNAVAILABLE);
    expect(documentRef.querySelector('[data-pricing-message]').textContent).toBe('Please try again soon.');
    expect(documentRef.querySelector('[data-pricing-retry]').hidden).toBe(false);

    view.renderOutcome();
    expect(documentRef.querySelector('[data-pricing-root]').dataset.state).toBe(PRICING_OUTCOMES.MISSING);
    expect(documentRef.querySelector('[data-pricing-message]').textContent).toBe('Pricing is currently unavailable.');
  });

  it('binds and unbinds retry handlers and no-ops non-functions', () => {
    const documentRef = createDocument();
    const view = createPricingView({ documentRef });

    const noOpUnbind = view.bindRetry(null);
    expect(typeof noOpUnbind).toBe('function');

    const handler = vi.fn();
    const unbind = view.bindRetry(handler);
    const retryButton = documentRef.querySelector('[data-pricing-retry]');

    retryButton.click();
    expect(handler).toHaveBeenCalledTimes(1);

    unbind();
    retryButton.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
