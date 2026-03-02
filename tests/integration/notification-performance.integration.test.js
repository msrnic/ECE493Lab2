import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute } from '../helpers/http-harness.js';

describe('notification performance integration', () => {
  it('captures finalize-to-attempt and fail-to-retry timing metrics', async () => {
    const app = createApp({
      notificationInternalServiceKey: 'internal-secret',
      sendDecisionEmailFn: async ({ attemptNumber }) => {
        if (attemptNumber === 1) {
          return { accepted: false, error: 'smtp down' };
        }

        return { accepted: true, providerMessageId: 'provider-1' };
      }
    });

    const trigger = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/decisions/:decisionId/notifications',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { decisionId: 'decision-performance' },
      body: {
        submissionId: 'submission-performance',
        authorId: 'author-performance',
        authorEmail: 'author-performance@example.com',
        decisionOutcome: 'accepted',
        finalizedAt: '2026-02-08T11:59:59.000Z'
      }
    });
    expect(trigger.statusCode).toBe(202);

    const retry = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/notifications/:notificationId/retry',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { notificationId: trigger.body.notificationId },
      body: { attemptNumber: 2 }
    });

    expect(retry.statusCode).toBe(200);
    expect(retry.body.result).toBe('delivered');

    const metrics = app.locals.retrySchedulerService.getLatencyMeasurements();
    expect(metrics.some((metric) => metric.metric === 'finalize_to_attempt1_ms')).toBe(true);
    expect(metrics.some((metric) => metric.metric === 'failure_to_retry_ms')).toBe(true);
  });
});
