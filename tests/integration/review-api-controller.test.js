import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import {
  createInProgressReview,
  createPaperScopeAssignment,
  createReviewVisibilityPaper,
  createSubmittedReview,
  createTrackScopeAssignment
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

function seedReviewVisibilityData(app) {
  app.locals.reviewVisibilityPaperModel.upsertPaper(
    createReviewVisibilityPaper({
      paperId: 'PAPER-INT-1',
      trackId: 'TRACK-INT',
      title: 'Integration Paper'
    })
  );

  app.locals.reviewVisibilityModel.upsertReview(
    createSubmittedReview({
      reviewId: 'REV-INT-SUB-1',
      paperId: 'PAPER-INT-1',
      reviewerName: 'Jordan Lee'
    })
  );
  app.locals.reviewVisibilityModel.upsertReview(
    createInProgressReview({
      reviewId: 'REV-INT-IP-1',
      paperId: 'PAPER-INT-1'
    })
  );

  app.locals.reviewVisibilityEditorAssignmentModel.upsertAssignment(
    createPaperScopeAssignment({
      assignmentId: 'ASG-INT-PAPER',
      editorId: 'editor-int-1',
      paperId: 'PAPER-INT-1'
    })
  );

  app.locals.reviewVisibilityEditorAssignmentModel.upsertAssignment(
    createTrackScopeAssignment({
      assignmentId: 'ASG-INT-TRACK',
      editorId: 'editor-int-track',
      trackId: 'TRACK-INT'
    })
  );
}

describe('integration: review-api-controller', () => {
  it('enforces authentication and returns available/pending/unavailable responses', async () => {
    const app = createApp({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });
    seedReviewVisibilityData(app);

    const unauthenticated = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/reviews',
      params: { paperId: 'PAPER-INT-1' }
    });
    expect(unauthenticated.statusCode).toBe(401);
    expect(unauthenticated.body.message).toBe('Authentication required');

    const editorCookie = await loginAs(app, {
      id: 'editor-int-1',
      email: 'editor.int1@example.com',
      role: 'editor'
    });
    const unassignedEditorCookie = await loginAs(app, {
      id: 'editor-int-2',
      email: 'editor.int2@example.com',
      role: 'editor'
    });
    const reviewerCookie = await loginAs(app, {
      id: 'reviewer-int-1',
      email: 'reviewer.int1@example.com',
      role: 'reviewer'
    });

    const available = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/reviews',
      params: { paperId: 'PAPER-INT-1' },
      headers: { cookie: editorCookie }
    });
    expect(available.statusCode).toBe(200);
    expect(available.body.status).toBe('available');
    expect(available.body.reviews).toHaveLength(1);
    expect(available.body.reviews[0].reviewerName).toBe('Jordan Lee');

    const pendingPaper = createReviewVisibilityPaper({
      paperId: 'PAPER-INT-PENDING',
      trackId: 'TRACK-INT',
      title: 'Pending Paper'
    });
    app.locals.reviewVisibilityPaperModel.upsertPaper(pendingPaper);
    app.locals.reviewVisibilityEditorAssignmentModel.upsertAssignment(
      createPaperScopeAssignment({
        assignmentId: 'ASG-INT-PENDING',
        editorId: 'editor-int-1',
        paperId: 'PAPER-INT-PENDING'
      })
    );

    const pending = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/reviews',
      params: { paperId: 'PAPER-INT-PENDING' },
      headers: { cookie: editorCookie }
    });
    expect(pending.statusCode).toBe(200);
    expect(pending.body).toEqual({
      paperId: 'PAPER-INT-PENDING',
      status: 'pending',
      reviews: []
    });

    const unavailableUnassigned = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/reviews',
      params: { paperId: 'PAPER-INT-1' },
      headers: { cookie: unassignedEditorCookie }
    });
    expect(unavailableUnassigned.statusCode).toBe(404);
    expect(unavailableUnassigned.body).toEqual({ message: 'Paper reviews unavailable' });

    const unavailableReviewer = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/reviews',
      params: { paperId: 'PAPER-INT-1' },
      headers: { cookie: reviewerCookie }
    });
    expect(unavailableReviewer.statusCode).toBe(404);
    expect(unavailableReviewer.body).toEqual({ message: 'Paper reviews unavailable' });

    const unavailableMissing = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/reviews',
      params: { paperId: 'PAPER-DOES-NOT-EXIST' },
      headers: { cookie: editorCookie }
    });
    expect(unavailableMissing.statusCode).toBe(404);
    expect(unavailableMissing.body).toEqual({ message: 'Paper reviews unavailable' });

    const trackAssignedCookie = await loginAs(app, {
      id: 'editor-int-track',
      email: 'editor.int.track@example.com',
      role: 'editor'
    });

    const availableViaTrack = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/reviews',
      params: { paperId: 'PAPER-INT-1' },
      headers: { cookie: trackAssignedCookie }
    });
    expect(availableViaTrack.statusCode).toBe(200);
    expect(availableViaTrack.body.status).toBe('available');

    const auditEntries = app.locals.reviewVisibilityAuditModel.listEntries({ paperId: 'PAPER-INT-1' });
    expect(auditEntries).toHaveLength(2);
  });
});
