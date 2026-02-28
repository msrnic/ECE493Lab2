import { DraftApiClient } from '../../controllers/draft-api-client.js';
import { createDraftEditorView } from '../../views/draft-editor-view.js';
import { createDraftHistoryView } from '../../views/draft-history-view.js';
import {
  hydrateSubmissionFileInput,
  hydrateSubmissionForm,
  readSubmissionFormValues
} from '../../views/submit-paper-view.js';

export function serializeDraftPayload(input) {
  const metadataValue = typeof input.metadata === 'string' ? input.metadata : JSON.stringify(input.metadata ?? {});
  return {
    baseRevision: Number(input.baseRevision ?? 0),
    metadata: metadataValue,
    files: input.files ?? [],
    removedFileIds: input.removedFileIds ?? []
  };
}

export function resolveDraftSubmissionId(form) {
  return String(form?.querySelector('[name="sessionId"]')?.value ?? '').trim();
}

export function extractDraftFileDescriptors(form) {
  const manuscriptInput = form?.querySelector('[name="manuscript"]');
  const files = Array.from(manuscriptInput?.files ?? []);

  return files.map((file) => {
    const restoredSize = Number(file?.draftSizeBytes);
    const sizeBytes = Number.isFinite(restoredSize) && restoredSize > 0
      ? restoredSize
      : Number(file.size ?? 0);
    const restoredChecksum = String(file?.draftChecksum ?? '').trim();
    const restoredStorageKey = String(file?.draftStorageKey ?? '').trim();

    return {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes,
      checksum: restoredChecksum || `${file.name}:${Number(file.size ?? 0)}:${file.lastModified ?? 0}`,
      storageKey: restoredStorageKey || `draft/${file.name}`
    };
  });
}

function setDraftStatus(statusNode, type, message) {
  statusNode.dataset.status = type;
  statusNode.textContent = message;
}

function renderHistoryList(listNode, timeline) {
  const documentRef = listNode.ownerDocument;
  listNode.replaceChildren();
  for (const version of timeline) {
    const item = documentRef.createElement('li');
    const label = documentRef.createElement('span');
    label.textContent = version.label;
    item.appendChild(label);

    const restoreButton = documentRef.createElement('button');
    restoreButton.type = 'button';
    restoreButton.dataset.draftRestoreVersion = version.versionId;
    restoreButton.textContent = 'Restore';
    item.appendChild(restoreButton);

    listNode.appendChild(item);
  }
}

export function createDraftPage(options = {}) {
  const apiClient = options.apiClient ?? new DraftApiClient(options.apiClientOptions ?? {});
  const editorView = options.editorView ?? createDraftEditorView();
  const historyView = options.historyView ?? createDraftHistoryView();

  return {
    async saveDraft(submissionId, formState) {
      const payload = serializeDraftPayload(formState);
      const pending = editorView.renderSavePending();

      try {
        const response = await apiClient.saveDraft(submissionId, payload);
        return {
          pending,
          result: editorView.renderSaveSuccess(response)
        };
      } catch (error) {
        return {
          pending,
          result: editorView.renderSaveFailure(error)
        };
      }
    },

    async loadLatestDraft(submissionId) {
      const payload = await apiClient.getLatestDraft(submissionId);
      return editorView.renderLoadedDraft(payload);
    },

    async loadHistory(submissionId) {
      const payload = await apiClient.listDraftVersions(submissionId);
      return historyView.renderVersionTimeline(payload.versions);
    },

    async restoreVersion(submissionId, versionId, baseRevision) {
      try {
        const payload = await apiClient.restoreDraftVersion(submissionId, versionId, { baseRevision });
        return historyView.renderRestoreResult(payload);
      } catch {
        return historyView.renderForbidden();
      }
    }
  };
}

