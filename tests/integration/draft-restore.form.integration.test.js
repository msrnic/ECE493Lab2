import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { bootstrapSubmitPaperPage } from '../../src/assets/js/submit-paper-page.js';
import { createTestServer, requestFor, withActor } from '../test-utils.js';

function flushAsyncWork() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createSubmitPaperDocument(sessionId = 'session-restore') {
  const dom = new JSDOM(`
    <form data-submit-paper-form>
      <input name="sessionId" value="${sessionId}" />
      <input name="actionSequenceId" value="action-restore" />
      <input name="title" value="" />
      <textarea name="abstract"></textarea>
      <input name="authorList" value="" />
      <input name="keywords" value="" />
      <input name="manuscript" type="file" />
      <button type="submit">Submit</button>
    </form>
    <p data-submit-paper-status></p>
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

function buildDraftFetchHarness(api, actor) {
  return async (url, options = {}) => {
    const method = String(options.method ?? 'GET').toUpperCase();
    const body = typeof options.body === 'string' && options.body.length > 0
      ? JSON.parse(options.body)
      : {};
    const path = String(url);

    let request;
    if (method === 'GET') {
      request = api.get(path);
      const response = await withActor(request, actor);
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        text: async () => JSON.stringify(response.body ?? {}),
        json: async () => response.body
      };
    }

    if (method === 'PUT') {
      request = api.put(path);
    } else if (method === 'POST') {
      request = api.post(path);
    } else {
      throw new Error(`Unsupported method: ${method}`);
    }

    const response = await withActor(request, actor).send(body);
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      text: async () => JSON.stringify(response.body ?? {}),
      json: async () => response.body
    };
  };
}

describe('integration: submit-paper restore hydrates form fields', () => {
  it('saves versioned metadata and hydrates restored values after pressing Restore', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);
    const fetchImpl = buildDraftFetchHarness(api, { userId: 'author-restore', role: 'author' });
    const documentRef = createSubmitPaperDocument();
    const originalFormData = globalThis.FormData;
    Object.defineProperty(globalThis, 'FormData', {
      value: documentRef.defaultView.FormData,
      configurable: true
    });

    try {
      bootstrapSubmitPaperPage({
        documentRef,
        fetchImpl
      });

      await flushAsyncWork();
      await flushAsyncWork();

      const manuscriptInput = documentRef.querySelector('[name="manuscript"]');
      const fileV1 = new File(['v1'], 'draft-v1.pdf', { type: 'application/pdf', lastModified: 21 });
      Object.defineProperty(manuscriptInput, 'files', {
        value: [fileV1],
        configurable: true
      });

      documentRef.querySelector('[name="title"]').value = 'Draft title v1';
      documentRef.querySelector('[name="abstract"]').value = 'Draft abstract v1';
      documentRef.querySelector('[name="authorList"]').value = 'Alice, Bob';
      documentRef.querySelector('[name="keywords"]').value = 'alpha, beta';

      documentRef.querySelector('[data-draft-save]').click();
      await flushAsyncWork();
      await flushAsyncWork();

      const fileV2 = new File(['v2x'], 'draft-v2.pdf', { type: 'application/pdf', lastModified: 22 });
      Object.defineProperty(manuscriptInput, 'files', {
        value: [fileV2],
        configurable: true
      });

      documentRef.querySelector('[name="title"]').value = 'Draft title v2';
      documentRef.querySelector('[name="abstract"]').value = 'Draft abstract v2';
      documentRef.querySelector('[name="authorList"]').value = 'Carol';
      documentRef.querySelector('[name="keywords"]').value = 'gamma';

      documentRef.querySelector('[data-draft-save]').click();
      await flushAsyncWork();
      await flushAsyncWork();

      const restoreButtons = [...documentRef.querySelectorAll('[data-draft-restore-version]')];
      expect(restoreButtons).toHaveLength(2);
      const restoreV1 = restoreButtons[restoreButtons.length - 1];
      expect(restoreV1).toBeDefined();

      restoreV1.click();
      await flushAsyncWork();
      await flushAsyncWork();

      expect(documentRef.querySelector('[name="title"]').value).toBe('Draft title v1');
      expect(documentRef.querySelector('[name="abstract"]').value).toBe('Draft abstract v1');
      expect(documentRef.querySelector('[name="authorList"]').value).toBe('Alice, Bob');
      expect(documentRef.querySelector('[name="keywords"]').value).toBe('alpha, beta');
      expect(manuscriptInput.files).toHaveLength(1);
      expect(manuscriptInput.files[0].name).toBe('draft-v1.pdf');
      expect(manuscriptInput.files[0].draftSizeBytes).toBe(2);

      const latest = await withActor(api.get('/api/submissions/session-restore/draft'), {
        userId: 'author-restore',
        role: 'author'
      });
      expect(latest.status).toBe(200);
      expect(latest.body.metadata).toEqual({
        title: 'Draft title v1',
        abstract: 'Draft abstract v1',
        authorList: ['Alice', 'Bob'],
        keywords: ['alpha', 'beta']
      });
      expect(latest.body.files).toEqual([
        expect.objectContaining({
          fileName: 'draft-v1.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 2,
          checksum: 'draft-v1.pdf:2:21'
        })
      ]);
    } finally {
      Object.defineProperty(globalThis, 'FormData', {
        value: originalFormData,
        configurable: true
      });
    }
  });
});
