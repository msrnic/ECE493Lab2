import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute, invokeHandler } from '../helpers/http-harness.js';
import { hashPassword } from '../../src/models/user-account-model.js';

async function loginAsEditor(app, suffix) {
  const email = `uc06.editor.${suffix}@example.com`;
  app.locals.repository.createUserAccount({
    id: `uc06-editor-${suffix}`,
    fullName: 'UC06 Editor',
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

async function startAttempt(app, headers, paperId, selections, basePaperVersion = 0) {
  return invokeAppRoute(app, {
    method: 'post',
    path: '/api/papers/:paperId/assignment-attempts',
    headers,
    params: { paperId },
    body: {
      editorId: 'editor-acceptance',
      basePaperVersion,
      selections
    }
  });
}

async function confirmAttempt(app, headers, paperId, attemptId, basePaperVersion) {
  return invokeAppRoute(app, {
    method: 'post',
    path: '/api/papers/:paperId/assignment-attempts/:attemptId/confirm',
    headers,
    params: { paperId, attemptId },
    body: {
      editorId: 'editor-acceptance',
      basePaperVersion
    }
  });
}

describe('UC-06-AS Assign Reviewers acceptance', () => {
  it('Given submitted paper, when reviewers selected, then reviewers are assigned and notified', async () => {
    const app = createApp();
    const { cookie } = await loginAsEditor(app, 'happy');
    const headers = { cookie };

    const papers = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers',
      headers,
      query: { state: 'submitted' }
    });
    expect(papers.statusCode).toBe(200);
    expect(papers.body.papers.some((paper) => paper.paperId === 'paper-001')).toBe(true);

    const candidates = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/reviewer-candidates',
      headers,
      params: { paperId: 'paper-001' }
    });
    expect(candidates.statusCode).toBe(200);
    const selectableCandidates = candidates.body.candidates
      .filter((candidate) => candidate.availabilityStatus === 'available' && candidate.coiFlag === false)
      .slice(0, 2);
    expect(selectableCandidates).toHaveLength(2);

    const attempt = await startAttempt(app, headers, 'paper-001', [
      { slotNumber: 1, reviewerId: selectableCandidates[0].reviewerId },
      { slotNumber: 2, reviewerId: selectableCandidates[1].reviewerId }
    ]);
    expect(attempt.statusCode).toBe(201);
    expect(attempt.body.status).toBe('ready_to_confirm');

    const confirmed = await confirmAttempt(app, headers, 'paper-001', attempt.body.attemptId, attempt.body.basePaperVersion);
    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.body.outcome).toBe('confirmed');
    expect(confirmed.body.assignedReviewers).toHaveLength(2);
    expect(confirmed.body.assignedReviewers.every((entry) => entry.invitation.status === 'sent')).toBe(true);
  });

  it('Given prior confirmation in the same session, when assignment is retried with latest paper version, then it succeeds', async () => {
    const app = createApp();
    const { cookie } = await loginAsEditor(app, 'repeat');
    const headers = { cookie };

    const initialPapers = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers',
      headers,
      query: { state: 'submitted' }
    });
    expect(initialPapers.statusCode).toBe(200);
    const initialPaper = initialPapers.body.papers.find((paper) => paper.paperId === 'paper-001');
    expect(initialPaper).toBeTruthy();

    const firstAttempt = await startAttempt(app, headers, 'paper-001', [
      { slotNumber: 1, reviewerId: 'reviewer-001' },
      { slotNumber: 2, reviewerId: 'reviewer-004' }
    ], initialPaper.assignmentVersion);
    expect(firstAttempt.statusCode).toBe(201);
    const firstConfirm = await confirmAttempt(
      app,
      headers,
      'paper-001',
      firstAttempt.body.attemptId,
      initialPaper.assignmentVersion
    );
    expect(firstConfirm.statusCode).toBe(200);

    const refreshedPapers = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers',
      headers,
      query: { state: 'submitted' }
    });
    const refreshedPaper = refreshedPapers.body.papers.find((paper) => paper.paperId === 'paper-001');
    expect(refreshedPaper.assignmentVersion).toBe(initialPaper.assignmentVersion + 1);

    const secondAttempt = await startAttempt(app, headers, 'paper-001', [
      { slotNumber: 1, reviewerId: 'reviewer-004' },
      { slotNumber: 2, reviewerId: 'reviewer-001' }
    ], refreshedPaper.assignmentVersion);
    expect(secondAttempt.statusCode).toBe(201);
    const secondConfirm = await confirmAttempt(
      app,
      headers,
      'paper-001',
      secondAttempt.body.attemptId,
      refreshedPaper.assignmentVersion
    );
    expect(secondConfirm.statusCode).toBe(200);
    expect(secondConfirm.body.outcome).toBe('confirmed');
  });

  it('Given unavailable/conflicted reviewer, when assignment attempted, then replacement is required before completion', async () => {
    const app = createApp();
    const { cookie } = await loginAsEditor(app, 'replace');
    const headers = { cookie };

    const attempt = await startAttempt(app, headers, 'paper-001', [
      { slotNumber: 1, reviewerId: 'reviewer-002' },
      { slotNumber: 2, reviewerId: 'reviewer-003' }
    ]);
    expect(attempt.statusCode).toBe(201);
    expect(['blocked_unavailable', 'blocked_coi']).toContain(attempt.body.status);

    const blockedConfirm = await confirmAttempt(app, headers, 'paper-001', attempt.body.attemptId, attempt.body.basePaperVersion);
    expect(blockedConfirm.statusCode).toBe(400);
    expect(blockedConfirm.body.code).toBe('ASSIGNMENT_BLOCKED');

    for (const blockedSelectionId of blockedConfirm.body.blockingSelectionIds) {
      const replaceResponse = await invokeAppRoute(app, {
        method: 'patch',
        path: '/api/papers/:paperId/assignment-attempts/:attemptId/selections/:selectionId',
        headers,
        params: {
          paperId: 'paper-001',
          attemptId: attempt.body.attemptId,
          selectionId: blockedSelectionId
        },
        body: {
          replacementReviewerId: blockedSelectionId === attempt.body.selections[0].selectionId
            ? 'reviewer-001'
            : 'reviewer-004'
        }
      });
      expect(replaceResponse.statusCode).toBe(200);
      expect(replaceResponse.body.status).toBe('eligible');
    }

    const confirmed = await confirmAttempt(app, headers, 'paper-001', attempt.body.attemptId, attempt.body.basePaperVersion);
    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.body.replacedReviewers.length).toBeGreaterThanOrEqual(1);
  });

  it('Given concurrent confirmations, when both editors confirm, then first wins and stale attempt is rejected', async () => {
    const app = createApp();
    const { cookie } = await loginAsEditor(app, 'stale');
    const headers = { cookie };
    const attemptA = await startAttempt(app, headers, 'paper-002', [
      { slotNumber: 1, reviewerId: 'reviewer-005' }
    ]);
    const attemptB = await startAttempt(app, headers, 'paper-002', [
      { slotNumber: 1, reviewerId: 'reviewer-006' }
    ]);

    const first = await confirmAttempt(app, headers, 'paper-002', attemptA.body.attemptId, 0);
    const second = await confirmAttempt(app, headers, 'paper-002', attemptB.body.attemptId, 0);
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(409);
    expect(second.body.code).toBe('STALE_CONFIRMATION');

    const staleOutcome = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/papers/:paperId/assignment-outcomes/:attemptId',
      headers,
      params: { paperId: 'paper-002', attemptId: attemptB.body.attemptId }
    });
    expect(staleOutcome.statusCode).toBe(200);
    expect(staleOutcome.body.outcome).toBe('rejected_stale');
  });
});
