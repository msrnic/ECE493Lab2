import { afterEach, describe, expect, it } from 'vitest';

import { invokeApp, requestAs } from '../setup/httpHarness.js';
import { createTestServer, waitFor } from '../setup/testServer.js';

const cleanups = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()();
  }
});

describe('US2 integration: schedule conflicts', () => {
  it('returns conflicts for admin and editor, and rejects unauthorized users', async () => {
    const context = createTestServer({
      acceptedPapers: [
        { paperId: 'p1', trackId: 'ux', durationMinutes: 30 },
        { paperId: 'p2', trackId: 'security', durationMinutes: 30 },
        { paperId: 'p3', trackId: 'pl', durationMinutes: 30 }
      ],
      sessionSlots: [
        {
          sessionSlotId: 'slot-1',
          trackId: 'ai',
          capacity: 1,
          startAt: '2026-06-01T09:00:00.000Z',
          endAt: '2026-06-01T10:00:00.000Z'
        }
      ]
    });
    cleanups.push(context.cleanup);

    const start = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin')
    });
    expect(start.status).toBe(202);

    await waitFor(() => context.readState().generationRuns[0]?.status === 'completed');

    const scheduleId = context.readState().generatedSchedules[0].scheduleId;

    const adminResult = await invokeApp(context.app, {
      path: `/api/schedules/${scheduleId}/conflicts`,
      headers: requestAs('admin')
    });
    expect(adminResult.status).toBe(200);
    expect(adminResult.body.items.length).toBeGreaterThan(0);

    const editorResult = await invokeApp(context.app, {
      path: `/api/schedules/${scheduleId}/conflicts`,
      headers: requestAs('editor')
    });
    expect(editorResult.status).toBe(200);

    const reviewerResult = await invokeApp(context.app, {
      path: `/api/schedules/${scheduleId}/conflicts`,
      headers: requestAs('reviewer')
    });
    expect(reviewerResult.status).toBe(403);
  });

  it('returns 404 for unknown schedules', async () => {
    const context = createTestServer();
    cleanups.push(context.cleanup);

    const response = await invokeApp(context.app, {
      path: '/api/schedules/does-not-exist/conflicts',
      headers: requestAs('admin')
    });
    expect(response.status).toBe(404);
  });
});
