import { describe, expect, it } from 'vitest';
import { createReviewInvitationModel } from '../../../src/models/ReviewInvitationModel.js';

function createModel(overrides = {}) {
  let idSequence = 0;
  const idFactory = () => `inv-${++idSequence}`;
  return createReviewInvitationModel({
    idFactory,
    nowFn: overrides.nowFn ?? (() => '2026-02-08T10:00:00.000Z'),
    ...overrides
  });
}

describe('ReviewInvitationModel', () => {
  it('creates invitations and deduplicates active invitations per assignment', () => {
    const model = createModel();
    const created = model.createInvitation({
      assignmentId: 'assignment-1',
      reviewerId: 'reviewer-1',
      displayName: 'One'
    });
    const deduped = model.createInvitation({
      assignmentId: 'assignment-1',
      reviewerId: 'reviewer-1',
      displayName: 'One'
    });

    expect(deduped.invitationId).toBe(created.invitationId);
    expect(model.getInvitation('missing')).toBeNull();
  });

  it('dispatches invitation success, failure, and canceled behavior', async () => {
    const model = createModel();
    const created = model.createInvitation({
      assignmentId: 'assignment-2',
      reviewerId: 'reviewer-2',
      displayName: 'Two'
    });

    const failed = await model.dispatchInvitation(created.invitationId, async () => ({
      accepted: false,
      error: 'smtp down'
    }));
    expect(failed.status).toBe('retry_scheduled');
    expect(failed.nextRetryAt).toBe('2026-02-08T10:05:00.000Z');
    expect(failed.lastError).toBe('smtp down');

    const sent = await model.dispatchInvitation(created.invitationId, async () => ({ accepted: true }));
    expect(sent.status).toBe('sent');
    expect(sent.nextRetryAt).toBeNull();
    expect(sent.lastError).toBeNull();

    const canceled = model.cancelInvitation(created.invitationId);
    expect(canceled.status).toBe('canceled');

    const unchanged = await model.dispatchInvitation(created.invitationId, async () => ({ accepted: true }));
    expect(unchanged.status).toBe('canceled');
  });

  it('uses default failure messages and supports retry success transition', async () => {
    const model = createModel();
    const created = model.createInvitation({
      assignmentId: 'assignment-default-error',
      reviewerId: 'reviewer-default-error',
      displayName: 'Default Error'
    });

    const dispatchFailed = await model.dispatchInvitation(created.invitationId, async () => ({ accepted: false }));
    expect(dispatchFailed.lastError).toBe('Invitation dispatch failed.');

    const retrySucceeded = await model.retryInvitation(created.invitationId, async () => ({ accepted: true }));
    expect(retrySucceeded.status).toBe('sent');
    expect(retrySucceeded.lastError).toBeNull();

    const second = model.createInvitation({
      assignmentId: 'assignment-default-retry-error',
      reviewerId: 'reviewer-default-retry-error',
      displayName: 'Default Retry Error'
    });
    await model.dispatchInvitation(second.invitationId, async () => ({ accepted: false, error: 'first fail' }));
    const retryFailed = await model.retryInvitation(second.invitationId, async () => ({ accepted: false }));
    expect(retryFailed.lastError).toBe('Invitation retry failed.');
  });

  it('retries with cap, terminal failure, and returns unchanged for terminal/canceled', async () => {
    const model = createModel({
      nowFn: () => new Date('2026-02-08T12:00:00.000Z')
    });
    const created = model.createInvitation({
      assignmentId: 'assignment-3',
      reviewerId: 'reviewer-3',
      displayName: 'Three'
    });

    await model.dispatchInvitation(created.invitationId, async () => ({ accepted: false, error: 'fail-0' }));
    const retry1 = await model.retryInvitation(created.invitationId, async () => ({ accepted: false, error: 'fail-1' }));
    expect(retry1.retryCount).toBe(1);
    expect(retry1.status).toBe('retry_scheduled');
    expect(retry1.nextRetryAt).toBe('2026-02-08T12:05:00.000Z');

    const retry2 = await model.retryInvitation(created.invitationId, async () => ({ accepted: false, error: 'fail-2' }));
    expect(retry2.retryCount).toBe(2);
    expect(retry2.status).toBe('retry_scheduled');

    const terminal = await model.retryInvitation(created.invitationId, async () => ({ accepted: false, error: 'fail-3' }));
    expect(terminal.retryCount).toBe(3);
    expect(terminal.status).toBe('failed_terminal');
    expect(terminal.followUpRequired).toBe(true);
    expect(terminal.nextRetryAt).toBeNull();

    const unchangedTerminal = await model.retryInvitation(created.invitationId, async () => ({ accepted: true }));
    expect(unchangedTerminal.status).toBe('failed_terminal');

    const second = model.createInvitation({
      assignmentId: 'assignment-4',
      reviewerId: 'reviewer-4',
      displayName: 'Four'
    });
    model.cancelInvitation(second.invitationId);
    const unchangedCanceled = await model.retryInvitation(second.invitationId, async () => ({ accepted: true }));
    expect(unchangedCanceled.status).toBe('canceled');
  });

  it('provides role-based failure-log access and not-found guards', async () => {
    const model = createModel();
    const created = model.createInvitation({
      assignmentId: 'assignment-5',
      reviewerId: 'reviewer-5',
      displayName: 'Five'
    });

    expect(() => model.getFailureLog(created.invitationId, 'reviewer')).toThrow(/do not have access/);
    expect(model.getFailureLog(created.invitationId, 'editor').invitationId).toBe(created.invitationId);
    expect(() => model.cancelInvitation('missing')).toThrow(/not found/);
    await expect(model.dispatchInvitation('missing')).rejects.toThrow(/not found/);
    await expect(model.retryInvitation('missing')).rejects.toThrow(/not found/);
  });

  it('creates a new invitation after terminal failure for same assignment', async () => {
    const model = createModel();
    const initial = model.createInvitation({
      assignmentId: 'assignment-6',
      reviewerId: 'reviewer-6',
      displayName: 'Six'
    });
    await model.dispatchInvitation(initial.invitationId, async () => ({ accepted: false, error: 'fail-0' }));
    await model.retryInvitation(initial.invitationId, async () => ({ accepted: false, error: 'fail-1' }));
    await model.retryInvitation(initial.invitationId, async () => ({ accepted: false, error: 'fail-2' }));
    await model.retryInvitation(initial.invitationId, async () => ({ accepted: false, error: 'fail-3' }));

    const newInvitation = model.createInvitation({
      assignmentId: 'assignment-6',
      reviewerId: 'reviewer-6',
      displayName: 'Six'
    });
    expect(newInvitation.invitationId).not.toBe(initial.invitationId);
  });

  it('uses default nowFn when none is provided', async () => {
    const model = createReviewInvitationModel({
      idFactory: () => 'inv-default-now'
    });
    model.createInvitation({
      assignmentId: 'assignment-default-now',
      reviewerId: 'reviewer-default-now',
      displayName: 'Default Now'
    });

    const status = await model.dispatchInvitation('inv-default-now', async () => ({ accepted: false, error: 'fail' }));
    expect(status.status).toBe('retry_scheduled');
    expect(status.nextRetryAt).not.toBeNull();
  });
});
