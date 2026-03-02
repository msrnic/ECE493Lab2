import { afterEach, describe, expect, it } from 'vitest';

import { invokeApp, requestAs } from '../setup/httpHarness.js';
import { createTestServer, waitFor } from '../setup/testServer.js';

const cleanups = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()();
  }
});

describe('US1 integration: schedule run lifecycle', () => {
  it('creates runs, returns run status, and exposes schedule details', async () => {
    const context = createTestServer({
      acceptedPapers: [
        { paperId: 'p1', trackId: 'ai', durationMinutes: 30 },
        { paperId: 'p2', trackId: 'systems', durationMinutes: 30 }
      ],
      sessionSlots: [
        {
          sessionSlotId: 'slot-1',
          trackId: 'ai',
          capacity: 2,
          startAt: '2026-06-01T09:00:00.000Z',
          endAt: '2026-06-01T10:00:00.000Z'
        },
        {
          sessionSlotId: 'slot-2',
          trackId: 'systems',
          capacity: 2,
          startAt: '2026-06-01T09:00:00.000Z',
          endAt: '2026-06-01T10:00:00.000Z'
        }
      ]
    });
    cleanups.push(context.cleanup);

    const createResponse = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin', 'admin-1'),
      body: { notes: 'run it' }
    });

    expect(createResponse.status).toBe(202);
    expect(createResponse.body.status).toBe('in_progress');

    await waitFor(() => context.readState().generationRuns[0]?.status === 'completed');

    const runId = createResponse.body.runId;
    const getRun = await invokeApp(context.app, {
      path: `/api/schedule-runs/${runId}`,
      headers: requestAs('admin', 'admin-1')
    });

    expect(getRun.status).toBe(200);
    expect(getRun.body.status).toBe('completed');
    expect(getRun.body.schedule).toBeTruthy();

    const listSchedules = await invokeApp(context.app, {
      path: '/api/schedules',
      headers: requestAs('admin', 'admin-1')
    });
    expect(listSchedules.status).toBe(200);
    expect(listSchedules.body.items).toHaveLength(1);

    const activeOnly = await invokeApp(context.app, {
      path: '/api/schedules',
      query: { activeOnly: true },
      headers: requestAs('admin', 'admin-1')
    });
    expect(activeOnly.status).toBe(200);
    expect(activeOnly.body.items).toHaveLength(1);

    const scheduleId = listSchedules.body.items[0].scheduleId;
    const getSchedule = await invokeApp(context.app, {
      path: `/api/schedules/${scheduleId}`,
      headers: requestAs('admin', 'admin-1')
    });
    expect(getSchedule.status).toBe(200);
    expect(getSchedule.body.assignments).toHaveLength(2);
  });

  it('rejects concurrent requests and non-admin users', async () => {
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

    const first = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin', 'admin-1'),
      body: { simulateLongRunMs: 100 }
    });
    expect(first.status).toBe(202);

    const second = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin', 'admin-1')
    });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('GENERATION_IN_PROGRESS');

    const nonAdmin = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('editor', 'editor-1')
    });
    expect(nonAdmin.status).toBe(403);
  });

  it('returns 404 for unknown run and 422 for invalid activeOnly', async () => {
    const context = createTestServer();
    cleanups.push(context.cleanup);

    const missingRun = await invokeApp(context.app, {
      path: '/api/schedule-runs/missing',
      headers: requestAs('admin', 'admin-1')
    });
    expect(missingRun.status).toBe(404);

    const invalidActiveOnly = await invokeApp(context.app, {
      path: '/api/schedules',
      query: { activeOnly: 'bad' },
      headers: requestAs('admin', 'admin-1')
    });
    expect(invalidActiveOnly.status).toBe(422);
  });

  it('returns completed run even when schedule summary is missing and handles schedule 404', async () => {
    const context = createTestServer({
      generationRuns: [
        {
          runId: 'run-1',
          initiatedByUserId: 'admin-1',
          initiatedByRole: 'admin',
          requestedAt: '2026-01-01T00:00:00.000Z',
          status: 'completed',
          generatedScheduleId: 'missing-schedule'
        }
      ]
    });
    cleanups.push(context.cleanup);

    const runResponse = await invokeApp(context.app, {
      path: '/api/schedule-runs/run-1',
      headers: requestAs('admin', 'admin-1')
    });
    expect(runResponse.status).toBe(200);
    expect(runResponse.body.generatedScheduleId).toBe('missing-schedule');
    expect(runResponse.body.schedule).toBeUndefined();

    const missingSchedule = await invokeApp(context.app, {
      path: '/api/schedules/missing-schedule',
      headers: requestAs('admin', 'admin-1')
    });
    expect(missingSchedule.status).toBe(404);
  });

  it('returns in-progress run payload without schedule and supports user-id fallbacks', async () => {
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

    const withBodyUser = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: { 'x-user-role': 'admin' },
      body: { requestedByUserId: 'admin-from-body', simulateLongRunMs: 50 }
    });
    expect(withBodyUser.status).toBe(202);

    const running = await invokeApp(context.app, {
      path: `/api/schedule-runs/${withBodyUser.body.runId}`,
      headers: requestAs('admin')
    });
    expect(running.status).toBe(200);
    expect(running.body.generatedScheduleId).toBeUndefined();

    await waitFor(() => context.readState().generationRuns[0]?.status === 'completed');
    expect(context.readState().generatedSchedules[0].createdByUserId).toBe('admin-from-body');

    const withSystemFallback = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: { 'x-user-role': 'admin' }
    });
    expect(withSystemFallback.status).toBe(202);

    await waitFor(() => context.readState().generationRuns[1]?.status === 'completed');
    expect(context.readState().generatedSchedules[1].createdByUserId).toBe('system-admin');
  });

  it('supports default async scheduler wiring in app construction', async () => {
    const context = createTestServer({
      acceptedPapers: [{ paperId: 'p1', trackId: 'ai', durationMinutes: 30 }],
      sessionSlots: [{
        sessionSlotId: 'slot-1',
        trackId: 'ai',
        capacity: 2,
        startAt: '2026-06-01T09:00:00.000Z',
        endAt: '2026-06-01T10:00:00.000Z'
      }]
    }, { useNativeScheduleTask: true });
    cleanups.push(context.cleanup);

    const response = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin', 'admin-native')
    });
    expect(response.status).toBe(202);

    await waitFor(() => context.readState().generationRuns[0]?.status === 'completed');
  });

  it('supports default Date-based timestamping for schedule runs', async () => {
    const context = createTestServer({
      acceptedPapers: [{ paperId: 'p1', trackId: 'ai', durationMinutes: 30 }],
      sessionSlots: [{
        sessionSlotId: 'slot-1',
        trackId: 'ai',
        capacity: 2,
        startAt: '2026-06-01T09:00:00.000Z',
        endAt: '2026-06-01T10:00:00.000Z'
      }]
    }, { includeNow: false });
    cleanups.push(context.cleanup);

    const response = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin', 'admin-date-now')
    });
    expect(response.status).toBe(202);

    await waitFor(() => context.readState().generationRuns[0]?.status === 'completed');
    const run = context.readState().generationRuns[0];
    expect(run.requestedAt).toMatch(/T/);
    expect(run.startedAt).toMatch(/T/);
    expect(run.completedAt).toMatch(/T/);
  });
});
