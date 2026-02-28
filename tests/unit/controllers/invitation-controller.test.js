import { describe, expect, it, vi } from 'vitest';
import { createInvitationController } from '../../../src/controllers/InvitationController.js';
import { createMockResponse } from '../../helpers/http-harness.js';

function createReq(params = {}, headers = {}) {
  return { params, headers };
}

describe('InvitationController', () => {
  it('dispatches and retries invitations', async () => {
    const invitationModel = {
      dispatchInvitation: vi.fn().mockResolvedValue({ invitationId: 'inv-1', status: 'sent' }),
      retryInvitation: vi.fn().mockResolvedValue({ invitationId: 'inv-1', status: 'retry_scheduled' }),
      getInvitation: vi.fn().mockReturnValue({ invitationId: 'inv-1', status: 'sent' }),
      cancelInvitation: vi.fn().mockReturnValue({ invitationId: 'inv-1', status: 'canceled' }),
      getFailureLog: vi.fn().mockReturnValue({ invitationId: 'inv-1', retryCount: 0 })
    };
    const controller = createInvitationController({ invitationModel });

    const dispatchRes = createMockResponse();
    await controller.dispatch(createReq({ invitationId: 'inv-1' }), dispatchRes);
    expect(dispatchRes.statusCode).toBe(202);
    expect(dispatchRes.body.status).toBe('sent');

    const retryRes = createMockResponse();
    await controller.retry(createReq({ invitationId: 'inv-1' }), retryRes);
    expect(retryRes.statusCode).toBe(200);
    expect(retryRes.body.status).toBe('retry_scheduled');

    const statusRes = createMockResponse();
    await controller.getStatus(createReq({ invitationId: 'inv-1' }), statusRes);
    expect(statusRes.statusCode).toBe(200);

    const cancelRes = createMockResponse();
    await controller.cancel(createReq({ invitationId: 'inv-1' }), cancelRes);
    expect(cancelRes.statusCode).toBe(200);

    const failureLogRes = createMockResponse();
    await controller.getFailureLog(
      createReq({ invitationId: 'inv-1' }, { 'x-user-role': 'editor' }),
      failureLogRes
    );
    expect(failureLogRes.statusCode).toBe(200);
  });

  it('handles error and not-found paths', async () => {
    const invitationModel = {
      dispatchInvitation: vi.fn().mockRejectedValue(Object.assign(new Error('dispatch failed'), { code: 'ERR', status: 409 })),
      retryInvitation: vi.fn().mockRejectedValue(new Error('retry failed')),
      getInvitation: vi.fn().mockReturnValue(null),
      cancelInvitation: vi.fn().mockImplementation(() => {
        throw Object.assign(new Error('missing'), { code: 'INVITATION_NOT_FOUND', status: 404 });
      }),
      getFailureLog: vi.fn().mockImplementation(() => {
        throw Object.assign(new Error('forbidden'), { code: 'INVITATION_FORBIDDEN', status: 403 });
      })
    };
    const controller = createInvitationController({ invitationModel });

    const dispatchRes = createMockResponse();
    await controller.dispatch(createReq({ invitationId: 'inv-1' }), dispatchRes);
    expect(dispatchRes.statusCode).toBe(409);
    expect(dispatchRes.body.code).toBe('ERR');

    const retryRes = createMockResponse();
    await controller.retry(createReq({ invitationId: 'inv-1' }), retryRes);
    expect(retryRes.statusCode).toBe(500);
    expect(retryRes.body.code).toBe('INTERNAL_ERROR');

    const statusRes = createMockResponse();
    await controller.getStatus(createReq({ invitationId: 'inv-1' }), statusRes);
    expect(statusRes.statusCode).toBe(404);

    const cancelRes = createMockResponse();
    await controller.cancel(createReq({ invitationId: 'inv-1' }), cancelRes);
    expect(cancelRes.statusCode).toBe(404);

    const failureLogRes = createMockResponse();
    await controller.getFailureLog(
      createReq({ invitationId: 'inv-1' }, { 'x-user-role': 'reviewer' }),
      failureLogRes
    );
    expect(failureLogRes.statusCode).toBe(403);
  });

  it('dispatches invitations for all reviewers in an outcome', async () => {
    const invitationModel = {
      dispatchInvitation: vi
        .fn()
        .mockResolvedValueOnce({ invitationId: 'inv-1', status: 'sent', followUpRequired: false })
        .mockResolvedValueOnce({ invitationId: 'inv-2', status: 'failed_terminal', followUpRequired: true })
    };
    const controller = createInvitationController({ invitationModel });
    const outcome = {
      assignedReviewers: [
        { reviewerId: 'r1', invitation: { invitationId: 'inv-1' } },
        { reviewerId: 'r2', invitation: { invitationId: 'inv-2' } }
      ],
      followUpRequired: false
    };

    const updated = await controller.dispatchForOutcome(outcome);
    expect(updated.assignedReviewers[0].invitation.status).toBe('sent');
    expect(updated.assignedReviewers[1].invitation.status).toBe('failed_terminal');
    expect(updated.followUpRequired).toBe(true);

    const noReviewersOutcome = await controller.dispatchForOutcome({ assignedReviewers: [], followUpRequired: false });
    expect(noReviewersOutcome.followUpRequired).toBe(false);
    expect(noReviewersOutcome.assignedReviewers).toEqual([]);
  });

  it('uses fallback error message and handles getStatus exceptions and missing headers', async () => {
    const invitationModel = {
      dispatchInvitation: vi.fn().mockRejectedValue({ status: 500, code: 'INTERNAL_ERROR' }),
      retryInvitation: vi.fn().mockResolvedValue({ invitationId: 'inv-1', status: 'sent' }),
      getInvitation: vi.fn().mockImplementation(() => {
        throw Object.assign(new Error('status failure'), { status: 503, code: 'STATUS_FAILURE' });
      }),
      cancelInvitation: vi.fn().mockResolvedValue({ invitationId: 'inv-1', status: 'canceled' }),
      getFailureLog: vi.fn().mockImplementation(() => {
        throw { status: 403, code: 'INVITATION_FORBIDDEN' };
      })
    };
    const controller = createInvitationController({ invitationModel });

    const dispatchRes = createMockResponse();
    await controller.dispatch(createReq({ invitationId: 'inv-x' }), dispatchRes);
    expect(dispatchRes.statusCode).toBe(500);
    expect(dispatchRes.body.message).toBe('Unexpected error.');

    const statusRes = createMockResponse();
    await controller.getStatus(createReq({ invitationId: 'inv-x' }), statusRes);
    expect(statusRes.statusCode).toBe(503);

    const failureLogRes = createMockResponse();
    await controller.getFailureLog(createReq({ invitationId: 'inv-x' }), failureLogRes);
    expect(failureLogRes.statusCode).toBe(403);
  });
});
