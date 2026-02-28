import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute } from '../helpers/http-harness.js';

describe('US3 failure log authorization integration', () => {
  it('returns paginated failure logs for authorized roles and denies unauthorized roles', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: false, error: 'mailbox unavailable' })
    });

    await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations',
      params: { assignmentId: 'asg-us3-1' },
      body: {
        paperId: 'paper-us3',
        reviewerId: 'reviewer-us3-1'
      }
    });
    await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations',
      params: { assignmentId: 'asg-us3-2' },
      body: {
        paperId: 'paper-us3',
        reviewerId: 'reviewer-us3-2'
      }
    });

    const unauthorized = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/invitation-failure-logs',
      params: { paperId: 'paper-us3' },
      headers: { 'x-user-role': 'reviewer' }
    });
    expect(unauthorized.statusCode).toBe(403);

    const wrongEditor = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/invitation-failure-logs',
      params: { paperId: 'paper-us3' },
      headers: {
        'x-user-role': 'editor',
        'x-editor-paper-ids': 'paper-other'
      }
    });
    expect(wrongEditor.statusCode).toBe(403);

    const support = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/invitation-failure-logs',
      params: { paperId: 'paper-us3' },
      query: { page: '1', pageSize: '1' },
      headers: { 'x-user-role': 'support' }
    });
    expect(support.statusCode).toBe(200);
    expect(support.body.paperId).toBe('paper-us3');
    expect(support.body.entries).toHaveLength(1);
    expect(support.body.total).toBeGreaterThan(1);

    const editorNoList = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/invitation-failure-logs',
      params: { paperId: 'paper-us3' },
      headers: { 'x-user-role': 'editor' }
    });
    expect(editorNoList.statusCode).toBe(200);
  });
});
