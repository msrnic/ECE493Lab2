/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import { bootstrapFinalSchedulePage } from '../../../src/assets/js/final-schedule-page.js';

describe('final-schedule page bootstrap', () => {
  it('returns not enhanced when root is missing', async () => {
    document.body.innerHTML = '<main></main>';

    const result = await bootstrapFinalSchedulePage({
      documentRef: document
    });

    expect(result).toEqual({
      enhanced: false,
      rendered: false
    });
  });

  it('enhances and renders when root exists', async () => {
    document.body.innerHTML = '<section data-final-schedule-root></section>';
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'unpublished',
        generatedAt: '2026-06-01T10:00:00.000Z',
        viewerContext: {
          isAuthenticated: false,
          viewerRole: 'anonymous',
          authorId: null
        },
        notice: {
          code: 'SCHEDULE_UNPUBLISHED',
          message: 'The final conference schedule has not been published yet.'
        }
      })
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchImpl;

    try {
      const result = await bootstrapFinalSchedulePage({
        documentRef: document
      });

      expect(result.enhanced).toBe(true);
      expect(result.rendered).toBe(true);
      expect(result.status).toBe('unpublished');
      expect(document.querySelector('[data-final-schedule-notice]')).not.toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('uses injected api client when provided', async () => {
    document.body.innerHTML = '<section data-final-schedule-root></section>';
    const apiClient = vi.fn().mockResolvedValue({
      status: 'published',
      conferenceTimeZone: 'America/Toronto',
      generatedAt: '2026-06-01T10:00:00.000Z',
      viewerContext: {
        isAuthenticated: false,
        viewerRole: 'anonymous',
        authorId: null
      },
      sessions: [{
        sessionId: 'MOCK-1',
        title: 'Mock',
        startTimeUtc: '2026-06-01T14:00:00.000Z',
        endTimeUtc: '2026-06-01T14:30:00.000Z',
        room: 'Room A',
        authorIds: []
      }]
    });

    const result = await bootstrapFinalSchedulePage({
      documentRef: document,
      apiClient
    });

    expect(apiClient).toHaveBeenCalledTimes(1);
    expect(result.enhanced).toBe(true);
    expect(result.status).toBe('published');
    expect(document.querySelectorAll('[data-final-schedule-session]')).toHaveLength(1);
  });
});
