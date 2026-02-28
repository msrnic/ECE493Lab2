import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { invokeAppRoute, invokeHandler } from '../helpers/http-harness.js';
import {
  createActiveAssignment,
  createInvalidReviewPayload,
  createValidReviewPayload
} from '../fixtures/review-submission-fixtures.js';

async function loginAsReviewer(app, {
  id = 'reviewer-uc09-int',
  email = 'reviewer.uc09.int@example.com'
} = {}) {
  app.locals.repository.createUserAccount({
    id,
    fullName: 'UC-09 Reviewer',
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

describe('integration: review submission API', () => {
  it('supports successful submit and completed status flow', async () => {
    const app = createApp();
    const { reviewerId, cookie } = await loginAsReviewer(app, {
      id: 'reviewer-uc09-int-success',
      email: 'reviewer.uc09.success@example.com'
    });
    const assignment = createActiveAssignment({
      assignmentId: 'asg-uc09-int-success',
      reviewerId,
      paperId: 'paper-uc09-success'
    });
    app.locals.reviewerPaperAssignmentModel.upsertAssignment(assignment);

    const submit = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/review-submissions',
      params: {
        assignmentId: assignment.assignmentId
      },
      headers: { cookie },
      body: createValidReviewPayload()
    });
    expect(submit.statusCode).toBe(201);
    expect(submit.body.status).toBe('COMPLETED');

    const status = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer-assignments/:assignmentId/review-status',
      params: {
        assignmentId: assignment.assignmentId
      },
      headers: { cookie }
    });
    expect(status.statusCode).toBe(200);
    expect(status.body.status).toBe('COMPLETED');
  });

  it('returns 400 on missing required fields and does not persist records', async () => {
    const app = createApp();
    const { reviewerId, cookie } = await loginAsReviewer(app, {
      id: 'reviewer-uc09-int-validation',
      email: 'reviewer.uc09.validation@example.com'
    });
    const assignment = createActiveAssignment({
      assignmentId: 'asg-uc09-int-validation',
      reviewerId,
      paperId: 'paper-uc09-validation'
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
    expect(
      app.locals.reviewRecordModel.getStatus(assignment.assignmentId).status
    ).toBe('NOT_SUBMITTED');
  });

  it('returns 403 for revoked or unauthorized assignment access', async () => {
    const app = createApp();
    const { reviewerId, cookie } = await loginAsReviewer(app, {
      id: 'reviewer-uc09-int-revoked',
      email: 'reviewer.uc09.revoked@example.com'
    });
    const assignment = createActiveAssignment({
      assignmentId: 'asg-uc09-int-revoked',
      reviewerId,
      paperId: 'paper-uc09-revoked',
      accessState: 'REVOKED'
    });
    app.locals.reviewerPaperAssignmentModel.upsertAssignment(assignment);

    const status = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/reviewer-assignments/:assignmentId/review-status',
      params: {
        assignmentId: assignment.assignmentId
      },
      headers: { cookie }
    });
    expect(status.statusCode).toBe(403);
    expect(status.body.code).toBe('ASSIGNMENT_ACCESS_REVOKED');

    const submit = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/review-submissions',
      params: {
        assignmentId: 'asg-not-found'
      },
      headers: { cookie },
      body: createValidReviewPayload()
    });
    expect(submit.statusCode).toBe(403);
    expect(submit.body.code).toBe('ASSIGNMENT_FORBIDDEN');
  });

  it('returns REVIEW_ALREADY_COMPLETED when submitted after completion', async () => {
    const app = createApp();
    const { reviewerId, cookie } = await loginAsReviewer(app, {
      id: 'reviewer-uc09-int-complete',
      email: 'reviewer.uc09.complete@example.com'
    });
    const assignment = createActiveAssignment({
      assignmentId: 'asg-uc09-int-complete',
      reviewerId,
      paperId: 'paper-uc09-complete'
    });
    app.locals.reviewerPaperAssignmentModel.upsertAssignment(assignment);

    const first = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/review-submissions',
      params: { assignmentId: assignment.assignmentId },
      headers: { cookie },
      body: createValidReviewPayload()
    });
    expect(first.statusCode).toBe(201);

    const second = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/reviewer-assignments/:assignmentId/review-submissions',
      params: { assignmentId: assignment.assignmentId },
      headers: { cookie },
      body: createValidReviewPayload({
        summary: 'Second attempt should be rejected.'
      })
    });

    expect(second.statusCode).toBe(409);
    expect(second.body.code).toBe('REVIEW_ALREADY_COMPLETED');
    expect(typeof second.body.existingReviewId).toBe('string');
  });

  it('allows exactly one successful request during concurrent submits', async () => {
    const app = createApp();
    const { reviewerId, cookie } = await loginAsReviewer(app, {
      id: 'reviewer-uc09-int-concurrent',
      email: 'reviewer.uc09.concurrent@example.com'
    });
    const assignment = createActiveAssignment({
      assignmentId: 'asg-uc09-int-concurrent',
      reviewerId,
      paperId: 'paper-uc09-concurrent'
    });
    app.locals.reviewerPaperAssignmentModel.upsertAssignment(assignment);

    const [first, second] = await Promise.all([
      invokeAppRoute(app, {
        method: 'post',
        path: '/api/reviewer-assignments/:assignmentId/review-submissions',
        params: { assignmentId: assignment.assignmentId },
        headers: { cookie },
        body: createValidReviewPayload({
          summary: 'Concurrent attempt 1.'
        })
      }),
      invokeAppRoute(app, {
        method: 'post',
        path: '/api/reviewer-assignments/:assignmentId/review-submissions',
        params: { assignmentId: assignment.assignmentId },
        headers: { cookie },
        body: createValidReviewPayload({
          summary: 'Concurrent attempt 2.'
        })
      })
    ]);

    const responses = [first, second];
    const successResponses = responses.filter((response) => response.statusCode === 201);
    const conflictResponses = responses.filter((response) => response.statusCode === 409);

    expect(successResponses).toHaveLength(1);
    expect(conflictResponses).toHaveLength(1);
    expect(conflictResponses[0].body.code).toBe('CONCURRENT_SUBMISSION_REJECTED');
  });
});
