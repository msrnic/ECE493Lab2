import { afterEach, describe, expect, it } from 'vitest';

import { invokeApp, requestAs } from '../setup/httpHarness.js';
import { createTestServer } from '../setup/testServer.js';

const cleanups = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()();
  }
});

describe('US1 authorization', () => {
  it('rejects non-admin schedule generation start', async () => {
    const context = createTestServer({
      acceptedPapers: [{ paperId: 'p1', trackId: 'ai', durationMinutes: 30 }],
      sessionSlots: [{
        sessionSlotId: 'slot-1',
        trackId: 'ai',
        capacity: 2,
        startAt: '2026-06-01T09:00:00.000Z',
        endAt: '2026-06-01T10:00:00.000Z'
      }]
    });
    cleanups.push(context.cleanup);

    const response = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('editor')
    });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });
});
