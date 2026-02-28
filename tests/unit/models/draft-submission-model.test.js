import { describe, expect, it } from 'vitest';
import {
  appendVersion,
  applySavedVersion,
  assertSaveAllowed,
  createDraftState,
  createDraftSubmission,
  DraftSubmissionStatus,
  ensureSubmission,
  findVersion,
  getLatestVersion,
  getSubmission,
  listSaveAttempts,
  listVersions,
  markSubmissionFinalized,
  recordSaveAttempt
} from '../../../src/models/draft-submission-model.js';

describe('draft-submission-model', () => {
  it('creates submissions and state', () => {
    const state = createDraftState();
    const first = ensureSubmission(state, { submissionId: 's1', ownerUserId: 'u1' });
    const second = ensureSubmission(state, { submissionId: 's1', ownerUserId: 'u2' });

    expect(first.ownerUserId).toBe('u1');
    expect(second).toBe(first);
    expect(getSubmission(state, 's1')).toBe(first);
  });

  it('validates submission creation and statuses', () => {
    expect(() => createDraftSubmission(null)).toThrow(/required/);
    expect(() => createDraftSubmission({ submissionId: 's1' })).toThrow(/ownerUserId/);
    expect(() => createDraftSubmission({ submissionId: 's1', ownerUserId: 'u1', status: 'X' })).toThrow(/invalid/);
  });

  it('enforces save invariants and stale checks', () => {
    const submission = createDraftSubmission({ submissionId: 's1', ownerUserId: 'u1' });
    expect(() => assertSaveAllowed(submission, -1)).toThrow(/baseRevision/);

    submission.latestRevision = 2;
    submission.latestVersionId = 'v2';
    expect(() => assertSaveAllowed(submission, 1)).toThrow(/stale/);

    submission.status = DraftSubmissionStatus.FINAL_SUBMITTED;
    expect(() => assertSaveAllowed(submission, 2)).toThrow(/finalized/);

    submission.status = DraftSubmissionStatus.IN_PROGRESS;
    expect(() => assertSaveAllowed(submission, 2)).not.toThrow();
  });

  it('manages versions and attempts buckets', () => {
    const state = createDraftState();
    ensureSubmission(state, { submissionId: 's1', ownerUserId: 'u1' });
    expect(getLatestVersion(state, 's1')).toBeNull();
    expect(listVersions(createDraftState(), 'missing')).toEqual([]);
    expect(listSaveAttempts(createDraftState(), 'missing')).toEqual([]);

    const version = { submissionId: 's1', versionId: 'v1', revision: 1, createdAt: 'now' };
    appendVersion(state, version);
    expect(listVersions(state, 's1')).toHaveLength(1);
    expect(findVersion(state, 's1', 'missing')).toBeNull();
    expect(findVersion(state, 's1', 'v1')).toBe(version);

    const submission = getSubmission(state, 's1');
    applySavedVersion(submission, version);
    expect(getLatestVersion(state, 's1')).toBe(version);

    recordSaveAttempt(
      state,
      {
        submissionId: 's1',
        attemptId: 'a1'
      }
    );
    expect(listSaveAttempts(state, 's1')).toHaveLength(1);

    expect(() => appendVersion(createDraftState(), version)).toThrow(/bucket/);
    expect(() => recordSaveAttempt(createDraftState(), { submissionId: 's1' })).toThrow(/bucket/);
  });

  it('finalizes submission once and preserves first finalized timestamp', () => {
    const submission = createDraftSubmission({ submissionId: 's1', ownerUserId: 'u1' });
    markSubmissionFinalized(submission, '2026-01-01T00:00:00.000Z');
    markSubmissionFinalized(submission, '2026-01-01T00:00:01.000Z');

    expect(submission.status).toBe(DraftSubmissionStatus.FINAL_SUBMITTED);
    expect(submission.finalizedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
