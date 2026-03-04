import { afterEach, describe, expect, test, vi } from 'vitest';
import { normalizeFinalSchedule } from '../../src/models/final-schedule-model.js';
import {
  makeAuthorViewerContext,
  makePublishedPayload,
  makeUnpublishedPayload
} from './fixtures/final-schedule-fixtures.js';

describe('normalizeFinalSchedule', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('throws for non-object payload', () => {
    expect(() => normalizeFinalSchedule(null)).toThrow('final schedule payload must be an object');
  });

  test('throws for invalid status', () => {
    const payload = makePublishedPayload({ status: 'draft' });
    expect(() => normalizeFinalSchedule(payload)).toThrow(
      'final schedule status must be published or unpublished'
    );
  });

  test('throws for invalid generatedAt', () => {
    const payload = makePublishedPayload({ generatedAt: 'not-date' });
    expect(() => normalizeFinalSchedule(payload)).toThrow('generatedAt must be a valid date-time string');
  });

  test('throws when published payload omits conferenceTimeZone', () => {
    const payload = makePublishedPayload({ conferenceTimeZone: '' });
    expect(() => normalizeFinalSchedule(payload)).toThrow('published schedule requires conferenceTimeZone');
  });

  test('throws when published payload has non-array sessions', () => {
    const payload = makePublishedPayload({ sessions: null });
    expect(() => normalizeFinalSchedule(payload)).toThrow('published schedule requires sessions array');
  });

  test('throws when published payload incorrectly includes notice', () => {
    const payload = makePublishedPayload({ notice: { code: 'SCHEDULE_UNPUBLISHED', message: 'x' } });
    expect(() => normalizeFinalSchedule(payload)).toThrow('published schedule must not include notice');
  });

  test('normalizes published payload with dual time labels and author highlight flag', () => {
    const payload = makePublishedPayload({
      viewerContext: makeAuthorViewerContext('A-102')
    });
    const result = normalizeFinalSchedule(payload, { viewerTimeZone: 'America/Vancouver' });

    expect(result.status).toBe('published');
    expect(result.sessions).toHaveLength(2);
    expect(result.sessions[0].isCurrentAuthorSession).toBe(true);
    expect(result.sessions[1].isCurrentAuthorSession).toBe(false);
    expect(result.sessions[0].conferenceTimeLabel).toContain('May');
    expect(result.sessions[0].localTimeLabel).toContain('May');
  });

  test('defaults missing optional track to empty string', () => {
    const payload = makePublishedPayload();
    const result = normalizeFinalSchedule(payload, { viewerTimeZone: 'UTC' });
    expect(result.sessions[1].track).toBe('');
  });

  test('throws when session entry is invalid object', () => {
    const payload = makePublishedPayload({ sessions: [null] });
    expect(() => normalizeFinalSchedule(payload)).toThrow('sessions entries must be objects');
  });

  test('throws when session required fields are missing', () => {
    const payload = makePublishedPayload({
      sessions: [
        {
          sessionId: 'S-1',
          title: 'Title',
          startTimeUtc: '2026-05-09T14:00:00Z',
          endTimeUtc: '2026-05-09T14:30:00Z',
          room: '',
          authorIds: ['A-1']
        }
      ]
    });

    expect(() => normalizeFinalSchedule(payload)).toThrow('session.room is required');
  });

  test('throws when authorIds are invalid', () => {
    const payload = makePublishedPayload({
      sessions: [
        {
          sessionId: 'S-1',
          title: 'Title',
          startTimeUtc: '2026-05-09T14:00:00Z',
          endTimeUtc: '2026-05-09T14:30:00Z',
          room: 'Hall A',
          authorIds: ['A-1', 2]
        }
      ]
    });

    expect(() => normalizeFinalSchedule(payload)).toThrow('session.authorIds must be an array of strings');
  });

  test('throws when session startTimeUtc is invalid', () => {
    const payload = makePublishedPayload({
      sessions: [
        {
          sessionId: 'S-1',
          title: 'Title',
          startTimeUtc: 'nope',
          endTimeUtc: '2026-05-09T14:30:00Z',
          room: 'Hall A',
          authorIds: ['A-1']
        }
      ]
    });

    expect(() => normalizeFinalSchedule(payload)).toThrow(
      'session.startTimeUtc must be a valid date-time string'
    );
  });

  test('throws when endTimeUtc is not later than startTimeUtc', () => {
    const payload = makePublishedPayload({
      sessions: [
        {
          sessionId: 'S-1',
          title: 'Title',
          startTimeUtc: '2026-05-09T14:00:00Z',
          endTimeUtc: '2026-05-09T14:00:00Z',
          room: 'Hall A',
          authorIds: ['A-1']
        }
      ]
    });

    expect(() => normalizeFinalSchedule(payload)).toThrow(
      'session.endTimeUtc must be later than session.startTimeUtc'
    );
  });

  test('falls back to UTC when resolving local timezone throws', () => {
    const originalDateTimeFormat = Intl.DateTimeFormat;

    function DateTimeFormatShim(...args) {
      if (args.length === 0) {
        throw new Error('boom');
      }

      return new originalDateTimeFormat(...args);
    }
    DateTimeFormatShim.prototype = originalDateTimeFormat.prototype;

    vi.stubGlobal('Intl', {
      ...Intl,
      DateTimeFormat: DateTimeFormatShim
    });

    const result = normalizeFinalSchedule(makePublishedPayload());
    expect(result.sessions[0].localTimeLabel).toContain('May');
  });

  test('falls back to UTC when resolved local timezone is empty', () => {
    const originalDateTimeFormat = Intl.DateTimeFormat;

    function DateTimeFormatShim(...args) {
      if (args.length === 0) {
        return {
          resolvedOptions: () => ({ timeZone: '' })
        };
      }

      return new originalDateTimeFormat(...args);
    }
    DateTimeFormatShim.prototype = originalDateTimeFormat.prototype;

    vi.stubGlobal('Intl', {
      ...Intl,
      DateTimeFormat: DateTimeFormatShim
    });

    const result = normalizeFinalSchedule(makePublishedPayload());
    expect(result.sessions[0].localTimeLabel).toContain('May');
  });

  test('throws when unpublished payload is missing notice object', () => {
    const payload = makeUnpublishedPayload({ notice: null });
    expect(() => normalizeFinalSchedule(payload)).toThrow('unpublished schedule requires notice');
  });

  test('throws when unpublished payload includes sessions', () => {
    const payload = makeUnpublishedPayload({ sessions: [] });
    expect(() => normalizeFinalSchedule(payload)).toThrow('unpublished schedule must not include sessions');
  });

  test('throws when unpublished notice code is invalid', () => {
    const payload = makeUnpublishedPayload({
      notice: { code: 'OTHER', message: 'Not published' }
    });

    expect(() => normalizeFinalSchedule(payload)).toThrow(
      'unpublished notice code must be SCHEDULE_UNPUBLISHED'
    );
  });

  test('throws when unpublished notice message is blank', () => {
    const payload = makeUnpublishedPayload({
      notice: { code: 'SCHEDULE_UNPUBLISHED', message: '   ' }
    });

    expect(() => normalizeFinalSchedule(payload)).toThrow('unpublished notice message is required');
  });

  test('normalizes unpublished payload', () => {
    const payload = makeUnpublishedPayload({
      notice: { code: 'SCHEDULE_UNPUBLISHED', message: '  Not yet published.  ' }
    });

    const result = normalizeFinalSchedule(payload);
    expect(result).toEqual({
      status: 'unpublished',
      generatedAt: payload.generatedAt,
      viewerContext: payload.viewerContext,
      notice: {
        code: 'SCHEDULE_UNPUBLISHED',
        message: 'Not yet published.'
      }
    });
  });
});
