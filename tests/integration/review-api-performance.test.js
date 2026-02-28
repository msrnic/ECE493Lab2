import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import {
  createPaperScopeAssignment,
  createReviewVisibilityPaper,
  createSubmittedReview
} from '../fixtures/review-visibility-fixtures.js';
import { invokeAppRoute, invokeHandler } from '../helpers/http-harness.js';

function percentile(values, percentileValue) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(index, 0)];
}

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

describe('integration: review-api performance', () => {
  it('keeps p95 latency <= 5000ms under 500 requests with 70/30 authorized-unavailable mix', async () => {
    const app = createApp({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });

    app.locals.reviewVisibilityPaperModel.upsertPaper(
      createReviewVisibilityPaper({
        paperId: 'PAPER-PERF-1',
        trackId: 'TRACK-PERF',
        title: 'Performance Paper'
      })
    );

    for (let index = 0; index < 100; index += 1) {
      app.locals.reviewVisibilityModel.upsertReview(
        createSubmittedReview({
          reviewId: `REV-PERF-${index + 1}`,
          paperId: 'PAPER-PERF-1',
          reviewerId: `reviewer-${index + 1}`,
          reviewerName: `Reviewer ${index + 1}`,
          submittedAt: `2026-02-08T10:${String(index % 60).padStart(2, '0')}:00.000Z`
        })
      );
    }

    app.locals.reviewVisibilityEditorAssignmentModel.upsertAssignment(
      createPaperScopeAssignment({
        assignmentId: 'ASG-PERF-1',
        editorId: 'editor-perf-authorized',
        paperId: 'PAPER-PERF-1'
      })
    );

    const authorizedCookie = await loginAs(app, {
      id: 'editor-perf-authorized',
      email: 'editor.perf.authorized@example.com',
      role: 'editor'
    });
    const unavailableCookie = await loginAs(app, {
      id: 'editor-perf-unavailable',
      email: 'editor.perf.unavailable@example.com',
      role: 'editor'
    });

    const durationsMs = [];
    let authorizedCount = 0;
    let unavailableCount = 0;

    for (let index = 0; index < 500; index += 1) {
      const authorizedRequest = index % 10 < 7;
      const start = performance.now();

      const response = await invokeAppRoute(app, {
        method: 'get',
        path: '/api/papers/:paperId/reviews',
        params: { paperId: 'PAPER-PERF-1' },
        headers: {
          cookie: authorizedRequest ? authorizedCookie : unavailableCookie
        }
      });

      const elapsed = performance.now() - start;
      durationsMs.push(elapsed);

      if (authorizedRequest) {
        authorizedCount += 1;
        expect(response.statusCode).toBe(200);
      } else {
        unavailableCount += 1;
        expect(response.statusCode).toBe(404);
      }
    }

    const p95 = percentile(durationsMs, 95);

    expect(authorizedCount).toBe(350);
    expect(unavailableCount).toBe(150);
    expect(p95).toBeLessThanOrEqual(5000);
  }, 30000);
});
