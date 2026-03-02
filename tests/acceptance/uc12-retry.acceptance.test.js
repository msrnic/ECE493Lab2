import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute } from '../helpers/http-harness.js';

describe('UC-12-AS retry acceptance', () => {
  it('Given notification fails, when retry is triggered, then exactly one retry attempt is processed', async () => {
    let callCount = 0;
    const app = createApp({
      notificationInternalServiceKey: 'internal-secret',
      sendDecisionEmailFn: async ({ attemptNumber }) => {
        callCount += 1;
        if (attemptNumber === 1) {
          return { accepted: false, error: 'smtp unavailable' };
        }

        return { accepted: true, providerMessageId: 'provider-retry-success' };
      }
    });

    const trigger = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/decisions/:decisionId/notifications',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { decisionId: 'decision-acceptance-retry-1' },
      body: {
        submissionId: 'submission-acceptance-retry-1',
        authorId: 'author-acceptance-retry-1',
        authorEmail: 'author-acceptance-retry-1@example.com',
        decisionOutcome: 'accepted',
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

    const conflict = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/notifications/:notificationId/retry',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { notificationId: trigger.body.notificationId },
      body: { attemptNumber: 2 }
    });

    expect(trigger.body.status).toBe('queued');
    expect(retry.statusCode).toBe(200);
    expect(retry.body.result).toBe('delivered');
    expect(conflict.statusCode).toBe(409);
    expect(callCount).toBe(2);
  });
});
