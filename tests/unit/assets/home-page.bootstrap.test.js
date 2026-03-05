/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import { bootstrapHomePage } from '../../../src/assets/js/home-page.js';

describe('home-page bootstrap', () => {
  it('renders schedule and pricing previews when both roots are present', async () => {
    document.body.innerHTML = `
      <section data-final-schedule-root></section>
      <p data-pricing-live-region aria-live="polite"></p>
      <section data-pricing-root></section>
    `;
    const payloadFactory = vi.fn().mockReturnValue({
      status: 'published',
      conferenceTimeZone: 'America/Toronto',
      generatedAt: '2026-06-01T10:00:00.000Z',
      viewerContext: {
        isAuthenticated: false,
        viewerRole: 'anonymous',
        authorId: null
      },
      sessions: [{
        sessionId: 'MOCK-200',
        title: 'Launch Mock',
        startTimeUtc: '2026-06-01T14:00:00.000Z',
        endTimeUtc: '2026-06-01T14:30:00.000Z',
        room: 'Room A',
        authorIds: []
      }]
    });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      async json() {
        return {
          status: 'pricing-displayed',
          currencyCode: 'CAD',
          items: [{
            itemId: 'PRICE-1',
            label: 'General',
            attendeeType: 'standard',
            amountMinor: 10000,
            displayOrder: 0
          }]
        };
      }
    });

    const result = await bootstrapHomePage({
      documentRef: document,
      payloadFactory
    });

    expect(payloadFactory).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(result.enhanced).toBe(true);
    expect(result.schedulePreview.status).toBe('published');
    expect(result.pricingPreview.status).toBe('pricing-displayed');
    expect(document.querySelectorAll('[data-final-schedule-session]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-pricing-item]')).toHaveLength(1);
  });

  it('returns not enhanced when both schedule and pricing roots are missing', async () => {
    document.body.innerHTML = '<main></main>';
    globalThis.fetch = vi.fn();

    const result = await bootstrapHomePage({
      documentRef: document
    });

    expect(result).toEqual({
      enhanced: false,
      rendered: false,
      schedulePreview: {
        enhanced: false,
        rendered: false
      },
      pricingPreview: {
        enhanced: false,
        rendered: false
      }
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('is enhanced when only pricing root exists', async () => {
    document.body.innerHTML = `
      <p data-pricing-live-region aria-live="polite"></p>
      <section data-pricing-root></section>
    `;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      async json() {
        return {
          status: 'pricing-missing',
          message: 'Pricing not available yet.'
        };
      }
    });

    const result = await bootstrapHomePage({
      documentRef: document
    });

    expect(result.enhanced).toBe(true);
    expect(result.rendered).toBe(true);
    expect(result.schedulePreview.enhanced).toBe(false);
    expect(result.pricingPreview.status).toBe('pricing-missing');
    expect(document.querySelector('[data-pricing-missing]')).not.toBeNull();
  });
});
