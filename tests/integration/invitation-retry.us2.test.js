import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute } from '../helpers/http-harness.js';

function createFixedClock(startIso) {
  const fixed = new Date(startIso);
  return () => new Date(fixed);
}

describe('US2 retry and cancellation integration', () => {
  it('retries every 5 minutes up to 3 retries then marks failed', async () => {
    const app = createApp({
      nowFn: createFixedClock('2026-02-08T10:00:00.000Z'),
      sendInvitationFn: async () => ({ accepted: false, error: 'provider down' })
    });

    const created = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations',
      params: { assignmentId: 'asg-us2-1' },
      body: {
        paperId: 'paper-us2-1',
        reviewerId: 'reviewer-us2-1'
      }
    });

    expect(created.statusCode).toBe(202);
    expect(created.body.status).toBe('pending');
    expect(created.body.nextRetryAt).toBe('2026-02-08T10:05:00.000Z');

    const earlyRun = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/review-invitations/retry-due',
      body: { runAt: '2026-02-08T10:04:59.000Z' }
    });
    expect(earlyRun.statusCode).toBe(200);
    expect(earlyRun.body.processedInvitations).toBe(0);

    const run1 = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/review-invitations/retry-due',
      body: { runAt: '2026-02-08T10:05:00.000Z' }
    });
    expect(run1.body.processedInvitations).toBe(1);
    expect(run1.body.attemptsCreated).toBe(1);

    const status1 = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/review-invitations/:invitationId',
      params: { invitationId: created.body.id }
    });
    expect(status1.body.status).toBe('pending');
    expect(status1.body.retryCount).toBe(1);
    expect(status1.body.nextRetryAt).toBe('2026-02-08T10:10:00.000Z');

    await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/review-invitations/retry-due',
      body: { runAt: '2026-02-08T10:10:00.000Z' }
    });

    const run3 = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/review-invitations/retry-due',
      body: { runAt: '2026-02-08T10:15:00.000Z' }
    });
    expect(run3.body.failed).toBe(1);

    const failed = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/review-invitations/:invitationId',
      params: { invitationId: created.body.id }
    });

    expect(failed.body.status).toBe('failed');
    expect(failed.body.retryCount).toBe(3);
    expect(failed.body.followUpRequired).toBe(true);
  });

  it('cancels pending retries and ignores late callbacks for canceled invitations', async () => {
    const app = createApp({
      nowFn: createFixedClock('2026-02-08T11:00:00.000Z'),
      sendInvitationFn: async () => ({ accepted: false, error: 'temporary outage' })
    });

    const created = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations',
      params: { assignmentId: 'asg-us2-cancel' },
      body: {
        paperId: 'paper-us2-cancel',
        reviewerId: 'reviewer-us2-cancel'
      }
    });

    const canceled = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations/cancel',
      params: { assignmentId: 'asg-us2-cancel' },
      body: {
        reason: 'assignment_removed',
        occurredAt: '2026-02-08T11:01:00.000Z'
      }
    });

    expect(canceled.statusCode).toBe(200);
    expect(canceled.body.status).toBe('canceled');

    const runDue = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/review-invitations/retry-due',
      body: { runAt: '2026-02-08T11:05:00.000Z' }
    });
    expect(runDue.body.processedInvitations).toBe(0);

    const attempts = app.locals.invitationModel.getDeliveryAttempts(created.body.id);
    const lateEvent = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/review-invitations/:invitationId/delivery-events',
      params: { invitationId: created.body.id },
      body: {
        attemptId: attempts[0].id,
        eventType: 'delivered',
        occurredAt: '2026-02-08T11:06:00.000Z'
      }
    });

    expect(lateEvent.statusCode).toBe(200);
    expect(lateEvent.body.status).toBe('canceled');

    const missingCancelPayload = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations/cancel',
      params: { assignmentId: 'asg-us2-cancel' },
      body: { reason: 'wrong' }
    });
    expect(missingCancelPayload.statusCode).toBe(400);
  });

  it('validates retry due payload and delivery event payload', async () => {
    const app = createApp();

    const retryBad = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/review-invitations/retry-due',
      body: {}
    });
    expect(retryBad.statusCode).toBe(400);

    const eventBad = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/review-invitations/:invitationId/delivery-events',
      params: { invitationId: 'missing' },
      body: {}
    });
    expect(eventBad.statusCode).toBe(400);
  });
});