export function bootstrapDraftPage({
  documentRef = globalThis.document,
  formRef,
  draftPage,
  apiClientOptions
} = {}) {
  const form = formRef ?? documentRef.querySelector('[data-submit-paper-form]');
  const sessionInput = form?.querySelector('[name="sessionId"]');
  const saveButton = documentRef.querySelector('[data-draft-save]');
  const loadButton = documentRef.querySelector('[data-draft-load]');
  const historyButton = documentRef.querySelector('[data-draft-history-refresh]');
  const statusNode = documentRef.querySelector('[data-draft-status]');
  const historyListNode = documentRef.querySelector('[data-draft-history-list]');

  if (!form || !sessionInput || !saveButton || !loadButton || !historyButton || !statusNode || !historyListNode) {
    return {
      enhanced: false
    };
  }

  const page = draftPage ?? createDraftPage({ apiClientOptions });
  let currentRevision = 0;
  const getSubmissionId = () => String(sessionInput.value).trim();

  async function loadLatestDraft() {
    const submissionId = getSubmissionId();
    if (!submissionId) {
      setDraftStatus(statusNode, 'error', 'Session ID is required for draft actions.');
      return;
    }

    try {
      const loaded = await page.loadLatestDraft(submissionId);
      currentRevision = Number(loaded.revision ?? 0);
      hydrateSubmissionForm(form, loaded.metadata);
      hydrateSubmissionFileInput(form, loaded.files);
      setDraftStatus(statusNode, 'success', `Loaded draft revision ${currentRevision}.`);
    } catch (error) {
      if (error?.code === 'DRAFT_NOT_FOUND') {
        setDraftStatus(statusNode, 'info', 'No saved draft exists yet.');
        return;
      }

      setDraftStatus(statusNode, 'error', error?.message ?? 'Unable to load latest draft.');
    }
  }

  async function refreshHistory() {
    const submissionId = getSubmissionId();
    if (!submissionId) {
      renderHistoryList(historyListNode, []);
      return;
    }

    try {
      const timeline = await page.loadHistory(submissionId);
      renderHistoryList(historyListNode, timeline);

      if (timeline.length === 0) {
        setDraftStatus(statusNode, 'info', 'No draft history is available yet.');
      }
    } catch (error) {
      setDraftStatus(statusNode, 'error', error?.message ?? 'Unable to load draft history.');
    }
  }

  saveButton.addEventListener('click', async () => {
    const submissionId = getSubmissionId();
    if (!submissionId) {
      setDraftStatus(statusNode, 'error', 'Session ID is required for draft actions.');
      return;
    }

    const formValues = readSubmissionFormValues(form);
    const formState = {
      baseRevision: currentRevision,
      metadata: formValues.metadata,
      files: extractDraftFileDescriptors(form)
    };

    const { pending, result } = await page.saveDraft(submissionId, formState);
    setDraftStatus(statusNode, 'info', pending.message);

    if (result.phase === 'saved') {
      currentRevision = Number(result.payload?.revision ?? currentRevision);
      setDraftStatus(statusNode, 'success', result.message);
      await refreshHistory();
      return;
    }

    const statusType = result.code === 'DRAFT_STALE' ? 'warning' : 'error';
    setDraftStatus(statusNode, statusType, result.message);
  });

  loadButton.addEventListener('click', async () => {
    await loadLatestDraft();
  });

  historyButton.addEventListener('click', async () => {
    await refreshHistory();
  });

  historyListNode.addEventListener('click', async (event) => {
    const restoreButton = event.target.closest('[data-draft-restore-version]');
    if (!restoreButton) {
      return;
    }

    const submissionId = getSubmissionId();
    if (!submissionId) {
      setDraftStatus(statusNode, 'error', 'Session ID is required for draft actions.');
      return;
    }

    const versionId = restoreButton.dataset.draftRestoreVersion;
    const restoreResult = await page.restoreVersion(submissionId, versionId, currentRevision);
    if (restoreResult.code === 'DRAFT_FORBIDDEN') {
      setDraftStatus(statusNode, 'error', restoreResult.message);
      return;
    }

    currentRevision = Number(restoreResult.revision ?? currentRevision);
    setDraftStatus(statusNode, 'success', restoreResult.message);
    await loadLatestDraft();
    await refreshHistory();
  });

  void loadLatestDraft();
  void refreshHistory();

  return {
    enhanced: true
  };
}
