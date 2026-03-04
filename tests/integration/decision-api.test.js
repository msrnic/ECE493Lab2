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

function seedDecisionPaper(app, {
  paperId,
  trackId,
  assignmentEditorIds = ['editor-decision-1'],
  withSubmittedReview = true
}) {
  app.locals.reviewVisibilityPaperModel.upsertPaper(
    createReviewVisibilityPaper({
      paperId,
      trackId,
      title: `Decision paper ${paperId}`
    })
  );

  if (withSubmittedReview) {
    app.locals.reviewVisibilityModel.upsertReview(
      createSubmittedReview({
        reviewId: `REV-${paperId}`,
        paperId,
        reviewerId: `reviewer-${paperId}`,
        reviewerName: `Reviewer ${paperId}`
      })
    );
  }

  assignmentEditorIds.forEach((editorId, index) => {
    app.locals.reviewVisibilityEditorAssignmentModel.upsertAssignment(
      createPaperScopeAssignment({
        assignmentId: `ASG-${paperId}-${index + 1}`,
        editorId,
        paperId
      })
    );
  });
}

describe('integration: decision-api', () => {
  it('covers workflow-load and save response contracts with audit outcomes', async () => {
    const app = createApp({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });

    seedDecisionPaper(app, {
      paperId: 'PAPER-DEC-1',
      trackId: 'TRACK-DEC'
    });
    seedDecisionPaper(app, {
      paperId: 'PAPER-DEC-2',
      trackId: 'TRACK-DEC',
      assignmentEditorIds: ['editor-decision-1', 'editor-decision-2']
    });
    seedDecisionPaper(app, {
      paperId: 'PAPER-IDEMPOTENT',
      trackId: 'TRACK-DEC'
    });

    const assignedCookie = await loginAs(app, {
      id: 'editor-decision-1',
      email: 'editor.decision1@example.com',
      role: 'editor'
    });
    const secondEditorCookie = await loginAs(app, {
      id: 'editor-decision-2',
      email: 'editor.decision2@example.com',
      role: 'editor'
    });
    const unassignedCookie = await loginAs(app, {
      id: 'editor-unassigned',
      email: 'editor.unassigned@example.com',
      role: 'editor'
    });
    const authorCookie = await loginAs(app, {
      id: 'author-decision-1',
      email: 'author.decision1@example.com',
      role: 'author'
    });

    const loadUnauthenticated = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/decision-workflow',
      params: { paperId: 'PAPER-DEC-1' }
    });
    expect(loadUnauthenticated.statusCode).toBe(401);

    const loadUnassigned = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/decision-workflow',
      params: { paperId: 'PAPER-DEC-1' },
      headers: { cookie: unassignedCookie }
    });
    expect(loadUnassigned.statusCode).toBe(403);

    const loadAsAuthor = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/decision-workflow',
      params: { paperId: 'PAPER-DEC-1' },
      headers: { cookie: authorCookie }
    });
    expect(loadAsAuthor.statusCode).toBe(403);
    expect(loadAsAuthor.body.code).toBe('ASSIGNMENT_FORBIDDEN');

    const loadAssigned = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/decision-workflow',
      params: { paperId: 'PAPER-DEC-1' },
      headers: { cookie: assignedCookie }
    });
    expect(loadAssigned.statusCode).toBe(200);
    expect(loadAssigned.body.decisionStatus).toBe('UNDECIDED');
    expect(loadAssigned.body.reviewsAvailable).toBe(true);
    expect(loadAssigned.body.evaluations).toHaveLength(1);

    const saveUnassigned = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-DEC-1' },
      headers: { cookie: unassignedCookie },
      body: {
        action: 'DEFER',
        expectedVersion: 1
      }
    });
    expect(saveUnassigned.statusCode).toBe(403);
    expect(saveUnassigned.body.code).toBe('DENIED_UNASSIGNED');

    const saveAsAuthor = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-DEC-1' },
      headers: { cookie: authorCookie },
      body: {
        action: 'DEFER',
        expectedVersion: 1
      }
    });
    expect(saveAsAuthor.statusCode).toBe(403);
    expect(saveAsAuthor.body.code).toBe('ASSIGNMENT_FORBIDDEN');

    const invalidOutcome = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-DEC-1' },
      headers: { cookie: assignedCookie },
      body: {
        action: 'FINAL',
        finalOutcome: 'MAYBE',
        expectedVersion: 1
      }
    });
    expect(invalidOutcome.statusCode).toBe(422);
    expect(invalidOutcome.body.code).toBe('DENIED_INVALID');

    app.locals.reviewVisibilityModel.removeReview('REV-PAPER-DEC-1');
    const missingReviews = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-DEC-1' },
      headers: { cookie: assignedCookie },
      body: {
        action: 'DEFER',
        expectedVersion: 1
      }
    });
    expect(missingReviews.statusCode).toBe(412);
    expect(missingReviews.body.code).toBe('DENIED_PRECONDITION');

    app.locals.reviewVisibilityModel.upsertReview(
      createSubmittedReview({
        reviewId: 'REV-PAPER-DEC-1',
        paperId: 'PAPER-DEC-1',
        reviewerId: 'reviewer-reloaded',
        reviewerName: 'Reviewer Reloaded'
      })
    );

    const finalSaved = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-DEC-1' },
      headers: {
        cookie: assignedCookie,
        'idempotency-key': 'save-final-1'
      },
      body: {
        action: 'FINAL',
        finalOutcome: 'ACCEPT',
        expectedVersion: 1
      }
    });
    expect(finalSaved.statusCode).toBe(200);
    expect(finalSaved.body.decisionStatus).toBe('FINAL');
    expect(finalSaved.body.finalOutcome).toBe('ACCEPT');
    expect(finalSaved.body.auditId).toBeDefined();

    const immutableChange = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-DEC-1' },
      headers: { cookie: assignedCookie },
      body: {
        action: 'FINAL',
        finalOutcome: 'REJECT',
        expectedVersion: 2
      }
    });
    expect(immutableChange.statusCode).toBe(409);
    expect(immutableChange.body.code).toBe('DENIED_IMMUTABLE');
    expect(immutableChange.body.overrideWorkflowUrl).toBe('/override/papers/PAPER-DEC-1');

    const firstConflictSave = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-DEC-2' },
      headers: { cookie: assignedCookie },
      body: {
        action: 'FINAL',
        finalOutcome: 'ACCEPT',
        expectedVersion: 1
      }
    });
    expect(firstConflictSave.statusCode).toBe(200);

    const secondConflictSave = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-DEC-2' },
      headers: { cookie: secondEditorCookie },
      body: {
        action: 'FINAL',
        finalOutcome: 'REJECT',
        expectedVersion: 1
      }
    });
    expect(secondConflictSave.statusCode).toBe(409);
    expect(secondConflictSave.body.code).toBe('DENIED_CONFLICT');

    const idempotentFirst = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-IDEMPOTENT' },
      headers: {
        cookie: assignedCookie,
        'idempotency-key': 'same-request'
      },
      body: {
        action: 'DEFER',
        expectedVersion: 1
      }
    });
    expect(idempotentFirst.statusCode).toBe(200);
    expect(idempotentFirst.body.decisionVersion).toBe(2);

    const idempotentSecond = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-IDEMPOTENT' },
      headers: {
        cookie: assignedCookie,
        'idempotency-key': 'same-request'
      },
      body: {
        action: 'DEFER',
        expectedVersion: 1
      }
    });
    expect(idempotentSecond.statusCode).toBe(200);
    expect(idempotentSecond.body.decisionVersion).toBe(2);

    const auditOutcomes = app.locals.decisionAuditModel.listEntries().map((entry) => entry.outcome);
    expect(auditOutcomes).toContain('SUCCESS_FINAL');
    expect(auditOutcomes).toContain('SUCCESS_DEFER');
    expect(auditOutcomes).toContain('DENIED_UNASSIGNED');
    expect(auditOutcomes).toContain('DENIED_IMMUTABLE');
    expect(auditOutcomes).toContain('DENIED_CONFLICT');
    expect(auditOutcomes).toContain('DENIED_PRECONDITION');
    expect(auditOutcomes).toContain('DENIED_INVALID');
  });

  it('treats audit persistence failure as not recorded and allows retry', async () => {
    const app = createApp({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });
    seedDecisionPaper(app, {
      paperId: 'PAPER-AUDIT-FAIL',
      trackId: 'TRACK-AUDIT'
    });

    const assignedCookie = await loginAs(app, {
      id: 'editor-audit-1',
      email: 'editor.audit1@example.com',
      role: 'editor'
    });
    app.locals.reviewVisibilityEditorAssignmentModel.upsertAssignment(
      createPaperScopeAssignment({
        assignmentId: 'ASG-AUDIT-FAIL',
        editorId: 'editor-audit-1',
        paperId: 'PAPER-AUDIT-FAIL'
      })
    );

    app.locals.decisionAuditModel.setShouldFailPersist(true);
    const failedSave = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-AUDIT-FAIL' },
      headers: { cookie: assignedCookie },
      body: {
        action: 'FINAL',
        finalOutcome: 'ACCEPT',
        expectedVersion: 1
      }
    });
    expect(failedSave.statusCode).toBe(500);
    expect(failedSave.body.code).toBe('AUDIT_WRITE_FAILED');

    const postFailureWorkflow = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/decision-workflow',
      params: { paperId: 'PAPER-AUDIT-FAIL' },
      headers: { cookie: assignedCookie }
    });
    expect(postFailureWorkflow.statusCode).toBe(200);
    expect(postFailureWorkflow.body.decisionStatus).toBe('UNDECIDED');
    expect(postFailureWorkflow.body.decisionVersion).toBe(1);

    app.locals.decisionAuditModel.setShouldFailPersist(false);
    const retrySuccess = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/papers/:paperId/decisions',
      params: { paperId: 'PAPER-AUDIT-FAIL' },
      headers: { cookie: assignedCookie },
      body: {
        action: 'FINAL',
        finalOutcome: 'ACCEPT',
        expectedVersion: 1
      }
    });
    expect(retrySuccess.statusCode).toBe(200);
    expect(retrySuccess.body.saved).toBe(true);
    expect(retrySuccess.body.decisionVersion).toBe(2);
  });
});
