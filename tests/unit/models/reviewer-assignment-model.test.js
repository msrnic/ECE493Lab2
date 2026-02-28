import { describe, expect, it } from 'vitest';
import { createPaperSubmissionModel } from '../../../src/models/PaperSubmissionModel.js';
import { createReviewerModel } from '../../../src/models/ReviewerModel.js';
import { createReviewerAssignmentModel } from '../../../src/models/ReviewerAssignmentModel.js';
import { createReviewInvitationModel } from '../../../src/models/ReviewInvitationModel.js';

function createContext() {
  let sequence = 0;
  const idFactory = () => `id-${++sequence}`;
  const paperSubmissionModel = createPaperSubmissionModel();
  const reviewerModel = createReviewerModel();
  const invitationModel = createReviewInvitationModel({
    idFactory,
    nowFn: () => '2026-02-08T15:00:00.000Z'
  });
  const reviewerAssignmentModel = createReviewerAssignmentModel({
    paperSubmissionModel,
    reviewerModel,
    invitationModel,
    idFactory,
    nowFn: () => '2026-02-08T15:00:00.000Z'
  });

  return {
    paperSubmissionModel,
    reviewerModel,
    invitationModel,
    reviewerAssignmentModel
  };
}

describe('ReviewerAssignmentModel', () => {
  it('creates attempts with ready-to-confirm and blocked states', () => {
    const { reviewerAssignmentModel } = createContext();

    const readyAttempt = reviewerAssignmentModel.createAttempt('paper-001', {
      editorId: 'editor-1',
      basePaperVersion: 0,
      selections: [
        { slotNumber: 1, reviewerId: 'reviewer-001' },
        { slotNumber: 2, reviewerId: 'reviewer-004' }
      ]
    });
    expect(readyAttempt.status).toBe('ready_to_confirm');

    const blockedUnavailable = reviewerAssignmentModel.createAttempt('paper-001', {
      editorId: 'editor-1',
      basePaperVersion: 0,
      selections: [
        { slotNumber: 1, reviewerId: 'reviewer-002' },
        { slotNumber: 2, reviewerId: 'reviewer-004' }
      ]
    });
    expect(blockedUnavailable.status).toBe('blocked_unavailable');

    const blockedCoi = reviewerAssignmentModel.createAttempt('paper-001', {
      editorId: 'editor-1',
      basePaperVersion: 0,
      selections: [
        { reviewerId: 'reviewer-003' },
        { slotNumber: 2, reviewerId: 'reviewer-004' }
      ]
    });
    expect(blockedCoi.status).toBe('blocked_coi');
    expect(blockedCoi.selections[0].slotNumber).toBe(1);
  });

  it('rejects invalid attempt payloads', () => {
    const { reviewerAssignmentModel, paperSubmissionModel } = createContext();

    expect(() =>
      reviewerAssignmentModel.createAttempt('paper-001', {
        editorId: 'editor-1',
        basePaperVersion: -1,
        selections: [{ reviewerId: 'reviewer-001' }]
      })
    ).toThrow(/non-negative integer/);

    expect(() =>
      reviewerAssignmentModel.createAttempt('paper-001', {
        editorId: 'editor-1',
        basePaperVersion: 0,
        selections: [{ reviewerId: 'reviewer-001' }, { reviewerId: 'reviewer-001' }]
      })
    ).toThrow(/unique per assignment attempt/);

    paperSubmissionModel.incrementAssignmentVersion('paper-001');
    expect(() =>
      reviewerAssignmentModel.createAttempt('paper-001', {
        editorId: 'editor-1',
        basePaperVersion: 0,
        selections: [{ reviewerId: 'reviewer-001' }]
      })
    ).toThrow(/reload current state/);
  });

  it('replaces blocked selections and validates uniqueness', () => {
    const { reviewerAssignmentModel, reviewerModel } = createContext();
    const attempt = reviewerAssignmentModel.createAttempt('paper-001', {
      editorId: 'editor-2',
      basePaperVersion: 0,
      selections: [
        { slotNumber: 1, reviewerId: 'reviewer-002' },
        { slotNumber: 2, reviewerId: 'reviewer-004' }
      ]
    });
    const blockedSelection = attempt.selections.find((selection) => selection.status === 'needs_replacement');

    expect(() =>
      reviewerAssignmentModel.replaceSelection('paper-001', attempt.attemptId, blockedSelection.selectionId, 'reviewer-004')
    ).toThrow(/must be unique/);
    expect(() =>
      reviewerAssignmentModel.replaceSelection('paper-001', attempt.attemptId, 'missing-selection', 'reviewer-001')
    ).toThrow(/selection was not found/);
    expect(() =>
      reviewerAssignmentModel.replaceSelection('paper-001', 'missing-attempt', blockedSelection.selectionId, 'reviewer-001')
    ).toThrow(/attempt was not found/);

    reviewerModel.updateCandidate('paper-001', 'reviewer-003', { coiFlag: true, availabilityStatus: 'available' });
    const stillBlocked = reviewerAssignmentModel.replaceSelection(
      'paper-001',
      attempt.attemptId,
      blockedSelection.selectionId,
      'reviewer-003'
    );
    expect(stillBlocked.status).toBe('needs_replacement');

    reviewerModel.updateCandidate('paper-001', 'reviewer-001', { coiFlag: false, availabilityStatus: 'available' });
    const resolved = reviewerAssignmentModel.replaceSelection(
      'paper-001',
      attempt.attemptId,
      blockedSelection.selectionId,
      'reviewer-001'
    );
    expect(resolved.status).toBe('eligible');
    expect(resolved.replacedReviewerId).toBe('reviewer-002');
    expect(reviewerAssignmentModel.getAttempt('paper-001', attempt.attemptId).status).toBe('ready_to_confirm');
  });

  it('blocks confirmation for unresolved selections and returns not-found outcome', () => {
    const { reviewerAssignmentModel } = createContext();
    const blockedAttempt = reviewerAssignmentModel.createAttempt('paper-001', {
      editorId: 'editor-3',
      basePaperVersion: 0,
      selections: [{ slotNumber: 1, reviewerId: 'reviewer-002' }]
    });

    expect(() =>
      reviewerAssignmentModel.confirmAttempt('paper-001', blockedAttempt.attemptId, {
        editorId: 'editor-3',
        basePaperVersion: 0
      })
    ).toThrow(/must be replaced/);

    expect(() => reviewerAssignmentModel.getOutcome('paper-001', blockedAttempt.attemptId)).toThrow(/not available yet/);
  });

  it('handles stale confirmation and stale outcome payload', () => {
    const { reviewerAssignmentModel, paperSubmissionModel } = createContext();
    const attempt = reviewerAssignmentModel.createAttempt('paper-001', {
      editorId: 'editor-4',
      basePaperVersion: 0,
      selections: [{ slotNumber: 1, reviewerId: 'reviewer-001' }]
    });

    paperSubmissionModel.incrementAssignmentVersion('paper-001');
    expect(() =>
      reviewerAssignmentModel.confirmAttempt('paper-001', attempt.attemptId, {
        editorId: 'editor-4',
        basePaperVersion: 0
      })
    ).toThrow(/already confirmed/);

    const staleOutcome = reviewerAssignmentModel.getOutcome('paper-001', attempt.attemptId);
    expect(staleOutcome.outcome).toBe('rejected_stale');
  });

  it('confirms assignment and refreshes outcome invitation states', async () => {
    const { reviewerAssignmentModel, invitationModel } = createContext();
    const attempt = reviewerAssignmentModel.createAttempt('paper-001', {
      editorId: 'editor-5',
      basePaperVersion: 0,
      selections: [
        { slotNumber: 1, reviewerId: 'reviewer-002' },
        { slotNumber: 2, reviewerId: 'reviewer-004' }
      ]
    });
    const blockedSelection = attempt.selections.find((selection) => selection.status === 'needs_replacement');
    reviewerAssignmentModel.replaceSelection('paper-001', attempt.attemptId, blockedSelection.selectionId, 'reviewer-001');

    const outcome = reviewerAssignmentModel.confirmAttempt('paper-001', attempt.attemptId, {
      editorId: 'editor-5',
      basePaperVersion: 0
    });
    expect(outcome.outcome).toBe('confirmed');
    expect(outcome.assignedReviewers).toHaveLength(2);
    expect(outcome.replacedReviewers).toHaveLength(1);
    expect(reviewerAssignmentModel.listAssignments(attempt.attemptId)).toHaveLength(2);

    const firstInvitationId = outcome.assignedReviewers[0].invitation.invitationId;
    await invitationModel.dispatchInvitation(firstInvitationId, async () => ({ accepted: true }));
    const refreshed = reviewerAssignmentModel.getOutcome('paper-001', attempt.attemptId);
    expect(refreshed.assignedReviewers[0].invitation.status).toBe('sent');
    invitationModel.getInvitation = () => null;
    const fallbackOutcome = reviewerAssignmentModel.getOutcome('paper-001', attempt.attemptId);
    expect(fallbackOutcome.assignedReviewers[0].invitation.invitationId).toBe(firstInvitationId);
    expect(() => reviewerAssignmentModel.getAttempt('paper-001', 'missing')).toThrow(/not found/);
    expect(reviewerAssignmentModel.listAssignments('missing-attempt')).toEqual([]);
  });

  it('uses default nowFn when none is provided', () => {
    let sequence = 0;
    const idFactory = () => `default-now-id-${++sequence}`;
    const paperSubmissionModel = createPaperSubmissionModel();
    const reviewerModel = createReviewerModel();
    const invitationModel = createReviewInvitationModel({
      idFactory,
      nowFn: () => '2026-02-08T20:00:00.000Z'
    });
    const model = createReviewerAssignmentModel({
      paperSubmissionModel,
      reviewerModel,
      invitationModel,
      idFactory
    });

    const attempt = model.createAttempt('paper-001', {
      editorId: 'editor-default-now',
      basePaperVersion: 0,
      selections: [{ reviewerId: 'reviewer-001' }]
    });
    const outcome = model.confirmAttempt('paper-001', attempt.attemptId, {
      editorId: 'editor-default-now',
      basePaperVersion: 0
    });
    expect(outcome.outcome).toBe('confirmed');
    expect(model.getAttempt('paper-001', attempt.attemptId).confirmedAt).toMatch(/T/);
  });
});
