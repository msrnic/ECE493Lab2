import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute, invokeHandler } from '../helpers/http-harness.js';
import { hashPassword } from '../../src/models/user-account-model.js';

function createFiveMinuteClock(startIso = '2026-02-08T09:00:00.000Z') {
  let tick = 0;
  const base = Date.parse(startIso);
  return () => new Date(base + tick++ * 5 * 60 * 1000);
}

async function createConfirmedAssignment(app, reviewerId = 'reviewer-001') {
  const login = await loginAsEditor(app);
  const attempt = await invokeAppRoute(app, {
    method: 'post',
    path: '/api/papers/:paperId/assignment-attempts',
    headers: { cookie: login.cookie },
    params: { paperId: 'paper-001' },
    body: {
      editorId: 'editor-uc07',
      basePaperVersion: 0,
      selections: [{ slotNumber: 1, reviewerId }]
    }
  });
  const confirmed = await invokeAppRoute(app, {
    method: 'post',
    path: '/api/papers/:paperId/assignment-attempts/:attemptId/confirm',
    headers: { cookie: login.cookie },
    params: { paperId: 'paper-001', attemptId: attempt.body.attemptId },
    body: {
      editorId: 'editor-uc07',
      basePaperVersion: 0
    }
  });
  return confirmed;
}

let editorCounter = 0;
async function loginAsEditor(app) {
  editorCounter += 1;
  const email = `uc07.editor.${editorCounter}@example.com`;
  app.locals.repository.createUserAccount({
    id: `uc07-editor-${editorCounter}`,
    fullName: 'UC07 Editor',
    emailNormalized: email,
    passwordHash: hashPassword('StrongPass!2026'),
    role: 'editor',
    lastAssignedRole: 'editor',
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
  return { cookie: String(loginResponse.headers['Set-Cookie']).split(';')[0] };
}

describe('UC-07-AS Receive Review Invitation acceptance', () => {
  it('Given reviewer assigned, when notification sent, then reviewer receives invitation', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: true })
    });

    const confirmed = await createConfirmedAssignment(app);
    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.body.assignedReviewers[0].invitation.status).toBe('sent');
  });

  it('Given delivery fails, when retry occurs, then failure details are visible in logs', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: false, error: 'smtp outage' }),
      nowFn: createFiveMinuteClock()
    });
    const confirmed = await createConfirmedAssignment(app);
    const invitationId = confirmed.body.assignedReviewers[0].invitation.invitationId;

    const retryResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/invitations/:invitationId/retry',
      params: { invitationId }
    });
    expect(retryResponse.statusCode).toBe(200);
    expect(retryResponse.body.status).toBe('retry_scheduled');
    expect(retryResponse.body.lastError).toBe('smtp outage');

    const failureLog = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/invitations/:invitationId/failure-log',
      params: { invitationId },
      headers: { 'x-user-role': 'editor' }
    });
    expect(failureLog.statusCode).toBe(200);
    expect(failureLog.body.lastError).toBe('smtp outage');
  });

  it('Given failures continue, when retries run, then cadence is 5 minutes and retry cap is 3 with terminal failure', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: false, error: 'delivery failed' }),
      nowFn: createFiveMinuteClock('2026-02-08T11:00:00.000Z')
    });
    const confirmed = await createConfirmedAssignment(app);
    const invitationId = confirmed.body.assignedReviewers[0].invitation.invitationId;
    const firstNextRetryAt = Date.parse(confirmed.body.assignedReviewers[0].invitation.nextRetryAt);

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

    const secondNextRetryAt = Date.parse(retry1.body.nextRetryAt);
    const thirdNextRetryAt = Date.parse(retry2.body.nextRetryAt);
    expect(secondNextRetryAt - firstNextRetryAt).toBe(5 * 60 * 1000);
    expect(thirdNextRetryAt - secondNextRetryAt).toBe(5 * 60 * 1000);
    expect(retry3.body.status).toBe('failed_terminal');
    expect(retry3.body.retryCount).toBe(3);
    expect(retry3.body.followUpRequired).toBe(true);
  });

  it('Given assignment is removed, when cancellation is processed, then invitation is canceled and retries stop', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: false, error: 'delivery failed' })
    });
    const confirmed = await createConfirmedAssignment(app);
    const invitationId = confirmed.body.assignedReviewers[0].invitation.invitationId;

    const canceled = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/invitations/:invitationId/cancel',
      params: { invitationId }
    });
    expect(canceled.statusCode).toBe(200);
    expect(canceled.body.status).toBe('canceled');

    const retryAfterCancel = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/invitations/:invitationId/retry',
      params: { invitationId }
    });
    expect(retryAfterCancel.statusCode).toBe(200);
    expect(retryAfterCancel.body.status).toBe('canceled');
  });

  it('Given unauthorized user requests failure logs, when access is evaluated, then access is denied', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: false, error: 'delivery failed' })
    });
    const confirmed = await createConfirmedAssignment(app);
    const invitationId = confirmed.body.assignedReviewers[0].invitation.invitationId;

    const denied = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/invitations/:invitationId/failure-log',
      params: { invitationId },
      headers: { 'x-user-role': 'reviewer' }
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.body.code).toBe('INVITATION_FORBIDDEN');
  });

  it('Given duplicate assignment event for same assignment, when invitation is recreated, then no duplicate active invitation is made', () => {
    const app = createApp();
    const first = app.locals.invitationModel.createInvitation({
      assignmentId: 'dup-assignment-1',
      reviewerId: 'reviewer-dup',
      displayName: 'Dup Reviewer'
    });
    const second = app.locals.invitationModel.createInvitation({
      assignmentId: 'dup-assignment-1',
      reviewerId: 'reviewer-dup',
      displayName: 'Dup Reviewer'
    });

    expect(second.invitationId).toBe(first.invitationId);
  });
});
