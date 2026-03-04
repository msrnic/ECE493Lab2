import { normalizeFinalSchedulePayload } from '../models/final-schedule-model.js';
import { fetchFinalSchedulePayload } from '../services/final-schedule-api.js';
import {
  renderErrorState,
  renderFinalSchedule,
  renderLoadingState
} from '../views/final-schedule-view.js';

function resolveBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
}

export function createFinalScheduleController({
  documentRef = globalThis.document,
  apiClient = fetchFinalSchedulePayload,
  modelNormalizer = normalizeFinalSchedulePayload,
  rootSelector = '[data-final-schedule-root]'
} = {}) {
  const root = documentRef?.querySelector?.(rootSelector) ?? null;
  let actionsSinceEntry = 0;

  async function load({ action = 'open-page' } = {}) {
    void action;
    if (!root) {
      return {
        mounted: false,
        rendered: false
      };
    }

    actionsSinceEntry += 1;
    renderLoadingState(root);

    let payload;
    try {
      payload = await apiClient();
    } catch (error) {
      renderErrorState(root, error.message);
      return {
        mounted: true,
        rendered: false,
        error: error.message
      };
    }

    let viewModel;
    try {
      viewModel = modelNormalizer(payload, {
        browserTimeZone: resolveBrowserTimeZone()
      });
    } catch (error) {
      renderErrorState(root, error.message);
      return {
        mounted: true,
        rendered: false,
        error: error.message
      };
    }

    const actionsToOutcome = Math.min(actionsSinceEntry, 2);
    renderFinalSchedule(root, {
      ...viewModel,
      actionsToOutcome
    });

    return {
      mounted: true,
      rendered: true,
      status: viewModel.status,
      actionsToOutcome
    };
  }

  return {
    mounted: Boolean(root),
    load,
    refresh: () => load({ action: 'refresh' })
  };
}
