import { describe, expect, it } from 'vitest';

import { invokeApp, requestAs } from '../setup/httpHarness.js';
import { createTestServer } from '../setup/testServer.js';

describe('SC-011 in-progress rejection latency', () => {
  it('returns conflict rejection quickly when run is already in progress', async () => {
    const context = createTestServer({
      acceptedPapers: [{ paperId: 'p1', trackId: 'ai', durationMinutes: 30 }],
      sessionSlots: [{
        sessionSlotId: 'slot-1',
        trackId: 'ai',
        capacity: 1,
        startAt: '2026-06-01T09:00:00.000Z',
        endAt: '2026-06-01T10:00:00.000Z'
      }]
    });

    await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin'),
      body: { simulateLongRunMs: 100 }
    });

    const started = Date.now();
    const second = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin')
    });
    const elapsedMs = Date.now() - started;

    context.cleanup();

    expect(second.status).toBe(409);
    expect(elapsedMs).toBeLessThan(1000);
  });
});
