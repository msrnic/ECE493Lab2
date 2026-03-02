import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { invokeApp, requestAs } from '../integration/setup/httpHarness.js';
import { createTestServer, waitFor } from '../integration/setup/testServer.js';

const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/schedule-fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const cleanups = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()();
  }
});

describe('UC-13 acceptance suite', () => {
  it('Given accepted papers exist, when generation starts, then schedule is produced', async () => {
    const context = createTestServer(fixtures.happyPath);
    cleanups.push(context.cleanup);

    const start = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin')
    });
    expect(start.status).toBe(202);

    await waitFor(() => context.readState().generationRuns[0]?.status === 'completed');
    expect(context.readState().generatedSchedules).toHaveLength(1);
  });

  it('Given conflicts are detected, when generating, then conflicts are flagged', async () => {
    const context = createTestServer(fixtures.conflictHeavy);
    cleanups.push(context.cleanup);

    await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin')
    });
    await waitFor(() => context.readState().generationRuns[0]?.status === 'completed');

    expect(context.readState().conflictFlags.length).toBeGreaterThan(0);
  });

  it('Given a run is in progress, when another generation starts, then second request is rejected with clear message', async () => {
    const context = createTestServer(fixtures.happyPath);
    cleanups.push(context.cleanup);

    const first = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin'),
      body: { simulateLongRunMs: 100 }
    });
    expect(first.status).toBe(202);

    const second = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin')
    });
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/in progress/i);
  });

  it('Given conflicts are detected, when generation completes, then schedule still exists', async () => {
    const context = createTestServer(fixtures.conflictHeavy);
    cleanups.push(context.cleanup);

    await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin')
    });
    await waitFor(() => context.readState().generationRuns[0]?.status === 'completed');

    expect(context.readState().generatedSchedules).toHaveLength(1);
    expect(context.readState().conflictFlags.length).toBeGreaterThan(0);
  });

  it('Given editor requests conflicts, when authorized, then full violation details are returned', async () => {
    const context = createTestServer(fixtures.conflictHeavy);
    cleanups.push(context.cleanup);

    await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin')
    });
    await waitFor(() => context.readState().generationRuns[0]?.status === 'completed');

    const scheduleId = context.readState().generatedSchedules[0].scheduleId;
    const response = await invokeApp(context.app, {
      path: `/api/schedules/${scheduleId}/conflicts`,
      headers: requestAs('editor')
    });

    expect(response.status).toBe(200);
    expect(response.body.items[0]).toHaveProperty('violationType');
    expect(response.body.items[0]).toHaveProperty('details');
  });

  it('Given accepted papers are missing, when generation starts, then generation fails with clear reason', async () => {
    const context = createTestServer({
      acceptedPapers: [],
      sessionSlots: fixtures.happyPath.sessionSlots
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

  it('Given two successful runs exist, when schedules are listed, then exactly one version is active', async () => {
    const context = createTestServer(fixtures.happyPath);
    cleanups.push(context.cleanup);

    await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin', 'admin-1')
    });
    await waitFor(() => context.readState().generationRuns[0]?.status === 'completed');

    await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedule-runs',
      headers: requestAs('admin', 'admin-2')
    });
    await waitFor(() => context.readState().generationRuns[1]?.status === 'completed');

    const list = await invokeApp(context.app, {
      path: '/api/schedules',
      headers: requestAs('admin', 'admin-1')
    });

    const activeCount = list.body.items.filter((item) => item.isActive).length;
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBe(2);
    expect(activeCount).toBe(1);
  });
});
