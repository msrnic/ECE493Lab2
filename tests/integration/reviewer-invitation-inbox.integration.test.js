import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { invokeAppRoute, invokeHandler } from '../helpers/http-harness.js';

async function loginAs(app, {
  id,
  email,
  role
}) {
  app.locals.repository.createUserAccount({
    id,
    fullName: `${role} user`,
    emailNormalized: email,
    passwordHash: hashPassword('StrongPass!2026'),
    role,
    lastAssignedRole: role,
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
  return String(loginResponse.headers['Set-Cookie']).split(';')[0];
}

async function triggerInvitation(app, { assignmentId, paperId, reviewerId }) {
  return invokeAppRoute(app, {
    method: 'post',
    path: '/api/reviewer-assignments/:assignmentId/invitations',
    params: { assignmentId },
    body: { paperId, reviewerId }
  });
}

describe('integration: reviewer invitation inbox', () => {
  it('requires authenticated reviewer role for page and api routes', async () => {
    const app = createApp();
    const editorCookie = await loginAs(app, {
      id: 'editor-inbox-int',
      email: 'editor.inbox.int@example.com',
      role: 'editor'
    });

    const pageUnauthenticated = await invokeAppRoute(app, {
      method: 'get',
      path: '/reviewer/invitations'
    });
    expect(pageUnauthenticated.statusCode).toBe(302);
    expect(pageUnauthenticated.redirectLocation).toBe('/login');

    const apiUnauthenticated = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/invitations'
    });
    expect(apiUnauthenticated.statusCode).toBe(401);
    expect(apiUnauthenticated.body.code).toBe('AUTHENTICATION_REQUIRED');

    const pageForbidden = await invokeAppRoute(app, {
      method: 'get',
      path: '/reviewer/invitations',
      headers: { cookie: editorCookie }
    });
    expect(pageForbidden.statusCode).toBe(302);
    expect(pageForbidden.redirectLocation).toBe('/dashboard?roleUpdated=reviewer_required');

    const apiForbidden = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/invitations',
      headers: { cookie: editorCookie }
    });
    expect(apiForbidden.statusCode).toBe(403);
    expect(apiForbidden.body.code).toBe('INVITATION_FORBIDDEN');
  });

  it('lists invitation inbox entries and supports includeInactive filtering', async () => {
    const app = createApp({
      sendInvitationFn: async (invitation) => {
        if (invitation.paperId === 'paper-inbox-delivered') {
          return { accepted: true, providerMessageId: 'provider-inbox-1' };
        }

        return { accepted: false, error: 'delivery pending' };
      }
    });
    const reviewerAccountId = 'reviewer-inbox-int';
    const reviewerCookie = await loginAs(app, {
      id: reviewerAccountId,
      email: 'reviewer.inbox.int@example.com',
      role: 'reviewer'
    });
    const reviewerId = `account-${reviewerAccountId}`;

    await triggerInvitation(app, {
      assignmentId: 'asg-inbox-pending-int',
      paperId: 'paper-inbox-pending',
      reviewerId
    });
    await triggerInvitation(app, {
      assignmentId: 'asg-inbox-delivered-int',
      paperId: 'paper-inbox-delivered',
      reviewerId
    });

    const inboxPage = await invokeAppRoute(app, {
      method: 'get',
      path: '/reviewer/invitations',
      headers: { cookie: reviewerCookie }
    });
    expect(inboxPage.statusCode).toBe(200);
    expect(inboxPage.text).toContain('Review Invitation Inbox');
    expect(inboxPage.text).toContain('paper-inbox-pending');
    expect(inboxPage.text).toContain('paper-inbox-delivered');

    const defaultApi = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/invitations',
      headers: { cookie: reviewerCookie }
    });
    expect(defaultApi.statusCode).toBe(200);
    expect(defaultApi.body.reviewerId).toBe(reviewerId);
    expect(defaultApi.body.invitations).toHaveLength(2);

    const activeOnlyApi = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/invitations',
      headers: { cookie: reviewerCookie },
      query: { includeInactive: 'false' }
    });
    expect(activeOnlyApi.statusCode).toBe(200);
    expect(activeOnlyApi.body.invitations).toHaveLength(1);
    expect(activeOnlyApi.body.invitations[0].paperId).toBe('paper-inbox-pending');
  });
});
