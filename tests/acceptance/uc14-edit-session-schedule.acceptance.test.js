import { afterEach, describe, expect, it } from 'vitest';

import { invokeApp, requestAs } from '../integration/setup/httpHarness.js';
import { createTestServer } from '../integration/setup/testServer.js';

const cleanups = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()();
  }
});

function seedSchedule() {
  return {
    generatedSchedules: [
      {
        scheduleId: 'schedule-14',
        runId: 'run-14',
        versionNumber: 1,
        isActive: true,
        createdAt: '2026-03-02T09:00:00.000Z',
        createdByUserId: 'admin-1'
      }
    ],
    sessionAssignments: [
      {
        assignmentId: 'session-a',
        scheduleId: 'schedule-14',
        paperId: 'paper-a',
        startTime: '2026-06-01T09:00:00.000Z',
        endTime: '2026-06-01T10:00:00.000Z',
        roomId: 'room-1'
      },
      {
        assignmentId: 'session-b',
        scheduleId: 'schedule-14',
        paperId: 'paper-b',
        startTime: '2026-06-01T10:00:00.000Z',
        endTime: '2026-06-01T11:00:00.000Z',
        roomId: 'room-1'
      }
    ]
  };
}

describe('UC-14 acceptance suite', () => {
  it('Given a generated schedule, when edits are saved, then the schedule is updated', async () => {
    const context = createTestServer(seedSchedule());
    cleanups.push(context.cleanup);

    const saveResponse = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedules/schedule-14/save-attempts',
      headers: requestAs('editor', 'editor-14'),
      body: {
        expectedVersion: 1,
        changes: [
          {
            sessionId: 'session-b',
            startTime: '2026-06-01T11:00:00.000Z',
            endTime: '2026-06-01T12:00:00.000Z',
            roomId: 'room-2'
          }
        ]
      }
    });

    expect(saveResponse.status).toBe(200);
    expect(saveResponse.body.savedVersion).toBe(2);

    const refreshed = await invokeApp(context.app, {
      path: '/api/schedules/schedule-14',
      headers: requestAs('editor', 'editor-14')
    });

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.version).toBe(2);
    expect(refreshed.body.sessions.find((session) => session.sessionId === 'session-b').roomId).toBe('room-2');
  });

  it('Given conflicts persist, when saving, then the system warns the editor', async () => {
    const context = createTestServer(seedSchedule());
    cleanups.push(context.cleanup);

    const response = await invokeApp(context.app, {
      method: 'POST',
      path: '/api/schedules/schedule-14/save-attempts',
      headers: requestAs('editor', 'editor-14'),
      body: {
        expectedVersion: 1,
        changes: [
          {
            sessionId: 'session-b',
            startTime: '2026-06-01T09:30:00.000Z',
            endTime: '2026-06-01T10:30:00.000Z',
            roomId: 'room-1'
          }
        ]
      }
    });

    expect(response.status).toBe(409);
    expect(response.body.conflicts.length).toBeGreaterThan(0);
    expect(response.body.warningMessage).toMatch(/warning|override/i);
  });
});
