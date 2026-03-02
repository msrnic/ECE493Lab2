import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import {
  bootstrapPricingPage,
  registerPricingPageOnLoad
} from '../../../src/assets/js/pricing-page.js';

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

describe('pricing-page bootstrap', () => {
  it('returns enhanced false when pricing mount is missing', async () => {
    const dom = new JSDOM('<main></main>');
    const fetchImpl = vi.fn();

    const result = await bootstrapPricingPage({
      documentRef: dom.window.document,
      fetchImpl
    });

    expect(result).toEqual({ enhanced: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('boots the page and performs initial pricing fetch', async () => {
    const documentRef = createPricingDocument();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'pricing-displayed',
        currencyCode: 'USD',
        items: [
          {
            itemId: 'std',
            label: 'Standard',
            attendeeType: 'standard',
            amountMinor: 25000,
            displayOrder: 0
          }
        ]
      })
    });

    const result = await bootstrapPricingPage({ documentRef, fetchImpl });

    expect(result.enhanced).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith('/api/public/pricing', {
      method: 'GET',
      headers: {
        accept: 'application/json'
      }
    });
    expect(documentRef.querySelector('[data-pricing-root]').dataset.state).toBe('pricing-displayed');
  });
});

describe('registerPricingPageOnLoad', () => {
  it('returns without action when document or bootstrap function is invalid', () => {
    expect(() => registerPricingPageOnLoad({ documentRef: null })).not.toThrow();
    expect(() => registerPricingPageOnLoad({ documentRef: { readyState: 'complete' }, bootstrapFn: null })).not.toThrow();
  });

  it('registers DOMContentLoaded when document is still loading', () => {
    const bootstrapFn = vi.fn().mockResolvedValue({ enhanced: true });
    const recorded = { callback: null, options: null };

    const documentRef = {
      readyState: 'loading'
    };

    const windowRef = {
      addEventListener: vi.fn((event, callback, options) => {
        expect(event).toBe('DOMContentLoaded');
        recorded.callback = callback;
        recorded.options = options;
      })
    };

    registerPricingPageOnLoad({ documentRef, windowRef, fetchImpl: vi.fn(), bootstrapFn });

    expect(windowRef.addEventListener).toHaveBeenCalledTimes(1);
    expect(recorded.options).toEqual({ once: true });

    recorded.callback();
    expect(bootstrapFn).toHaveBeenCalledWith({
      documentRef,
      fetchImpl: expect.any(Function)
    });
  });

  it('runs bootstrap immediately when document is ready', () => {
    const bootstrapFn = vi.fn().mockResolvedValue({ enhanced: true });
    const fetchImpl = vi.fn();
    const documentRef = {
      readyState: 'complete'
    };

    registerPricingPageOnLoad({ documentRef, fetchImpl, bootstrapFn });

    expect(bootstrapFn).toHaveBeenCalledWith({ documentRef, fetchImpl });
  });
});
