import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute } from '../helpers/http-harness.js';

function createFixedClock(startIso) {
  const fixed = new Date(startIso);
  return () => new Date(fixed);
}

describe('notification delivery integration', () => {
  it('uses default decision-email sender when no override is provided', async () => {
    const app = createApp({
      nowFn: createFixedClock('2026-02-08T10:00:00.000Z'),
      notificationInternalServiceKey: 'internal-secret'
    });

    const response = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/decisions/:decisionId/notifications',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { decisionId: 'decision-default-sender' },
      body: {
        submissionId: 'submission-default-sender',
        authorId: 'author-default-sender',
        authorEmail: 'author-default-sender@example.com',
        decisionOutcome: 'accepted',
        finalizedAt: '2026-02-08T09:59:00.000Z'
      }
    });

    expect(response.statusCode).toBe(202);
    expect(response.body.status).toBe('delivered');
  });

  it('enforces internal auth and validates trigger payload', async () => {
    const app = createApp({
      nowFn: createFixedClock('2026-02-08T10:00:00.000Z'),
      notificationInternalServiceKey: 'internal-secret'
    });

    const unauthorized = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/decisions/:decisionId/notifications',
      params: { decisionId: 'decision-auth-1' },
      body: {}
    });
    expect(unauthorized.statusCode).toBe(401);

    const badPayload = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/decisions/:decisionId/notifications',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { decisionId: 'decision-auth-2' },
      body: {
        submissionId: 'submission-1',
        authorId: 'author-1',
        authorEmail: 'author@example.com',
        decisionOutcome: 'accepted',
        finalizedAt: '2100-01-01T00:00:00.000Z'
      }
    });

    expect(badPayload.statusCode).toBe(400);
  });

  it('supports happy path, idempotency, retry success, and retry conflicts', async () => {
    let callCount = 0;
    const app = createApp({
      nowFn: createFixedClock('2026-02-08T10:00:00.000Z'),
      notificationInternalServiceKey: 'internal-secret',
      sendDecisionEmailFn: async ({ attemptNumber }) => {
        callCount += 1;

        if (callCount === 2 && attemptNumber === 1) {
          return { accepted: false, error: 'smtp outage' };
        }

        return {
          accepted: true,
          providerMessageId: `provider-${callCount}`
        };
      }
    });

    const happy = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/decisions/:decisionId/notifications',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { decisionId: 'decision-happy' },
      body: {
        submissionId: 'submission-happy',
        authorId: 'author-happy',
        authorEmail: 'author-happy@example.com',
        decisionOutcome: 'accepted',
        finalizedAt: '2026-02-08T09:59:00.000Z'
      }
    });

    expect(happy.statusCode).toBe(202);
    expect(happy.body.status).toBe('delivered');
    expect(happy.body.attemptsUsed).toBe(1);

    const duplicate = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/decisions/:decisionId/notifications',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { decisionId: 'decision-happy' },
      body: {
        submissionId: 'submission-happy',
        authorId: 'author-happy',
        authorEmail: 'author-happy@example.com',
        decisionOutcome: 'accepted',
        finalizedAt: '2026-02-08T09:59:00.000Z'
      }
    });

    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.body.status).toBe('delivered');

    const retryFlow = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/decisions/:decisionId/notifications',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { decisionId: 'decision-retry' },
      body: {
        submissionId: 'submission-retry',
        authorId: 'author-retry',
        authorEmail: 'author-retry@example.com',
        decisionOutcome: 'rejected',
        finalizedAt: '2026-02-08T09:59:00.000Z'
      }
    });

    expect(retryFlow.statusCode).toBe(202);
    expect(retryFlow.body.status).toBe('queued');

    const retry = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/notifications/:notificationId/retry',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { notificationId: retryFlow.body.notificationId },
      body: { attemptNumber: 2 }
    });

    expect(retry.statusCode).toBe(200);
    expect(retry.body.result).toBe('delivered');

    const retryConflict = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/notifications/:notificationId/retry',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { notificationId: retryFlow.body.notificationId },
      body: { attemptNumber: 2 }
    });

    expect(retryConflict.statusCode).toBe(409);

    const invalidRetryBody = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/notifications/:notificationId/retry',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { notificationId: retryFlow.body.notificationId },
      body: { attemptNumber: 1 }
    });
    expect(invalidRetryBody.statusCode).toBe(400);

    const missingRetry = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/notifications/:notificationId/retry',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { notificationId: 'missing' },
      body: { attemptNumber: 2 }
    });
    expect(missingRetry.statusCode).toBe(404);
  });

  it('records unresolved failures and restricts admin access', async () => {
    const app = createApp({
      nowFn: createFixedClock('2026-02-08T10:00:00.000Z'),
      notificationInternalServiceKey: 'internal-secret',
      sendDecisionEmailFn: async () => ({ accepted: false, error: 'mail transport down' })
    });

    const trigger = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/decisions/:decisionId/notifications',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { decisionId: 'decision-unresolved' },
      body: {
        submissionId: 'submission-unresolved',
        authorId: 'author-unresolved',
        authorEmail: 'author-unresolved@example.com',
        decisionOutcome: 'revision',
        finalizedAt: '2026-02-08T09:59:00.000Z'
      }
    });

    expect(trigger.body.status).toBe('queued');

    const retry = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/notifications/:notificationId/retry',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { notificationId: trigger.body.notificationId },
      body: { attemptNumber: 2 }
    });

    expect(retry.statusCode).toBe(200);
    expect(retry.body.result).toBe('unresolved_failure');
    expect(typeof retry.body.failureRecordId).toBe('string');

    const unauthenticatedList = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/admin/notification-failures',
      query: {}
    });
    expect(unauthenticatedList.statusCode).toBe(401);

    const forbiddenList = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/admin/notification-failures',
      headers: { 'x-user-role': 'reviewer' },
      query: {}
    });
    expect(forbiddenList.statusCode).toBe(403);

    const adminList = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/admin/notification-failures',
      headers: { 'x-user-role': 'editor' },
      query: {
        submissionId: 'submission-unresolved',
        page: '1',
        pageSize: '10'
      }
    });

    expect(adminList.statusCode).toBe(200);
    expect(adminList.body.items).toHaveLength(1);
    expect(adminList.body.items[0].failureRecordId).toBe(retry.body.failureRecordId);

    const adminDetail = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/admin/notification-failures/:failureRecordId',
      headers: { 'x-user-role': 'admin' },
      params: { failureRecordId: retry.body.failureRecordId }
    });

    expect(adminDetail.statusCode).toBe(200);
    expect(adminDetail.body.finalDeliveryStatus).toBe('unresolved_failure');
    expect(adminDetail.body.attemptNumber).toBe(2);

    const missingDetail = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/admin/notification-failures/:failureRecordId',
      headers: { 'x-user-role': 'admin' },
      params: { failureRecordId: 'missing' }
    });

    expect(missingDetail.statusCode).toBe(404);
  });
});
