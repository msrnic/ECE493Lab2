import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { invokeAppRoute } from '../../helpers/http-harness.js';

const contractPath = path.join(process.cwd(), 'specs/001-receive-review-invitation/contracts/openapi.yaml');

describe('Reviewer invitation OpenAPI contract smoke', () => {
  it('keeps required UC-07 contract paths and endpoint response shapes', async () => {
    const openapi = readFileSync(contractPath, 'utf8');

    const requiredPaths = [
      '/api/reviewer-assignments/{assignmentId}/invitations',
      '/api/review-invitations/{invitationId}',
      '/api/review-invitations/{invitationId}/delivery-events',
      '/api/reviewer-assignments/{assignmentId}/invitations/cancel',
      '/api/internal/review-invitations/retry-due',
      '/api/papers/{paperId}/invitation-failure-logs'
    ];

    for (const requiredPath of requiredPaths) {
      expect(openapi.includes(requiredPath)).toBe(true);
    }

    const app = createApp({
      sendInvitationFn: async () => ({ accepted: false, error: 'smtp timeout' })
    });

    const trigger = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations',
      params: { assignmentId: 'asg-contract-1' },
      body: { paperId: 'paper-contract', reviewerId: 'reviewer-contract' }
    });

    expect(trigger.statusCode).toBe(202);
    expect(trigger.body).toMatchObject({
      id: expect.any(String),
      reviewerAssignmentId: 'asg-contract-1',
      paperId: 'paper-contract',
      reviewerId: 'reviewer-contract',
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      followUpRequired: false,
      updatedAt: expect.any(String)
    });

    const status = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/review-invitations/:invitationId',
      params: { invitationId: trigger.body.id }
    });
    expect(status.statusCode).toBe(200);

    const attempts = app.locals.invitationModel.getDeliveryAttempts(trigger.body.id);
    const deliveredEvent = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/review-invitations/:invitationId/delivery-events',
      params: { invitationId: trigger.body.id },
      body: {
        attemptId: attempts[0].id,
        eventType: 'delivered',
        occurredAt: '2026-02-08T10:01:00.000Z'
      }
    });
    expect(deliveredEvent.statusCode).toBe(200);
    expect(deliveredEvent.body.status).toBe('delivered');

    const cancel = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations/cancel',
      params: { assignmentId: 'asg-contract-1' },
      body: { reason: 'assignment_removed', occurredAt: '2026-02-08T10:02:00.000Z' }
    });
    expect(cancel.statusCode).toBe(200);

    const retryRun = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/review-invitations/retry-due',
      body: { runAt: '2026-02-08T10:05:00.000Z' }
    });
    expect(retryRun.statusCode).toBe(200);
    expect(retryRun.body).toMatchObject({
      runAt: expect.any(String),
      processedInvitations: expect.any(Number),
      attemptsCreated: expect.any(Number),
      completed: expect.any(Number),
      failed: expect.any(Number),
      canceled: expect.any(Number)
    });

    const logs = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/invitation-failure-logs',
      params: { paperId: 'paper-contract' },
      headers: { 'x-user-role': 'support' }
    });
    expect(logs.statusCode).toBe(200);
    expect(logs.body).toMatchObject({
      paperId: 'paper-contract',
      entries: expect.any(Array),
      page: expect.any(Number),
      pageSize: expect.any(Number),
      total: expect.any(Number)
    });
  });
});
