const DEFAULT_GENERATED_AT = '2026-06-01T12:00:00.000Z';

export function createLaunchMockSchedulePayload({
  status = 'published'
} = {}) {
  if (status === 'unpublished') {
    return {
      status: 'unpublished',
      generatedAt: DEFAULT_GENERATED_AT,
      viewerContext: {
        isAuthenticated: false,
        viewerRole: 'anonymous',
        authorId: null
      },
      notice: {
        code: 'SCHEDULE_UNPUBLISHED',
        message: 'The final conference schedule has not been published yet.'
      }
    };
  }

  return {
    status: 'published',
    conferenceTimeZone: 'America/Toronto',
    generatedAt: DEFAULT_GENERATED_AT,
    viewerContext: {
      isAuthenticated: false,
      viewerRole: 'anonymous',
      authorId: null
    },
    sessions: [
      {
        sessionId: 'MOCK-101',
        title: 'Opening Keynote: Applied ML Systems',
        startTimeUtc: '2026-06-01T14:00:00.000Z',
        endTimeUtc: '2026-06-01T14:45:00.000Z',
        room: 'Grand Hall',
        track: 'Keynote',
        authorIds: ['author-1'],
        isCurrentAuthorSession: false
      },
      {
        sessionId: 'MOCK-102',
        title: 'Secure Networking in Practice',
        startTimeUtc: '2026-06-01T15:00:00.000Z',
        endTimeUtc: '2026-06-01T15:45:00.000Z',
        room: 'Room B',
        track: 'Security',
        authorIds: ['author-2'],
        isCurrentAuthorSession: false
      }
    ]
  };
}
