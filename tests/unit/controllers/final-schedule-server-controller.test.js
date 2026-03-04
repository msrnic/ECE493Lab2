import { describe, expect, it, vi } from 'vitest';
import { createFinalScheduleServerController } from '../../../src/controllers/final-schedule-server-controller.js';

function createResponseRecorder() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

describe('final-schedule-server-controller', () => {
  it('returns unpublished payload for anonymous viewers when no published schedule exists', () => {
    const controller = createFinalScheduleServerController({
      authController: {
        getAuthenticatedSession: vi.fn().mockReturnValue(null)
      },
      repository: {
        findUserById: vi.fn()
      },
      scheduleRepository: {
        read: vi.fn().mockReturnValue({
          generatedSchedules: [],
          sessionAssignments: []
        })
      },
      nowFn: () => new Date('2026-06-01T10:00:00.000Z')
    });

    const response = createResponseRecorder();
    controller.getFinalSchedule({}, response);

    expect(response.statusCode).toBe(200);
    expect(response.payload.status).toBe('unpublished');
    expect(response.payload.viewerContext.viewerRole).toBe('anonymous');
    expect(response.payload.notice.code).toBe('SCHEDULE_UNPUBLISHED');
  });

  it('returns published payload with sorted sessions and author highlighting', () => {
    const controller = createFinalScheduleServerController({
      authController: {
        getAuthenticatedSession: vi.fn().mockReturnValue({
          user: { id: 'author-1', email: 'author1@example.com' }
        })
      },
      repository: {
        findUserById: vi.fn().mockReturnValue({ role: 'author' })
      },
      scheduleRepository: {
        read: vi.fn().mockReturnValue({
          generatedSchedules: [
            { scheduleId: 's-1', status: 'published', isActive: true, conferenceTimeZone: 'America/Toronto' }
          ],
          sessionAssignments: [
            {
              assignmentId: 'session-2',
              scheduleId: 's-1',
              paperId: 'paper-2',
              title: 'Second',
              startTime: '2026-06-01T11:00:00.000Z',
              endTime: '2026-06-01T11:30:00.000Z',
              roomId: 'Room B',
              track: 'AI',
              authorIds: []
            },
            {
              assignmentId: 'session-1',
              scheduleId: 's-1',
              paperId: 'paper-1',
              title: 'First',
              startTime: '2026-06-01T10:00:00.000Z',
              endTime: '2026-06-01T10:30:00.000Z',
              roomId: 'Room A',
              track: 'Systems',
              authorIds: ['author-1']
            }
          ]
        })
      },
      nowFn: () => new Date('2026-06-01T10:00:00.000Z')
    });

    const response = createResponseRecorder();
    controller.getFinalSchedule({}, response);

    expect(response.statusCode).toBe(200);
    expect(response.payload.status).toBe('published');
    expect(response.payload.viewerContext.viewerRole).toBe('author');
    expect(response.payload.sessions).toHaveLength(2);
    expect(response.payload.sessions[0].sessionId).toBe('session-1');
    expect(response.payload.sessions[0].isCurrentAuthorSession).toBe(true);
    expect(response.payload.sessions[1].isCurrentAuthorSession).toBe(false);
  });

  it('maps authenticated non-authors to viewerRole other and falls back to latest published', () => {
    const controller = createFinalScheduleServerController({
      authController: {
        getAuthenticatedSession: vi.fn().mockReturnValue({
          user: { id: 'editor-1', email: 'editor@example.com' }
        })
      },
      repository: {
        findUserById: vi.fn().mockReturnValue({ role: 'editor' })
      },
      scheduleRepository: {
        read: vi.fn().mockReturnValue({
          generatedSchedules: [
            { scheduleId: 'old', status: 'published', isActive: false },
            { scheduleId: 'latest', status: 'published', isActive: false }
          ],
          sessionAssignments: []
        })
      }
    });

    const response = createResponseRecorder();
    controller.getFinalSchedule({}, response);

    expect(response.payload.status).toBe('published');
    expect(response.payload.viewerContext).toEqual({
      isAuthenticated: true,
      viewerRole: 'other',
      authorId: null
    });
    expect(response.payload.sessions).toEqual([]);
    expect(response.payload.conferenceTimeZone).toBe('America/Toronto');
  });

  it('handles missing schedule/assignment arrays and assignment field fallbacks', () => {
    const controller = createFinalScheduleServerController({
      authController: {
        getAuthenticatedSession: vi.fn().mockReturnValue({
          user: { id: 'author-fallback', email: 'author.fallback@example.com' }
        })
      },
      repository: {
        findUserById: vi.fn().mockReturnValue({ role: 'author' })
      },
      scheduleRepository: {
        read: vi.fn()
          .mockReturnValueOnce({
            generatedSchedules: undefined,
            sessionAssignments: undefined
          })
          .mockReturnValueOnce({
            generatedSchedules: [{ scheduleId: 's-2', status: 'published', isActive: true }],
            sessionAssignments: [{
              assignmentId: 'asg-1',
              scheduleId: 's-2',
              paperId: 'paper-only',
              startTime: '2026-06-01T08:00:00.000Z',
              endTime: '2026-06-01T08:30:00.000Z',
              authorIds: ['author-fallback', ' ', 123]
            }]
          })
      }
    });

    const firstResponse = createResponseRecorder();
    controller.getFinalSchedule({}, firstResponse);
    expect(firstResponse.payload.status).toBe('unpublished');

    const secondResponse = createResponseRecorder();
    controller.getFinalSchedule({}, secondResponse);
    expect(secondResponse.payload.status).toBe('published');
    expect(secondResponse.payload.sessions).toHaveLength(1);
    expect(secondResponse.payload.sessions[0].title).toBe('paper-only');
    expect(secondResponse.payload.sessions[0].room).toBe('TBD');
    expect(secondResponse.payload.sessions[0].track).toBe('');
    expect(secondResponse.payload.sessions[0].isCurrentAuthorSession).toBe(true);
  });

  it('returns published payload with empty sessions when assignments are missing and uses untitled fallback', () => {
    const controller = createFinalScheduleServerController({
      authController: {
        getAuthenticatedSession: vi.fn().mockReturnValue({
          user: { id: 'editor-2', email: 'editor2@example.com' }
        })
      },
      repository: {
        findUserById: vi.fn().mockReturnValue({ role: 'editor' })
      },
      scheduleRepository: {
        read: vi.fn()
          .mockReturnValueOnce({
            generatedSchedules: [{ scheduleId: 's-empty', status: 'published', isActive: true }],
            sessionAssignments: undefined
          })
          .mockReturnValueOnce({
            generatedSchedules: [{ scheduleId: 's-fallback-title', status: 'published', isActive: true }],
            sessionAssignments: [{
              assignmentId: 'asg-title',
              scheduleId: 's-fallback-title',
              startTime: '2026-06-01T08:00:00.000Z',
              endTime: '2026-06-01T08:30:00.000Z'
            }]
          })
      }
    });

    const firstResponse = createResponseRecorder();
    controller.getFinalSchedule({}, firstResponse);
    expect(firstResponse.payload.status).toBe('published');
    expect(firstResponse.payload.sessions).toEqual([]);

    const secondResponse = createResponseRecorder();
    controller.getFinalSchedule({}, secondResponse);
    expect(secondResponse.payload.status).toBe('published');
    expect(secondResponse.payload.sessions[0].title).toBe('Untitled Session');
    expect(secondResponse.payload.sessions[0].authorIds).toEqual([]);
    expect(secondResponse.payload.sessions[0].isCurrentAuthorSession).toBe(false);
  });
});
