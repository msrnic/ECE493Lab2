import { normalizeViewerContext } from './viewer-context-model.js';

function assertIsoDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date-time string`);
  }

  return date;
}

function resolveLocalTimeZone(viewerTimeZone) {
  if (typeof viewerTimeZone === 'string' && viewerTimeZone.trim()) {
    return viewerTimeZone;
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function formatRange(startUtc, endUtc, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const start = formatter.format(startUtc);
  const end = formatter.format(endUtc);

  return `${start} - ${end}`;
}

function normalizePublishedSession(session, viewerContext, conferenceTimeZone, localTimeZone) {
  if (!session || typeof session !== 'object') {
    throw new Error('sessions entries must be objects');
  }

  const requiredFields = ['sessionId', 'title', 'startTimeUtc', 'endTimeUtc', 'room', 'authorIds'];
  for (const field of requiredFields) {
    if (session[field] === undefined || session[field] === null || session[field] === '') {
      throw new Error(`session.${field} is required`);
    }
  }

  if (!Array.isArray(session.authorIds) || session.authorIds.some((id) => typeof id !== 'string')) {
    throw new Error('session.authorIds must be an array of strings');
  }

  const startDate = assertIsoDate(session.startTimeUtc, 'session.startTimeUtc');
  const endDate = assertIsoDate(session.endTimeUtc, 'session.endTimeUtc');
  if (endDate <= startDate) {
    throw new Error('session.endTimeUtc must be later than session.startTimeUtc');
  }

  const isCurrentAuthorSession =
    viewerContext.viewerRole === 'author' &&
    typeof viewerContext.authorId === 'string' &&
    session.authorIds.includes(viewerContext.authorId);

  return {
    sessionId: session.sessionId,
    title: session.title,
    startTimeUtc: session.startTimeUtc,
    endTimeUtc: session.endTimeUtc,
    room: session.room,
    track: typeof session.track === 'string' && session.track.trim() ? session.track : '',
    authorIds: [...session.authorIds],
    isCurrentAuthorSession,
    conferenceTimeLabel: formatRange(startDate, endDate, conferenceTimeZone),
    localTimeLabel: formatRange(startDate, endDate, localTimeZone)
  };
}

function normalizePublishedPayload(payload, viewerContext, options) {
  if (typeof payload.conferenceTimeZone !== 'string' || payload.conferenceTimeZone.trim() === '') {
    throw new Error('published schedule requires conferenceTimeZone');
  }

  if (!Array.isArray(payload.sessions)) {
    throw new Error('published schedule requires sessions array');
  }

  if (payload.notice !== undefined) {
    throw new Error('published schedule must not include notice');
  }

  const localTimeZone = resolveLocalTimeZone(options.viewerTimeZone);

  return {
    status: 'published',
    conferenceTimeZone: payload.conferenceTimeZone,
    generatedAt: payload.generatedAt,
    viewerContext,
    sessions: payload.sessions.map((session) =>
      normalizePublishedSession(session, viewerContext, payload.conferenceTimeZone, localTimeZone)
    )
  };
}

function normalizeUnpublishedPayload(payload, viewerContext) {
  if (!payload.notice || typeof payload.notice !== 'object') {
    throw new Error('unpublished schedule requires notice');
  }

  if (payload.sessions !== undefined) {
    throw new Error('unpublished schedule must not include sessions');
  }

  if (payload.notice.code !== 'SCHEDULE_UNPUBLISHED') {
    throw new Error('unpublished notice code must be SCHEDULE_UNPUBLISHED');
  }

  if (typeof payload.notice.message !== 'string' || payload.notice.message.trim() === '') {
    throw new Error('unpublished notice message is required');
  }

  return {
    status: 'unpublished',
    generatedAt: payload.generatedAt,
    viewerContext,
    notice: {
      code: payload.notice.code,
      message: payload.notice.message.trim()
    }
  };
}

export function normalizeFinalSchedule(payload, options = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('final schedule payload must be an object');
  }

  if (payload.status !== 'published' && payload.status !== 'unpublished') {
    throw new Error('final schedule status must be published or unpublished');
  }

  assertIsoDate(payload.generatedAt, 'generatedAt');
  const viewerContext = normalizeViewerContext(payload.viewerContext);

  if (payload.status === 'published') {
    return normalizePublishedPayload(payload, viewerContext, options);
  }

  return normalizeUnpublishedPayload(payload, viewerContext);
}
