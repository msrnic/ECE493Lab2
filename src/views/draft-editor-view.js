import { buildStatusMessage } from './draft-ui-shared.js';

export function createDraftEditorView() {
  return {
    renderSavePending() {
      return {
        phase: 'saving',
        message: 'Saving draft...'
      };
    },

    renderSaveSuccess(response) {
      return {
        phase: 'saved',
        message: buildStatusMessage({
          type: 'success',
          revision: response.revision,
          savedAt: response.savedAt
        }),
        payload: response
      };
    },

    renderSaveFailure(errorResponse) {
      const code = errorResponse?.code;
      const type = code === 'DRAFT_STALE' ? 'stale' : code === 'DRAFT_FORBIDDEN' ? 'auth' : 'error';

      return {
        phase: 'error',
        code,
        reloadRequired: Boolean(errorResponse?.reloadRequired),
        message: buildStatusMessage({ type, message: errorResponse?.message })
      };
    },

    renderLoadedDraft(payload) {
      return {
        phase: 'loaded',
        revision: payload.revision,
        metadata: payload.metadata ?? {},
        files: payload.files ?? []
      };
    }
  };
}
