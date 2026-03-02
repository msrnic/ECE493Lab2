import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import {
  createPaperScopeAssignment,
  createReviewVisibilityPaper,
  createSubmittedReview
} from '../fixtures/review-visibility-fixtures.js';
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

function seedPaper(app, {
  paperId,
  trackId = 'TRACK-ACCEPTANCE',
  withReview = true,
  editorIds = []
}) {
  app.locals.reviewVisibilityPaperModel.upsertPaper(
    createReviewVisibilityPaper({
      paperId,
      trackId,
      title: `Acceptance paper ${paperId}`
    })
  );

  if (withReview) {
    app.locals.reviewVisibilityModel.upsertReview(
      createSubmittedReview({
        reviewId: `REV-${paperId}`,
        paperId,
        reviewerId: `reviewer-${paperId}`,
        reviewerName: `Reviewer ${paperId}`
      })
    );
  }

  editorIds.forEach((editorId, index) => {
    app.locals.reviewVisibilityEditorAssignmentModel.upsertAssignment(
      createPaperScopeAssignment({
        assignmentId: `ASG-${paperId}-${index + 1}`,
        editorId,
        paperId
      })
    );
  });
}

describe('UC-11-AS Make Paper Decision acceptance', () => {
  it('stores final decisions, supports defer, and preserves first-write-wins immutability', async () => {
    const app = createApp({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });
    seedPaper(app, {
      paperId: 'PAPER-AS-DECISION',
      editorIds: ['editor-as-1']
    });
    seedPaper(app, {
      paperId: 'PAPER-AS-CONFLICT',
      editorIds: ['editor-as-1', 'editor-as-2']
    });

    const editorOneCookie = await loginAs(app, {
      id: 'editor-as-1',
      email: 'editor.as1@example.com',
      role: 'editor'
    });
    const editorTwoCookie = await loginAs(app, {
      id: 'editor-as-2',
      email: 'editor.as2@example.com',
      role: 'editor'
    });

    const decisionPage = await invokeAppRoute(app, {
      method: 'get',
      path: '/editor/decisions',
      headers: { cookie: editorOneCookie }
    });
    expect(decisionPage.statusCode).toBe(200);
    expect(decisionPage.text).toContain('Editor Decision Workflow');

    const workflowBeforeSave = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/decision-workflow',
      params: { paperId: 'PAPER-AS-DECISION' },
      headers: { cookie: editorOneCookie }
    });
    expect(workflowBeforeSave.statusCode).toBe(200);
    expect(workflowBeforeSave.body.reviewsAvailable).toBe(true);
    expect(workflowBeforeSave.body.decisionStatus).toBe('UNDECIDED');

    const deferSaved = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-AS-DECISION' },
      headers: { cookie: editorOneCookie },
      body: {
        action: 'DEFER',
        expectedVersion: 1
      }
    });
    expect(deferSaved.statusCode).toBe(200);
    expect(deferSaved.body.decisionStatus).toBe('UNDECIDED');

    const finalSaved = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-AS-DECISION' },
      headers: { cookie: editorOneCookie },
      body: {
        action: 'FINAL',
        finalOutcome: 'ACCEPT',
        expectedVersion: 2
      }
    });
    expect(finalSaved.statusCode).toBe(200);
    expect(finalSaved.body.decisionStatus).toBe('FINAL');
    expect(finalSaved.body.finalOutcome).toBe('ACCEPT');

    const immutableChange = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-AS-DECISION' },
      headers: { cookie: editorOneCookie },
      body: {
        action: 'FINAL',
        finalOutcome: 'REJECT',
        expectedVersion: 3
      }
    });
    expect(immutableChange.statusCode).toBe(409);
    expect(immutableChange.body.code).toBe('DENIED_IMMUTABLE');
    expect(immutableChange.body.overrideWorkflowUrl).toBe('/override/papers/PAPER-AS-DECISION');

    const firstConflictSave = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-AS-CONFLICT' },
      headers: { cookie: editorOneCookie },
      body: {
        action: 'FINAL',
        finalOutcome: 'ACCEPT',
        expectedVersion: 1
      }
    });
    expect(firstConflictSave.statusCode).toBe(200);

    const laterConflictSave = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-AS-CONFLICT' },
      headers: { cookie: editorTwoCookie },
      body: {
        action: 'FINAL',
        finalOutcome: 'REJECT',
        expectedVersion: 1
      }
    });
    expect(laterConflictSave.statusCode).toBe(409);
    expect(laterConflictSave.body.code).toBe('DENIED_CONFLICT');

    const conflictWorkflow = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/decision-workflow',
      params: { paperId: 'PAPER-AS-CONFLICT' },
      headers: { cookie: editorOneCookie }
    });
    expect(conflictWorkflow.body.finalOutcome).toBe('ACCEPT');
  });

  it('denies unassigned editors, invalid final outcomes, and missing review preconditions', async () => {
    const app = createApp({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });
    seedPaper(app, {
      paperId: 'PAPER-AS-DENIALS',
      editorIds: ['editor-assigned']
    });

    const assignedCookie = await loginAs(app, {
      id: 'editor-assigned',
      email: 'editor.assigned@example.com',
      role: 'editor'
    });
    const unassignedCookie = await loginAs(app, {
      id: 'editor-unassigned',
      email: 'editor.unassigned@example.com',
      role: 'editor'
    });

    const unassignedDenied = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-AS-DENIALS' },
      headers: { cookie: unassignedCookie },
      body: {
        action: 'DEFER',
        expectedVersion: 1
      }
    });
    expect(unassignedDenied.statusCode).toBe(403);
    expect(unassignedDenied.body.code).toBe('DENIED_UNASSIGNED');

    const invalidOutcomeDenied = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-AS-DENIALS' },
      headers: { cookie: assignedCookie },
      body: {
        action: 'FINAL',
        finalOutcome: 'MAYBE',
        expectedVersion: 1
      }
    });
    expect(invalidOutcomeDenied.statusCode).toBe(422);
    expect(invalidOutcomeDenied.body.code).toBe('DENIED_INVALID');

    app.locals.reviewVisibilityModel.removeReview('REV-PAPER-AS-DENIALS');
    const missingReviewsDenied = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-AS-DENIALS' },
      headers: { cookie: assignedCookie },
      body: {
        action: 'DEFER',
        expectedVersion: 1
      }
    });
    expect(missingReviewsDenied.statusCode).toBe(412);
    expect(missingReviewsDenied.body.code).toBe('DENIED_PRECONDITION');
  });

  it('reports non-success failures clearly and allows retry', async () => {
    const app = createApp({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });
    seedPaper(app, {
      paperId: 'PAPER-AS-RETRY',
      editorIds: ['editor-retry']
    });

    const cookie = await loginAs(app, {
      id: 'editor-retry',
      email: 'editor.retry@example.com',
      role: 'editor'
    });

    app.locals.decisionAuditModel.setShouldFailPersist(true);
    const failedSave = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-AS-RETRY' },
      headers: { cookie },
      body: {
        action: 'FINAL',
        finalOutcome: 'ACCEPT',
        expectedVersion: 1
      }
    });
    expect(failedSave.statusCode).toBe(500);
    expect(failedSave.body.code).toBe('AUDIT_WRITE_FAILED');
    expect(failedSave.body.message).toContain('not recorded');

    const workflowAfterFailure = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/decision-workflow',
      params: { paperId: 'PAPER-AS-RETRY' },
      headers: { cookie }
    });
    expect(workflowAfterFailure.body.decisionStatus).toBe('UNDECIDED');
    expect(workflowAfterFailure.body.decisionVersion).toBe(1);

    app.locals.decisionAuditModel.setShouldFailPersist(false);
    const retrySuccess = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-AS-RETRY' },
      headers: { cookie },
      body: {
        action: 'FINAL',
        finalOutcome: 'ACCEPT',
        expectedVersion: 1
      }
    });
    expect(retrySuccess.statusCode).toBe(200);
    expect(retrySuccess.body.saved).toBe(true);
  });

  it('writes audit entries for successful and denied decision actions', async () => {
    const app = createApp({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });
    seedPaper(app, {
      paperId: 'PAPER-AS-AUDIT',
      editorIds: ['editor-audit']
    });

    const cookie = await loginAs(app, {
      id: 'editor-audit',
      email: 'editor.audit@example.com',
      role: 'editor'
    });

    await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-AS-AUDIT' },
      headers: { cookie },
      body: {
        action: 'DEFER',
        expectedVersion: 1
      }
    });
    await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-AS-AUDIT' },
      headers: { cookie },
      body: {
        action: 'FINAL',
        finalOutcome: 'INVALID',
        expectedVersion: 2
      }
    });

    const auditEntries = app.locals.decisionAuditModel.listEntries({
      paperId: 'PAPER-AS-AUDIT'
    });
    expect(auditEntries.length).toBeGreaterThanOrEqual(2);
    expect(auditEntries.map((entry) => entry.outcome)).toContain('SUCCESS_DEFER');
    expect(auditEntries.map((entry) => entry.outcome)).toContain('DENIED_INVALID');
    auditEntries.forEach((entry) => {
      expect(entry.editorId).toBe('editor-audit');
      expect(entry.paperId).toBe('PAPER-AS-AUDIT');
      expect(entry.occurredAt).toBeTypeOf('string');
    });
  });
});
