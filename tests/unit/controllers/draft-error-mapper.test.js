import { describe, expect, it } from 'vitest';
import { mapDraftError, mapErrorToOutcome } from '../../../src/controllers/draft-error-mapper.js';

describe('draft-error-mapper', () => {
  it('maps known errors and unknown errors', () => {
    expect(mapDraftError(null).status).toBe(500);
    expect(mapDraftError({ code: 'DRAFT_AUTH_REQUIRED' }).status).toBe(401);
    expect(mapDraftError({ code: 'DRAFT_FORBIDDEN' }).status).toBe(403);
    expect(mapDraftError({ code: 'DRAFT_STALE', latestRevision: 2 }).status).toBe(409);
    expect(mapDraftError({ code: 'DRAFT_NOT_FOUND', message: 'missing' }).status).toBe(404);
    expect(mapDraftError({ code: 'DRAFT_BAD_REQUEST', message: 'bad' }).status).toBe(400);
    expect(mapDraftError({ code: 'DRAFT_BAD_REVISION', message: 'bad' }).status).toBe(400);
    expect(mapDraftError({ code: 'DRAFT_SAVE_FAILED', message: 'oops' }).status).toBe(500);
    expect(mapDraftError({ code: 'OTHER' }).status).toBe(500);
  });

  it('uses fallback messages when mapped errors omit explicit message text', () => {
    expect(mapDraftError({ code: 'DRAFT_NOT_FOUND' }).body.message).toContain('not found');
    expect(mapDraftError({ code: 'DRAFT_BAD_REQUEST' }).body.message).toContain('validation');
    expect(mapDraftError({ code: 'DRAFT_SAVE_FAILED' }).body.message).toContain('system error');
  });

  it('maps errors to save attempt outcomes', () => {
    expect(mapErrorToOutcome('DRAFT_STALE')).toBe('FAILED_STALE');
    expect(mapErrorToOutcome('DRAFT_AUTH_REQUIRED')).toBe('FAILED_AUTH');
    expect(mapErrorToOutcome('DRAFT_FORBIDDEN')).toBe('FAILED_AUTH');
    expect(mapErrorToOutcome('DRAFT_SAVE_FAILED')).toBe('FAILED_SYSTEM');
  });
});
