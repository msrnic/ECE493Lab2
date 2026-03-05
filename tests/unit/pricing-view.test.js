/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import {
  createPricingView,
  formatCurrency,
  renderLoadingState,
  renderPricingOutcome
} from '../../src/views/pricing-view.js';
import { PRICING_OUTCOMES } from '../../src/models/pricing-model.js';

describe('pricing-view', () => {
  it('formats currency and renders loading state', () => {
    const root = document.createElement('section');
    const live = document.createElement('p');

    expect(formatCurrency(12345, 'CAD')).toContain('123.45');

    renderLoadingState(root, live);
    expect(root.querySelector('[data-pricing-status]').textContent).toContain('Loading conference pricing');
    expect(live.textContent).toContain('Loading conference pricing');

    renderLoadingState(null, live);
  });

  it('renders displayed pricing rows and escapes unsafe markup', () => {
    const root = document.createElement('section');
    const live = document.createElement('p');

    renderPricingOutcome(root, {
      status: PRICING_OUTCOMES.DISPLAYED,
      currencyCode: 'CAD',
      items: [
        {
          itemId: 'ITEM-1',
          label: '<Standard>',
          attendeeType: 'standard',
          amountMinor: 15000,
          displayOrder: 0,
          discount: {
            label: 'Early <bird>',
            amountMinor: 3000
          }
        },
        {
          itemId: 'ITEM-2',
          label: 'Student',
          attendeeType: 'student',
          amountMinor: 9000,
          displayOrder: 1,
          discount: null
        },
        {
          itemId: 'ITEM-3',
          label: 'Guest',
          attendeeType: 'other',
          amountMinor: 0,
          displayOrder: 2,
          discount: null
        }
      ]
    }, { liveRegion: live });

    expect(root.querySelector('[data-pricing-displayed]')).not.toBeNull();
    expect(root.querySelectorAll('[data-pricing-item]')).toHaveLength(3);
    expect(root.querySelector('[data-pricing-item-label]').innerHTML).toContain('&lt;Standard&gt;');
    expect(root.querySelectorAll('[data-pricing-discount]')).toHaveLength(1);
    expect(root.querySelectorAll('[data-pricing-item-amount]')[2].textContent).toContain('0.00');
    expect(live.textContent).toBe('Pricing details are available.');
  });

  it('renders missing and unavailable states and binds retry action', () => {
    const root = document.createElement('section');
    const live = document.createElement('p');
    const retryHandler = vi.fn();

    renderPricingOutcome(root, {
      status: PRICING_OUTCOMES.MISSING,
      message: 'Pricing missing right now.'
    }, { liveRegion: live });

    expect(root.querySelector('[data-pricing-missing]')).not.toBeNull();
    expect(root.querySelector('[data-pricing-info]').textContent).toContain('Pricing missing right now.');
    expect(live.textContent).toBe('Pricing missing right now.');

    renderPricingOutcome(root, {
      status: PRICING_OUTCOMES.UNAVAILABLE,
      message: 'Temporary outage.'
    }, {
      liveRegion: live,
      onRetry: retryHandler
    });

    const retryButton = root.querySelector('[data-pricing-retry]');
    expect(retryButton).not.toBeNull();
    retryButton.click();
    expect(retryHandler).toHaveBeenCalledOnce();
    expect(live.textContent).toBe('Temporary outage.');
  });

  it('creates mounted view wrappers with selectors and locale overrides', () => {
    document.body.innerHTML = `
      <p data-pricing-live-region></p>
      <section data-pricing-root></section>
    `;

    const view = createPricingView({ documentRef: document, locale: 'en-US' });
    expect(view.mounted).toBe(true);

    view.renderLoading();
    view.renderOutcome({
      status: PRICING_OUTCOMES.DISPLAYED,
      currencyCode: 'USD',
      items: [{
        itemId: 'ID',
        label: 'General',
        attendeeType: 'standard',
        amountMinor: 100,
        displayOrder: 0,
        discount: null
      }]
    });

    expect(document.querySelector('[data-pricing-currency]').textContent).toContain('USD');

    const unmounted = createPricingView({
      documentRef: { querySelector: () => null }
    });
    expect(unmounted.mounted).toBe(false);
    unmounted.renderLoading();
    unmounted.renderOutcome({ status: PRICING_OUTCOMES.MISSING, message: 'Missing' });
  });
});
