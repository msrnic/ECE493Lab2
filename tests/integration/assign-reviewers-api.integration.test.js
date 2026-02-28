import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute, invokeHandler } from '../helpers/http-harness.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { createTempPersistencePaths } from '../helpers/persistence-paths.js';
import { extractTokenFromConfirmationUrl, validRegistrationPayload } from '../helpers/test-support.js';

async function loginAs(app, {
  id,
  email,
  role = 'editor'
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

function withCookie(cookie) {
  return { cookie };
}

async function createAttempt(app, paperId, selections, basePaperVersion = 0, headers = {}) {
  return invokeAppRoute(app, {
    method: 'post',
    path: '/api/papers/:paperId/assignment-attempts',
    params: { paperId },
    headers,
    body: {
      editorId: 'editor-1',
      basePaperVersion,
      selections
    }
  });
}

describe('integration: assign-reviewers api', () => {
  it('requires authenticated editor role for assignment endpoints', async () => {
    const app = createApp();
    const editorCookie = await loginAs(app, {
      id: 'editor-1',
      email: 'editor.assign@example.com',
      role: 'editor'
    });
    const reviewerCookie = await loginAs(app, {
      id: 'reviewer-1',
      email: 'reviewer.assign@example.com',
      role: 'reviewer'
    });

    const unauthenticated = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers',
      query: { state: 'submitted' }
    });
    expect(unauthenticated.statusCode).toBe(401);
    expect(unauthenticated.body.code).toBe('AUTHENTICATION_REQUIRED');

    const forbidden = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers',
      headers: withCookie(reviewerCookie),
      query: { state: 'submitted' }
    });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.body.code).toBe('ASSIGNMENT_FORBIDDEN');

    const allowed = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers',
      headers: withCookie(editorCookie),
      query: { state: 'submitted' }
    });
    expect(allowed.statusCode).toBe(200);
  });

  it('supports happy-path assignment and stale-confirmation handling', async () => {
    const app = createApp();
    const editorCookie = await loginAs(app, {
      id: 'editor-main',
      email: 'editor.main@example.com'
    });
    const editorHeaders = withCookie(editorCookie);

    const badQuery = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers',
      headers: editorHeaders,
      query: { state: 'draft' }
    });
    expect(badQuery.statusCode).toBe(400);

    const papers = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers',
      headers: editorHeaders,
      query: { state: 'submitted' }
    });
    expect(papers.statusCode).toBe(200);
    expect(papers.body.papers.length).toBeGreaterThanOrEqual(2);

    const candidates = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/reviewer-candidates',
      headers: editorHeaders,
      params: { paperId: 'paper-001' }
    });
    expect(candidates.statusCode).toBe(200);
    expect(candidates.body.candidates).toHaveLength(4);

    const unavailablePaperCandidates = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/reviewer-candidates',
      headers: editorHeaders,
      params: { paperId: 'missing-paper' }
    });
    expect(unavailablePaperCandidates.statusCode).toBe(404);

    const blockedAttempt = await createAttempt(app, 'paper-001', [
      { slotNumber: 1, reviewerId: 'reviewer-002' },
      { slotNumber: 2, reviewerId: 'reviewer-004' }
    ], 0, editorHeaders);
    expect(blockedAttempt.statusCode).toBe(201);

    const blockedConfirm = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/assignment-attempts/:attemptId/confirm',
      headers: editorHeaders,
      params: { paperId: 'paper-001', attemptId: blockedAttempt.body.attemptId },
      body: {
        editorId: 'editor-1',
        basePaperVersion: blockedAttempt.body.basePaperVersion
      }
    });
    expect(blockedConfirm.statusCode).toBe(400);
    expect(blockedConfirm.body.code).toBe('ASSIGNMENT_BLOCKED');

    const blockedSelection = blockedAttempt.body.selections.find((selection) => selection.status === 'needs_replacement');
    const replacement = await invokeAppRoute(app, {
      method: 'patch',
      path: '/api/papers/:paperId/assignment-attempts/:attemptId/selections/:selectionId',
      headers: editorHeaders,
      params: {
        paperId: 'paper-001',
        attemptId: blockedAttempt.body.attemptId,
        selectionId: blockedSelection.selectionId
      },
      body: {
        replacementReviewerId: 'reviewer-001'
      }
    });
    expect(replacement.statusCode).toBe(200);
    expect(replacement.body.status).toBe('eligible');

    const confirmed = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/assignment-attempts/:attemptId/confirm',
      headers: editorHeaders,
      params: { paperId: 'paper-001', attemptId: blockedAttempt.body.attemptId },
      body: {
        editorId: 'editor-1',
        basePaperVersion: 0
      }
    });
    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.body.outcome).toBe('confirmed');
    expect(confirmed.body.assignedReviewers).toHaveLength(2);
    expect(confirmed.body.replacedReviewers).toHaveLength(1);

    const outcome = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/assignment-outcomes/:attemptId',
      headers: editorHeaders,
      params: { paperId: 'paper-001', attemptId: blockedAttempt.body.attemptId }
    });
    expect(outcome.statusCode).toBe(200);

    const attemptA = await createAttempt(app, 'paper-002', [{ slotNumber: 1, reviewerId: 'reviewer-005' }], 0, editorHeaders);
    const attemptB = await createAttempt(app, 'paper-002', [{ slotNumber: 1, reviewerId: 'reviewer-006' }], 0, editorHeaders);

    const confirmedA = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/assignment-attempts/:attemptId/confirm',
      headers: editorHeaders,
      params: { paperId: 'paper-002', attemptId: attemptA.body.attemptId },
      body: { editorId: 'editor-1', basePaperVersion: 0 }
    });
    expect(confirmedA.statusCode).toBe(200);

    const staleB = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/assignment-attempts/:attemptId/confirm',
      headers: editorHeaders,
      params: { paperId: 'paper-002', attemptId: attemptB.body.attemptId },
      body: { editorId: 'editor-2', basePaperVersion: 0 }
    });
    expect(staleB.statusCode).toBe(409);
    expect(staleB.body.code).toBe('STALE_CONFIRMATION');
    expect(staleB.body.currentAssignmentVersion).toBe(1);

    const staleOutcome = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/assignment-outcomes/:attemptId',
      headers: editorHeaders,
      params: { paperId: 'paper-002', attemptId: attemptB.body.attemptId }
    });
    expect(staleOutcome.statusCode).toBe(200);
    expect(staleOutcome.body.outcome).toBe('rejected_stale');
  });

  it('supports invitation retry, terminal failure, cancellation, and failure-log authorization', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({
        accepted: false,
        error: 'delivery failed'
      })
    });
    const editorCookie = await loginAs(app, {
      id: 'editor-uc07',
      email: 'editor.uc07@example.com'
    });
    const editorHeaders = withCookie(editorCookie);

    const attempt = await createAttempt(app, 'paper-001', [
      { slotNumber: 1, reviewerId: 'reviewer-001' }
    ], 0, editorHeaders);
    const confirmed = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/assignment-attempts/:attemptId/confirm',
      headers: editorHeaders,
      params: { paperId: 'paper-001', attemptId: attempt.body.attemptId },
      body: { editorId: 'editor-1', basePaperVersion: 0 }
    });
    expect(confirmed.statusCode).toBe(200);

    const invitationId = confirmed.body.assignedReviewers[0].invitation.invitationId;
    expect(confirmed.body.assignedReviewers[0].invitation.status).toBe('retry_scheduled');

    const retry1 = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/invitations/:invitationId/retry',
      params: { invitationId }
    });
    const retry2 = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/invitations/:invitationId/retry',
      params: { invitationId }
    });
    const retry3 = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/invitations/:invitationId/retry',
      params: { invitationId }
    });

    expect(retry1.statusCode).toBe(200);
    expect(retry1.body.status).toBe('retry_scheduled');
    expect(retry2.body.status).toBe('retry_scheduled');
    expect(retry3.body.status).toBe('failed_terminal');
    expect(retry3.body.followUpRequired).toBe(true);

    const failureLogForbidden = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/invitations/:invitationId/failure-log',
      params: { invitationId },
      headers: { 'x-user-role': 'reviewer' }
    });
    expect(failureLogForbidden.statusCode).toBe(403);

    const failureLogAllowed = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/invitations/:invitationId/failure-log',
      params: { invitationId },
      headers: { 'x-user-role': 'editor' }
    });
    expect(failureLogAllowed.statusCode).toBe(200);
    expect(failureLogAllowed.body.status).toBe('failed_terminal');

    const statusBeforeCancel = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/invitations/:invitationId',
      params: { invitationId }
    });
    expect(statusBeforeCancel.statusCode).toBe(200);

    const canceled = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/invitations/:invitationId/cancel',
      params: { invitationId }
    });
    expect(canceled.statusCode).toBe(200);
    expect(canceled.body.status).toBe('canceled');

    const dispatchCanceled = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/invitations/:invitationId/dispatch',
      params: { invitationId }
    });
    expect(dispatchCanceled.statusCode).toBe(202);
    expect(dispatchCanceled.body.status).toBe('canceled');

    const unknownInvitation = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/invitations/:invitationId',
      params: { invitationId: 'missing' }
    });
    expect(unknownInvitation.statusCode).toBe(404);
  });

  it('lists reviewer-role user accounts as reviewer candidates', async () => {
    const app = createApp();
    const editorCookie = await loginAs(app, {
      id: 'editor-candidates',
      email: 'editor.candidates@example.com'
    });
    app.locals.repository.createUserAccount({
      id: 'reviewer-account',
      fullName: 'Registered Reviewer',
      emailNormalized: 'registered.reviewer@example.com',
      passwordHash: hashPassword('StrongPass!2026'),
      role: 'reviewer',
      lastAssignedRole: 'reviewer',
      status: 'active',
      createdAt: '2026-02-01T00:00:00.000Z',
      activatedAt: '2026-02-01T00:00:00.000Z'
    });

    const candidates = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/reviewer-candidates',
      headers: withCookie(editorCookie),
      params: { paperId: 'paper-001' }
    });

    expect(candidates.statusCode).toBe(200);
    expect(candidates.body.candidates.some((candidate) => candidate.reviewerId === 'account-reviewer-account')).toBe(true);
  });

  it('persists registered accounts and last assigned role so they can log in and appear as reviewers', async () => {
    const paths = createTempPersistencePaths('ece493-auth-persistence-');
    const appOne = createApp({
      authNodeEnv: 'test',
      databaseDirectory: paths.databaseDirectory,
      uploadsDirectory: paths.uploadsDirectory
    });

    const registration = await invokeAppRoute(appOne, {
      method: 'post',
      path: '/api/registrations',
      body: validRegistrationPayload({
        fullName: 'Persisted Reviewer',
        email: 'persisted.reviewer@example.com'
      })
    });
    expect(registration.statusCode).toBe(201);
    const token = extractTokenFromConfirmationUrl(registration.body.confirmationUrl);

    const confirmed = await invokeAppRoute(appOne, {
      method: 'get',
      path: '/api/registrations/confirm',
      query: { token }
    });
    expect(confirmed.statusCode).toBe(200);

    const firstLogin = await invokeHandler(appOne.locals.authController.login, {
      body: {
        email: 'persisted.reviewer@example.com',
        password: 'StrongPass!2026'
      }
    });
    expect(firstLogin.statusCode).toBe(200);
    const reviewerCookie = String(firstLogin.headers['Set-Cookie']).split(';')[0];

    const roleUpdate = await invokeAppRoute(appOne, {
      method: 'post',
      path: '/account/role',
      headers: { cookie: reviewerCookie },
      body: { role: 'reviewer' }
    });
    expect(roleUpdate.statusCode).toBe(302);
    expect(roleUpdate.redirectLocation).toBe('/dashboard?roleUpdated=updated');

    const appTwo = createApp({
      authNodeEnv: 'test',
      databaseDirectory: paths.databaseDirectory,
      uploadsDirectory: paths.uploadsDirectory
    });
    const secondLogin = await invokeHandler(appTwo.locals.authController.login, {
      body: {
        email: 'persisted.reviewer@example.com',
        password: 'StrongPass!2026'
      }
    });
    expect(secondLogin.statusCode).toBe(200);

    const editorCookie = await loginAs(appTwo, {
      id: 'editor-persisted',
      email: 'editor.persisted@example.com'
    });
    const candidates = await invokeAppRoute(appTwo, {
      method: 'get',
      path: '/api/papers/:paperId/reviewer-candidates',
      headers: withCookie(editorCookie),
      params: { paperId: 'paper-001' }
    });
    expect(candidates.statusCode).toBe(200);
    expect(candidates.body.candidates.some((candidate) => candidate.email === 'persisted.reviewer@example.com')).toBe(true);
  });
});
