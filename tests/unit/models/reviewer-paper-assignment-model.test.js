import { describe, expect, it } from 'vitest';
import { createReviewerPaperAssignmentModel } from '../../../src/models/reviewer-paper-assignment-model.js';

describe('reviewer-paper-assignment-model', () => {
  it('upserts and retrieves assignments', () => {
    const model = createReviewerPaperAssignmentModel();
    const saved = model.upsertAssignment({
      assignmentId: 'asg-1',
      reviewerId: 'account-reviewer-1',
      paperId: 'paper-1'
    });

    expect(saved.accessState).toBe('ACTIVE');
    expect(model.getAssignment('asg-1')).toEqual(saved);
    expect(model.getAssignment('unknown-asg')).toBeNull();
  });

  it('updates access state and returns null for unknown assignment', () => {
    const model = createReviewerPaperAssignmentModel({
      seedAssignments: [{
        assignmentId: 'asg-2',
        reviewerId: 'account-reviewer-2',
        paperId: 'paper-2',
        accessState: 'ACTIVE'
      }]
    });

    expect(model.setAccessState('missing', 'REVOKED')).toBeNull();
    expect(model.setAccessState('asg-2', 'REVOKED').accessState).toBe('REVOKED');
  });

  it('resolves access grants and denials', () => {
    const model = createReviewerPaperAssignmentModel({
      seedAssignments: [{
        assignmentId: 'asg-3',
        reviewerId: 'account-reviewer-3',
        paperId: 'paper-3',
        accessState: 'ACTIVE'
      }]
    });

    expect(
      model.resolveAccess({
        assignmentId: 'asg-3',
        reviewerId: 'account-reviewer-3'
      })
    ).toMatchObject({
      allowed: true,
      reasonCode: 'ACCESS_GRANTED'
    });

    expect(
      model.resolveAccess({
        assignmentId: 'asg-3',
        reviewerId: 'account-other'
      })
    ).toMatchObject({
      allowed: false,
      reasonCode: 'ASSIGNMENT_FORBIDDEN'
    });

    model.setAccessState('asg-3', 'REVOKED');
    expect(
      model.resolveAccess({
        assignmentId: 'asg-3',
        reviewerId: 'account-reviewer-3'
      })
    ).toMatchObject({
      allowed: false,
      reasonCode: 'ASSIGNMENT_ACCESS_REVOKED'
    });

    expect(
      model.resolveAccess({
        assignmentId: 'unknown',
        reviewerId: 'account-reviewer-3'
      })
    ).toMatchObject({
      allowed: false,
      reasonCode: 'ASSIGNMENT_FORBIDDEN'
    });
  });

  it('validates required fields and access states', () => {
    const model = createReviewerPaperAssignmentModel();

    expect(() => model.upsertAssignment({
      assignmentId: '',
      reviewerId: 'account-reviewer-4',
      paperId: 'paper-4'
    })).toThrow(/assignmentId must be a non-empty string/);

    expect(() => model.upsertAssignment({
      assignmentId: 'asg-4',
      reviewerId: '',
      paperId: 'paper-4'
    })).toThrow(/reviewerId must be a non-empty string/);

    expect(() => model.upsertAssignment({
      assignmentId: 'asg-4',
      reviewerId: 'account-reviewer-4',
      paperId: 'paper-4',
      accessState: 'INVALID'
    })).toThrow(/accessState must be one of ACTIVE, REVOKED/);
  });
});
