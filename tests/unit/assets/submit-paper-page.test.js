/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import {
  bootstrapSubmitPaperPage,
  createSubmissionApi
} from '../../../src/assets/js/submit-paper-page.js';

function jsonResponse({ ok = true, status = 200, payload = {} } = {}) {
  return {
    ok,
    status,
    json: async () => payload
  };
}

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function setFormHtml() {
  document.body.innerHTML = `
    <form data-submit-paper-form>
      <input name="sessionId" value="session-1" />
      <input name="actionSequenceId" value="action-1" />
      <input name="title" value="Paper" />
      <textarea name="abstract">Abstract</textarea>
      <input name="authorList" value="Author" />
      <input name="keywords" value="keyword" />
      <input name="manuscript" type="file" />
      <button type="submit">Submit</button>
    </form>
    <p data-submit-paper-status></p>
  `;
}

function setFormHtmlWithDraftControls() {
  document.body.innerHTML = `
    <form data-submit-paper-form>
      <input name="sessionId" value="session-1" />
      <input name="actionSequenceId" value="action-1" />
      <input name="title" value="Paper" />
      <textarea name="abstract">Abstract</textarea>
      <input name="authorList" value="Author" />
      <input name="keywords" value="keyword" />
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
  `;
}

describe('submit-paper-page', () => {
  it('creates submission API wrappers and handles request failures', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          payload: {
            submissionId: 'sub-1',
            actionSequenceId: 'action-server-1'
          }
        })
      )
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('invalid json');
        }
      })
      .mockResolvedValueOnce(jsonResponse({ payload: { status: 'submitted' } }));

    const api = createSubmissionApi({ fetchImpl });

    await expect(
      api.createSubmission({
        metadata: {
          title: 'Paper'
        }
      })
    ).resolves.toEqual({
      ok: true,
      status: 200,
      payload: {
        submissionId: 'sub-1',
        actionSequenceId: 'action-server-1'
      }
    });

    await expect(
      api.uploadFile({
        submissionId: 'sub-1',
        category: 'manuscript',
        file: new File(['x'], 'paper.pdf', { type: 'application/pdf' })
      })
    ).resolves.toEqual({
      ok: false,
      status: 0,
      payload: {
        message: 'Request failed.'
      }
    });

    await expect(
      api.validateSubmission({
        submissionId: 'sub-1'
      })
    ).resolves.toEqual({
      ok: true,
      status: 200,
      payload: {}
    });

    await expect(
      api.finalizeSubmission({
        submissionId: 'sub-1',
        idempotencyKey: 'action-server-1'
      })
    ).resolves.toEqual({
      ok: true,
      status: 200,
      payload: {
        status: 'submitted'
      }
    });

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(fetchImpl.mock.calls[1][1].headers).toEqual({
      'Content-Type': 'application/json'
    });
    const uploadRequestBody = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(uploadRequestBody).toEqual({
      category: 'manuscript',
      file: {
        name: 'paper.pdf',
        type: 'application/pdf',
        size: 1
      }
    });
    expect(fetchImpl.mock.calls[2][1].body).toBe('{}');
    expect(fetchImpl.mock.calls[3][1].body).toBe('{}');
  });

  it('serializes upload payload defaults when file metadata is missing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ payload: { submissionId: 'sub-1' } }));
    const api = createSubmissionApi({ fetchImpl });

    await expect(
      api.uploadFile({
        submissionId: 'sub-1',
        category: 'manuscript',
        file: {}
      })
    ).resolves.toEqual({
      ok: true,
      status: 200,
      payload: {
        submissionId: 'sub-1'
      }
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      category: 'manuscript',
      file: {
        name: '',
        type: '',
        size: 0
      }
    });
  });

  it('prefers restored draft file size metadata when present', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ payload: { submissionId: 'sub-1' } }));
    const api = createSubmissionApi({ fetchImpl });

    const restoredFile = new File(['x'], 'restored.pdf', { type: 'application/pdf' });
    Object.defineProperty(restoredFile, 'draftSizeBytes', {
      value: 4096,
      configurable: true
    });

    await expect(
      api.uploadFile({
        submissionId: 'sub-1',
        category: 'manuscript',
        file: restoredFile
      })
    ).resolves.toEqual({
      ok: true,
      status: 200,
      payload: {
        submissionId: 'sub-1'
      }
    });

    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      category: 'manuscript',
      file: {
        name: 'restored.pdf',
        type: 'application/pdf',
        size: 4096
      }
    });
  });

  it('returns not enhanced when required DOM nodes are missing', () => {
    document.body.innerHTML = '<main>no form</main>';

    expect(
      bootstrapSubmitPaperPage({
        documentRef: document,
        fetchImpl: vi.fn()
      })
    ).toEqual({
      enhanced: false
    });
  });

  it('submits without requiring form session/action IDs and uses server action sequence idempotency', async () => {
    setFormHtml();

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          payload: {
            submissionId: 'sub-server-id',
            actionSequenceId: 'action-sequence-server'
          }
        })
      )
      .mockResolvedValueOnce(jsonResponse({ payload: { valid: true, errors: [] } }))
      .mockResolvedValueOnce(
        jsonResponse({
          payload: {
            confirmationCode: 'CONF-9999'
          }
        })
      );

    const result = bootstrapSubmitPaperPage({
      documentRef: document,
      fetchImpl
    });
    expect(result).toEqual({ enhanced: true });

    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsyncWork();

    const statusNode = document.querySelector('[data-submit-paper-status]');
    expect(statusNode.dataset.status).toBe('success');
    expect(statusNode.textContent).toContain('CONF-9999');

    const createRequestBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(createRequestBody).toEqual({
      metadata: {
        title: 'Paper',
        abstract: 'Abstract',
        authorList: ['Author'],
        keywords: ['keyword']
      }
    });
    expect(fetchImpl.mock.calls[1][1].body).toBe('{}');
    expect(fetchImpl.mock.calls[2][1].headers['Idempotency-Key']).toBe('action-sequence-server');
  });

  it('uses crypto-generated idempotency key when action sequence is unavailable', async () => {
    setFormHtml();
    document.querySelector('[name="actionSequenceId"]').value = '';

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ payload: { submissionId: 'sub-crypto' } }))
      .mockResolvedValueOnce(jsonResponse({ payload: { valid: true, errors: [] } }))
      .mockResolvedValueOnce(jsonResponse({ payload: { confirmationCode: 'CONF-CRYPTO' } }));

    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        randomUUID: () => 'crypto-action-id'
      },
      configurable: true
    });

    try {
      bootstrapSubmitPaperPage({
        documentRef: document,
        fetchImpl
      });

      document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork();
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true
      });
    }

    expect(fetchImpl.mock.calls[2][1].headers['Idempotency-Key']).toBe('crypto-action-id');
  });

  it('generates fallback idempotency key when crypto UUID is unavailable', async () => {
    setFormHtml();
    document.querySelector('[name="actionSequenceId"]').value = '';

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ payload: { submissionId: 'sub-fallback' } }))
      .mockResolvedValueOnce(jsonResponse({ payload: { valid: true, errors: [] } }))
      .mockResolvedValueOnce(jsonResponse({ payload: { confirmationCode: 'CONF-FALLBACK' } }));

    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        randomUUID: () => ''
      },
      configurable: true
    });

    try {
      bootstrapSubmitPaperPage({
        documentRef: document,
        fetchImpl
      });

      document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork();
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true
      });
    }

    expect(fetchImpl.mock.calls[2][1].headers['Idempotency-Key']).toMatch(/^action-\d+-[0-9a-f]+$/);
  });

  it('handles create and upload failure branches', async () => {
    setFormHtml();

    const fileInput = document.querySelector('[name="manuscript"]');
    const file = new File(['content'], 'paper.pdf', { type: 'application/pdf' });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      configurable: true
    });

    const createFailFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: false,
        status: 500,
        payload: {
          message: 'create failed'
        }
      })
    );

    bootstrapSubmitPaperPage({
      documentRef: document,
      fetchImpl: createFailFetch
    });

    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsyncWork();
    const statusNode = document.querySelector('[data-submit-paper-status]');
    expect(statusNode.dataset.status).toBe('error');
    expect(statusNode.textContent).toBe('create failed');

    setFormHtml();
    const fallbackCreateFailFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: false,
        status: 500,
        payload: {}
      })
    );

    bootstrapSubmitPaperPage({
      documentRef: document,
      fetchImpl: fallbackCreateFailFetch
    });

    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsyncWork();
    expect(document.querySelector('[data-submit-paper-status]').textContent).toBe(
      'Failed to create submission.'
    );

    setFormHtml();
    const retryFileInput = document.querySelector('[name="manuscript"]');
    Object.defineProperty(retryFileInput, 'files', {
      value: [file],
      configurable: true
    });

    const uploadRetryFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ payload: { submissionId: 'sub-1' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: false,
          status: 503,
          payload: {
            outcome: 'retry_required',
            message: 'retry upload'
          }
        })
      );

    bootstrapSubmitPaperPage({
      documentRef: document,
      fetchImpl: uploadRetryFetch
    });

    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsyncWork();

    expect(document.querySelector('[data-submit-paper-status]').dataset.status).toBe('warning');
    expect(document.querySelector('[data-submit-paper-status]').textContent).toBe('retry upload');

    setFormHtml();
    const nonRetryFileInput = document.querySelector('[name="manuscript"]');
    Object.defineProperty(nonRetryFileInput, 'files', {
      value: [file],
      configurable: true
    });

    const uploadErrorFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ payload: { submissionId: 'sub-1' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: false,
          status: 400,
          payload: {
            message: 'Uploaded file violates policy.',
            details: [
              {
                message: 'Unsupported file type. Upload a PDF (.pdf) or text (.txt).'
              }
            ]
          }
        })
      );

    bootstrapSubmitPaperPage({
      documentRef: document,
      fetchImpl: uploadErrorFetch
    });

    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsyncWork();

    expect(document.querySelector('[data-submit-paper-status]').dataset.status).toBe('error');
    expect(document.querySelector('[data-submit-paper-status]').textContent).toContain(
      'Unsupported file type. Upload a PDF (.pdf) or text (.txt).'
    );

    setFormHtml();
    const fallbackDetailFileInput = document.querySelector('[name="manuscript"]');
    Object.defineProperty(fallbackDetailFileInput, 'files', {
      value: [file],
      configurable: true
    });

    const uploadFallbackMessageFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ payload: { submissionId: 'sub-1' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: false,
          status: 400,
          payload: {
            details: [{}]
          }
        })
      );

    bootstrapSubmitPaperPage({
      documentRef: document,
      fetchImpl: uploadFallbackMessageFetch
    });

    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsyncWork();

    expect(document.querySelector('[data-submit-paper-status]').dataset.status).toBe('error');
    expect(document.querySelector('[data-submit-paper-status]').textContent).toBe(
      'Failed to upload manuscript.'
    );
  });

  it('handles invalid validation response, finalize failure, and success path', async () => {
    setFormHtml();

    const validationRequestFailureFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ payload: { submissionId: 'sub-validation-error' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: false,
          status: 500,
          payload: {
            message: 'validation request failed'
          }
        })
      );

    bootstrapSubmitPaperPage({
      documentRef: document,
      fetchImpl: validationRequestFailureFetch
    });

    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsyncWork();
    expect(document.querySelector('[data-submit-paper-status]').dataset.status).toBe('error');
    expect(document.querySelector('[data-submit-paper-status]').textContent).toBe('validation request failed');

    setFormHtml();
    const invalidWithoutErrorsFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ payload: { submissionId: 'sub-invalid-no-errors' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          payload: {
            valid: false
          }
        })
      );

    bootstrapSubmitPaperPage({
      documentRef: document,
      fetchImpl: invalidWithoutErrorsFetch
    });

    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsyncWork();
    expect(document.querySelector('[data-submit-paper-status]').dataset.status).toBe('error');
    expect(document.querySelector('[data-submit-paper-status]').textContent).toBe('');

    setFormHtml();
    const fileInput = document.querySelector('[name="manuscript"]');
    const file = new File(['content'], 'paper.pdf', { type: 'application/pdf' });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      configurable: true
    });

    const invalidValidationFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ payload: { submissionId: 'sub-1' } }))
      .mockResolvedValueOnce(jsonResponse({ payload: { file: { fileId: 'file-1' } } }))
      .mockResolvedValueOnce(
        jsonResponse({
          payload: {
            valid: false,
            errors: [
              {
                field: 'title',
                message: 'Title is required.'
              }
            ]
          }
        })
      );

    bootstrapSubmitPaperPage({
      documentRef: document,
      fetchImpl: invalidValidationFetch
    });

    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsyncWork();

    const statusNode = document.querySelector('[data-submit-paper-status]');
    expect(statusNode.dataset.status).toBe('error');
    expect(statusNode.textContent).toBe('Title is required.');
    expect(document.querySelector('[name="title"]').getAttribute('aria-invalid')).toBe('true');

    setFormHtml();
    const fileInput2 = document.querySelector('[name="manuscript"]');
    Object.defineProperty(fileInput2, 'files', {
      value: [file],
      configurable: true
    });

    const finalizeFailureFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ payload: { submissionId: 'sub-2' } }))
      .mockResolvedValueOnce(jsonResponse({ payload: { file: { fileId: 'file-1' } } }))
      .mockResolvedValueOnce(jsonResponse({ payload: { valid: true, errors: [] } }))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: false,
          status: 503,
          payload: {
            outcome: 'retry_required',
            message: 'retry finalize'
          }
        })
      );

    bootstrapSubmitPaperPage({
      documentRef: document,
      fetchImpl: finalizeFailureFetch
    });

    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsyncWork();
    expect(document.querySelector('[data-submit-paper-status]').dataset.status).toBe('warning');
    expect(document.querySelector('[data-submit-paper-status]').textContent).toBe('retry finalize');

    setFormHtml();
    const fileInputErrorFinalize = document.querySelector('[name="manuscript"]');
    Object.defineProperty(fileInputErrorFinalize, 'files', {
      value: [file],
      configurable: true
    });

    const finalizeErrorFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ payload: { submissionId: 'sub-finalize-error' } }))
      .mockResolvedValueOnce(jsonResponse({ payload: { file: { fileId: 'file-1' } } }))
      .mockResolvedValueOnce(jsonResponse({ payload: { valid: true, errors: [] } }))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: false,
          status: 409,
          payload: {
            message: 'duplicate submission'
          }
        })
      );

    bootstrapSubmitPaperPage({
      documentRef: document,
      fetchImpl: finalizeErrorFetch
    });

    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsyncWork();
    expect(document.querySelector('[data-submit-paper-status]').dataset.status).toBe('error');
    expect(document.querySelector('[data-submit-paper-status]').textContent).toBe('duplicate submission');

    setFormHtml();
    const fileInput3 = document.querySelector('[name="manuscript"]');
    Object.defineProperty(fileInput3, 'files', {
      value: [file],
      configurable: true
    });

    const successFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ payload: { submissionId: 'sub-3' } }))
      .mockResolvedValueOnce(jsonResponse({ payload: { file: { fileId: 'file-1' } } }))
      .mockResolvedValueOnce(jsonResponse({ payload: { valid: true, errors: [] } }))
      .mockResolvedValueOnce(
        jsonResponse({
          payload: {
            confirmationCode: 'CONF-1234'
          }
        })
      );

    bootstrapSubmitPaperPage({
      documentRef: document,
      fetchImpl: successFetch
    });

    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsyncWork();

    expect(document.querySelector('[data-submit-paper-status]').dataset.status).toBe('success');
    expect(document.querySelector('[data-submit-paper-status]').textContent).toContain('CONF-1234');
  });

  it('uses injected fetch implementation for draft save/restore and hydrates restored values', async () => {
    setFormHtmlWithDraftControls();

    const originalFetch = globalThis.fetch;
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn(async () => {
        throw new Error('global fetch should not be used for draft flow');
      }),
      configurable: true
    });

    const savedVersions = [];
    const fetchImpl = vi.fn(async (url, options = {}) => {
      const method = String(options.method ?? 'GET').toUpperCase();
      const body = typeof options.body === 'string' && options.body.length > 0
        ? JSON.parse(options.body)
        : {};

      if (url === '/api/submissions/session-1/draft' && method === 'GET') {
        if (savedVersions.length === 0) {
          return new Response(
            JSON.stringify({
              code: 'DRAFT_NOT_FOUND',
              message: 'No saved draft exists for this submission.'
            }),
            { status: 404, headers: { 'content-type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(savedVersions[savedVersions.length - 1]),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }

      if (url === '/api/submissions/session-1/draft' && method === 'PUT') {
        const metadata = typeof body.metadata === 'string' ? JSON.parse(body.metadata) : (body.metadata ?? {});
        const revision = savedVersions.length + 1;
        const version = {
          submissionId: 'session-1',
          versionId: `v${revision}`,
          revision,
          savedAt: `2026-02-08T12:00:0${revision}.000Z`,
          savedByUserId: 'author-1',
          restoredFromVersionId: null,
          metadata,
          files: Array.isArray(body.files) ? body.files : []
        };
        savedVersions.push(version);

        return new Response(
          JSON.stringify({
            submissionId: 'session-1',
            versionId: version.versionId,
            revision: version.revision,
            savedAt: version.savedAt
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }

      if (url === '/api/submissions/session-1/draft/versions' && method === 'GET') {
        return new Response(
          JSON.stringify({
            submissionId: 'session-1',
            latestRevision: savedVersions.length,
            versions: [...savedVersions]
              .reverse()
              .map((version) => ({
                versionId: version.versionId,
                revision: version.revision,
                savedAt: version.savedAt,
                savedByUserId: version.savedByUserId,
                restoredFromVersionId: version.restoredFromVersionId
              }))
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }

      const restoreMatch = String(url).match(/^\/api\/submissions\/session-1\/draft\/versions\/([^/]+)\/restore$/);
      if (restoreMatch && method === 'POST') {
        const sourceVersion = savedVersions.find((version) => version.versionId === restoreMatch[1]);
        if (!sourceVersion) {
          return new Response(
            JSON.stringify({
              code: 'DRAFT_NOT_FOUND',
              message: 'Requested version not found.'
            }),
            { status: 404, headers: { 'content-type': 'application/json' } }
          );
        }

        const revision = savedVersions.length + 1;
        const restoredVersion = {
          submissionId: 'session-1',
          versionId: `v${revision}`,
          revision,
          savedAt: `2026-02-08T12:00:0${revision}.000Z`,
          savedByUserId: 'author-1',
          restoredFromVersionId: sourceVersion.versionId,
          metadata: sourceVersion.metadata,
          files: sourceVersion.files
        };
        savedVersions.push(restoredVersion);

        return new Response(
          JSON.stringify({
            submissionId: 'session-1',
            versionId: restoredVersion.versionId,
            revision: restoredVersion.revision,
            savedAt: restoredVersion.savedAt,
            message: 'Draft saved successfully.'
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    try {
      bootstrapSubmitPaperPage({
        documentRef: document,
        fetchImpl
      });

      await flushAsyncWork();
      await flushAsyncWork();

      const manuscriptInput = document.querySelector('[name="manuscript"]');
      const version1File = new File(['v1'], 'draft-v1.pdf', { type: 'application/pdf', lastModified: 11 });
      Object.defineProperty(manuscriptInput, 'files', {
        value: [version1File],
        configurable: true
      });

      document.querySelector('[name="title"]').value = 'Version 1 title';
      document.querySelector('[name="abstract"]').value = 'Version 1 abstract';
      document.querySelector('[name="authorList"]').value = 'Alice, Bob';
      document.querySelector('[name="keywords"]').value = 'alpha, beta';

      document.querySelector('[data-draft-save]').click();
      await flushAsyncWork();
      await flushAsyncWork();

      const version2File = new File(['v2x'], 'draft-v2.pdf', { type: 'application/pdf', lastModified: 12 });
      Object.defineProperty(manuscriptInput, 'files', {
        value: [version2File],
        configurable: true
      });

      document.querySelector('[name="title"]').value = 'Version 2 title';
      document.querySelector('[name="abstract"]').value = 'Version 2 abstract';
      document.querySelector('[name="authorList"]').value = 'Carol';
      document.querySelector('[name="keywords"]').value = 'gamma';

      document.querySelector('[data-draft-save]').click();
      await flushAsyncWork();
      await flushAsyncWork();

      const restoreV1Button = [...document.querySelectorAll('[data-draft-restore-version]')]
        .find((button) => button.dataset.draftRestoreVersion === 'v1');
      expect(restoreV1Button).toBeDefined();

      restoreV1Button.click();
      await flushAsyncWork();
      await flushAsyncWork();

      expect(document.querySelector('[name="title"]').value).toBe('Version 1 title');
      expect(document.querySelector('[name="abstract"]').value).toBe('Version 1 abstract');
      expect(document.querySelector('[name="authorList"]').value).toBe('Alice, Bob');
      expect(document.querySelector('[name="keywords"]').value).toBe('alpha, beta');
      expect(manuscriptInput.files).toHaveLength(1);
      expect(manuscriptInput.files[0].name).toBe('draft-v1.pdf');
      expect(manuscriptInput.files[0].draftSizeBytes).toBe(2);

      expect(
        fetchImpl.mock.calls.some(
          ([url, init = {}]) =>
            url === '/api/submissions/session-1/draft/versions/v1/restore' && String(init.method) === 'POST'
        )
      ).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'fetch', {
        value: originalFetch,
        configurable: true
      });
    }
  });
});
