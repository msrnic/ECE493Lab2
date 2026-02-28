import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute } from '../helpers/http-harness.js';

describe('US1 invitation lifecycle integration', () => {
  it('creates, reuses, and reads invitation status via contract endpoints', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: true, providerMessageId: 'provider-1' })
    });

    const created = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations',
      params: { assignmentId: 'asg-us1-1' },
      body: {
        paperId: 'paper-us1-1',
        reviewerId: 'reviewer-us1-1'
      }
    });

    expect(created.statusCode).toBe(202);
    expect(created.body).toMatchObject({
      reviewerAssignmentId: 'asg-us1-1',
      paperId: 'paper-us1-1',
      reviewerId: 'reviewer-us1-1',
      status: 'delivered',
      retryCount: 0,
      maxRetries: 3,
      followUpRequired: false
    });

    const reused = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations',
      params: { assignmentId: 'asg-us1-1' },
      body: {
        paperId: 'paper-us1-1',
        reviewerId: 'reviewer-us1-1'
      }
    });

    expect(reused.statusCode).toBe(202);

    const status = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/review-invitations/:invitationId',
      params: { invitationId: created.body.id }
    });

    expect(status.statusCode).toBe(200);
    expect(status.body.id).toBe(created.body.id);
    expect(status.body.status).toBe('delivered');

    const missing = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/review-invitations/:invitationId',
      params: { invitationId: 'missing' }
    });
    expect(missing.statusCode).toBe(404);
  });

  it('validates mandatory fields for trigger endpoint', async () => {
    const app = createApp();

    const response = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations',
      params: { assignmentId: 'asg-us1-2' },
      body: { reviewerId: 'reviewer-us1-2' }
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe('INVITATION_BAD_REQUEST');
  });
});
