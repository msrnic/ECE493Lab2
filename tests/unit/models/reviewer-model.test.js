import { describe, expect, it } from 'vitest';
import { createReviewerModel } from '../../../src/models/ReviewerModel.js';

describe('ReviewerModel', () => {
  it('lists candidates and resolves candidate records', () => {
    const model = createReviewerModel();
    const candidates = model.listCandidates('paper-001');
    expect(candidates).toHaveLength(4);
    expect(model.getCandidateById('paper-001', 'reviewer-001')?.displayName).toContain('Alex');
    expect(model.getCandidateById('paper-001', 'missing')).toBeNull();
  });

  it('throws when paper or reviewer does not exist', () => {
    const model = createReviewerModel();
    expect(() => model.listCandidates('missing-paper')).toThrow(/paper was not found/);
    expect(() => model.getCandidateOrThrow('paper-001', 'missing')).toThrow(/not found for paper/);
  });

  it('updates candidate status', () => {
    const model = createReviewerModel();
    const updated = model.updateCandidate('paper-001', 'reviewer-002', {
      availabilityStatus: 'available',
      coiFlag: false
    });
    expect(updated.availabilityStatus).toBe('available');
    expect(updated.coiFlag).toBe(false);
  });

  it('includes active reviewer accounts from persisted user records', () => {
    const model = createReviewerModel({
      repository: {
        listUserAccounts: () => ([
          {
            id: 'acct-1',
            fullName: 'Reviewer Account',
            emailNormalized: 'reviewer.account@example.com',
            status: 'active',
            role: 'reviewer',
            lastAssignedRole: 'editor'
          },
          {
            id: 'acct-2',
            fullName: 'Legacy Reviewer Only',
            emailNormalized: 'legacy.reviewer.only@example.com',
            status: 'active',
            role: 'editor',
            lastAssignedRole: 'reviewer'
          },
          {
            id: 'acct-3',
            fullName: 'Editor Account',
            emailNormalized: 'editor.account@example.com',
            status: 'active',
            role: 'editor',
            lastAssignedRole: 'editor'
          },
          {
            id: 'acct-4',
            emailNormalized: 'role-fallback@example.com',
            status: 'active',
            role: 'reviewer'
          },
          {
            id: 'acct-5',
            fullName: 'Pending Reviewer',
            emailNormalized: 'pending.reviewer@example.com',
            status: 'pending',
            role: 'reviewer',
            lastAssignedRole: 'reviewer'
          }
        ])
      }
    });

    const candidates = model.listCandidates('paper-001');
    expect(candidates.some((candidate) => candidate.reviewerId === 'account-acct-1')).toBe(true);
    expect(candidates.some((candidate) => candidate.reviewerId === 'account-acct-2')).toBe(false);
    expect(candidates.some((candidate) => candidate.reviewerId === 'account-acct-3')).toBe(false);
    expect(candidates.some((candidate) => candidate.reviewerId === 'account-acct-5')).toBe(false);
    expect(candidates.some((candidate) => candidate.reviewerId === 'account-acct-4')).toBe(true);
    expect(model.getCandidateById('paper-001', 'account-acct-1')?.displayName).toBe('Reviewer Account');
    expect(model.getCandidateById('paper-001', 'account-acct-4')?.displayName).toBe('role-fallback@example.com');
    expect(model.updateCandidate('paper-001', 'account-acct-1', { availabilityStatus: 'unavailable' }).availabilityStatus)
      .toBe('unavailable');
  });
});
