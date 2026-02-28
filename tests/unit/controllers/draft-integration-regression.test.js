import { describe, expect, it } from 'vitest';
import { createTestServer, requestFor, saveDraft, withActor } from '../../test-utils.js';

describe('draft cross-story regression', () => {
  it('keeps prior save after system failure, then resumes and restores', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    const first = await saveDraft(api, 'submission-r', { userId: 'author-r' }, { baseRevision: 0, metadata: { title: 'alpha' } });
    expect(first.status).toBe(200);

    const failed = await saveDraft(
      api,
      'submission-r',
      { userId: 'author-r' },
      { baseRevision: 1, metadata: { title: 'beta' } },
      { 'x-force-system-error': 'true' }
    );
    expect(failed.status).toBe(500);

    const second = await saveDraft(api, 'submission-r', { userId: 'author-r' }, { baseRevision: 1, metadata: { title: 'gamma' } });
    expect(second.status).toBe(200);

    const versions = await withActor(api.get('/api/submissions/submission-r/draft/versions'), { userId: 'author-r' });
    expect(versions.body.versions).toHaveLength(2);

    const restore = await withActor(
      api.post(`/api/submissions/submission-r/draft/versions/${first.body.versionId}/restore`),
      { userId: 'author-r' }
    ).send({ baseRevision: 2 });
    expect(restore.status).toBe(200);

    const latest = await withActor(api.get('/api/submissions/submission-r/draft'), { userId: 'author-r' });
    expect(latest.body.metadata).toEqual({ title: 'alpha' });
  });
});
