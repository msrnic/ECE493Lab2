import { describe, expect, it } from 'vitest';
import { normalizeFinalSchedulePayload } from '../../../src/models/final-schedule-model.js';
import {
  createAuthorPublishedPayload,
  createPublishedSchedulePayload,
  createUnpublishedSchedulePayload
} from '../fixtures/final-schedule-fixtures.js';

describe('final-schedule-model', () => {
  it('normalizes published payload and derives time labels plus author highlighting', () => {
    const normalized = normalizeFinalSchedulePayload(createAuthorPublishedPayload(), {
      browserTimeZone: 'America/Edmonton'
    });

    expect(normalized.status).toBe('published');
    expect(normalized.conferenceTimeZone).toBe('America/Toronto');
    expect(normalized.sessions).toHaveLength(2);
    expect(normalized.sessions[0].isCurrentAuthorSession).toBe(true);
    expect(normalized.sessions[1].isCurrentAuthorSession).toBe(false);
    expect(normalized.sessions[0].conferenceTimeLabel).toContain('2026');
    expect(normalized.sessions[0].localTimeLabel).toContain('2026');
    expect(normalized.notice).toBeNull();
  });

  it('validates published payload requirements and invalid sessions', () => {
    expect(() => normalizeFinalSchedulePayload({ status: 'published' })).toThrow(
      'Published payload requires a sessions array.'
    );

    expect(() => normalizeFinalSchedulePayload(createPublishedSchedulePayload({ notice: { code: 'x', message: 'x' } }))).toThrow(
      'Published payload must not include an unpublished notice.'
    );

    expect(() => normalizeFinalSchedulePayload(createPublishedSchedulePayload({
      sessions: [{
        sessionId: 'x',
        title: 'Bad',
        startTimeUtc: '2026-06-01T14:30:00.000Z',
        endTimeUtc: '2026-06-01T14:00:00.000Z',
        room: 'A',
        authorIds: []
      }]
    }))).toThrow('Session endTimeUtc must be later than startTimeUtc.');

    expect(() => normalizeFinalSchedulePayload(createPublishedSchedulePayload({
      sessions: [{
        sessionId: 'x',
        title: 'Bad',
        startTimeUtc: 'not-a-date',
        endTimeUtc: '2026-06-01T14:00:00.000Z',
        room: 'A',
        authorIds: []
      }]
    }))).toThrow('Sessions require valid startTimeUtc and endTimeUtc date-times.');

    expect(() => normalizeFinalSchedulePayload(createPublishedSchedulePayload({
      sessions: [null]
    }))).toThrow('Each session must be an object.');
  });

  it('normalizes unpublished payload and enforces notice/session rules', () => {
    const normalized = normalizeFinalSchedulePayload(createUnpublishedSchedulePayload());

    expect(normalized.status).toBe('unpublished');
    expect(normalized.sessions).toEqual([]);
    expect(normalized.notice.message).toContain('not been published');
    expect(normalized.conferenceTimeZone).toBeNull();

    expect(() => normalizeFinalSchedulePayload(createUnpublishedSchedulePayload({
      notice: { code: 'SCHEDULE_UNPUBLISHED', message: '   ' }
    }))).toThrow('Unpublished payload requires a notice message.');

    expect(() => normalizeFinalSchedulePayload({
      status: 'unpublished',
      generatedAt: '2026-05-01T12:00:00.000Z',
      viewerContext: {
        isAuthenticated: false,
        viewerRole: 'anonymous',
        authorId: null
      }
    })).toThrow('Unpublished payload requires a notice message.');

    expect(() => normalizeFinalSchedulePayload(createUnpublishedSchedulePayload({
      sessions: [{ sessionId: 'leak' }]
    }))).toThrow('Unpublished payload must not include sessions.');

    const fallbackCode = normalizeFinalSchedulePayload(createUnpublishedSchedulePayload({
      notice: {
        message: 'Schedule unavailable.'
      }
    }));
    expect(fallbackCode.notice.code).toBe('SCHEDULE_UNPUBLISHED');
  });

  it('applies session field defaults and browser timezone fallback when omitted', () => {
    const originalDateTimeFormat = Intl.DateTimeFormat;
    function DateTimeFormatMock() {
      if (!(this instanceof DateTimeFormatMock)) {
        return {
          resolvedOptions: () => ({})
        };
      }
    }
    DateTimeFormatMock.prototype.resolvedOptions = () => ({});
    DateTimeFormatMock.prototype.format = () => 'mock-time';
    Intl.DateTimeFormat = DateTimeFormatMock;

    try {
      const normalized = normalizeFinalSchedulePayload(createPublishedSchedulePayload({
        sessions: [{
          startTimeUtc: '2026-06-01T14:00:00.000Z',
          endTimeUtc: '2026-06-01T14:30:00.000Z'
        }]
      }));

      expect(normalized.sessions[0].sessionId).toBe('');
      expect(normalized.sessions[0].title).toBe('Untitled Session');
      expect(normalized.sessions[0].room).toBe('TBD');
      expect(normalized.sessions[0].authorIds).toEqual([]);
      expect(normalized.sessions[0].localTimeLabel).toBe('mock-time - mock-time');
    } finally {
      Intl.DateTimeFormat = originalDateTimeFormat;
    }
  });

  it('rejects invalid payload inputs and invalid status', () => {
    expect(() => normalizeFinalSchedulePayload(null)).toThrow('Final schedule payload is required.');
    expect(() => normalizeFinalSchedulePayload({ status: 'draft' })).toThrow(
      'Final schedule status must be published or unpublished.'
    );

    expect(() => normalizeFinalSchedulePayload({
      status: 'published',
      conferenceTimeZone: 'America/Toronto',
      generatedAt: '2026-05-01T12:00:00.000Z',
      viewerContext: {
        isAuthenticated: true,
        viewerRole: 'author',
        authorId: ''
      },
      sessions: []
    })).toThrow('Author viewers require a non-empty authorId.');

    const fallbackGeneratedAt = normalizeFinalSchedulePayload(createPublishedSchedulePayload({
      generatedAt: 'not-a-date',
      conferenceTimeZone: '   ',
      sessions: []
    }));
    expect(fallbackGeneratedAt.conferenceTimeZone).toBe('UTC');
    expect(typeof fallbackGeneratedAt.generatedAt).toBe('string');
  });
});
