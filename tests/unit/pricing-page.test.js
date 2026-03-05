/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import { bootstrapPricingPage } from '../../src/assets/js/pricing-page.js';

describe('pricing-page bootstrap', () => {
  it('returns not-enhanced when pricing root is absent', async () => {
    document.body.innerHTML = '<main></main>';

    const result = await bootstrapPricingPage({ documentRef: document });
    expect(result).toEqual({ enhanced: false, rendered: false });
  });

  it('loads pricing page when root exists', async () => {
    document.body.innerHTML = `
      <p data-pricing-live-region aria-live="polite"></p>
      <section data-pricing-root></section>
    `;

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          status: 'pricing-displayed',
          currencyCode: 'CAD',
          items: [{
            itemId: 'ITEM-1',
            label: 'General',
            attendeeType: 'standard',
            amountMinor: 10000,
            displayOrder: 0
          }]
        };
      }
    });

    const result = await bootstrapPricingPage({ documentRef: document });

    expect(result.enhanced).toBe(true);
    expect(result.rendered).toBe(true);
    expect(result.status).toBe('pricing-displayed');
    expect(document.querySelectorAll('[data-pricing-item]')).toHaveLength(1);
  });
});
