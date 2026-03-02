function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const basePublished = {
  status: 'published',
  conferenceTimeZone: 'America/Toronto',
  generatedAt: '2026-02-08T15:00:00Z',
  viewerContext: {
    isAuthenticated: false,
    viewerRole: 'anonymous',
    authorId: null
  },
  sessions: [
    {
      sessionId: 'S-301',
      title: 'Graph ML for Systems',
      startTimeUtc: '2026-05-09T14:00:00Z',
      endTimeUtc: '2026-05-09T14:30:00Z',
      room: 'Hall B',
      track: 'AI Systems',
      authorIds: ['A-102', 'A-215'],
      isCurrentAuthorSession: false
    },
    {
      sessionId: 'S-302',
      title: 'Secure Distributed Training',
      startTimeUtc: '2026-05-09T15:00:00Z',
      endTimeUtc: '2026-05-09T15:30:00Z',
      room: 'Hall C',
      authorIds: ['A-303'],
      isCurrentAuthorSession: false
    }
  ]
};

const baseUnpublished = {
  status: 'unpublished',
  generatedAt: '2026-02-08T15:00:00Z',
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

export function makePublishedPayload(overrides = {}) {
  return {
    ...clone(basePublished),
    ...clone(overrides)
  };
}

export function makeUnpublishedPayload(overrides = {}) {
  return {
    ...clone(baseUnpublished),
    ...clone(overrides)
  };
}

export function makeAuthorViewerContext(authorId = 'A-102') {
  return {
    isAuthenticated: true,
    viewerRole: 'author',
    authorId
  };
}
