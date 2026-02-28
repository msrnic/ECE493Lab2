import { describe, expect, it } from 'vitest';
import {
  createDraftSaveAttempt,
  DraftSaveOutcome,
  isFailureOutcome
} from '../../../src/models/draft-save-attempt-model.js';

describe('draft-save-attempt-model', () => {
  it('creates successful and failed attempts', () => {
    const success = createDraftSaveAttempt(
      {
        submissionId: 's1',
        actorUserId: 'u1',
        baseRevision: 0,
        outcome: DraftSaveOutcome.SUCCESS,
        createdVersionId: 'v1'
      },
      { idFactory: () => 'a1', now: () => '2026-01-01T00:00:00.000Z' }
    );

    expect(success.attemptId).toBe('a1');
    expect(isFailureOutcome(DraftSaveOutcome.SUCCESS)).toBe(false);
    expect(isFailureOutcome(DraftSaveOutcome.FAILED_SYSTEM)).toBe(true);

    const failed = createDraftSaveAttempt(
      {
        submissionId: 's1',
        actorUserId: 'u1',
        baseRevision: 1,
        outcome: DraftSaveOutcome.FAILED_SYSTEM,
        errorCode: 'DRAFT_SAVE_FAILED'
      },
      { idFactory: () => 'a2', now: () => '2026-01-01T00:00:01.000Z' }
    );

    expect(failed.errorCode).toBe('DRAFT_SAVE_FAILED');
  });

  it('uses default timestamp factory when now is omitted', () => {
    const attempt = createDraftSaveAttempt(
      {
        submissionId: 's-default-time',
        actorUserId: 'u-default-time',
        baseRevision: 1,
        outcome: DraftSaveOutcome.FAILED_STALE,
        errorCode: 'DRAFT_STALE'
      },
      { idFactory: () => 'a-default-time' }
    );

    expect(attempt.attemptId).toBe('a-default-time');
    expect(typeof attempt.attemptedAt).toBe('string');
  });

  it('validates save attempt inputs', () => {
    expect(() => createDraftSaveAttempt(null)).toThrow(/required/);
    expect(() => createDraftSaveAttempt({ submissionId: 's1', baseRevision: 0, outcome: 'SUCCESS' })).toThrow(
      /actorUserId/
    );
    expect(() =>
      createDraftSaveAttempt({ submissionId: 's1', actorUserId: 'u1', baseRevision: -1, outcome: 'SUCCESS' })
    ).toThrow(/baseRevision/);
    expect(() =>
      createDraftSaveAttempt({ submissionId: 's1', actorUserId: 'u1', baseRevision: 0, outcome: 'UNKNOWN' })
    ).toThrow(/invalid/);
    expect(() =>
      createDraftSaveAttempt({
        submissionId: 's1',
        actorUserId: 'u1',
        baseRevision: 0,
        outcome: DraftSaveOutcome.SUCCESS
      })
    ).toThrow(/createdVersionId/);
    expect(() =>
      createDraftSaveAttempt({
        submissionId: 's1',
        actorUserId: 'u1',
        baseRevision: 0,
        outcome: DraftSaveOutcome.FAILED_AUTH
      })
    ).toThrow(/errorCode/);
  });
});
