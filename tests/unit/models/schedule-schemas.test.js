import { describe, expect, it } from 'vitest';

import { parseActiveOnly, validateCreateScheduleRunRequest } from '../../../src/models/validation/scheduleSchemas.js';

describe('scheduleSchemas', () => {
  it('validates create request payloads', () => {
    expect(validateCreateScheduleRunRequest(null)).toEqual({ valid: true, data: {} });

    expect(validateCreateScheduleRunRequest([]).valid).toBe(false);
    expect(validateCreateScheduleRunRequest({ requestedByUserId: '' }).valid).toBe(false);
    expect(validateCreateScheduleRunRequest({ notes: 5 }).valid).toBe(false);
    expect(validateCreateScheduleRunRequest({ notes: 'a'.repeat(501) }).valid).toBe(false);
    expect(validateCreateScheduleRunRequest({ simulateLongRunMs: -1 }).valid).toBe(false);
    expect(validateCreateScheduleRunRequest({ simulateLongRunMs: 20000 }).valid).toBe(false);

    const valid = validateCreateScheduleRunRequest({
      requestedByUserId: 'admin-1',
      notes: 'ok',
      simulateLongRunMs: 10
    });

    expect(valid).toEqual({
      valid: true,
      data: {
        requestedByUserId: 'admin-1',
        notes: 'ok',
        simulateLongRunMs: 10
      }
    });
  });

  it('parses activeOnly query values', () => {
    expect(parseActiveOnly(undefined)).toBe(false);
    expect(parseActiveOnly(true)).toBe(true);
    expect(parseActiveOnly(false)).toBe(false);
    expect(parseActiveOnly('true')).toBe(true);
    expect(parseActiveOnly('1')).toBe(true);
    expect(parseActiveOnly('false')).toBe(false);
    expect(parseActiveOnly('0')).toBe(false);

    expect(() => parseActiveOnly('oops')).toThrow('activeOnly must be a boolean value.');
  });
});
