import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { invokeAppRoute, invokeHandler } from '../helpers/http-harness.js';

async function triggerInvitation(app, { assignmentId, paperId, reviewerId }) {
  return invokeAppRoute(app, {
    method: 'post',
    path: '/api/reviewer-assignments/:assignmentId/invitations',
    params: { assignmentId },
    body: { paperId, reviewerId }
  });
}

async function loginAsReviewer(app, suffix = 'uc07') {
  const email = `uc07.reviewer.${suffix}@example.com`;
  app.locals.repository.createUserAccount({
    id: `uc07-reviewer-${suffix}`,
    fullName: 'UC07 Reviewer',
    emailNormalized: email,
    passwordHash: hashPassword('StrongPass!2026'),
    role: 'reviewer',
    lastAssignedRole: 'reviewer',
    status: 'active',
    createdAt: '2026-02-01T00:00:00.000Z',
    activatedAt: '2026-02-01T00:00:00.000Z'
  });

  const loginResponse = await invokeHandler(app.locals.authController.login, {
    body: {
      email,
      password: 'StrongPass!2026'
    }
  });
  return {
    cookie: String(loginResponse.headers['Set-Cookie']).split(';')[0],
    reviewerId: `account-uc07-reviewer-${suffix}`
  };
}

describe('UC-07-AS Receive Review Invitation acceptance', () => {
  it('Given reviewer assigned, when notification sent, then reviewer receives the invitation', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: true, providerMessageId: 'provider-1' })
    });

    const triggered = await triggerInvitation(app, {
      assignmentId: 'asg-acceptance-1',
      paperId: 'paper-acceptance',
      reviewerId: 'reviewer-acceptance'
    });

    expect(triggered.statusCode).toBe(202);
    expect(triggered.body.status).toBe('delivered');

    const status = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/review-invitations/:invitationId',
      params: { invitationId: triggered.body.id }
    });
    expect(status.statusCode).toBe(200);
    expect(status.body.status).toBe('delivered');
  });

  it('Given notification delivery fails, when retry occurs, then the system logs the failure', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: false, error: 'smtp outage' })
    });

    const triggered = await triggerInvitation(app, {
      assignmentId: 'asg-acceptance-2',
      paperId: 'paper-acceptance',
      reviewerId: 'reviewer-failure'
    });
    expect(triggered.body.status).toBe('pending');

    await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/review-invitations/retry-due',
      body: { runAt: triggered.body.nextRetryAt }
    });

    const logs = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/invitation-failure-logs',
      params: { paperId: 'paper-acceptance' },
      headers: { 'x-user-role': 'support' }
    });

    expect(logs.statusCode).toBe(200);
    expect(logs.body.entries.some((entry) => entry.eventType === 'initial-failure')).toBe(true);
    expect(logs.body.entries.some((entry) => entry.eventType === 'retry-failure')).toBe(true);
  });

  it('Given notification delivery fails, when retry scheduling starts, then retries run every 5 minutes up to 3 retries', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: false, error: 'delivery failed' })
    });

    const triggered = await triggerInvitation(app, {
      assignmentId: 'asg-acceptance-3',
      paperId: 'paper-acceptance',
      reviewerId: 'reviewer-retry'
    });

    const nextRetryAt1 = Date.parse(triggered.body.nextRetryAt);

    await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/review-invitations/retry-due',
      body: { runAt: triggered.body.nextRetryAt }
    });

    const statusAfterRetry1 = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/review-invitations/:invitationId',
      params: { invitationId: triggered.body.id }
    });
    const nextRetryAt2 = Date.parse(statusAfterRetry1.body.nextRetryAt);

    await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/review-invitations/retry-due',
      body: { runAt: statusAfterRetry1.body.nextRetryAt }
    });

    const statusAfterRetry2 = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/review-invitations/:invitationId',
      params: { invitationId: triggered.body.id }
    });
    const nextRetryAt3 = Date.parse(statusAfterRetry2.body.nextRetryAt);

    expect(nextRetryAt2 - nextRetryAt1).toBe(5 * 60 * 1000);
    expect(nextRetryAt3 - nextRetryAt2).toBe(5 * 60 * 1000);
  });

  it('Given all retries fail, when retry limit is reached, then invitation is marked failed and flagged for manual follow-up', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: false, error: 'mail transport down' })
    });

    const triggered = await triggerInvitation(app, {
      assignmentId: 'asg-acceptance-4',
      paperId: 'paper-acceptance',
      reviewerId: 'reviewer-terminal'
    });

    let status = triggered.body;
    for (let retry = 0; retry < 3; retry += 1) {
      await invokeAppRoute(app, {
        method: 'post',
        path: '/api/internal/review-invitations/retry-due',
        body: { runAt: status.nextRetryAt }
      });
      const refreshed = await invokeAppRoute(app, {
        method: 'get',
        path: '/api/review-invitations/:invitationId',
        params: { invitationId: triggered.body.id }
      });
      status = refreshed.body;
    }

    const failed = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/review-invitations/:invitationId',
      params: { invitationId: triggered.body.id }
    });

    expect(failed.statusCode).toBe(200);
    expect(failed.body.status).toBe('failed');
    expect(failed.body.retryCount).toBe(3);
    expect(failed.body.followUpRequired).toBe(true);
  });

  it('Given reviewer assignment is removed while retries are pending, when cancellation is processed, then invitation is marked canceled and no further retries run', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: false, error: 'temporary outage' })
    });

    const triggered = await triggerInvitation(app, {
      assignmentId: 'asg-acceptance-5',
      paperId: 'paper-acceptance',
      reviewerId: 'reviewer-cancel'
    });

    const canceled = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations/cancel',
      params: { assignmentId: 'asg-acceptance-5' },
      body: {
        reason: 'assignment_removed',
        occurredAt: '2026-02-08T10:06:00.000Z'
      }
    });

    expect(canceled.statusCode).toBe(200);
    expect(canceled.body.status).toBe('canceled');

    const retryRun = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/review-invitations/retry-due',
      body: { runAt: triggered.body.nextRetryAt }
    });
    expect(retryRun.body.processedInvitations).toBe(0);
  });

  it('Given an unauthorized authenticated user requests failure logs, when access is evaluated, then access is denied', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: false, error: 'delivery failed' })
    });

    await triggerInvitation(app, {
      assignmentId: 'asg-acceptance-6',
      paperId: 'paper-acceptance-denied',
      reviewerId: 'reviewer-denied'
    });

    const denied = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/invitation-failure-logs',
      params: { paperId: 'paper-acceptance-denied' },
      headers: { 'x-user-role': 'reviewer' }
    });

    expect(denied.statusCode).toBe(403);
    expect(denied.body.code).toBe('INVITATION_FORBIDDEN');
  });

  it('Given the same reviewer-paper assignment is reprocessed, when invitation dispatch is triggered, then no duplicate active invitation is created', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: false, error: 'still pending' })
    });

    const first = await triggerInvitation(app, {
      assignmentId: 'asg-acceptance-7',
      paperId: 'paper-acceptance',
      reviewerId: 'reviewer-duplicate'
    });

    const second = await triggerInvitation(app, {
      assignmentId: 'asg-acceptance-7',
      paperId: 'paper-acceptance',
      reviewerId: 'reviewer-duplicate'
    });

    expect(first.statusCode).toBe(202);
    expect(second.statusCode).toBe(200);
    expect(second.body.id).toBe(first.body.id);
  });

  it('Given a reviewer has assignment invitations, when the reviewer opens the invitation inbox, then invitation entries are visible', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: false, error: 'delivery pending' })
    });

    const reviewerSession = await loginAsReviewer(app, 'inbox');
    await triggerInvitation(app, {
      assignmentId: 'asg-acceptance-inbox-1',
      paperId: 'paper-acceptance-inbox',
      reviewerId: reviewerSession.reviewerId
    });

    const inboxPage = await invokeAppRoute(app, {
      method: 'get',
      path: '/reviewer/invitations',
      headers: { cookie: reviewerSession.cookie }
    });
    expect(inboxPage.statusCode).toBe(200);
    expect(inboxPage.text).toContain('Review Invitation Inbox');
    expect(inboxPage.text).toContain('paper-acceptance-inbox');

    const inboxApi = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/invitations',
      headers: { cookie: reviewerSession.cookie }
    });
    expect(inboxApi.statusCode).toBe(200);
    expect(inboxApi.body.invitations.length).toBeGreaterThan(0);
  });
});
