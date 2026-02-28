import { describe, expect, it } from 'vitest';
import { createTestServer, requestFor, saveDraft, withActor } from '../test-utils.js';

describe('draft API integration - save error handling', () => {
  it('returns 409 for stale save attempts', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    await saveDraft(api, 'sub-1', { userId: 'author-1' }, { baseRevision: 0, metadata: { title: 'v1' } });
    await saveDraft(api, 'sub-1', { userId: 'author-1' }, { baseRevision: 1, metadata: { title: 'v2' } });

    const stale = await saveDraft(api, 'sub-1', { userId: 'author-1' }, { baseRevision: 1 - 1, metadata: { title: 'v0' } });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe('DRAFT_STALE');
    expect(stale.body.reloadRequired).toBe(true);
  });

  it('returns 500 for system errors while preserving latest successful version', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    await saveDraft(api, 'sub-2', { userId: 'author-2' }, { baseRevision: 0, metadata: { title: 'stable' } });

    const failed = await withActor(api.put('/api/submissions/sub-2/draft'), {
      userId: 'author-2'
    }).send({
      baseRevision: 1,
      metadata: { title: 'unstable' },
      forceSystemError: true
    });

    expect(failed.status).toBe(500);
    expect(failed.body.code).toBe('DRAFT_SAVE_FAILED');

    const latest = await withActor(api.get('/api/submissions/sub-2/draft'), {
      userId: 'author-2'
    });
    expect(latest.status).toBe(200);
    expect(latest.body.metadata).toEqual({ title: 'stable' });
  });
});
