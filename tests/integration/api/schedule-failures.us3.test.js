import { afterEach, describe, expect, it } from 'vitest';

import { invokeApp, requestAs } from '../setup/httpHarness.js';
import { createTestServer, waitFor } from '../setup/testServer.js';

const cleanups = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()();
  }
});

describe('US3 integration: failures and retries', () => {
  it('returns 422 when accepted papers are missing', async () => {
    const context = createTestServer({
      acceptedPapers: [],
      sessionSlots: [{
        sessionSlotId: 'slot-1',
        trackId: 'ai',
        capacity: 1,
        startAt: '2026-06-01T09:00:00.000Z',
        endAt: '2026-06-01T10:00:00.000Z'
      }]
    });
    cleanups.push(context.cleanup);

    const response = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin')
    });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('NO_ACCEPTED_PAPERS');
  });

  it('returns 422 for invalid metadata and supports retry after correction', async () => {
    const context = createTestServer({
      acceptedPapers: [{ paperId: 'p1', trackId: 'ai', durationMinutes: 30 }],
      sessionSlots: [{
        sessionSlotId: 'slot-1',
        trackId: 'ai',
        capacity: 0,
        startAt: '2026-06-01T10:00:00.000Z',
        endAt: '2026-06-01T09:00:00.000Z'
      }]
    });
    cleanups.push(context.cleanup);

    const invalidMetadata = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin')
    });
    expect(invalidMetadata.status).toBe(422);
    expect(invalidMetadata.body.code).toBe('MISSING_SESSION_METADATA');

    context.writeState({
      ...context.readState(),
      acceptedPapers: [{ paperId: 'p1', trackId: 'ai', durationMinutes: 30 }],
      sessionSlots: [{
        sessionSlotId: 'slot-1',
        trackId: 'ai',
        capacity: 2,
        startAt: '2026-06-01T09:00:00.000Z',
        endAt: '2026-06-01T10:00:00.000Z'
      }]
    });

    const retry = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin'),
      body: { notes: 'retry' }
    });
    expect(retry.status).toBe(202);

    await waitFor(() => context.readState().generationRuns[0]?.status === 'completed');
    expect(context.readState().generatedSchedules).toHaveLength(1);
  });

  it('returns 422 validation error for malformed request payload', async () => {
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
      headers: requestAs('admin'),
      body: []
    });
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('marks run as failed when generation execution throws', async () => {
    const context = createTestServer({
      acceptedPapers: [
        { paperId: 'p1', trackId: 'ai', durationMinutes: 30 },
        { paperId: 'p1', trackId: 'ai', durationMinutes: 30 }
      ],
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
      headers: requestAs('admin')
    });
    expect(response.status).toBe(202);

    await waitFor(() => context.readState().generationRuns[0]?.status === 'failed');
    expect(context.readState().generationRuns[0].failureReason).toMatch(/Duplicate paper assignment/);
  });
});
