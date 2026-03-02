import { afterEach, describe, expect, it } from 'vitest';

import { invokeApp, requestAs } from '../setup/httpHarness.js';
import { createTestServer, waitFor } from '../setup/testServer.js';

const cleanups = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()();
  }
});

describe('UC-13 polish edge cases', () => {
  it('keeps in-progress rejection stable under quick repeat submissions', async () => {
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
    cleanups.push(context.cleanup);

    await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin'),
      body: { simulateLongRunMs: 100 }
    });

    const second = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin')
    });

    expect(second.status).toBe(409);
  });

  it('keeps conflict flags deduplicated for repeated equivalent violations', async () => {
    const context = createTestServer({
      acceptedPapers: [
        { paperId: 'p1', trackId: 'ux', durationMinutes: 30 },
        { paperId: 'p2', trackId: 'ux', durationMinutes: 30 }
      ],
      sessionSlots: [{
        sessionSlotId: 'slot-1',
        trackId: 'ai',
        capacity: 1,
        startAt: '2026-06-01T09:00:00.000Z',
        endAt: '2026-06-01T10:00:00.000Z'
      }]
    });
    cleanups.push(context.cleanup);

    await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin')
    });

    await waitFor(() => context.readState().generationRuns[0]?.status === 'completed');

    const keys = context.readState().conflictFlags.map((item) => item.dedupKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
