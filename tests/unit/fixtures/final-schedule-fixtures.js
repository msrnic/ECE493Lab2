export function createPublishedSchedulePayload(overrides = {}) {
  return {
    status: 'published',
    conferenceTimeZone: 'America/Toronto',
    generatedAt: '2026-05-01T12:00:00.000Z',
    viewerContext: {
      isAuthenticated: false,
      viewerRole: 'anonymous',
      authorId: null
    },
    sessions: [
      {
        sessionId: 'S-100',
        title: 'Systems and AI',
        startTimeUtc: '2026-06-01T14:00:00.000Z',
        endTimeUtc: '2026-06-01T14:30:00.000Z',
        room: 'Hall A',
        track: 'AI',
        authorIds: ['author-1'],
        isCurrentAuthorSession: false
      },
      {
        sessionId: 'S-101',
        title: 'Network Security',
        startTimeUtc: '2026-06-01T15:00:00.000Z',
        endTimeUtc: '2026-06-01T15:30:00.000Z',
        room: 'Hall B',
        track: 'Security',
        authorIds: ['author-2'],
        isCurrentAuthorSession: false
      }
    ],
    ...overrides
  };
}

export function createAuthorPublishedPayload(overrides = {}) {
  return createPublishedSchedulePayload({
    viewerContext: {
      isAuthenticated: true,
      viewerRole: 'author',
      authorId: 'author-1'
    },
    ...overrides
  });
}

export function createUnpublishedSchedulePayload(overrides = {}) {
  return {
    status: 'unpublished',
    generatedAt: '2026-05-01T12:00:00.000Z',
    viewerContext: {
      isAuthenticated: false,
      viewerRole: 'anonymous',
      authorId: null
    },
    notice: {
      code: 'SCHEDULE_UNPUBLISHED',
      message: 'The final conference schedule has not been published yet.'
    },
    ...overrides
  };
}
