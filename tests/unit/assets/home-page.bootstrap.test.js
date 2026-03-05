/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import { bootstrapHomePage } from '../../../src/assets/js/home-page.js';

describe('home-page bootstrap', () => {
  it('renders schedule preview from launch payload factory', async () => {
    document.body.innerHTML = '<section data-final-schedule-root></section>';
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

    const result = await bootstrapHomePage({
      documentRef: document,
      payloadFactory
    });

    expect(payloadFactory).toHaveBeenCalledTimes(1);
    expect(result.enhanced).toBe(true);
    expect(result.status).toBe('published');
    expect(document.querySelectorAll('[data-final-schedule-session]')).toHaveLength(1);
  });

  it('returns not enhanced when schedule root is missing', async () => {
    document.body.innerHTML = '<main></main>';

    const result = await bootstrapHomePage({
      documentRef: document
    });

    expect(result).toEqual({
      enhanced: false,
      rendered: false
    });
  });
});
