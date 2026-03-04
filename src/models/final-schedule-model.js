import { isAuthorViewer, normalizeViewerContext } from './viewer-context-model.js';

function isIsoDateTime(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function formatTimeRange(startIso, endIso, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const startLabel = formatter.format(new Date(startIso));
  const endLabel = formatter.format(new Date(endIso));

  return `${startLabel} - ${endLabel}`;
}

function normalizeSession(session, { viewerContext, conferenceTimeZone, browserTimeZone }) {
  if (!session || typeof session !== 'object') {
    throw new Error('Each session must be an object.');
  }

  if (!isIsoDateTime(session.startTimeUtc) || !isIsoDateTime(session.endTimeUtc)) {
    throw new Error('Sessions require valid startTimeUtc and endTimeUtc date-times.');
  }

  const startMs = Date.parse(session.startTimeUtc);
  const endMs = Date.parse(session.endTimeUtc);
  if (endMs <= startMs) {
    throw new Error('Session endTimeUtc must be later than startTimeUtc.');
  }

  const authorIds = Array.isArray(session.authorIds)
    ? session.authorIds.filter((authorId) => typeof authorId === 'string' && authorId.trim().length > 0)
    : [];

  const viewerOwnsSession = isAuthorViewer(viewerContext) && authorIds.includes(viewerContext.authorId);

  return {
    sessionId: String(session.sessionId ?? ''),
    title: String(session.title ?? 'Untitled Session'),
    room: String(session.room ?? 'TBD'),
    track: typeof session.track === 'string' ? session.track : '',
    startTimeUtc: session.startTimeUtc,
    endTimeUtc: session.endTimeUtc,
    authorIds,
    isCurrentAuthorSession: viewerOwnsSession,
    conferenceTimeLabel: formatTimeRange(session.startTimeUtc, session.endTimeUtc, conferenceTimeZone),
    localTimeLabel: formatTimeRange(session.startTimeUtc, session.endTimeUtc, browserTimeZone)
  };
}

export function normalizeFinalSchedulePayload(payload, {
  browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
} = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Final schedule payload is required.');
  }

  const viewerContext = normalizeViewerContext(payload.viewerContext ?? {});
  const generatedAt = isIsoDateTime(payload.generatedAt) ? payload.generatedAt : new Date().toISOString();

  if (payload.status === 'unpublished') {
    const notice = payload.notice ?? {};
    if (typeof notice.message !== 'string' || notice.message.trim().length === 0) {
      throw new Error('Unpublished payload requires a notice message.');
    }

    if (Array.isArray(payload.sessions) && payload.sessions.length > 0) {
      throw new Error('Unpublished payload must not include sessions.');
    }

    return {
      status: 'unpublished',
      generatedAt,
      viewerContext,
      notice: {
        code: typeof notice.code === 'string' && notice.code.trim().length > 0
          ? notice.code
          : 'SCHEDULE_UNPUBLISHED',
        message: notice.message.trim()
      },
      sessions: [],
      conferenceTimeZone: null
    };
  }

  if (payload.status !== 'published') {
    throw new Error('Final schedule status must be published or unpublished.');
  }

  const conferenceTimeZone = typeof payload.conferenceTimeZone === 'string' && payload.conferenceTimeZone.trim().length > 0
    ? payload.conferenceTimeZone.trim()
    : 'UTC';

  if (!Array.isArray(payload.sessions)) {
    throw new Error('Published payload requires a sessions array.');
  }

  if (payload.notice) {
    throw new Error('Published payload must not include an unpublished notice.');
  }

  const sessions = payload.sessions.map((session) => normalizeSession(session, {
    viewerContext,
    conferenceTimeZone,
    browserTimeZone
  }));

  return {
    status: 'published',
    generatedAt,
    viewerContext,
    conferenceTimeZone,
    sessions,
    notice: null
  };
}
