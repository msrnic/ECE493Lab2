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

describe('integration: reviewer paper access', () => {
  it('requires reviewer session for page and reviewer api routes', async () => {
    const app = createApp();
    const editorCookie = await loginAs(app, {
      id: 'editor-uc08-int',
      email: 'editor.uc08.int@example.com',
      role: 'editor'
    });

    const pageNoSession = await invokeAppRoute(app, {
      method: 'get',
      path: '/reviewer/papers'
    });
    expect(pageNoSession.statusCode).toBe(302);
    expect(pageNoSession.redirectLocation).toBe('/login');

    const apiNoSession = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers'
    });
    expect(apiNoSession.statusCode).toBe(401);

    const pageWrongRole = await invokeAppRoute(app, {
      method: 'get',
      path: '/reviewer/papers',
      headers: { cookie: editorCookie }
    });
    expect(pageWrongRole.statusCode).toBe(302);
    expect(pageWrongRole.redirectLocation).toBe('/dashboard?roleUpdated=reviewer_required');

    const apiWrongRole = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers',
      headers: { cookie: editorCookie }
    });
    expect(apiWrongRole.statusCode).toBe(403);
  });

  it('supports successful reviewer file access, outage retries, and revocation', async () => {
    const app = createApp();

    const reviewerCookie = await loginAs(app, {
      id: 'reviewer-uc08-int',
      email: 'reviewer.uc08.int@example.com',
      role: 'reviewer'
    });

    const paperAccessService = app.locals.paperAccessApiService;
    paperAccessService.upsertPaper({
      paperId: 'paper-uc08-int',
      title: 'Integration Paper',
      files: [{ fileId: 'f-1', fileName: 'paper.pdf', contentType: 'application/pdf', sizeBytes: 100 }],
      editorIds: ['editor-uc08-int']
    });

    const firstInvitation = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations',
      params: { assignmentId: 'asg-uc08-int' },
      body: {
        paperId: 'paper-uc08-int',
        reviewerId: 'account-reviewer-uc08-int'
      }
    });
    expect(firstInvitation.statusCode).toBe(202);

    const beforeAcceptance = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers',
      headers: { cookie: reviewerCookie }
    });
    expect(beforeAcceptance.statusCode).toBe(200);
    expect(beforeAcceptance.body.papers).toHaveLength(0);

    const declined = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer/invitations/:invitationId/decline',
      params: { invitationId: firstInvitation.body.id },
      headers: { cookie: reviewerCookie }
    });
    expect(declined.statusCode).toBe(200);
    expect(declined.body.status).toBe('declined');

    const afterDecline = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers',
      headers: { cookie: reviewerCookie }
    });
    expect(afterDecline.statusCode).toBe(200);
    expect(afterDecline.body.papers).toHaveLength(0);

    const invitation = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/invitations',
      params: { assignmentId: 'asg-uc08-int-accepted' },
      body: {
        paperId: 'paper-uc08-int',
        reviewerId: 'account-reviewer-uc08-int'
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
      params: { paperId: 'paper-uc08-int' },
      headers: { cookie: reviewerCookie }
    });
    expect(filesResponse.statusCode).toBe(200);

    const downloadResponse = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files/:fileId',
      params: { paperId: 'paper-uc08-int', fileId: 'f-1' },
      headers: { cookie: reviewerCookie }
    });
    expect(downloadResponse.statusCode).toBe(200);

    paperAccessService.setPaperAvailability('paper-uc08-int', 'temporarily-unavailable');

    const outage1 = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files',
      params: { paperId: 'paper-uc08-int' },
      headers: { cookie: reviewerCookie }
    });
    const outage2 = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files',
      params: { paperId: 'paper-uc08-int' },
      headers: { cookie: reviewerCookie }
    });
    const throttled = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files',
      params: { paperId: 'paper-uc08-int' },
      headers: { cookie: reviewerCookie }
    });

    expect(outage1.statusCode).toBe(503);
    expect(outage2.statusCode).toBe(503);
    expect(throttled.statusCode).toBe(429);

    paperAccessService.setPaperAvailability('paper-uc08-int', 'available');
    paperAccessService.revokeReviewerAccess({
      reviewerId: 'account-reviewer-uc08-int',
      paperId: 'paper-uc08-int',
      revokedBy: 'editor-uc08-int'
    });

    const denied = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files/:fileId',
      params: { paperId: 'paper-uc08-int', fileId: 'f-1' },
      headers: { cookie: reviewerCookie }
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.body.reasonCode).toBe('ACCESS_REVOKED');
  });

  it('restricts access record visibility by role and elevated support/admin headers', async () => {
    const app = createApp();

    const reviewerCookie = await loginAs(app, {
      id: 'reviewer-uc08-int-records',
      email: 'reviewer.uc08.records@example.com',
      role: 'reviewer'
    });
    const editorCookie = await loginAs(app, {
      id: 'editor-uc08-int-records',
      email: 'editor.uc08.records@example.com',
      role: 'editor'
    });

    const paperAccessService = app.locals.paperAccessApiService;
    paperAccessService.upsertPaper({
      paperId: 'paper-uc08-records',
      title: 'Records Paper',
      files: [{ fileId: 'f-2', fileName: 'records.pdf', contentType: 'application/pdf', sizeBytes: 50 }],
      editorIds: ['editor-uc08-int-records']
    });
    paperAccessService.assignReviewer({
      reviewerId: 'account-reviewer-uc08-int-records',
      paperId: 'paper-uc08-records'
    });

    await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer/papers/:paperId/files',
      params: { paperId: 'paper-uc08-records' },
      headers: { cookie: reviewerCookie }
    });

    const denied = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/access-attempts',
      params: { paperId: 'paper-uc08-records' },
      headers: { cookie: reviewerCookie }
    });
    expect(denied.statusCode).toBe(403);

    const editorAllowed = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/access-attempts',
      params: { paperId: 'paper-uc08-records' },
      headers: { cookie: editorCookie }
    });
    expect(editorAllowed.statusCode).toBe(200);
    expect(editorAllowed.body.records.length).toBeGreaterThan(0);

    const supportAllowed = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/access-attempts',
      params: { paperId: 'paper-uc08-records' },
      headers: {
        cookie: reviewerCookie,
        'x-user-role': 'support'
      }
    });
    expect(supportAllowed.statusCode).toBe(200);

    const pageView = await invokeAppRoute(app, {
      method: 'get',
      path: '/papers/:paperId/access-attempts',
      params: { paperId: 'paper-uc08-records' },
      headers: { cookie: editorCookie }
    });
    expect(pageView.statusCode).toBe(200);
    expect(pageView.text).toContain('Paper Access Records');
  });
});
