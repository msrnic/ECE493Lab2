import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import {
  createInProgressReview,
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

describe('UC-10-AS View Reviews acceptance', () => {
  it('Given reviews exist, When the editor requests them, Then all completed reviews are displayed', async () => {
    const app = createApp({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });

    app.locals.reviewVisibilityPaperModel.upsertPaper(
      createReviewVisibilityPaper({
        paperId: 'PAPER-AS-1',
        trackId: 'TRACK-AS',
        title: 'Acceptance Paper'
      })
    );

    app.locals.reviewVisibilityModel.upsertReview(
      createSubmittedReview({
        reviewId: 'REV-AS-SUB-1',
        paperId: 'PAPER-AS-1',
        reviewerName: 'Reviewer Accepted'
      })
    );
    app.locals.reviewVisibilityModel.upsertReview(
      createInProgressReview({
        reviewId: 'REV-AS-IP-1',
        paperId: 'PAPER-AS-1'
      })
    );

    app.locals.reviewVisibilityEditorAssignmentModel.upsertAssignment(
      createPaperScopeAssignment({
        assignmentId: 'ASG-AS-1',
        editorId: 'editor-as-1',
        paperId: 'PAPER-AS-1'
      })
    );

    const editorCookie = await loginAs(app, {
      id: 'editor-as-1',
      email: 'editor.as1@example.com',
      role: 'editor'
    });

    const response = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/reviews',
      params: { paperId: 'PAPER-AS-1' },
      headers: { cookie: editorCookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('available');
    expect(response.body.reviews).toHaveLength(1);
    expect(response.body.reviews[0].reviewerName).toBe('Reviewer Accepted');

    const pageResponse = await invokeAppRoute(app, {
      method: 'get',
      path: '/editor/reviews',
      headers: { cookie: editorCookie },
      query: { paperId: 'PAPER-AS-1' }
    });
    expect(pageResponse.statusCode).toBe(200);
    expect(pageResponse.text).toContain('Paper Reviews');
  });

  it('Given no reviews exist, When requested, Then the system indicates reviews are pending', async () => {
    const app = createApp({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });

    app.locals.reviewVisibilityPaperModel.upsertPaper(
      createReviewVisibilityPaper({
        paperId: 'PAPER-AS-2',
        trackId: 'TRACK-AS',
        title: 'Pending Acceptance Paper'
      })
    );

    app.locals.reviewVisibilityEditorAssignmentModel.upsertAssignment(
      createPaperScopeAssignment({
        assignmentId: 'ASG-AS-2',
        editorId: 'editor-as-2',
        paperId: 'PAPER-AS-2'
      })
    );

    const editorCookie = await loginAs(app, {
      id: 'editor-as-2',
      email: 'editor.as2@example.com',
      role: 'editor'
    });

    const response = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/reviews',
      params: { paperId: 'PAPER-AS-2' },
      headers: { cookie: editorCookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      paperId: 'PAPER-AS-2',
      status: 'pending',
      reviews: []
    });
  });
});
