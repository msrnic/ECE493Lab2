import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute } from '../helpers/http-harness.js';

describe('NFR-002 retry scheduler drift', () => {
  it('schedules retries every 5 minutes with at most 15-second drift', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: false, error: 'drift check failure' })
    });

    const triggered = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations',
      params: { assignmentId: 'asg-drift' },
      body: {
        paperId: 'paper-drift',
        reviewerId: 'reviewer-drift'
      }
    });

    expect(triggered.statusCode).toBe(202);
    expect(triggered.body.status).toBe('pending');

    let expectedRetryAt = Date.parse(triggered.body.nextRetryAt);

    for (let retry = 0; retry < 2; retry += 1) {
      const retried = await invokeAppRoute(app, {
        method: 'post',
        path: '/api/internal/review-invitations/retry-due',
        body: { runAt: new Date(expectedRetryAt).toISOString() }
      });

      expect(retried.statusCode).toBe(200);

      const refreshed = await invokeAppRoute(app, {
        method: 'get',
        path: '/api/review-invitations/:invitationId',
        params: { invitationId: triggered.body.id }
      });

      expect(refreshed.statusCode).toBe(200);
      expect(refreshed.body.status).toBe('pending');

      const actualNextRetryAt = Date.parse(refreshed.body.nextRetryAt);
      const expectedNextRetryAt = expectedRetryAt + (5 * 60 * 1000);
      const driftMs = Math.abs(actualNextRetryAt - expectedNextRetryAt);

      expect(driftMs).toBeLessThanOrEqual(15000);
      expectedRetryAt = actualNextRetryAt;
    }
  });
});
