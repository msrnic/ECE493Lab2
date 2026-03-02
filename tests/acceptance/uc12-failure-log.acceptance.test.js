import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute } from '../helpers/http-harness.js';

describe('UC-12-AS failure-log acceptance', () => {
  it('Given retry fails, when unresolved failure is recorded, then admin can view full failure details', async () => {
    const app = createApp({
      notificationInternalServiceKey: 'internal-secret',
      sendDecisionEmailFn: async () => ({ accepted: false, error: 'provider down' })
    });

    const trigger = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/decisions/:decisionId/notifications',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { decisionId: 'decision-acceptance-failure-log-1' },
      body: {
        submissionId: 'submission-acceptance-failure-log-1',
        authorId: 'author-acceptance-failure-log-1',
        authorEmail: 'author-acceptance-failure-log-1@example.com',
        decisionOutcome: 'revision',
        finalizedAt: '2026-02-08T11:59:00.000Z'
      }
    });

    const retry = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/notifications/:notificationId/retry',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { notificationId: trigger.body.notificationId },
      body: { attemptNumber: 2 }
    });

    const denied = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/admin/notification-failures',
      headers: { 'x-user-role': 'reviewer' }
    });

    const list = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/admin/notification-failures',
      headers: { 'x-user-role': 'admin' },
      query: { submissionId: 'submission-acceptance-failure-log-1' }
    });

    const detail = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/admin/notification-failures/:failureRecordId',
      headers: { 'x-user-role': 'admin' },
      params: { failureRecordId: retry.body.failureRecordId }
    });

    expect(retry.body.result).toBe('unresolved_failure');
    expect(denied.statusCode).toBe(403);
    expect(list.statusCode).toBe(200);
    expect(list.body.items[0].failureRecordId).toBe(retry.body.failureRecordId);
    expect(detail.statusCode).toBe(200);
    expect(detail.body.attemptNumber).toBe(2);
    expect(Date.parse(detail.body.retainedUntil)).toBeGreaterThan(Date.parse(detail.body.timestamp));
  });
});
