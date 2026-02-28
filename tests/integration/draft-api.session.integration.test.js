import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { invokeAppRoute } from '../helpers/http-harness.js';

describe('draft API integration - authenticated session access', () => {
  it('accepts save/load requests using session-auth headers', async () => {
    const app = createApp();
    const headers = {
      'x-session-id': 'session-draft-1',
      'x-author-id': 'author-draft-1'
    };

    const saveResponse = await invokeAppRoute(app, {
      method: 'put',
      path: '/api/submissions/:submissionId/draft',
      params: { submissionId: 'submission-draft-1' },
      headers,
      body: {
        baseRevision: 0,
        metadata: { title: 'Session-backed draft' },
        files: []
      }
    });
    expect(saveResponse.statusCode).toBe(200);
    expect(saveResponse.body.revision).toBe(1);

    const latestResponse = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/submissions/:submissionId/draft',
      params: { submissionId: 'submission-draft-1' },
      headers
    });
    expect(latestResponse.statusCode).toBe(200);
    expect(latestResponse.body.metadata.title).toBe('Session-backed draft');

    const unauthenticatedList = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/submissions/:submissionId/draft/versions',
      params: { submissionId: 'submission-draft-1' }
    });
    expect(unauthenticatedList.statusCode).toBe(401);
  });

  it('treats editor account role as admin for version-list access', async () => {
    const app = createApp();

    app.locals.repository.createUserAccount({
      id: 'editor-user',
      fullName: 'Editor User',
      emailNormalized: 'editor.user@example.com',
      passwordHash: hashPassword('StrongPass!2026'),
      role: 'editor',
      status: 'active',
      credentialVersion: 0,
      createdAt: '2026-02-01T00:00:00.000Z',
      activatedAt: '2026-02-01T00:00:00.000Z'
    });

    const ownerHeaders = {
      'x-session-id': 'session-owner-1',
      'x-author-id': 'owner-user'
    };
    await invokeAppRoute(app, {
      method: 'put',
      path: '/api/submissions/:submissionId/draft',
      params: { submissionId: 'submission-draft-2' },
      headers: ownerHeaders,
      body: {
        baseRevision: 0,
        metadata: { title: 'Owner draft' }
      }
    });

    const editorHeaders = {
      'x-session-id': 'session-editor-1',
      'x-author-id': 'editor-user'
    };
    const listResponse = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/submissions/:submissionId/draft/versions',
      params: { submissionId: 'submission-draft-2' },
      headers: editorHeaders
    });

    expect(listResponse.statusCode).toBe(200);
    expect(Array.isArray(listResponse.body.versions)).toBe(true);
  });
});
