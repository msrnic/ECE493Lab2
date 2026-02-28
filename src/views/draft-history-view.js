import { formatSaveTimestamp } from './draft-ui-shared.js';

export function createDraftHistoryView() {
  return {
    renderVersionTimeline(versions) {
      if (!versions?.length) {
        return [];
      }

      return versions.map((version) => ({
        versionId: version.versionId,
        label: `Revision ${version.revision} - ${formatSaveTimestamp(version.savedAt)}`,
        restoredFromVersionId: version.restoredFromVersionId ?? null
      }));
    },

    renderRestoreResult(response) {
      return {
        restoredVersionId: response.versionId,
        revision: response.revision,
        message: `Restored as revision ${response.revision}.`
      };
    },

    renderForbidden() {
      return {
        code: 'DRAFT_FORBIDDEN',
        message: 'You do not have permission for this action.'
      };
    }
  };
}
