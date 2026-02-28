import { describe, expect, it } from 'vitest';
import { createReviewInvitationModel } from '../../../src/models/ReviewInvitationModel.js';

function createClock(startIso = '2026-02-08T10:00:00.000Z') {
  const queue = [new Date(startIso).toISOString()];

  return {
    nowFn: () => {
      if (queue.length === 1) {
        return queue[0];
      }

      return queue.shift();
    },
    push: (...values) => {
      for (const value of values) {
        queue.push(new Date(value).toISOString());
      }
    }
  };
}

function createModel(overrides = {}) {
  let invitationSequence = 0;
  let attemptSequence = 0;
  let logSequence = 0;

  return createReviewInvitationModel({
    idFactory: () => `inv-${++invitationSequence}`,
    attemptIdFactory: () => `attempt-${++attemptSequence}`,
    failureLogIdFactory: () => `log-${++logSequence}`,
    nowFn: overrides.nowFn ?? (() => '2026-02-08T10:00:00.000Z'),
    ...overrides
  });
}

describe('ReviewInvitationModel contract lifecycle', () => {
  it('triggers invitation delivery and reuses active invitations', async () => {
    const model = createModel();

    const created = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-1',
        paperId: 'paper-1',
        reviewerId: 'reviewer-1'
      },
      async () => ({ accepted: false, error: 'smtp down' })
    );

    expect(created.reused).toBe(false);
    expect(created.invitation.status).toBe('pending');
    expect(created.invitation.nextRetryAt).toBe('2026-02-08T10:05:00.000Z');

    const reused = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-1',
        paperId: 'paper-1',
        reviewerId: 'reviewer-1'
      },
      async () => ({ accepted: true })
    );

    expect(reused.reused).toBe(true);
    expect(reused.invitation.id).toBe(created.invitation.id);

    const attempts = model.getDeliveryAttempts(created.invitation.id);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].attemptNumber).toBe(0);
  });

  it('processes due retries and transitions to delivered and failed terminal states', async () => {
    const model = createModel();

    const success = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-success',
        paperId: 'paper-1',
        reviewerId: 'reviewer-1'
      },
      async () => ({ accepted: false, error: 'initial-failure' })
    );

    const successSummary = await model.processDueRetries(
      { runAt: '2026-02-08T10:05:00.000Z' },
      async () => ({ accepted: true, providerMessageId: 'msg-1' })
    );

    expect(successSummary).toMatchObject({
      processedInvitations: 1,
      attemptsCreated: 1,
      completed: 1,
      failed: 0,
      canceled: 0
    });
    expect(model.getInvitationStatus(success.invitation.id)?.status).toBe('delivered');

    const failure = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-fail',
        paperId: 'paper-2',
        reviewerId: 'reviewer-2'
      },
      async () => ({ accepted: false, error: 'first-failure' })
    );

    await model.processDueRetries({ runAt: '2026-02-08T10:05:00.000Z' }, async () => ({ accepted: false, error: 'retry-1' }));
    await model.processDueRetries({ runAt: '2026-02-08T10:10:00.000Z' }, async () => ({ accepted: false, error: 'retry-2' }));
    const finalSummary = await model.processDueRetries(
      { runAt: '2026-02-08T10:15:00.000Z' },
      async () => ({ accepted: false, error: 'retry-3' })
    );

    expect(finalSummary.failed).toBe(1);

    const failedStatus = model.getInvitationStatus(failure.invitation.id);
    expect(failedStatus?.status).toBe('failed');
    expect(failedStatus?.followUpRequired).toBe(true);
  });

  it('records delivery callbacks including late-callback ignored paths', async () => {
    const clock = createClock('2026-02-08T12:00:00.000Z');
    clock.push('2026-02-08T12:00:00.000Z', '2026-02-08T12:05:00.000Z', '2026-02-08T12:06:00.000Z');
    const model = createModel({ nowFn: clock.nowFn });

    const created = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-callback',
        paperId: 'paper-callback',
        reviewerId: 'reviewer-callback'
      },
      async () => ({ accepted: false, error: 'provider timeout' })
    );

    const attempt = model.getDeliveryAttempts(created.invitation.id)[0];
    const delivered = model.recordDeliveryEvent(created.invitation.id, {
      attemptId: attempt.id,
      eventType: 'delivered',
      occurredAt: '2026-02-08T12:01:00.000Z'
    });

    expect(delivered.status).toBe('delivered');

    const failedModel = createModel({ nowFn: () => '2026-02-08T12:00:00.000Z' });
    const failed = await failedModel.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-failed-callback',
        paperId: 'paper-callback',
        reviewerId: 'reviewer-callback'
      },
      async () => ({ accepted: false, error: 'initial' })
    );
    await failedModel.processDueRetries({ runAt: '2026-02-08T12:05:00.000Z' }, async () => ({ accepted: false, error: 'retry-1' }));
    await failedModel.processDueRetries({ runAt: '2026-02-08T12:10:00.000Z' }, async () => ({ accepted: false, error: 'retry-2' }));
    await failedModel.processDueRetries({ runAt: '2026-02-08T12:15:00.000Z' }, async () => ({ accepted: false, error: 'retry-3' }));

    const lastAttempt = failedModel.getDeliveryAttempts(failed.invitation.id).at(-1);
    const unchanged = failedModel.recordDeliveryEvent(failed.invitation.id, {
      attemptId: lastAttempt.id,
      eventType: 'delivered',
      occurredAt: '2026-02-08T12:16:00.000Z'
    });
    expect(unchanged.status).toBe('failed');

    const lateEntry = failedModel.getAllFailureLogs().find((entry) => entry.eventType === 'late-callback-ignored');
    expect(lateEntry?.message).toContain('Ignored delivered callback');
  });

  it('requires reviewer acceptance before invitation becomes accepted and keeps accepted invitations terminal', async () => {
    const model = createModel({
      nowFn: () => '2026-02-08T12:00:00.000Z'
    });
    const pending = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-accept-pending',
        paperId: 'paper-accept-pending',
        reviewerId: 'reviewer-accept-pending'
      },
      async () => ({ accepted: false, error: 'delivery pending' })
    );
    expect(() => model.acceptInvitation(pending.invitation.id, {
      reviewerId: 'reviewer-accept-pending'
    })).toThrow(/cannot be accepted/);

    const delivered = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-accept-delivered',
        paperId: 'paper-accept-delivered',
        reviewerId: 'reviewer-accept-delivered'
      },
      async () => ({ accepted: true })
    );
    expect(() => model.acceptInvitation(delivered.invitation.id, {
      reviewerId: 'reviewer-other'
    })).toThrow(/do not have access/);
    expect(() => model.declineInvitation(delivered.invitation.id, {
      reviewerId: 'reviewer-other'
    })).toThrow(/do not have access/);

    const deliveredActive = model.listInvitationsForReviewer('reviewer-accept-delivered', {
      includeInactive: false
    });
    expect(deliveredActive).toHaveLength(1);
    expect(deliveredActive[0].status).toBe('delivered');

    const accepted = model.acceptInvitation(delivered.invitation.id, {
      reviewerId: 'reviewer-accept-delivered',
      occurredAt: '2026-02-08T12:03:00.000Z'
    });
    expect(accepted.status).toBe('accepted');
    expect(accepted.acceptedAt).toBe('2026-02-08T12:03:00.000Z');

    const acceptedNoop = model.acceptInvitation(delivered.invitation.id, {
      reviewerId: 'reviewer-accept-delivered'
    });
    expect(acceptedNoop.status).toBe('accepted');
    expect(acceptedNoop.acceptedAt).toBe('2026-02-08T12:03:00.000Z');

    const legacyAccepted = model.getInvitation(delivered.invitation.id);
    expect(legacyAccepted.status).toBe('accepted');

    const activeAfterAccept = model.listInvitationsForReviewer('reviewer-accept-delivered', {
      includeInactive: false
    });
    expect(activeAfterAccept).toHaveLength(0);

    const dispatchNoop = await model.dispatchInvitation(delivered.invitation.id, async () => ({ accepted: true }));
    expect(dispatchNoop.status).toBe('accepted');

    const retryNoop = await model.retryInvitation(delivered.invitation.id, async () => ({ accepted: true }));
    expect(retryNoop.status).toBe('accepted');

    const attempt = model.getDeliveryAttempts(delivered.invitation.id)[0];
    const ignoredCallback = model.recordDeliveryEvent(delivered.invitation.id, {
      attemptId: attempt.id,
      eventType: 'failed',
      occurredAt: '2026-02-08T12:04:00.000Z'
    });
    expect(ignoredCallback.status).toBe('accepted');

    const cancelByAssignmentNoop = model.cancelInvitationByAssignment(
      'asg-accept-delivered',
      'assignment_removed',
      '2026-02-08T12:05:00.000Z'
    );
    expect(cancelByAssignmentNoop.status).toBe('accepted');
  });

  it('allows delivered invitations to be declined and keeps declined invitations terminal', async () => {
    const model = createModel({
      nowFn: () => '2026-02-08T15:00:00.000Z'
    });
    const pending = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-decline-pending',
        paperId: 'paper-decline-pending',
        reviewerId: 'reviewer-decline'
      },
      async () => ({ accepted: false, error: 'delivery pending' })
    );

    expect(() => model.declineInvitation(pending.invitation.id, {
      reviewerId: 'reviewer-decline'
    })).toThrow(/cannot be declined/);

    const delivered = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-decline-delivered',
        paperId: 'paper-decline-delivered',
        reviewerId: 'reviewer-decline'
      },
      async () => ({ accepted: true })
    );

    const declined = model.declineInvitation(delivered.invitation.id, {
      reviewerId: 'reviewer-decline',
      occurredAt: '2026-02-08T15:01:00.000Z'
    });
    expect(declined.status).toBe('declined');
    expect(declined.declinedAt).toBe('2026-02-08T15:01:00.000Z');

    const declinedNoop = model.declineInvitation(delivered.invitation.id, {
      reviewerId: 'reviewer-decline'
    });
    expect(declinedNoop.status).toBe('declined');
    expect(declinedNoop.declinedAt).toBe('2026-02-08T15:01:00.000Z');

    const activeOnly = model.listInvitationsForReviewer('reviewer-decline', {
      includeInactive: false
    });
    expect(activeOnly.map((invitation) => invitation.id)).toEqual([pending.invitation.id]);

    const retryNoop = await model.retryInvitation(delivered.invitation.id, async () => ({ accepted: true }));
    expect(retryNoop.status).toBe('declined');

    const dispatchNoop = await model.dispatchInvitation(delivered.invitation.id, async () => ({ accepted: true }));
    expect(dispatchNoop.status).toBe('declined');

    const attempt = model.getDeliveryAttempts(delivered.invitation.id)[0];
    const ignoredCallback = model.recordDeliveryEvent(delivered.invitation.id, {
      attemptId: attempt.id,
      eventType: 'failed',
      occurredAt: '2026-02-08T15:02:00.000Z'
    });
    expect(ignoredCallback.status).toBe('declined');
  });

  it('applies failed callback events for initial and retry attempts', async () => {
    const model = createModel({
      nowFn: () => '2026-02-08T13:00:00.000Z'
    });
    const created = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-callback-failed',
        paperId: 'paper-callback-failed',
        reviewerId: 'reviewer-callback-failed'
      },
      async () => ({ accepted: false, error: 'initial-failure' })
    );

    const initialAttempt = model.getDeliveryAttempts(created.invitation.id)[0];
    const initialCallback = model.recordDeliveryEvent(created.invitation.id, {
      attemptId: initialAttempt.id,
      eventType: 'failed'
    });
    expect(initialCallback.status).toBe('pending');
    expect(initialCallback.lastFailureReason).toBe('Delivery callback failure.');

    const terminalModel = createModel({
      maxRetries: 1,
      nowFn: () => '2026-02-08T14:00:00.000Z'
    });
    const terminal = await terminalModel.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-callback-terminal',
        paperId: 'paper-callback-terminal',
        reviewerId: 'reviewer-callback-terminal'
      },
      async () => ({ accepted: false, error: 'initial-failure' })
    );

    await terminalModel.processDueRetries(
      { runAt: terminal.invitation.nextRetryAt },
      async () => ({ accepted: true })
    );
    const retryAttempt = terminalModel.getDeliveryAttempts(terminal.invitation.id).at(-1);
    const retryCallback = terminalModel.recordDeliveryEvent(terminal.invitation.id, {
      attemptId: retryAttempt.id,
      eventType: 'failed',
      failureReason: 'provider bounce',
      occurredAt: '2026-02-08T14:06:00.000Z'
    });

    expect(retryCallback.status).toBe('failed');
    expect(retryCallback.followUpRequired).toBe(true);
  });

  it('cancels invitations by assignment and respects terminal no-op cancellation', async () => {
    const model = createModel();

    await expect(() => model.cancelInvitationByAssignment('missing', 'assignment_removed', '2026-02-08T10:00:00.000Z'))
      .toThrow(/not found/);

    const pending = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-cancel',
        paperId: 'paper-cancel',
        reviewerId: 'reviewer-cancel'
      },
      async () => ({ accepted: false, error: 'fail' })
    );

    const canceled = model.cancelInvitationByAssignment('asg-cancel', 'assignment_removed', '2026-02-08T10:06:00.000Z');
    expect(canceled.status).toBe('canceled');

    const unchanged = model.cancelInvitationByAssignment('asg-cancel', 'assignment_removed', '2026-02-08T10:07:00.000Z');
    expect(unchanged.status).toBe('canceled');

    const terminal = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-terminal',
        paperId: 'paper-terminal',
        reviewerId: 'reviewer-terminal'
      },
      async () => ({ accepted: true })
    );

    const deliveredCanceled = model.cancelInvitationByAssignment(
      'asg-terminal',
      'assignment_removed',
      '2026-02-08T10:08:00.000Z'
    );
    expect(deliveredCanceled.status).toBe('canceled');
    expect(model.getInvitationStatus(terminal.invitation.id)?.status).toBe('canceled');

    expect(pending.invitation.id).toBeDefined();
  });

  it('lists failure logs by paper with role policy and pagination', async () => {
    const model = createModel();
    const invitationA = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-logs-a',
        paperId: 'paper-logs',
        reviewerId: 'reviewer-a'
      },
      async () => ({ accepted: false, error: 'initial-a' })
    );
    await model.processDueRetries({ runAt: '2026-02-08T10:05:00.000Z' }, async () => ({ accepted: false, error: 'retry-a' }));

    await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-logs-b',
        paperId: 'paper-logs',
        reviewerId: 'reviewer-b'
      },
      async () => ({ accepted: false, error: 'initial-b' })
    );

    const editorVisible = model.listFailureLogsByPaper('paper-logs', {
      actorRole: 'editor',
      editorPaperIds: ['paper-logs'],
      page: 1,
      pageSize: 1
    });

    expect(editorVisible.entries).toHaveLength(1);
    expect(editorVisible.page).toBe(1);
    expect(editorVisible.pageSize).toBe(1);
    expect(editorVisible.total).toBeGreaterThan(1);

    const supportVisible = model.listFailureLogsByPaper('paper-logs', {
      actorRole: 'support',
      page: 2,
      pageSize: 1
    });
    expect(supportVisible.entries).toHaveLength(1);

    const openEditor = model.listFailureLogsByPaper('paper-logs', {
      actorRole: 'editor',
      editorPaperIds: '',
      page: -1,
      pageSize: 1000
    });
    expect(openEditor.page).toBe(1);
    expect(openEditor.pageSize).toBe(100);

    const fallbackPageSize = model.listFailureLogsByPaper('paper-logs', {
      actorRole: 'support',
      page: 1,
      pageSize: 0
    });
    expect(fallbackPageSize.pageSize).toBe(20);

    expect(() => model.listFailureLogsByPaper('paper-logs', {
      actorRole: 'editor',
      editorPaperIds: ['other-paper']
    })).toThrow(/do not have access/);

    expect(() => model.listFailureLogsByPaper('paper-logs', {
      actorRole: 'reviewer'
    })).toThrow(/do not have access/);

    expect(() => model.listFailureLogsByPaper('paper-logs')).toThrow(/do not have access/);

    expect(model.getDeliveryAttempts(invitationA.invitation.id).length).toBeGreaterThan(0);
  });

  it('uses default runAt for retry processing when none is provided', async () => {
    const model = createModel({
      nowFn: () => '2026-02-08T16:00:00.000Z'
    });
    await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-default-runAt',
        paperId: 'paper-default-runAt',
        reviewerId: 'reviewer-default-runAt'
      },
      async () => ({ accepted: false, error: 'initial' })
    );

    const summary = await model.processDueRetries({}, async () => ({ accepted: true }));
    expect(summary.runAt).toBe('2026-02-08T16:00:00.000Z');
  });

  it('uses non-zero dispatch attempt numbers and rejects unknown callback attempts', async () => {
    const model = createModel({
      nowFn: () => '2026-02-08T17:00:00.000Z'
    });
    const legacy = model.createInvitation({
      assignmentId: 'asg-dispatch-retry',
      reviewerId: 'reviewer-dispatch-retry',
      displayName: 'Dispatch Retry'
    });

    await model.dispatchInvitation(legacy.invitationId, async () => ({ accepted: false, error: 'initial-failure' }));
    await model.retryInvitation(legacy.invitationId, async () => ({ accepted: false, error: 'retry-failure' }));
    await model.dispatchInvitation(legacy.invitationId, async () => ({ accepted: true }));
    await model.retryInvitation(legacy.invitationId, async () => ({ accepted: true }));

    const attempts = model.getDeliveryAttempts(legacy.invitationId);
    expect(attempts.at(-1)?.attemptNumber).toBeGreaterThanOrEqual(1);

    expect(() =>
      model.recordDeliveryEvent(legacy.invitationId, {
        attemptId: 'missing-attempt',
        eventType: 'delivered',
        occurredAt: '2026-02-08T17:01:00.000Z'
      })
    ).toThrow(/attempt was not found/);

    expect(model.getDeliveryAttempts('missing-invitation')).toEqual([]);
    expect(() => model.getFailureLog(legacy.invitationId)).toThrow(/do not have access/);
  });

  it('lists reviewer invitation inbox entries with includeInactive filtering', async () => {
    const model = createModel({
      nowFn: () => '2026-02-08T18:00:00.000Z'
    });

    const pending = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-inbox-pending',
        paperId: 'paper-inbox-1',
        reviewerId: 'account-reviewer-1'
      },
      async () => ({ accepted: false, error: 'mailbox unavailable' })
    );
    const delivered = await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-inbox-delivered',
        paperId: 'paper-inbox-2',
        reviewerId: 'account-reviewer-1'
      },
      async () => ({ accepted: true })
    );
    await model.triggerInvitationDelivery(
      {
        reviewerAssignmentId: 'asg-inbox-other',
        paperId: 'paper-inbox-3',
        reviewerId: 'account-reviewer-2'
      },
      async () => ({ accepted: false, error: 'mailbox unavailable' })
    );

    const all = model.listInvitationsForReviewer('account-reviewer-1');
    expect(all).toHaveLength(2);
    expect(all.every((entry) => entry.reviewerId === 'account-reviewer-1')).toBe(true);
    expect(all.some((entry) => entry.id === pending.invitation.id)).toBe(true);
    expect(all.some((entry) => entry.id === delivered.invitation.id)).toBe(true);

    const activeOnly = model.listInvitationsForReviewer('account-reviewer-1', { includeInactive: false });
    expect(activeOnly).toHaveLength(2);
    expect(activeOnly.some((entry) => entry.id === pending.invitation.id)).toBe(true);
    expect(activeOnly.some((entry) => entry.id === delivered.invitation.id)).toBe(true);

    model.declineInvitation(delivered.invitation.id, {
      reviewerId: 'account-reviewer-1',
      occurredAt: '2026-02-08T18:01:00.000Z'
    });

    const activeAfterDecline = model.listInvitationsForReviewer('account-reviewer-1', { includeInactive: false });
    expect(activeAfterDecline).toHaveLength(1);
    expect(activeAfterDecline[0].id).toBe(pending.invitation.id);

    expect(model.listInvitationsForReviewer('account-missing')).toEqual([]);
    expect(model.listInvitationsForReviewer(undefined)).toEqual([]);
  });
});
