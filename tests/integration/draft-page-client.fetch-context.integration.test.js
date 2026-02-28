import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { bootstrapDraftPage } from '../../src/assets/js/draft-page.js';

function flushAsyncWork() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createDraftDom(sessionId = 'session-integration') {
  const dom = new JSDOM(`
    <form data-submit-paper-form>
      <input name="sessionId" value="${sessionId}" />
      <input name="actionSequenceId" value="action-1" />
      <input name="title" value="Integration Draft" />
      <textarea name="abstract">Abstract</textarea>
      <input name="authorList" value="Author One" />
      <input name="keywords" value="draft, integration" />
      <input name="manuscript" type="file" />
    </form>
    <section data-submit-paper-draft>
      <button type="button" data-draft-save>Save Draft</button>
      <button type="button" data-draft-load>Load Latest Draft</button>
      <button type="button" data-draft-history-refresh>Refresh Draft History</button>
      <p data-draft-status></p>
      <ul data-draft-history-list></ul>
    </section>
  `);

  return dom.window.document;
}

describe('draft page + draft api client integration', () => {
  it('saves a draft using default global fetch without illegal invocation', async () => {
    const documentRef = createDraftDom('session-fetch-bind');
    const originalFetch = globalThis.fetch;
    const originalFormData = globalThis.FormData;
    const fetchImpl = vi.fn(function fetchImpl(url, init = {}) {
      if (this !== globalThis) {
        throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
      }

      const method = String(init.method ?? 'GET');
      if (String(url).endsWith('/api/submissions/session-fetch-bind/draft') && method === 'GET') {
        return Promise.resolve(
          new Response(JSON.stringify({ code: 'DRAFT_NOT_FOUND', message: 'missing' }), {
            status: 404,
            headers: { 'content-type': 'application/json' }
          })
        );
      }

      if (String(url).endsWith('/api/submissions/session-fetch-bind/draft/versions')) {
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

      if (String(url).endsWith('/api/submissions/session-fetch-bind/draft') && method === 'PUT') {
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
    });

    Object.defineProperty(globalThis, 'fetch', {
      value: fetchImpl,
      configurable: true
    });
    Object.defineProperty(globalThis, 'FormData', {
      value: documentRef.defaultView.FormData,
      configurable: true
    });

    try {
      const result = bootstrapDraftPage({ documentRef });
      expect(result).toEqual({ enhanced: true });

      await flushAsyncWork();
      await flushAsyncWork();

      documentRef.querySelector('[data-draft-save]').click();
      await flushAsyncWork();
      await flushAsyncWork();

      const statusNode = documentRef.querySelector('[data-draft-status]');
      expect(statusNode.dataset.status).toBe('success');
      expect(statusNode.textContent).toContain('Draft saved (revision 1)');

      const putCall = fetchImpl.mock.calls.find(([, init = {}]) => String(init.method) === 'PUT');
      expect(putCall).toBeDefined();
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
});
