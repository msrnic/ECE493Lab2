import { describe, expect, it } from 'vitest';
import { createTestServer, requestFor, saveDraft, withActor } from '../../test-utils.js';
import { createDraftVersionController } from '../../../src/controllers/draft-version-controller.js';
import { createDraftState } from '../../../src/models/draft-submission-model.js';

describe('draft-version-controller', () => {
  it('lists versions and gets details for owner and admin', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    const first = await saveDraft(api, 'submission-1', { userId: 'author-1' }, { baseRevision: 0, metadata: { title: 'v1' } });
    await saveDraft(api, 'submission-1', { userId: 'author-1' }, { baseRevision: 1, metadata: { title: 'v2' } });

    const listAsOwner = await withActor(api.get('/api/submissions/submission-1/draft/versions'), {
      userId: 'author-1'
    });
    expect(listAsOwner.status).toBe(200);
    expect(listAsOwner.body.versions).toHaveLength(2);
    expect(listAsOwner.body.versions[0].revision).toBe(2);

    const listAsAdmin = await withActor(api.get('/api/submissions/submission-1/draft/versions'), {
      userId: 'admin-1',
      role: 'admin'
    });
    expect(listAsAdmin.status).toBe(200);

    const getVersion = await withActor(
      api.get(`/api/submissions/submission-1/draft/versions/${first.body.versionId}`),
      { userId: 'author-1' }
    );
    expect(getVersion.status).toBe(200);
    expect(getVersion.body.revision).toBe(1);
  });

  it('restores prior version as new latest and enforces stale check', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    const v1 = await saveDraft(api, 'submission-2', { userId: 'author-2' }, { baseRevision: 0, metadata: { title: 'v1' } });
    await saveDraft(api, 'submission-2', { userId: 'author-2' }, { baseRevision: 1, metadata: { title: 'v2' } });

    const restored = await withActor(
      api.post(`/api/submissions/submission-2/draft/versions/${v1.body.versionId}/restore`),
      { userId: 'author-2' }
    ).send({ baseRevision: 2 });

    expect(restored.status).toBe(200);
    expect(restored.body.revision).toBe(3);

    const latest = await withActor(api.get('/api/submissions/submission-2/draft'), { userId: 'author-2' });
    expect(latest.body.metadata).toEqual({ title: 'v1' });

    const staleRestore = await withActor(
      api.post(`/api/submissions/submission-2/draft/versions/${v1.body.versionId}/restore`),
      { userId: 'author-2' }
    ).send({ baseRevision: 1 });

    expect(staleRestore.status).toBe(409);
  });

  it('enforces authz and not-found conditions for version routes', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    await saveDraft(api, 'submission-3', { userId: 'owner-3' }, { baseRevision: 0, metadata: { title: 'v1' } });

    const unauthList = await api.get('/api/submissions/submission-3/draft/versions');
    expect(unauthList.status).toBe(401);

    const forbiddenList = await withActor(api.get('/api/submissions/submission-3/draft/versions'), {
      userId: 'other-user'
    });
    expect(forbiddenList.status).toBe(403);

    const missingSubmission = await withActor(api.get('/api/submissions/missing/draft/versions'), {
      userId: 'owner-3'
    });
    expect(missingSubmission.status).toBe(404);

    const missingVersion = await withActor(api.get('/api/submissions/submission-3/draft/versions/missing'), {
      userId: 'owner-3'
    });
    expect(missingVersion.status).toBe(404);

    const missingSubmissionDetail = await withActor(api.get('/api/submissions/missing/draft/versions/v1'), {
      userId: 'owner-3'
    });
    expect(missingSubmissionDetail.status).toBe(404);

    const missingRestore = await withActor(
      api.post('/api/submissions/submission-3/draft/versions/missing/restore'),
      { userId: 'owner-3' }
    ).send({ baseRevision: 1 });
    expect(missingRestore.status).toBe(404);

    const missingSubmissionRestore = await withActor(
      api.post('/api/submissions/missing/draft/versions/v1/restore'),
      { userId: 'owner-3' }
    ).send({ baseRevision: 0 });
    expect(missingSubmissionRestore.status).toBe(404);
  });

  it('supports default actor role and default controller factories', async () => {
    const state = createDraftState();
    state.submissions.set('s-default', {
      submissionId: 's-default',
      ownerUserId: 'owner-default',
      status: 'IN_PROGRESS',
      latestVersionId: null,
      latestRevision: 0
    });
    state.versions.set('s-default', []);
    state.saveAttempts.set('s-default', []);

    const controller = createDraftVersionController({ state });
    const req = {
      params: { submissionId: 's-default' },
      get(name) {
        if (name === 'x-user-id') {
          return 'owner-default';
        }

        return undefined;
      }
    };
    const res = {
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

    await controller.listDraftVersions(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.versions).toEqual([]);

    state.submissions.get('s-default').latestVersionId = 'v1';
    state.submissions.get('s-default').latestRevision = 1;
    state.versions.set('s-default', [
      {
        versionId: 'v1',
        submissionId: 's-default',
        revision: 1,
        savedByUserId: 'owner-default',
        metadataSnapshot: { title: 'seed' },
        fileReferences: [],
        restoredFromVersionId: null,
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ]);

    const restoreReq = {
      params: { submissionId: 's-default', versionId: 'v1' },
      body: { baseRevision: 1 },
      get(name) {
        if (name === 'x-user-id') {
          return 'owner-default';
        }

        return undefined;
      }
    };
    const restoreRes = {
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

    await controller.restoreDraftVersion(restoreReq, restoreRes);
    expect(restoreRes.statusCode).toBe(200);
    expect(typeof restoreRes.body.savedAt).toBe('string');
  });
});
