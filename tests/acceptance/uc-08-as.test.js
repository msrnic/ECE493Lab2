import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { invokeAppRoute, invokeHandler } from '../helpers/http-harness.js';

async function loginAs(app, { id, email, role }) {
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

function seedReviewerPaperAccess(app, {
  paperId = 'paper-uc08-as',
  reviewerAccountId = 'reviewer-uc08-as',
  editorAccountId = 'editor-uc08-as',
  assign = true
} = {}) {
  app.locals.paperAccessApiService.upsertPaper({
    paperId,
    title: 'UC-08 Acceptance Paper',
    files: [{
      fileId: 'file-uc08-as',
      fileName: 'acceptance.pdf',
      contentType: 'application/pdf',
      sizeBytes: 128
    }],
    editorIds: [editorAccountId]
  });

  if (assign) {
    app.locals.paperAccessApiService.assignReviewer({
      reviewerId: `account-${reviewerAccountId}`,
      paperId
    });
  }

  return { paperId, fileId: 'file-uc08-as' };
}

describe('UC-08-AS Access Assigned Paper acceptance', () => {
  it('Given reviewer accepted assignment, when paper selected, then files are displayed', async () => {
    const app = createApp();
    const reviewerCookie = await loginAs(app, {
      id: 'reviewer-uc08-as-1',
      email: 'reviewer.uc08.as1@example.com',
      role: 'reviewer'
    });

    const { paperId } = seedReviewerPaperAccess(app, {
      paperId: 'paper-uc08-as-1',
      reviewerAccountId: 'reviewer-uc08-as-1',
      editorAccountId: 'editor-uc08-as-1',
      assign: false
    });

    const beforeAccept = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers',
      headers: { cookie: reviewerCookie }
    });
    expect(beforeAccept.statusCode).toBe(200);
    expect(beforeAccept.body.papers).toHaveLength(0);

    const invitation = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations',
      params: { assignmentId: 'asg-uc08-as-1' },
      body: {
        paperId,
        reviewerId: 'account-reviewer-uc08-as-1'
      }
    });
    expect(invitation.statusCode).toBe(202);

    const accepted = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer/invitations/:invitationId/accept',
      params: { invitationId: invitation.body.id },
      headers: { cookie: reviewerCookie }
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.body.status).toBe('accepted');

    const assigned = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers',
      headers: { cookie: reviewerCookie }
    });
    expect(assigned.statusCode).toBe(200);
    expect(assigned.body.papers).toHaveLength(1);

    const filesResponse = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files',
      params: { paperId },
      headers: { cookie: reviewerCookie }
    });

    expect(filesResponse.statusCode).toBe(200);
    expect(filesResponse.body.files[0].fileName).toBe('acceptance.pdf');
  });

  it('Given reviewer declines assignment invitation, when inbox refreshes, then invitation disappears and no paper is accessible', async () => {
    const app = createApp();
    const reviewerCookie = await loginAs(app, {
      id: 'reviewer-uc08-as-decline',
      email: 'reviewer.uc08.decline@example.com',
      role: 'reviewer'
    });

    const { paperId } = seedReviewerPaperAccess(app, {
      paperId: 'paper-uc08-as-decline',
      reviewerAccountId: 'reviewer-uc08-as-decline',
      editorAccountId: 'editor-uc08-as-decline',
      assign: false
    });

    const invitation = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations',
      params: { assignmentId: 'asg-uc08-as-decline' },
      body: {
        paperId,
        reviewerId: 'account-reviewer-uc08-as-decline'
      }
    });
    expect(invitation.statusCode).toBe(202);

    const inboxBeforeDecline = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/invitations',
      headers: { cookie: reviewerCookie },
      query: { includeInactive: 'false' }
    });
    expect(inboxBeforeDecline.statusCode).toBe(200);
    expect(inboxBeforeDecline.body.invitations.map((entry) => entry.id)).toContain(invitation.body.id);

    const declined = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer/invitations/:invitationId/decline',
      params: { invitationId: invitation.body.id },
      headers: { cookie: reviewerCookie }
    });
    expect(declined.statusCode).toBe(200);
    expect(declined.body.status).toBe('declined');

    const inboxAfterDecline = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/invitations',
      headers: { cookie: reviewerCookie },
      query: { includeInactive: 'false' }
    });
    expect(inboxAfterDecline.statusCode).toBe(200);
    expect(inboxAfterDecline.body.invitations.find((entry) => entry.id === invitation.body.id)).toBeUndefined();

    const assigned = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers',
      headers: { cookie: reviewerCookie }
    });
    expect(assigned.statusCode).toBe(200);
    expect(assigned.body.papers).toHaveLength(0);
  });

  it('Given access revoked, when paper accessed, then access is denied', async () => {
    const app = createApp();
    const reviewerCookie = await loginAs(app, {
      id: 'reviewer-uc08-as-2',
      email: 'reviewer.uc08.as2@example.com',
      role: 'reviewer'
    });

    const { paperId } = seedReviewerPaperAccess(app, {
      paperId: 'paper-uc08-as-2',
      reviewerAccountId: 'reviewer-uc08-as-2',
      editorAccountId: 'editor-uc08-as-2'
    });

    app.locals.paperAccessApiService.revokeReviewerAccess({
      reviewerId: 'account-reviewer-uc08-as-2',
      paperId,
      revokedBy: 'editor-uc08-as-2'
    });

    const denied = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files',
      params: { paperId },
      headers: { cookie: reviewerCookie }
    });

    expect(denied.statusCode).toBe(403);
    expect(denied.body.reasonCode).toBe('ACCESS_REVOKED');
  });

  it('Given session expires before retrieval, when reviewer requests files, then re-authentication is required', async () => {
    const app = createApp();

    const unauthenticated = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files',
      params: { paperId: 'paper-uc08-as-3' }
    });

    expect(unauthenticated.statusCode).toBe(401);
    expect(unauthenticated.body.code).toBe('AUTHENTICATION_REQUIRED');
    expect(unauthenticated.body.files).toBeUndefined();
  });

  it('Given temporary outage, when retries are made, then immediate retry is allowed and repeated retries are throttled', async () => {
    const app = createApp();
    const reviewerCookie = await loginAs(app, {
      id: 'reviewer-uc08-as-4',
      email: 'reviewer.uc08.as4@example.com',
      role: 'reviewer'
    });

    const { paperId } = seedReviewerPaperAccess(app, {
      paperId: 'paper-uc08-as-4',
      reviewerAccountId: 'reviewer-uc08-as-4',
      editorAccountId: 'editor-uc08-as-4'
    });

    app.locals.paperAccessApiService.setPaperAvailability(paperId, 'temporarily-unavailable');

    const first = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files',
      params: { paperId },
      headers: { cookie: reviewerCookie }
    });
    const second = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files',
      params: { paperId },
      headers: { cookie: reviewerCookie }
    });
    const throttled = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files',
      params: { paperId },
      headers: { cookie: reviewerCookie }
    });

    expect(first.statusCode).toBe(503);
    expect(second.statusCode).toBe(503);
    expect(throttled.statusCode).toBe(429);
  });

  it('Given reviewer already viewing content and access revoked, when requesting another file, then new request is denied while previous content stays visible', async () => {
    const app = createApp();
    const reviewerCookie = await loginAs(app, {
      id: 'reviewer-uc08-as-5',
      email: 'reviewer.uc08.as5@example.com',
      role: 'reviewer'
    });

    const { paperId, fileId } = seedReviewerPaperAccess(app, {
      paperId: 'paper-uc08-as-5',
      reviewerAccountId: 'reviewer-uc08-as-5',
      editorAccountId: 'editor-uc08-as-5'
    });

    const firstDisplay = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files',
      params: { paperId },
      headers: { cookie: reviewerCookie }
    });
    expect(firstDisplay.statusCode).toBe(200);

    app.locals.paperAccessApiService.revokeReviewerAccess({
      reviewerId: 'account-reviewer-uc08-as-5',
      paperId,
      revokedBy: 'editor-uc08-as-5'
    });

    const denied = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files/:fileId',
      params: { paperId, fileId },
      headers: { cookie: reviewerCookie }
    });

    expect(denied.statusCode).toBe(403);
    expect(firstDisplay.body.files).toHaveLength(1);
  });

  it('Given access attempt records exist, when editor/support-admin views records, then outcomes are visible and unauthorized users are denied', async () => {
    const app = createApp();
    const reviewerCookie = await loginAs(app, {
      id: 'reviewer-uc08-as-6',
      email: 'reviewer.uc08.as6@example.com',
      role: 'reviewer'
    });
    const editorCookie = await loginAs(app, {
      id: 'editor-uc08-as-6',
      email: 'editor.uc08.as6@example.com',
      role: 'editor'
    });

    const { paperId } = seedReviewerPaperAccess(app, {
      paperId: 'paper-uc08-as-6',
      reviewerAccountId: 'reviewer-uc08-as-6',
      editorAccountId: 'editor-uc08-as-6'
    });

    await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files',
      params: { paperId },
      headers: { cookie: reviewerCookie }
    });

    const unauthorized = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/access-attempts',
      params: { paperId },
      headers: { cookie: reviewerCookie }
    });
    expect(unauthorized.statusCode).toBe(403);

    const editorAllowed = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/access-attempts',
      params: { paperId },
      headers: { cookie: editorCookie }
    });
    expect(editorAllowed.statusCode).toBe(200);
    expect(editorAllowed.body.records.length).toBeGreaterThan(0);

    const supportAllowed = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/access-attempts',
      params: { paperId },
      headers: {
        cookie: reviewerCookie,
        'x-user-role': 'support'
      }
    });
    expect(supportAllowed.statusCode).toBe(200);

    const expiredSession = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/access-attempts',
      params: { paperId }
    });
    expect(expiredSession.statusCode).toBe(401);
  });
});
