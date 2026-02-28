import { describe, expect, it, vi } from 'vitest';
import {
  buildStatusMessage,
  formatSaveTimestamp,
  mapOutcomeToClass
} from '../../../src/views/draft-ui-shared.js';
import { createDraftEditorView } from '../../../src/views/draft-editor-view.js';
import { createDraftHistoryView } from '../../../src/views/draft-history-view.js';
import { createDraftPage, serializeDraftPayload } from '../../../src/assets/js/draft-page.js';
import { DraftApiClient } from '../../../src/controllers/draft-api-client.js';

describe('draft page and views', () => {
  it('formats timestamps and maps status text/classes', () => {
    expect(formatSaveTimestamp('')).toBe('');
    expect(formatSaveTimestamp('2026-01-01T00:00:00.000Z')).toContain('Jan');

    expect(mapOutcomeToClass('SUCCESS')).toBe('notice--success');
    expect(mapOutcomeToClass('FAILED_STALE')).toBe('notice--warning');
    expect(mapOutcomeToClass('FAILED_AUTH')).toBe('notice--error');
    expect(mapOutcomeToClass('OTHER')).toBe('notice--error');

    expect(buildStatusMessage({ type: 'success', revision: 2, savedAt: '2026-01-01T00:00:00.000Z' })).toContain('revision 2');
    expect(buildStatusMessage({ type: 'stale' })).toContain('stale');
    expect(buildStatusMessage({ type: 'auth' })).toContain('not authorized');
    expect(buildStatusMessage({ type: 'error', message: 'custom' })).toBe('custom');
    expect(buildStatusMessage({})).toContain('not saved');
  });

  it('renders editor and history outputs for all branches', () => {
    const editorView = createDraftEditorView();
    const historyView = createDraftHistoryView();

    expect(editorView.renderSavePending().phase).toBe('saving');
    expect(editorView.renderSaveSuccess({ revision: 1, savedAt: '2026-01-01T00:00:00.000Z' }).phase).toBe('saved');
    expect(editorView.renderSaveFailure({ code: 'DRAFT_STALE', reloadRequired: true }).reloadRequired).toBe(true);
    expect(editorView.renderSaveFailure({ code: 'DRAFT_FORBIDDEN' }).message).toContain('not authorized');
    expect(editorView.renderSaveFailure({ code: 'DRAFT_SAVE_FAILED', message: 'failed' }).message).toBe('failed');

    expect(editorView.renderLoadedDraft({ revision: 1, metadata: { title: 'x' }, files: ['a'] }).files).toEqual(['a']);
    expect(editorView.renderLoadedDraft({ revision: 1 }).files).toEqual([]);

    expect(historyView.renderVersionTimeline([])).toEqual([]);
    const timeline = historyView.renderVersionTimeline([
      { versionId: 'v1', revision: 1, savedAt: '2026-01-01T00:00:00.000Z', restoredFromVersionId: null }
    ]);
    expect(timeline[0].label).toContain('Revision 1');
    expect(historyView.renderRestoreResult({ versionId: 'v2', revision: 2 }).message).toContain('revision 2');
    expect(historyView.renderForbidden().code).toBe('DRAFT_FORBIDDEN');
  });

  it('serializes payload and orchestrates save/load/history/restore flows', async () => {
    const apiClient = {
      saveDraft: vi.fn(async () => ({ revision: 1, savedAt: '2026-01-01T00:00:00.000Z' })),
      getLatestDraft: vi.fn(async () => ({ revision: 1, metadata: { title: 'x' }, files: [] })),
      listDraftVersions: vi.fn(async () => ({ versions: [{ versionId: 'v1', revision: 1, savedAt: '2026-01-01T00:00:00.000Z' }] })),
      restoreDraftVersion: vi.fn(async () => ({ versionId: 'v2', revision: 2 }))
    };

    expect(serializeDraftPayload({}).baseRevision).toBe(0);
    expect(serializeDraftPayload({}).metadata).toBe('{}');
    expect(serializeDraftPayload({ baseRevision: 2, metadata: { t: 1 } }).metadata).toBe('{"t":1}');
    expect(serializeDraftPayload({ baseRevision: 2, metadata: '{"t":1}' }).metadata).toBe('{"t":1}');

    const page = createDraftPage({ apiClient });
    const success = await page.saveDraft('s1', { baseRevision: 0, metadata: { title: 'x' } });
    expect(success.result.phase).toBe('saved');

    apiClient.saveDraft.mockRejectedValueOnce({ code: 'DRAFT_FORBIDDEN', message: 'no' });
    const failure = await page.saveDraft('s1', { baseRevision: 1, metadata: { title: 'x' } });
    expect(failure.result.phase).toBe('error');

    const loaded = await page.loadLatestDraft('s1');
    expect(loaded.phase).toBe('loaded');

    const history = await page.loadHistory('s1');
    expect(history).toHaveLength(1);

    const restored = await page.restoreVersion('s1', 'v1', 1);
    expect(restored.revision).toBe(2);

    apiClient.restoreDraftVersion.mockRejectedValueOnce(new Error('forbidden'));
    const forbiddenRestore = await page.restoreVersion('s1', 'v1', 2);
    expect(forbiddenRestore.code).toBe('DRAFT_FORBIDDEN');
  });

  it('creates draft page with default dependencies', () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    const client = new DraftApiClient({ fetchImpl });
    const page = createDraftPage({ apiClient: client });
    expect(typeof page.saveDraft).toBe('function');
  });

  it('creates draft page with default api client when apiClient is omitted', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"versions":[]}', { status: 200 }));
    const page = createDraftPage({ apiClientOptions: { fetchImpl } });
    const history = await page.loadHistory('s1');

    expect(history).toEqual([]);
  });

  it('creates draft page with fully default options', () => {
    const page = createDraftPage();
    expect(typeof page.loadLatestDraft).toBe('function');
  });

  it('uses provided editorView and historyView dependencies', async () => {
    const apiClient = {
      saveDraft: vi.fn(async () => ({ revision: 9, savedAt: '2026-01-01T00:00:00.000Z' })),
      getLatestDraft: vi.fn(async () => ({ revision: 9, metadata: { title: 'provided' }, files: [] })),
      listDraftVersions: vi.fn(async () => ({ versions: [{ versionId: 'v9' }] })),
      restoreDraftVersion: vi.fn(async () => ({ versionId: 'v10', revision: 10 }))
    };
    const editorView = {
      renderSavePending: vi.fn(() => ({ phase: 'pending-custom' })),
      renderSaveSuccess: vi.fn(() => ({ phase: 'saved-custom' })),
      renderSaveFailure: vi.fn(() => ({ phase: 'failed-custom' })),
      renderLoadedDraft: vi.fn(() => ({ phase: 'loaded-custom' }))
    };
    const historyView = {
      renderVersionTimeline: vi.fn(() => [{ id: 'custom' }]),
      renderRestoreResult: vi.fn(() => ({ phase: 'restored-custom' })),
      renderForbidden: vi.fn(() => ({ phase: 'forbidden-custom' }))
    };

    const page = createDraftPage({ apiClient, editorView, historyView });

    const saveResult = await page.saveDraft('s-custom', { baseRevision: 0, metadata: {} });
    expect(saveResult.pending.phase).toBe('pending-custom');
    expect(saveResult.result.phase).toBe('saved-custom');

    const loaded = await page.loadLatestDraft('s-custom');
    expect(loaded.phase).toBe('loaded-custom');

    const timeline = await page.loadHistory('s-custom');
    expect(timeline).toEqual([{ id: 'custom' }]);

    const restored = await page.restoreVersion('s-custom', 'v9', 9);
    expect(restored.phase).toBe('restored-custom');
  });
});
