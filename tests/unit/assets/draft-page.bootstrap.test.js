/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import {
  bootstrapDraftPage,
  extractDraftFileDescriptors,
  resolveDraftSubmissionId
} from '../../../src/assets/js/draft-page.js';

function flushAsyncWork() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function setDraftDom(sessionId = 'session-1') {
  document.body.innerHTML = `
    <form data-submit-paper-form>
      <input name="sessionId" value="${sessionId}" />
      <input name="actionSequenceId" value="action-1" />
      <input name="title" value="Paper title" />
      <textarea name="abstract">Paper abstract</textarea>
      <input name="authorList" value="Author One" />
      <input name="keywords" value="draft, paper" />
      <input name="manuscript" type="file" />
    </form>
    <section data-submit-paper-draft>
      <button type="button" data-draft-save>Save Draft</button>
      <button type="button" data-draft-load>Load Latest Draft</button>
      <button type="button" data-draft-history-refresh>Refresh Draft History</button>
      <p data-draft-status></p>
      <ul data-draft-history-list></ul>
    </section>
  `;
}

describe('draft-page bootstrap', () => {
  it('returns not enhanced when required nodes are missing and handles helper defaults', () => {
    document.body.innerHTML = '<main>No draft nodes</main>';

    expect(bootstrapDraftPage({ documentRef: document })).toEqual({ enhanced: false });

    expect(resolveDraftSubmissionId(null)).toBe('');

    setDraftDom(' session-2 ');
    expect(resolveDraftSubmissionId(document.querySelector('[data-submit-paper-form]'))).toBe('session-2');
    expect(extractDraftFileDescriptors(document.querySelector('[data-submit-paper-form]'))).toEqual([]);
    document.body.innerHTML = '<form data-submit-paper-form><input name="title" value="x" /></form>';
    const formWithoutSession = document.querySelector('[data-submit-paper-form]');
    expect(resolveDraftSubmissionId(formWithoutSession)).toBe('');
    expect(extractDraftFileDescriptors(formWithoutSession)).toEqual([]);

    setDraftDom(' session-2 ');
    const input = document.querySelector('[name="manuscript"]');
    Object.defineProperty(input, 'files', {
      value: [{ name: 'fallback.bin' }],
      configurable: true
    });
    expect(extractDraftFileDescriptors(document.querySelector('[data-submit-paper-form]'))).toEqual([
      {
        fileName: 'fallback.bin',
        mimeType: 'application/octet-stream',
        sizeBytes: 0,
        checksum: 'fallback.bin:0:0',
        storageKey: 'draft/fallback.bin'
      }
    ]);

    const restoredDescriptorFile = { name: 'restored.bin', type: 'application/octet-stream', size: 0, lastModified: 0 };
    Object.defineProperty(restoredDescriptorFile, 'draftSizeBytes', {
      value: 512,
      configurable: true
    });
    Object.defineProperty(restoredDescriptorFile, 'draftChecksum', {
      value: 'checksum-restored',
      configurable: true
    });
    Object.defineProperty(restoredDescriptorFile, 'draftStorageKey', {
      value: 'uploads/restored.bin',
      configurable: true
    });
    Object.defineProperty(input, 'files', {
      value: [restoredDescriptorFile],
      configurable: true
    });
    expect(extractDraftFileDescriptors(document.querySelector('[data-submit-paper-form]'))).toEqual([
      {
        fileName: 'restored.bin',
        mimeType: 'application/octet-stream',
        sizeBytes: 512,
        checksum: 'checksum-restored',
        storageKey: 'uploads/restored.bin'
      }
    ]);

    setDraftDom('session-without-input');
    document.querySelector('[name="sessionId"]').remove();
    expect(bootstrapDraftPage({ documentRef: document })).toEqual({ enhanced: false });
  });

  it('handles missing-session branches for save/load/history/restore actions', async () => {
    setDraftDom('');
    const draftPage = {
      saveDraft: vi.fn(),
      loadLatestDraft: vi.fn(),
      loadHistory: vi.fn(),
      restoreVersion: vi.fn()
    };

    const result = bootstrapDraftPage({ documentRef: document, draftPage });
    expect(result).toEqual({ enhanced: true });
    await flushAsyncWork();

    const statusNode = document.querySelector('[data-draft-status]');
    expect(statusNode.textContent).toContain('Session ID is required');
    expect(document.querySelector('[data-draft-history-list]').children).toHaveLength(0);

    document.querySelector('[data-draft-save]').click();
    document.querySelector('[data-draft-load]').click();
    document.querySelector('[data-draft-history-refresh]').click();
    await flushAsyncWork();

    const listNode = document.querySelector('[data-draft-history-list]');
    listNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const restoreButton = document.createElement('button');
    restoreButton.type = 'button';
    restoreButton.dataset.draftRestoreVersion = 'v1';
    listNode.appendChild(restoreButton);
    restoreButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(draftPage.saveDraft).not.toHaveBeenCalled();
    expect(draftPage.loadLatestDraft).not.toHaveBeenCalled();
    expect(draftPage.loadHistory).not.toHaveBeenCalled();
    expect(draftPage.restoreVersion).not.toHaveBeenCalled();
  });

  it('loads latest draft, saves successfully, and restores selected history versions', async () => {
    setDraftDom('session-success');
    const fileInput = document.querySelector('[name="manuscript"]');
    const file = new File(['pdf-bytes'], 'paper.pdf', { type: 'application/pdf', lastModified: 7 });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      configurable: true
    });

    const draftPage = {
      saveDraft: vi.fn(async () => ({
        pending: { message: 'Saving draft...' },
        result: {
          phase: 'saved',
          message: 'Saved OK',
          payload: { revision: 2 }
        }
      })),
      loadLatestDraft: vi
        .fn()
        .mockResolvedValueOnce({
          revision: 1,
          metadata: {
            title: 'Loaded Title',
            abstract: 'Loaded abstract',
            authorList: ['Loaded Author'],
            keywords: ['loaded']
          },
          files: [
            {
              fileName: 'paper.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 9,
              checksum: 'loaded-file-a',
              storageKey: 'uploads/paper-a'
            }
          ]
        })
        .mockResolvedValueOnce({
          revision: 3,
          metadata: {
            title: 'Restored Title',
            abstract: 'Loaded abstract',
            authorList: ['Loaded Author'],
            keywords: ['loaded']
          },
          files: [
            {
              fileName: 'restored-paper.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 5,
              checksum: 'loaded-file-restored',
              storageKey: 'uploads/paper-restored'
            }
          ]
        }),
      loadHistory: vi
        .fn()
        .mockResolvedValueOnce([{ versionId: 'v1', label: 'Revision 1 - Jan 1', restoredFromVersionId: null }])
        .mockResolvedValueOnce([{ versionId: 'v1', label: 'Revision 1 - Jan 1', restoredFromVersionId: null }])
        .mockResolvedValueOnce([{ versionId: 'v1', label: 'Revision 1 - Jan 1', restoredFromVersionId: null }]),
      restoreVersion: vi.fn(async () => ({
        revision: 3,
        message: 'Restored as revision 3.'
      }))
    };

    bootstrapDraftPage({ documentRef: document, draftPage });
    await flushAsyncWork();
    await flushAsyncWork();

    expect(document.querySelector('[name="title"]').value).toBe('Loaded Title');
    expect(document.querySelector('[name="manuscript"]').files).toHaveLength(1);
    expect(document.querySelector('[name="manuscript"]').files[0].name).toBe('paper.pdf');
    expect(document.querySelector('[data-draft-history-list]').children).toHaveLength(1);

    document.querySelector('[data-draft-save]').click();
    await flushAsyncWork();
    await flushAsyncWork();

    expect(draftPage.saveDraft).toHaveBeenCalledWith(
      'session-success',
      expect.objectContaining({
        baseRevision: 1,
        metadata: expect.objectContaining({ title: 'Loaded Title' }),
        files: [
          {
            fileName: 'paper.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 9,
            checksum: 'loaded-file-a',
            storageKey: 'uploads/paper-a'
          }
        ]
      })
    );
    expect(document.querySelector('[data-draft-status]').textContent).toBe('Saved OK');

    const restoreButton = document.querySelector('[data-draft-restore-version]');
    restoreButton.click();
    await flushAsyncWork();
    await flushAsyncWork();

    expect(draftPage.restoreVersion).toHaveBeenCalledWith('session-success', 'v1', 2);
    expect(document.querySelector('[name="title"]').value).toBe('Restored Title');
    expect(document.querySelector('[name="manuscript"]').files).toHaveLength(1);
    expect(document.querySelector('[name="manuscript"]').files[0].name).toBe('restored-paper.pdf');
  });

  it('bootstraps using default draftPage when custom draftPage is omitted', async () => {
    setDraftDom('session-default-page');
    const form = document.querySelector('[data-submit-paper-form]');

    const originalFetch = globalThis.fetch;
    const fetchImpl = vi.fn(async (url, init = {}) => {
      if (url.endsWith('/draft') && (init.method ?? 'GET') === 'GET') {
        return new Response(JSON.stringify({ code: 'DRAFT_NOT_FOUND', message: 'missing' }), {
          status: 404
        });
      }

      if (url.endsWith('/draft/versions')) {
        return new Response(JSON.stringify({ versions: [] }), {
          status: 200
        });
      }

      return new Response('{}', { status: 200 });
    });
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchImpl,
      configurable: true
    });

    try {
      const result = bootstrapDraftPage({ documentRef: document, formRef: form });
      expect(result).toEqual({ enhanced: true });
      await flushAsyncWork();
      await flushAsyncWork();
    } finally {
      Object.defineProperty(globalThis, 'fetch', {
        value: originalFetch,
        configurable: true
      });
    }
  });

  it('defaults loaded revision to zero when loadLatestDraft omits revision', async () => {
    setDraftDom('session-no-revision');
    const draftPage = {
      saveDraft: vi.fn(async () => ({
        pending: { message: 'Saving draft...' },
        result: { phase: 'saved', message: 'Saved with fallback revision', payload: {} }
      })),
      loadLatestDraft: vi.fn(async () => ({
        metadata: {
          title: 'Untitled',
          abstract: '',
          authorList: [],
          keywords: []
        },
        files: []
      })),
      loadHistory: vi.fn(async () => []),
      restoreVersion: vi.fn()
    };

    bootstrapDraftPage({ documentRef: document, draftPage });
    await flushAsyncWork();
    await flushAsyncWork();

    document.querySelector('[data-draft-save]').click();
    await flushAsyncWork();
    await flushAsyncWork();

    expect(draftPage.saveDraft).toHaveBeenCalledWith(
      'session-no-revision',
      expect.objectContaining({ baseRevision: 0 })
    );
  });

  it('covers not-found and generic load errors plus stale/save-error/history-error/forbidden branches', async () => {
    setDraftDom('session-errors');
    const draftPage = {
      saveDraft: vi
        .fn()
        .mockResolvedValueOnce({
          pending: { message: 'Saving draft...' },
          result: { phase: 'error', code: 'DRAFT_STALE', message: 'stale save' }
        })
        .mockResolvedValueOnce({
          pending: { message: 'Saving draft...' },
          result: { phase: 'error', code: 'DRAFT_SAVE_FAILED', message: 'save failed' }
        }),
      loadLatestDraft: vi
        .fn()
        .mockRejectedValueOnce({ code: 'DRAFT_NOT_FOUND' })
        .mockRejectedValueOnce({})
        .mockRejectedValueOnce(new Error('latest load failed')),
      loadHistory: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce({})
        .mockRejectedValueOnce(new Error('history load failed')),
      restoreVersion: vi.fn(async () => ({
        code: 'DRAFT_FORBIDDEN',
        message: 'forbidden restore'
      }))
    };

    bootstrapDraftPage({ documentRef: document, draftPage });
    await flushAsyncWork();
    await flushAsyncWork();

    document.querySelector('[data-draft-save]').click();
    await flushAsyncWork();
    expect(document.querySelector('[data-draft-status]').dataset.status).toBe('warning');

    document.querySelector('[data-draft-save]').click();
    await flushAsyncWork();
    expect(document.querySelector('[data-draft-status]').dataset.status).toBe('error');
    expect(document.querySelector('[data-draft-status]').textContent).toBe('save failed');

    document.querySelector('[data-draft-load]').click();
    await flushAsyncWork();
    expect(document.querySelector('[data-draft-status]').textContent).toBe('Unable to load latest draft.');
    document.querySelector('[data-draft-load]').click();
    await flushAsyncWork();
    expect(document.querySelector('[data-draft-status]').textContent).toBe('latest load failed');

    document.querySelector('[data-draft-history-refresh]').click();
    await flushAsyncWork();
    expect(document.querySelector('[data-draft-status]').textContent).toBe('Unable to load draft history.');
    document.querySelector('[data-draft-history-refresh]').click();
    await flushAsyncWork();
    expect(document.querySelector('[data-draft-status]').textContent).toBe('history load failed');

    const listNode = document.querySelector('[data-draft-history-list]');
    listNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const restoreButton = document.createElement('button');
    restoreButton.type = 'button';
    restoreButton.dataset.draftRestoreVersion = 'v7';
    listNode.appendChild(restoreButton);
    restoreButton.click();
    await flushAsyncWork();

    expect(document.querySelector('[data-draft-status]').textContent).toBe('forbidden restore');
  });

  it('keeps current revision when save/restore payload omits revision fields', async () => {
    setDraftDom('session-fallback-revision');
    const draftPage = {
      saveDraft: vi.fn(async () => ({
        pending: { message: 'Saving draft...' },
        result: {
          phase: 'saved',
          message: 'Saved without revision',
          payload: {}
        }
      })),
      loadLatestDraft: vi
        .fn()
        .mockResolvedValueOnce({
          revision: 4,
          metadata: {
            title: 'Revision Four',
            abstract: '',
            authorList: [],
            keywords: []
          },
          files: []
        })
        .mockResolvedValueOnce({
          revision: 4,
          metadata: {
            title: 'Revision Four',
            abstract: '',
            authorList: [],
            keywords: []
          },
          files: []
        }),
      loadHistory: vi
        .fn()
        .mockResolvedValueOnce([{ versionId: 'v4', label: 'Revision 4 - Jan 1', restoredFromVersionId: null }])
        .mockResolvedValueOnce([{ versionId: 'v4', label: 'Revision 4 - Jan 1', restoredFromVersionId: null }])
        .mockResolvedValueOnce([{ versionId: 'v4', label: 'Revision 4 - Jan 1', restoredFromVersionId: null }]),
      restoreVersion: vi.fn(async () => ({
        message: 'Restored without revision'
      }))
    };

    bootstrapDraftPage({ documentRef: document, draftPage });
    await flushAsyncWork();
    await flushAsyncWork();

    document.querySelector('[data-draft-save]').click();
    await flushAsyncWork();
    await flushAsyncWork();

    const restoreButton = document.querySelector('[data-draft-restore-version]');
    restoreButton.click();
    await flushAsyncWork();
    await flushAsyncWork();

    expect(draftPage.restoreVersion).toHaveBeenCalledWith('session-fallback-revision', 'v4', 4);
  });
});
