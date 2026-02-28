import { describe, expect, it } from 'vitest';
import { applyRetentionPrune, pruneVersionsForSubmission } from '../../../src/models/draft-retention-policy.js';
import {
  createDraftState,
  createDraftSubmission,
  DraftSubmissionStatus,
  ensureSubmission
} from '../../../src/models/draft-submission-model.js';

describe('draft-retention-policy', () => {
  it('returns unchanged versions when submission is still in progress', () => {
    const submission = createDraftSubmission({ submissionId: 's1', ownerUserId: 'u1' });
    const versions = [{ versionId: 'v1', revision: 1 }];
    const result = pruneVersionsForSubmission(submission, versions);

    expect(result.retainedVersions).toBe(versions);
    expect(result.prunedVersions).toEqual([]);
  });

  it('handles finalized submissions with one or many versions', () => {
    const finalized = createDraftSubmission({
      submissionId: 's1',
      ownerUserId: 'u1',
      status: DraftSubmissionStatus.FINAL_SUBMITTED,
      latestVersionId: 'v2'
    });

    const one = pruneVersionsForSubmission(finalized, [{ versionId: 'v2', revision: 2 }]);
    expect(one.prunedVersions).toEqual([]);

    const many = pruneVersionsForSubmission(finalized, [
      { versionId: 'v1', revision: 1 },
      { versionId: 'v2', revision: 2 },
      { versionId: 'v3', revision: 3 }
    ]);
    expect(many.retainedVersionId).toBe('v2');
    expect(many.prunedVersions).toHaveLength(2);

    const fallbackLatest = pruneVersionsForSubmission(
      { ...finalized, latestVersionId: 'missing' },
      [
        { versionId: 'v1', revision: 1 },
        { versionId: 'v3', revision: 3 }
      ]
    );
    expect(fallbackLatest.retainedVersionId).toBe('v3');
  });

  it('applies prune results to state and validates inputs', () => {
    const state = createDraftState();
    ensureSubmission(state, {
      submissionId: 's1',
      ownerUserId: 'u1',
      status: DraftSubmissionStatus.FINAL_SUBMITTED,
      latestVersionId: 'v2'
    });

    state.submissions.get('s1').status = DraftSubmissionStatus.FINAL_SUBMITTED;
    state.submissions.get('s1').latestVersionId = 'v2';
    state.versions.set('s1', [
      { versionId: 'v1', revision: 1 },
      { versionId: 'v2', revision: 2 }
    ]);

    const result = applyRetentionPrune(state, 's1');
    expect(result.prunedVersionCount).toBe(1);
    expect(state.versions.get('s1')).toEqual([{ versionId: 'v2', revision: 2 }]);

    const sparseState = createDraftState();
    sparseState.submissions.set('s2', {
      submissionId: 's2',
      ownerUserId: 'u2',
      status: DraftSubmissionStatus.FINAL_SUBMITTED,
      latestVersionId: null
    });
    const sparseResult = applyRetentionPrune(sparseState, 's2');
    expect(sparseResult.prunedVersionCount).toBe(0);

    expect(() => pruneVersionsForSubmission(null, [])).toThrow(/required/);
    expect(() => applyRetentionPrune(state, 'missing')).toThrow(/not found/);
  });
});
