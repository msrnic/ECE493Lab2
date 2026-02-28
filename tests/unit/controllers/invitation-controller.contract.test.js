import { describe, expect, it, vi } from 'vitest';
import { createInvitationController } from '../../../src/controllers/InvitationController.js';
import { createMockResponse } from '../../helpers/http-harness.js';

function createReq({
  params = {},
  body,
  headers,
  query,
  authenticatedReviewerId
} = {}) {
  return {
    params,
    body,
    headers: headers ?? {},
    query: query ?? {},
    authenticatedReviewerId
  };
}

describe('InvitationController contract endpoints', () => {
  it('creates/reuses invitations by assignment and serves contract status', async () => {
    const invitationModel = {
      triggerInvitationDelivery: vi
        .fn()
        .mockResolvedValueOnce({
          reused: false,
          invitation: { id: 'inv-1', status: 'delivered' }
        })
        .mockResolvedValueOnce({
          reused: true,
          invitation: { id: 'inv-1', status: 'pending' }
        }),
      getInvitationStatus: vi
        .fn()
        .mockReturnValueOnce({ id: 'inv-1', status: 'delivered' })
        .mockReturnValueOnce(null)
    };
    const controller = createInvitationController({ invitationModel });

    const missingPayloadRes = createMockResponse();
    await controller.triggerByAssignment(
      createReq({ params: { assignmentId: 'asg-1' }, body: { paperId: 'paper-1' } }),
      missingPayloadRes
    );
    expect(missingPayloadRes.statusCode).toBe(400);

    const createdRes = createMockResponse();
    await controller.triggerByAssignment(
      createReq({
        params: { assignmentId: 'asg-1' },
        body: { paperId: 'paper-1', reviewerId: 'reviewer-1' }
      }),
      createdRes
    );
    expect(createdRes.statusCode).toBe(202);

    const reusedRes = createMockResponse();
    await controller.triggerByAssignment(
      createReq({
        params: { assignmentId: 'asg-1' },
        body: { paperId: 'paper-1', reviewerId: 'reviewer-1' }
      }),
      reusedRes
    );
    expect(reusedRes.statusCode).toBe(200);

    const statusRes = createMockResponse();
    await controller.getContractStatus(createReq({ params: { invitationId: 'inv-1' } }), statusRes);
    expect(statusRes.statusCode).toBe(200);

    const notFoundRes = createMockResponse();
    await controller.getContractStatus(createReq({ params: { invitationId: 'missing' } }), notFoundRes);
    expect(notFoundRes.statusCode).toBe(404);
  });

  it('records delivery events and maps request validation and thrown errors', async () => {
    const invitationModel = {
      recordDeliveryEvent: vi
        .fn()
        .mockReturnValueOnce({ id: 'inv-1', status: 'delivered' })
        .mockImplementation(() => {
          throw Object.assign(new Error('attempt missing'), {
            status: 404,
            code: 'INVITATION_ATTEMPT_NOT_FOUND'
          });
        })
    };
    const controller = createInvitationController({ invitationModel });

    const badReqRes = createMockResponse();
    await controller.recordDeliveryEvent(
      createReq({ params: { invitationId: 'inv-1' }, body: { attemptId: 'a1' } }),
      badReqRes
    );
    expect(badReqRes.statusCode).toBe(400);

    const undefinedBodyRes = createMockResponse();
    await controller.recordDeliveryEvent(
      createReq({ params: { invitationId: 'inv-1' } }),
      undefinedBodyRes
    );
    expect(undefinedBodyRes.statusCode).toBe(400);

    const okRes = createMockResponse();
    await controller.recordDeliveryEvent(
      createReq({
        params: { invitationId: 'inv-1' },
        body: {
          attemptId: 'a1',
          eventType: 'delivered',
          occurredAt: '2026-02-08T10:00:00.000Z'
        }
      }),
      okRes
    );
    expect(okRes.statusCode).toBe(200);

    const failedRes = createMockResponse();
    await controller.recordDeliveryEvent(
      createReq({
        params: { invitationId: 'inv-1' },
        body: {
          attemptId: 'a2',
          eventType: 'failed',
          occurredAt: '2026-02-08T10:01:00.000Z'
        }
      }),
      failedRes
    );
    expect(failedRes.statusCode).toBe(404);
    expect(failedRes.body.code).toBe('INVITATION_ATTEMPT_NOT_FOUND');
  });

  it('handles cancel/retry worker and failure-log list contract routes', async () => {
    const invitationModel = {
      cancelInvitationByAssignment: vi.fn().mockReturnValue({ id: 'inv-1', status: 'canceled' }),
      processDueRetries: vi
        .fn()
        .mockResolvedValue({
          runAt: '2026-02-08T10:05:00.000Z',
          processedInvitations: 1,
          attemptsCreated: 1,
          completed: 0,
          failed: 0,
          canceled: 0
        }),
      listFailureLogsByPaper: vi.fn().mockReturnValue({
        paperId: 'paper-1',
        entries: [],
        page: 1,
        pageSize: 20,
        total: 0
      })
    };
    const controller = createInvitationController({ invitationModel });

    const badReasonRes = createMockResponse();
    await controller.cancelByAssignment(
      createReq({
        params: { assignmentId: 'asg-1' },
        body: { reason: 'wrong-reason', occurredAt: '2026-02-08T10:00:00.000Z' }
      }),
      badReasonRes
    );
    expect(badReasonRes.statusCode).toBe(400);

    const undefinedCancelBodyRes = createMockResponse();
    await controller.cancelByAssignment(
      createReq({ params: { assignmentId: 'asg-1' } }),
      undefinedCancelBodyRes
    );
    expect(undefinedCancelBodyRes.statusCode).toBe(400);

    const missingOccurredAtRes = createMockResponse();
    await controller.cancelByAssignment(
      createReq({
        params: { assignmentId: 'asg-1' },
        body: { reason: 'assignment_removed' }
      }),
      missingOccurredAtRes
    );
    expect(missingOccurredAtRes.statusCode).toBe(400);

    const canceledRes = createMockResponse();
    await controller.cancelByAssignment(
      createReq({
        params: { assignmentId: 'asg-1' },
        body: { reason: 'assignment_removed', occurredAt: '2026-02-08T10:00:00.000Z' }
      }),
      canceledRes
    );
    expect(canceledRes.statusCode).toBe(200);

    const missingRunAtRes = createMockResponse();
    await controller.retryDue(createReq({ body: {} }), missingRunAtRes);
    expect(missingRunAtRes.statusCode).toBe(400);

    const undefinedRetryBodyRes = createMockResponse();
    await controller.retryDue(createReq(), undefinedRetryBodyRes);
    expect(undefinedRetryBodyRes.statusCode).toBe(400);

    const retryRes = createMockResponse();
    await controller.retryDue(createReq({ body: { runAt: '2026-02-08T10:05:00.000Z' } }), retryRes);
    expect(retryRes.statusCode).toBe(200);

    const logsRes = createMockResponse();
    await controller.listFailureLogsByPaper(
      createReq({
        params: { paperId: 'paper-1' },
        query: { page: '2', pageSize: '10' },
        headers: {
          'x-user-role': 'EDITOR',
          'x-editor-paper-ids': 'paper-1,paper-2'
        }
      }),
      logsRes
    );
    expect(logsRes.statusCode).toBe(200);
    expect(invitationModel.listFailureLogsByPaper).toHaveBeenCalledWith('paper-1', {
      page: 2,
      pageSize: 10,
      actorRole: 'editor',
      editorPaperIds: ['paper-1', 'paper-2']
    });

    const logsArrayHeaderRes = createMockResponse();
    await controller.listFailureLogsByPaper(
      createReq({
        params: { paperId: 'paper-1' },
        headers: {
          'x-user-role': 'editor',
          'x-editor-paper-ids': ['paper-1,paper-2']
        }
      }),
      logsArrayHeaderRes
    );
    expect(logsArrayHeaderRes.statusCode).toBe(200);
    expect(invitationModel.listFailureLogsByPaper).toHaveBeenCalledWith('paper-1', {
      page: 1,
      pageSize: 20,
      actorRole: 'editor',
      editorPaperIds: ['paper-1', 'paper-2']
    });
  });

  it('returns reviewer inbox payload and supports includeInactive query parsing', async () => {
    const invitationModel = {
      listInvitationsForReviewer: vi
        .fn()
        .mockReturnValueOnce([{ id: 'inv-1', status: 'pending' }])
        .mockReturnValueOnce([{ id: 'inv-1', status: 'pending' }, { id: 'inv-2', status: 'delivered' }])
    };
    const controller = createInvitationController({ invitationModel });

    const noReviewerRes = createMockResponse();
    await controller.listReviewerInbox(createReq(), noReviewerRes);
    expect(noReviewerRes.statusCode).toBe(401);

    const activeOnlyRes = createMockResponse();
    await controller.listReviewerInbox(
      createReq({
        query: { includeInactive: 'false' },
        authenticatedReviewerId: 'account-reviewer-1'
      }),
      activeOnlyRes
    );
    expect(activeOnlyRes.statusCode).toBe(200);
    expect(activeOnlyRes.body).toEqual({
      reviewerId: 'account-reviewer-1',
      invitations: [{ id: 'inv-1', status: 'pending' }]
    });
    expect(invitationModel.listInvitationsForReviewer).toHaveBeenCalledWith('account-reviewer-1', {
      includeInactive: false
    });

    const includeAllRes = createMockResponse();
    await controller.listReviewerInbox(
      createReq({
        query: { includeInactive: 'TRUE' },
        authenticatedReviewerId: 'account-reviewer-1'
      }),
      includeAllRes
    );
    expect(includeAllRes.statusCode).toBe(200);
    expect(includeAllRes.body.invitations).toHaveLength(2);
    expect(invitationModel.listInvitationsForReviewer).toHaveBeenCalledWith('account-reviewer-1', {
      includeInactive: true
    });
  });

  it('maps unexpected controller-level errors for contract routes', async () => {
    const invitationModel = {
      triggerInvitationDelivery: vi.fn().mockRejectedValue({ status: 500, code: 'UNKNOWN' }),
      getInvitationStatus: vi.fn().mockImplementation(() => {
        throw Object.assign(new Error('status failure'), { status: 503, code: 'STATUS_FAILURE' });
      }),
      recordDeliveryEvent: vi.fn().mockImplementation(() => {
        throw { status: 500, code: 'BROKEN' };
      }),
      cancelInvitationByAssignment: vi.fn().mockImplementation(() => {
        throw Object.assign(new Error('missing'), { status: 404, code: 'INVITATION_NOT_FOUND' });
      }),
      processDueRetries: vi.fn().mockRejectedValue(new Error('retry worker failure')),
      listFailureLogsByPaper: vi.fn().mockImplementation(() => {
        throw Object.assign(new Error('forbidden'), { status: 403, code: 'INVITATION_FORBIDDEN' });
      }),
      listInvitationsForReviewer: vi.fn().mockImplementation(() => {
        throw Object.assign(new Error('reviewer inbox failure'), { status: 500, code: 'INBOX_FAILURE' });
      })
    };
    const controller = createInvitationController({ invitationModel });

    const triggerRes = createMockResponse();
    await controller.triggerByAssignment(
      createReq({ params: { assignmentId: 'asg-1' }, body: { paperId: 'paper-1', reviewerId: 'reviewer-1' } }),
      triggerRes
    );
    expect(triggerRes.statusCode).toBe(500);
    expect(triggerRes.body.message).toBe('Unexpected error.');

    const statusRes = createMockResponse();
    await controller.getContractStatus(createReq({ params: { invitationId: 'inv-1' } }), statusRes);
    expect(statusRes.statusCode).toBe(503);

    const eventRes = createMockResponse();
    await controller.recordDeliveryEvent(
      createReq({
        params: { invitationId: 'inv-1' },
        body: { attemptId: 'att', eventType: 'delivered', occurredAt: '2026-02-08T10:00:00.000Z' }
      }),
      eventRes
    );
    expect(eventRes.statusCode).toBe(500);

    const cancelRes = createMockResponse();
    await controller.cancelByAssignment(
      createReq({
        params: { assignmentId: 'asg-1' },
        body: { reason: 'assignment_removed', occurredAt: '2026-02-08T10:00:00.000Z' }
      }),
      cancelRes
    );
    expect(cancelRes.statusCode).toBe(404);

    const retryRes = createMockResponse();
    await controller.retryDue(createReq({ body: { runAt: '2026-02-08T10:05:00.000Z' } }), retryRes);
    expect(retryRes.statusCode).toBe(500);

    const logsRes = createMockResponse();
    await controller.listFailureLogsByPaper(createReq({ params: { paperId: 'paper-1' } }), logsRes);
    expect(logsRes.statusCode).toBe(403);

    const reviewerInboxRes = createMockResponse();
    await controller.listReviewerInbox(
      createReq({
        authenticatedReviewerId: 'account-reviewer-1'
      }),
      reviewerInboxRes
    );
    expect(reviewerInboxRes.statusCode).toBe(500);
  });
});
