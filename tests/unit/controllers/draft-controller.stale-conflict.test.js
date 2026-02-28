import { describe, expect, it } from 'vitest';
import { createTestServer, requestFor, saveDraft, withActor } from '../../test-utils.js';
import { createDraftController } from '../../../src/controllers/draft-controller.js';
import { createDraftState } from '../../../src/models/draft-submission-model.js';

describe('draft-controller stale conflict and failure handling', () => {
  it('rejects stale saves and preserves latest version', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    await saveDraft(api, 'submission-1', { userId: 'author-1' }, { baseRevision: 0, metadata: { title: 'v1' } });
    await saveDraft(api, 'submission-1', { userId: 'author-1' }, { baseRevision: 1, metadata: { title: 'v2' } });

    const staleSave = await saveDraft(api, 'submission-1', { userId: 'author-1' }, {
      baseRevision: 0,
      metadata: { title: 'stale' }
    });

    expect(staleSave.status).toBe(409);
    expect(staleSave.body.code).toBe('DRAFT_STALE');
    expect(staleSave.body.latestRevision).toBe(2);

    const latest = await withActor(api.get('/api/submissions/submission-1/draft'), { userId: 'author-1' });
    expect(latest.status).toBe(200);
    expect(latest.body.metadata).toEqual({ title: 'v2' });
  });

  it('returns system failures without mutating previously saved state', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    await saveDraft(api, 'submission-2', { userId: 'author-2' }, { baseRevision: 0, metadata: { title: 'stable' } });

    const failureByHeader = await saveDraft(
      api,
      'submission-2',
      { userId: 'author-2' },
      { baseRevision: 1, metadata: { title: 'should fail' } },
      { 'x-force-system-error': 'true' }
    );
    expect(failureByHeader.status).toBe(500);

    const failureByBody = await withActor(api.put('/api/submissions/submission-2/draft'), {
      userId: 'author-2'
    }).send({
      baseRevision: 1,
      metadata: { title: 'should fail too' },
      forceSystemError: true
    });
    expect(failureByBody.status).toBe(500);

    const latest = await withActor(api.get('/api/submissions/submission-2/draft'), { userId: 'author-2' });
    expect(latest.status).toBe(200);
    expect(latest.body.revision).toBe(1);
    expect(latest.body.metadata).toEqual({ title: 'stable' });
  });

  it('enforces authentication and owner-only saves', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    const unauthenticated = await api.put('/api/submissions/submission-3/draft').send({ baseRevision: 0, metadata: {} });
    expect(unauthenticated.status).toBe(401);

    await saveDraft(api, 'submission-3', { userId: 'owner-1' }, { baseRevision: 0, metadata: { t: 1 } });

    const forbidden = await withActor(api.put('/api/submissions/submission-3/draft'), {
      userId: 'other-actor'
    }).send({
      baseRevision: 1,
      metadata: { t: 2 }
    });

    expect(forbidden.status).toBe(403);
  });

  it('covers getLatest and prune-retention error branches', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    const notFoundSubmission = await withActor(api.get('/api/submissions/missing/draft'), { userId: 'author-1' });
    expect(notFoundSubmission.status).toBe(404);

    await withActor(api.put('/api/submissions/submission-4/draft'), { userId: 'owner-4' }).send({
      baseRevision: 0,
      metadata: { title: 'v1' }
    });

    const forbiddenRead = await withActor(api.get('/api/submissions/submission-4/draft'), { userId: 'other-user' });
    expect(forbiddenRead.status).toBe(403);

    const noInternalToken = await api
      .post('/api/submissions/submission-4/draft/retention/prune')
      .send({ finalSubmissionId: 'submission-4' });
    expect(noInternalToken.status).toBe(401);

    const badFinalSubmissionId = await api
      .post('/api/submissions/submission-4/draft/retention/prune')
      .set('x-internal-service-token', 'internal-token')
      .send({ finalSubmissionId: 'wrong-id' });
    expect(badFinalSubmissionId.status).toBe(400);

    const pruneMissing = await api
      .post('/api/submissions/missing/draft/retention/prune')
      .set('x-internal-service-token', 'internal-token')
      .send({ finalSubmissionId: 'missing' });
    expect(pruneMissing.status).toBe(404);
  });

  it('returns no-saved-draft when submission exists without successful version', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    await withActor(api.put('/api/submissions/submission-5/draft'), {
      userId: 'intruder'
    })
      .set('x-submission-owner-id', 'owner-5')
      .send({ baseRevision: 0, metadata: {} });

    const latest = await withActor(api.get('/api/submissions/submission-5/draft'), {
      userId: 'owner-5'
    });
    expect(latest.status).toBe(404);
    expect(latest.body.code).toBe('DRAFT_NOT_FOUND');
  });

  it('swallows save-attempt recording failures', async () => {
    const { app, state } = createTestServer();
    const api = requestFor(app);

    await saveDraft(api, 'submission-6', { userId: 'owner-6' }, { baseRevision: 0, metadata: { title: 'v1' } });
    state.saveAttempts.delete('submission-6');

    const failed = await saveDraft(
      api,
      'submission-6',
      { userId: 'owner-6' },
      { baseRevision: 1, metadata: { title: 'v2' } },
      { 'x-force-system-error': 'true' }
    );

    expect(failed.status).toBe(500);
  });

  it('covers controller default options and nullish-body system-error path', async () => {
    const state = createDraftState();
    const controller = createDraftController({ state });

    const saveReq = {
      params: { submissionId: 'submission-defaults' },
      body: { baseRevision: 0, metadata: {} },
      get(name) {
        if (name === 'x-user-id') {
          return 'owner-defaults';
        }

        return undefined;
      }
    };
    const saveRes = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      }
    };

    await controller.saveDraft(saveReq, saveRes);
    expect(saveRes.statusCode).toBe(200);

    const systemErrorReq = {
      params: { submissionId: 'submission-defaults' },
      body: undefined,
      get(name) {
        if (name === 'x-user-id') {
          return 'owner-defaults';
        }

        if (name === 'x-force-system-error') {
          return 'true';
        }

        return undefined;
      }
    };
    const systemErrorRes = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      }
    };

    await controller.saveDraft(systemErrorReq, systemErrorRes);
    expect(systemErrorRes.statusCode).toBe(500);

    const pruneReq = {
      params: { submissionId: 'submission-defaults' },
      body: { finalSubmissionId: 'submission-defaults' },
      get(name) {
        if (name === 'x-internal-service-token') {
          return 'internal-token';
        }

        return undefined;
      }
    };
    const pruneRes = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      }
    };

    await controller.pruneRetention(pruneReq, pruneRes);
    expect(pruneRes.statusCode).toBe(200);
  });
});
