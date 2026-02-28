import { describe, expect, it, vi } from 'vitest';
import { createReviewerAssignmentController } from '../../../src/controllers/ReviewerAssignmentController.js';
import { createMockResponse } from '../../helpers/http-harness.js';

function reqShape({ params, query, body } = {}) {
  return {
    params: params ?? {},
    query: query ?? {},
    body
  };
}

describe('ReviewerAssignmentController', () => {
  it('serves paper/candidate listings and assignment lifecycle', async () => {
    const paperSubmissionModel = {
      listSubmittedPapers: vi.fn().mockReturnValue([{ paperId: 'paper-1' }]),
      assertPaperIsAssignable: vi.fn()
    };
    const reviewerModel = {
      listCandidates: vi.fn().mockReturnValue([{ reviewerId: 'reviewer-1' }])
    };
    const reviewerAssignmentModel = {
      createAttempt: vi.fn().mockReturnValue({ attemptId: 'attempt-1', basePaperVersion: 0 }),
      replaceSelection: vi.fn().mockReturnValue({ selectionId: 'selection-1' }),
      confirmAttempt: vi.fn().mockReturnValue({ outcome: 'confirmed' }),
      getOutcome: vi.fn().mockReturnValue({ outcome: 'confirmed' })
    };
    const invitationController = {
      dispatchForOutcome: vi.fn().mockResolvedValue({ outcome: 'confirmed', dispatched: true })
    };
    const controller = createReviewerAssignmentController({
      paperSubmissionModel,
      reviewerModel,
      reviewerAssignmentModel,
      invitationController
    });

    const invalidQueryRes = createMockResponse();
    await controller.listSubmittedPapers(reqShape({ query: { state: 'draft' } }), invalidQueryRes);
    expect(invalidQueryRes.statusCode).toBe(400);

    const papersRes = createMockResponse();
    await controller.listSubmittedPapers(reqShape({ query: { state: 'submitted' } }), papersRes);
    expect(papersRes.statusCode).toBe(200);
    expect(papersRes.body.papers).toHaveLength(1);

    const candidatesRes = createMockResponse();
    await controller.listReviewerCandidates(reqShape({ params: { paperId: 'paper-1' } }), candidatesRes);
    expect(candidatesRes.statusCode).toBe(200);

    const createAttemptRes = createMockResponse();
    await controller.createAttempt(
      {
        ...reqShape({ params: { paperId: 'paper-1' }, body: { editorId: 'editor-1' } }),
        assignmentEditorId: 'editor-session'
      },
      createAttemptRes
    );
    expect(createAttemptRes.statusCode).toBe(201);
    expect(reviewerAssignmentModel.createAttempt).toHaveBeenCalledWith('paper-1', {
      editorId: 'editor-session'
    });

    const replaceRes = createMockResponse();
    await controller.replaceSelection(
      reqShape({
        params: { paperId: 'paper-1', attemptId: 'attempt-1', selectionId: 'selection-1' },
        body: { replacementReviewerId: 'reviewer-2' }
      }),
      replaceRes
    );
    expect(replaceRes.statusCode).toBe(200);

    const confirmRes = createMockResponse();
    await controller.confirmAttempt(
      {
        ...reqShape({
          params: { paperId: 'paper-1', attemptId: 'attempt-1' },
          body: { basePaperVersion: 0 }
        }),
        assignmentEditorId: 'editor-session'
      },
      confirmRes
    );
    expect(confirmRes.statusCode).toBe(200);
    expect(confirmRes.body.dispatched).toBe(true);
    expect(reviewerAssignmentModel.confirmAttempt).toHaveBeenCalledWith('paper-1', 'attempt-1', {
      basePaperVersion: 0,
      editorId: 'editor-session'
    });

    const outcomeRes = createMockResponse();
    await controller.getOutcome(
      reqShape({
        params: { paperId: 'paper-1', attemptId: 'attempt-1' }
      }),
      outcomeRes
    );
    expect(outcomeRes.statusCode).toBe(200);
  });

  it('maps errors for all handlers, including stale and blocking metadata', async () => {
    const staleError = Object.assign(new Error('stale'), {
      code: 'STALE_CONFIRMATION',
      status: 409,
      currentAssignmentVersion: 2
    });
    const blockedError = Object.assign(new Error('blocked'), {
      code: 'ASSIGNMENT_BLOCKED',
      status: 400,
      blockingSelectionIds: ['selection-1']
    });
    const paperSubmissionModel = {
      listSubmittedPapers: vi.fn().mockImplementation(() => {
        throw Object.assign(new Error('list failed'), { code: 'LIST_FAIL', status: 500 });
      }),
      assertPaperIsAssignable: vi.fn().mockImplementation(() => {
        throw Object.assign(new Error('paper missing'), { code: 'PAPER_NOT_FOUND', status: 404 });
      })
    };
    const reviewerModel = {
      listCandidates: vi.fn().mockReturnValue([])
    };
    const reviewerAssignmentModel = {
      createAttempt: vi.fn().mockImplementation(() => {
        throw Object.assign(new Error('create failed'), { code: 'ASSIGNMENT_BAD_REQUEST', status: 400 });
      }),
      replaceSelection: vi.fn().mockImplementation(() => {
        throw blockedError;
      }),
      confirmAttempt: vi.fn().mockImplementation(() => {
        throw staleError;
      }),
      getOutcome: vi.fn().mockImplementation(() => {
        throw new Error('outcome unavailable');
      })
    };
    const controller = createReviewerAssignmentController({
      paperSubmissionModel,
      reviewerModel,
      reviewerAssignmentModel
    });

    const listRes = createMockResponse();
    await controller.listSubmittedPapers(reqShape({ query: { state: 'submitted' } }), listRes);
    expect(listRes.statusCode).toBe(500);

    const candidatesRes = createMockResponse();
    await controller.listReviewerCandidates(reqShape({ params: { paperId: 'paper-1' } }), candidatesRes);
    expect(candidatesRes.statusCode).toBe(404);

    const createRes = createMockResponse();
    await controller.createAttempt(reqShape({ params: { paperId: 'paper-1' }, body: {} }), createRes);
    expect(createRes.statusCode).toBe(400);

    const replaceRes = createMockResponse();
    await controller.replaceSelection(
      reqShape({ params: { paperId: 'paper-1', attemptId: 'a1', selectionId: 's1' }, body: {} }),
      replaceRes
    );
    expect(replaceRes.statusCode).toBe(400);
    expect(replaceRes.body.blockingSelectionIds).toEqual(['selection-1']);

    const confirmRes = createMockResponse();
    await controller.confirmAttempt(
      reqShape({ params: { paperId: 'paper-1', attemptId: 'a1' }, body: {} }),
      confirmRes
    );
    expect(confirmRes.statusCode).toBe(409);
    expect(confirmRes.body.currentAssignmentVersion).toBe(2);

    const outcomeRes = createMockResponse();
    await controller.getOutcome(reqShape({ params: { paperId: 'paper-1', attemptId: 'a1' } }), outcomeRes);
    expect(outcomeRes.statusCode).toBe(500);
    expect(outcomeRes.body.code).toBe('INTERNAL_ERROR');
  });

  it('uses fallback error message and supports confirm without invitation controller', async () => {
    const paperSubmissionModel = {
      listSubmittedPapers: vi.fn().mockReturnValue([]),
      assertPaperIsAssignable: vi.fn()
    };
    const reviewerModel = {
      listCandidates: vi.fn().mockReturnValue([])
    };
    const reviewerAssignmentModel = {
      createAttempt: vi.fn().mockImplementation(() => {
        throw { status: 500, code: 'UNKNOWN' };
      }),
      replaceSelection: vi.fn().mockReturnValue({ selectionId: 's1' }),
      confirmAttempt: vi.fn().mockReturnValue({ outcome: 'confirmed' }),
      getOutcome: vi.fn().mockReturnValue({ outcome: 'confirmed' })
    };
    const controller = createReviewerAssignmentController({
      paperSubmissionModel,
      reviewerModel,
      reviewerAssignmentModel
    });

    const createRes = createMockResponse();
    await controller.createAttempt(reqShape({ params: { paperId: 'paper-1' } }), createRes);
    expect(createRes.statusCode).toBe(500);
    expect(createRes.body.message).toBe('Unexpected error.');
    expect(reviewerAssignmentModel.createAttempt).toHaveBeenCalledWith('paper-1', {});

    const confirmRes = createMockResponse();
    await controller.confirmAttempt(reqShape({ params: { paperId: 'paper-1', attemptId: 'a1' } }), confirmRes);
    expect(confirmRes.statusCode).toBe(200);
    expect(confirmRes.body.outcome).toBe('confirmed');
    expect(reviewerAssignmentModel.confirmAttempt).toHaveBeenCalledWith('paper-1', 'a1', {});
  });
});
