import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { invokeAppRoute, invokeHandler } from '../helpers/http-harness.js';
import {
  createActiveAssignment,
  createInvalidReviewPayload,
  createValidReviewPayload
} from '../fixtures/review-submission-fixtures.js';

async function loginAsReviewer(app, { id, email }) {
  app.locals.repository.createUserAccount({
    id,
    fullName: 'Acceptance Reviewer',
    emailNormalized: email,
    passwordHash: hashPassword('StrongPass!2026'),
    role: 'reviewer',
    lastAssignedRole: 'reviewer',
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

  return {
    reviewerId: `account-${id}`,
    cookie: String(loginResponse.headers['Set-Cookie']).split(';')[0]
  };
}

describe('UC-09-AS Submit Review acceptance', () => {
  it('Given a completed review form, when submitted, then review is saved and marked complete', async () => {
    const app = createApp();
    const { reviewerId, cookie } = await loginAsReviewer(app, {
      id: 'reviewer-uc09-as-complete',
      email: 'reviewer.uc09.acceptance.complete@example.com'
    });
    const assignment = createActiveAssignment({
      assignmentId: 'asg-uc09-as-complete',
      reviewerId,
      paperId: 'paper-uc09-as-complete'
    });
    app.locals.reviewerPaperAssignmentModel.upsertAssignment(assignment);

    const submitResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/review-submissions',
      params: {
        assignmentId: assignment.assignmentId
      },
      headers: { cookie },
      body: createValidReviewPayload()
    });

    expect(submitResponse.statusCode).toBe(201);
    expect(submitResponse.body.status).toBe('COMPLETED');

    const statusResponse = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer-assignments/:assignmentId/review-status',
      params: {
        assignmentId: assignment.assignmentId
      },
      headers: { cookie }
    });
    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.body.status).toBe('COMPLETED');
  });

  it('Given required fields are missing, when submission is attempted, then system requests completion', async () => {
    const app = createApp();
    const { reviewerId, cookie } = await loginAsReviewer(app, {
      id: 'reviewer-uc09-as-missing',
      email: 'reviewer.uc09.acceptance.missing@example.com'
    });
    const assignment = createActiveAssignment({
      assignmentId: 'asg-uc09-as-missing',
      reviewerId,
      paperId: 'paper-uc09-as-missing'
    });
    app.locals.reviewerPaperAssignmentModel.upsertAssignment(assignment);

    const response = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/review-submissions',
      params: {
        assignmentId: assignment.assignmentId
      },
      headers: { cookie },
      body: createInvalidReviewPayload()
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect(response.body.missingFields).toEqual([
      'recommendation',
      'overallScore',
      'confidenceScore',
      'summary'
    ]);
  });

  it('Given assignment access is revoked, when reviewer submits, then request is rejected', async () => {
    const app = createApp();
    const { reviewerId, cookie } = await loginAsReviewer(app, {
      id: 'reviewer-uc09-as-revoked',
      email: 'reviewer.uc09.acceptance.revoked@example.com'
    });
    const assignment = createActiveAssignment({
      assignmentId: 'asg-uc09-as-revoked',
      reviewerId,
      paperId: 'paper-uc09-as-revoked',
      accessState: 'REVOKED'
    });
    app.locals.reviewerPaperAssignmentModel.upsertAssignment(assignment);

    const response = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/review-submissions',
      params: {
        assignmentId: assignment.assignmentId
      },
      headers: { cookie },
      body: createValidReviewPayload()
    });

    expect(response.statusCode).toBe(403);
    expect(response.body.code).toBe('ASSIGNMENT_ACCESS_REVOKED');
  });

  it('Given review is already completed, when reviewer resubmits, then conflict is returned', async () => {
    const app = createApp();
    const { reviewerId, cookie } = await loginAsReviewer(app, {
      id: 'reviewer-uc09-as-duplicate',
      email: 'reviewer.uc09.acceptance.duplicate@example.com'
    });
    const assignment = createActiveAssignment({
      assignmentId: 'asg-uc09-as-duplicate',
      reviewerId,
      paperId: 'paper-uc09-as-duplicate'
    });
    app.locals.reviewerPaperAssignmentModel.upsertAssignment(assignment);

    const first = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/review-submissions',
      params: {
        assignmentId: assignment.assignmentId
      },
      headers: { cookie },
      body: createValidReviewPayload()
    });
    expect(first.statusCode).toBe(201);

    const second = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/review-submissions',
      params: {
        assignmentId: assignment.assignmentId
      },
      headers: { cookie },
      body: createValidReviewPayload({
        summary: 'Duplicate attempt.'
      })
    });
    expect(second.statusCode).toBe(409);
    expect(second.body.code).toBe('REVIEW_ALREADY_COMPLETED');
  });
});
