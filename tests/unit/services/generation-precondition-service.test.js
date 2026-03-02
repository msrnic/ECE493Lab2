import { describe, expect, it } from 'vitest';

import GenerationPreconditionService from '../../../src/models/services/GenerationPreconditionService.js';

const service = new GenerationPreconditionService();

describe('GenerationPreconditionService', () => {
  it('fails when accepted papers are missing', () => {
    const result = service.validate({ acceptedPapers: [], sessionSlots: [] });
    expect(result).toEqual({
      ok: false,
      code: 'NO_ACCEPTED_PAPERS',
      message: 'At least one accepted paper is required before generation can start.'
    });
  });

  it('fails when paper metadata is invalid', () => {
    const result = service.validate({
      acceptedPapers: [{ paperId: '', trackId: 'ai', durationMinutes: 30 }],
      sessionSlots: [{
        sessionSlotId: 'slot-1',
        trackId: 'ai',
        capacity: 1,
        startAt: '2026-01-01T10:00:00.000Z',
        endAt: '2026-01-01T11:00:00.000Z'
      }]
    });

    expect(result.code).toBe('MISSING_PAPER_METADATA');
  });

  it('fails when session slots are missing', () => {
    const result = service.validate({
      acceptedPapers: [{ paperId: 'p1', trackId: 'ai', durationMinutes: 30 }],
      sessionSlots: []
    });

    expect(result.code).toBe('NO_SESSION_SLOTS');
  });

  it('fails when session slot metadata is invalid', () => {
    const result = service.validate({
      acceptedPapers: [{ paperId: 'p1', trackId: 'ai', durationMinutes: 30 }],
      sessionSlots: [{
        sessionSlotId: 'slot-1',
        trackId: 'ai',
        capacity: 0,
        startAt: '2026-01-01T11:00:00.000Z',
        endAt: '2026-01-01T10:00:00.000Z'
      }]
    });

    expect(result.code).toBe('MISSING_SESSION_METADATA');
  });

  it('fails when required session slot fields are missing', () => {
    const result = service.validate({
      acceptedPapers: [{ paperId: 'p1', trackId: 'ai', durationMinutes: 30 }],
      sessionSlots: [{
        sessionSlotId: '',
        trackId: 'ai',
        capacity: 1,
        startAt: '2026-01-01T10:00:00.000Z',
        endAt: '2026-01-01T11:00:00.000Z'
      }]
    });

    expect(result.code).toBe('MISSING_SESSION_METADATA');
  });

  it('passes with valid prerequisites', () => {
    const result = service.validate({
      acceptedPapers: [{ paperId: 'p1', trackId: 'ai', durationMinutes: 30 }],
      sessionSlots: [{
        sessionSlotId: 'slot-1',
        trackId: 'ai',
        capacity: 1,
        startAt: '2026-01-01T10:00:00.000Z',
        endAt: '2026-01-01T11:00:00.000Z'
      }]
    });

    expect(result).toEqual({ ok: true });
  });
});
