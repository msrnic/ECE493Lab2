import { afterEach, describe, expect, it } from 'vitest';

import { invokeApp, requestAs } from '../setup/httpHarness.js';
import { createTestServer } from '../setup/testServer.js';

const cleanups = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()();
  }
});

function createSeed(version = 1) {
  return {
    generatedSchedules: [
      {
        scheduleId: 'schedule-1',
        runId: 'run-1',
        versionNumber: version,
        isActive: true,
        createdAt: '2026-03-02T09:00:00.000Z',
        createdByUserId: 'admin-1'
      }
    ],
    sessionAssignments: [
      {
        assignmentId: 'session-1',
        scheduleId: 'schedule-1',
        paperId: 'paper-1',
        startTime: '2026-06-01T09:00:00.000Z',
        endTime: '2026-06-01T10:00:00.000Z',
        roomId: 'room-a'
      },
      {
        assignmentId: 'session-2',
        scheduleId: 'schedule-1',
        paperId: 'paper-2',
        startTime: '2026-06-01T10:00:00.000Z',
        endTime: '2026-06-01T11:00:00.000Z',
        roomId: 'room-a'
      }
    ]
  };
}

describe('UC14 integration: schedule edit APIs', () => {
  it('loads schedule state, saves non-conflicting edits, and enforces stale/version checks', async () => {
    const context = createTestServer(createSeed());
    cleanups.push(context.cleanup);

    const loaded = await invokeApp(context.app, {
      path: '/api/schedules/schedule-1',
      headers: requestAs('editor', 'editor-1')
    });
    expect(loaded.status).toBe(200);
    expect(loaded.body.version).toBe(1);
    expect(loaded.body.sessions).toHaveLength(2);

    const saved = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedules/schedule-1/save-attempts',
      headers: requestAs('editor', 'editor-1'),
      body: {
        expectedVersion: 1,
        changes: [
          {
            sessionId: 'session-2',
            startTime: '2026-06-01T11:00:00.000Z',
            endTime: '2026-06-01T12:00:00.000Z',
            roomId: 'room-b'
          }
        ]
      }
    });
    expect(saved.status).toBe(200);
    expect(saved.body.savedVersion).toBe(2);

    const refreshed = await invokeApp(context.app, {
      path: '/api/schedules/schedule-1',
      headers: requestAs('editor', 'editor-1')
    });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.version).toBe(2);
    expect(refreshed.body.sessions.find((item) => item.sessionId === 'session-2').roomId).toBe('room-b');

    const stale = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedules/schedule-1/save-attempts',
      headers: requestAs('editor', 'editor-1'),
      body: {
        expectedVersion: 1,
        changes: [
          {
            sessionId: 'session-1',
            startTime: '2026-06-01T12:00:00.000Z',
            endTime: '2026-06-01T13:00:00.000Z',
            roomId: 'room-a'
          }
        ]
      }
    });
    expect(stale.status).toBe(412);
    expect(stale.body.code).toBe('STALE_SCHEDULE');

    const forbidden = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedules/schedule-1/save-attempts',
      headers: requestAs('reviewer', 'reviewer-1'),
      body: {
        expectedVersion: 2,
        changes: [
          {
            sessionId: 'session-1',
            startTime: '2026-06-01T13:00:00.000Z',
            endTime: '2026-06-01T14:00:00.000Z',
            roomId: 'room-a'
          }
        ]
      }
    });
    expect(forbidden.status).toBe(403);

    const missing = await invokeApp(context.app, {
      path: '/api/schedules/unknown',
      headers: requestAs('editor', 'editor-1')
    });
    expect(missing.status).toBe(404);
  });

  it('warns on unresolved conflicts, supports override save, and blocks publish until resolved', async () => {
    const context = createTestServer(createSeed());
    cleanups.push(context.cleanup);

    const warning = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedules/schedule-1/save-attempts',
      headers: requestAs('editor', 'editor-1'),
      body: {
        expectedVersion: 1,
        changes: [
          {
            sessionId: 'session-2',
            startTime: '2026-06-01T09:30:00.000Z',
            endTime: '2026-06-01T10:30:00.000Z',
            roomId: 'room-a'
          }
        ]
      }
    });
    expect(warning.status).toBe(409);
    expect(warning.body.conflicts).toHaveLength(1);

    const missingReason = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedules/schedule-1/override-saves',
      headers: requestAs('editor', 'editor-1'),
      body: {
        expectedVersion: 1,
        decisionToken: warning.body.decisionToken,
        reason: ' ',
        affectedConflictIds: warning.body.conflicts.map((item) => item.conflictId),
        changes: [
          {
            sessionId: 'session-2',
            startTime: '2026-06-01T09:30:00.000Z',
            endTime: '2026-06-01T10:30:00.000Z',
            roomId: 'room-a'
          }
        ]
      }
    });
    expect(missingReason.status).toBe(400);

    const staleToken = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedules/schedule-1/override-saves',
      headers: requestAs('editor', 'editor-1'),
      body: {
        expectedVersion: 1,
        decisionToken: 'stale',
        reason: 'Need temporary overlap.',
        affectedConflictIds: warning.body.conflicts.map((item) => item.conflictId),
        changes: [
          {
            sessionId: 'session-2',
            startTime: '2026-06-01T09:30:00.000Z',
            endTime: '2026-06-01T10:30:00.000Z',
            roomId: 'room-a'
          }
        ]
      }
    });
    expect(staleToken.status).toBe(409);

    const overridden = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedules/schedule-1/override-saves',
      headers: requestAs('editor', 'editor-1'),
      body: {
        expectedVersion: 1,
        decisionToken: warning.body.decisionToken,
        reason: 'Need temporary overlap.',
        affectedConflictIds: warning.body.conflicts.map((item) => item.conflictId),
        changes: [
          {
            sessionId: 'session-2',
            startTime: '2026-06-01T09:30:00.000Z',
            endTime: '2026-06-01T10:30:00.000Z',
            roomId: 'room-a'
          }
        ]
      }
    });
    expect(overridden.status).toBe(200);
    expect(overridden.body.unresolvedConflicts).toBe(1);

    const blockedPublish = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedules/schedule-1/publish-attempts',
      headers: requestAs('editor', 'editor-1'),
      body: { expectedVersion: 2 }
    });
    expect(blockedPublish.status).toBe(409);
    expect(blockedPublish.body.code).toBe('UNRESOLVED_CONFLICTS');

    const invalidPublish = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedules/schedule-1/publish-attempts',
      headers: requestAs('editor', 'editor-1'),
      body: { expectedVersion: 0 }
    });
    expect(invalidPublish.status).toBe(422);

    const resolvedSave = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedules/schedule-1/save-attempts',
      headers: requestAs('editor', 'editor-1'),
      body: {
        expectedVersion: 2,
        changes: [
          {
            sessionId: 'session-2',
            startTime: '2026-06-01T11:00:00.000Z',
            endTime: '2026-06-01T12:00:00.000Z',
            roomId: 'room-b'
          }
        ]
      }
    });
    expect(resolvedSave.status).toBe(200);
    expect(resolvedSave.body.savedVersion).toBe(3);

    const published = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedules/schedule-1/publish-attempts',
      headers: requestAs('editor', 'editor-1'),
      body: { expectedVersion: 3 }
    });
    expect(published.status).toBe(200);
    expect(published.body.status).toBe('published');
  });
});
