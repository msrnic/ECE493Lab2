import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { bootstrapSubmitPaperPage } from '../../src/assets/js/submit-paper-page.js';
import { invokeHandler } from '../helpers/http-harness.js';
import { createTestServer, requestFor, saveDraft, withActor } from '../test-utils.js';

function getRouteHandler(app, method, path) {
  const layer = app.router.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
  );

  return layer.route.stack[0].handle;
}

function flushAsyncWork() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('UC-05-AS draft save scenarios (1-6)', () => {
  it('Scenario 1a: Submit-paper screen exposes save-draft controls', async () => {
    const app = createApp();
    const submitPaperHandler = getRouteHandler(app, 'get', '/submit-paper');

    app.locals.repository.createUserAccount({
      id: 'uc05-author',
      fullName: 'UC05 Author',
      emailNormalized: 'uc05.author@example.com',
      passwordHash: hashPassword('StrongPass!2026'),
      role: 'author',
      status: 'active',
      credentialVersion: 0,
      createdAt: '2026-02-01T00:00:00.000Z',
      activatedAt: '2026-02-01T00:00:00.000Z'
    });

    const login = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'uc05.author@example.com',
        password: 'StrongPass!2026'
      }
    });
    const sessionCookie = String(login.headers['Set-Cookie']).split(';')[0];

    const submitPage = await invokeHandler(submitPaperHandler, {
      headers: {
        cookie: sessionCookie
      }
    });

    expect(submitPage.statusCode).toBe(200);
    expect(submitPage.text).toContain('data-submit-paper-draft');
    expect(submitPage.text).toContain('data-draft-save');
    expect(submitPage.text).toContain('data-draft-load');
    expect(submitPage.text).toContain('data-draft-history-refresh');
    expect(submitPage.text).toContain('data-draft-history-list');
  });

  it('Scenario 1b: Save-draft action succeeds when submit-paper page uses default fetch', async () => {
    const dom = new JSDOM(`
      <form data-submit-paper-form>
        <input name="sessionId" value="uc05-browser-flow" />
        <input name="actionSequenceId" value="action-1" />
        <input name="title" value="Browser Draft" />
        <textarea name="abstract">Draft abstract</textarea>
        <input name="authorList" value="Author One" />
        <input name="keywords" value="draft, acceptance" />
        <input name="manuscript" type="file" />
      </form>
      <section data-submit-paper-draft>
        <button type="button" data-draft-save>Save Draft</button>
        <button type="button" data-draft-load>Load Latest Draft</button>
        <button type="button" data-draft-history-refresh>Refresh Draft History</button>
        <p data-draft-status></p>
        <ul data-draft-history-list></ul>
      </section>
      <p data-submit-paper-status></p>
    `);
    const documentRef = dom.window.document;

    const originalFetch = globalThis.fetch;
    const originalFormData = globalThis.FormData;
    const fetchImpl = function fetchImpl(url, init = {}) {
      if (this !== globalThis) {
        throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
      }

      const method = String(init.method ?? 'GET');
      if (String(url).endsWith('/api/submissions/uc05-browser-flow/draft') && method === 'GET') {
        return Promise.resolve(
          new Response(JSON.stringify({ code: 'DRAFT_NOT_FOUND', message: 'missing' }), {
            status: 404,
            headers: { 'content-type': 'application/json' }
          })
        );
      }

      if (String(url).endsWith('/api/submissions/uc05-browser-flow/draft/versions')) {
        return Promise.resolve(
          new Response(JSON.stringify({
            versions: [
              {
                versionId: 'v1',
                revision: 1,
                savedAt: '2026-02-08T12:00:00.000Z'
              }
            ]
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        );
      }

      if (String(url).endsWith('/api/submissions/uc05-browser-flow/draft') && method === 'PUT') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              revision: 1,
              savedAt: '2026-02-08T12:00:00.000Z'
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' }
            }
          )
        );
      }

      return Promise.resolve(new Response('{}', { status: 200 }));
    };

    Object.defineProperty(globalThis, 'fetch', {
      value: fetchImpl,
      configurable: true
    });
    Object.defineProperty(globalThis, 'FormData', {
      value: documentRef.defaultView.FormData,
      configurable: true
    });

    try {
      const result = bootstrapSubmitPaperPage({ documentRef });
      expect(result).toEqual({ enhanced: true });

      await flushAsyncWork();
      await flushAsyncWork();

      documentRef.querySelector('[data-draft-save]').click();
      await flushAsyncWork();
      await flushAsyncWork();

      const draftStatus = documentRef.querySelector('[data-draft-status]');
      expect(draftStatus.dataset.status).toBe('success');
      expect(draftStatus.textContent).toContain('Draft saved (revision 1)');
    } finally {
      Object.defineProperty(globalThis, 'fetch', {
        value: originalFetch,
        configurable: true
      });
      Object.defineProperty(globalThis, 'FormData', {
        value: originalFormData,
        configurable: true
      });
    }
  });

  it('Scenario 1: Save Draft Success', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    const response = await saveDraft(api, 'uc05-s1', { userId: 'author-a' }, {
      baseRevision: 0,
      metadata: { title: 'Partial Paper' },
      files: []
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Draft saved successfully.');
  });

  it('Scenario 2: Save Includes Files', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    await saveDraft(api, 'uc05-s2', { userId: 'author-a' }, {
      baseRevision: 0,
      metadata: { title: 'With Files' },
      files: [
        {
          fileName: 'attachment.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 2048,
          checksum: 'sum-1',
          storageKey: 'uploads/attachment-1'
        }
      ]
    });

    const latest = await withActor(api.get('/api/submissions/uc05-s2/draft'), { userId: 'author-a' });
    expect(latest.status).toBe(200);
    expect(latest.body.files).toHaveLength(1);
    expect(latest.body.files[0].fileName).toBe('attachment.pdf');
  });

  it('Scenario 3: Repeated Save Creates Version History', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    await saveDraft(api, 'uc05-s3', { userId: 'author-a' }, { baseRevision: 0, metadata: { title: 'v1' } });
    await saveDraft(api, 'uc05-s3', { userId: 'author-a' }, { baseRevision: 1, metadata: { title: 'v2' } });

    const history = await withActor(api.get('/api/submissions/uc05-s3/draft/versions'), { userId: 'author-a' });
    expect(history.status).toBe(200);
    expect(history.body.versions).toHaveLength(2);
    expect(history.body.versions[0].revision).toBe(2);
  });

  it('Scenario 4: System Error During Save', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    const failed = await saveDraft(
      api,
      'uc05-s4',
      { userId: 'author-a' },
      {
        baseRevision: 0,
        metadata: { title: 'fail' }
      },
      { 'x-force-system-error': 'true' }
    );

    expect(failed.status).toBe(500);
    expect(failed.body.message).toContain('Please retry');
  });

  it('Scenario 5: Failed Save Preserves Prior Version', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    await saveDraft(api, 'uc05-s5', { userId: 'author-a' }, { baseRevision: 0, metadata: { title: 'saved' } });
    await saveDraft(
      api,
      'uc05-s5',
      { userId: 'author-a' },
      { baseRevision: 1, metadata: { title: 'failed update' } },
      { 'x-force-system-error': 'true' }
    );

    const latest = await withActor(api.get('/api/submissions/uc05-s5/draft'), { userId: 'author-a' });
    expect(latest.body.metadata).toEqual({ title: 'saved' });
  });

  it('Scenario 6: Stale Save Rejected', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    await saveDraft(api, 'uc05-s6', { userId: 'author-a' }, { baseRevision: 0, metadata: { title: 'v1' } });
    await saveDraft(api, 'uc05-s6', { userId: 'author-a' }, { baseRevision: 1, metadata: { title: 'v2' } });

    const stale = await saveDraft(api, 'uc05-s6', { userId: 'author-a' }, { baseRevision: 0, metadata: { title: 'v-stale' } });
    expect(stale.status).toBe(409);
    expect(stale.body.reloadRequired).toBe(true);
  });
});
