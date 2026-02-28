import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { bootstrapSubmitPaperPage } from '../../src/assets/js/submit-paper-page.js';
import { createTestServer, requestFor, saveDraft, withActor } from '../test-utils.js';

function flushAsyncWork() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createSubmitPaperDocument(sessionId = 'uc05-h8-ui') {
  const dom = new JSDOM(`
    <form data-submit-paper-form>
      <input name="sessionId" value="${sessionId}" />
      <input name="actionSequenceId" value="action-h8-ui" />
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

describe('UC-05-AS draft history scenarios (7-11)', () => {
  it('Scenario 7: Resume Latest Draft', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    await saveDraft(api, 'uc05-h7', { userId: 'author-a' }, { baseRevision: 0, metadata: { title: 'resume-me' } });
    const latest = await withActor(api.get('/api/submissions/uc05-h7/draft'), { userId: 'author-a' });

    expect(latest.status).toBe(200);
    expect(latest.body.metadata).toEqual({ title: 'resume-me' });
  });

  it('Scenario 8: Restore Prior Version', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    const v1 = await saveDraft(api, 'uc05-h8', { userId: 'author-a' }, { baseRevision: 0, metadata: { title: 'v1' } });
    await saveDraft(api, 'uc05-h8', { userId: 'author-a' }, { baseRevision: 1, metadata: { title: 'v2' } });

    const restored = await withActor(api.post(`/api/submissions/uc05-h8/draft/versions/${v1.body.versionId}/restore`), {
      userId: 'author-a'
    }).send({ baseRevision: 2 });

    expect(restored.status).toBe(200);

    const latest = await withActor(api.get('/api/submissions/uc05-h8/draft'), { userId: 'author-a' });
    expect(latest.body.metadata).toEqual({ title: 'v1' });
  });

  it('Scenario 8b: Restore action hydrates submit-paper form fields with selected version data', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);
    const fetchImpl = buildDraftFetchHarness(api, { userId: 'author-h8-ui', role: 'author' });
    const documentRef = createSubmitPaperDocument();
    const originalFormData = globalThis.FormData;
    Object.defineProperty(globalThis, 'FormData', {
      value: documentRef.defaultView.FormData,
      configurable: true
    });

    try {
      bootstrapSubmitPaperPage({ documentRef, fetchImpl });
      await flushAsyncWork();
      await flushAsyncWork();

      const manuscriptInput = documentRef.querySelector('[name="manuscript"]');
      const fileV1 = new File(['v1'], 'acceptance-v1.pdf', { type: 'application/pdf', lastModified: 31 });
      Object.defineProperty(manuscriptInput, 'files', {
        value: [fileV1],
        configurable: true
      });

      documentRef.querySelector('[name="title"]').value = 'Restore title v1';
      documentRef.querySelector('[name="abstract"]').value = 'Restore abstract v1';
      documentRef.querySelector('[name="authorList"]').value = 'Alice, Bob';
      documentRef.querySelector('[name="keywords"]').value = 'alpha, beta';

      documentRef.querySelector('[data-draft-save]').click();
      await flushAsyncWork();
      await flushAsyncWork();

      const fileV2 = new File(['v2x'], 'acceptance-v2.pdf', { type: 'application/pdf', lastModified: 32 });
      Object.defineProperty(manuscriptInput, 'files', {
        value: [fileV2],
        configurable: true
      });

      documentRef.querySelector('[name="title"]').value = 'Restore title v2';
      documentRef.querySelector('[name="abstract"]').value = 'Restore abstract v2';
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

      expect(documentRef.querySelector('[name="title"]').value).toBe('Restore title v1');
      expect(documentRef.querySelector('[name="abstract"]').value).toBe('Restore abstract v1');
      expect(documentRef.querySelector('[name="authorList"]').value).toBe('Alice, Bob');
      expect(documentRef.querySelector('[name="keywords"]').value).toBe('alpha, beta');
      expect(manuscriptInput.files).toHaveLength(1);
      expect(manuscriptInput.files[0].name).toBe('acceptance-v1.pdf');
      expect(manuscriptInput.files[0].draftSizeBytes).toBe(2);
    } finally {
      Object.defineProperty(globalThis, 'FormData', {
        value: originalFormData,
        configurable: true
      });
    }
  });

  it('Scenario 9: Authorized Version Access', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    await saveDraft(api, 'uc05-h9', { userId: 'author-a' }, { baseRevision: 0, metadata: { title: 'v1' } });

    const adminList = await withActor(api.get('/api/submissions/uc05-h9/draft/versions'), {
      userId: 'admin-a',
      role: 'admin'
    });
    expect(adminList.status).toBe(200);
  });

  it('Scenario 10: Unauthorized Version Access', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    await saveDraft(api, 'uc05-h10', { userId: 'author-a' }, { baseRevision: 0, metadata: { title: 'v1' } });

    const unauthorized = await withActor(api.get('/api/submissions/uc05-h10/draft/versions'), {
      userId: 'intruder'
    });
    expect(unauthorized.status).toBe(403);
  });

  it('Scenario 11: Retention Prune After Final Submission', async () => {
    const { app } = createTestServer();
    const api = requestFor(app);

    await saveDraft(api, 'uc05-h11', { userId: 'author-a' }, { baseRevision: 0, metadata: { title: 'v1' } });
    await saveDraft(api, 'uc05-h11', { userId: 'author-a' }, { baseRevision: 1, metadata: { title: 'v2' } });

    const pruned = await api
      .post('/api/submissions/uc05-h11/draft/retention/prune')
      .set('x-internal-service-token', 'internal-token')
      .send({ finalSubmissionId: 'uc05-h11' });

    expect(pruned.status).toBe(200);
    expect(pruned.body.prunedVersionCount).toBe(1);

    const versions = await withActor(api.get('/api/submissions/uc05-h11/draft/versions'), { userId: 'author-a' });
    expect(versions.body.versions).toHaveLength(1);
  });
});
