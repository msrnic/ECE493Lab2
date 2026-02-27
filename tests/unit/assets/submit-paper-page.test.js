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
});
