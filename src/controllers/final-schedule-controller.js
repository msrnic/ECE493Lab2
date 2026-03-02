import { normalizeFinalSchedule } from '../models/final-schedule-model.js';
import { fetchFinalSchedule } from '../services/final-schedule-api.js';
import { renderError, renderFinalSchedule, renderLoading } from '../views/final-schedule-view.js';

export function createFinalScheduleController({
  container,
  fetchImpl = fetch,
  apiUrl = '/api/final-schedule',
  viewerTimeZone
} = {}) {
  if (!container) {
    throw new Error('container is required to create final schedule controller');
  }

  let postLoginActionCount = 0;
  let wasAuthenticatedOnPreviousLoad = false;

  function resetPostLoginActionCount() {
    postLoginActionCount = 0;
  }

  function incrementPostLoginActionCount() {
    postLoginActionCount += 1;
  }

  async function load() {
    renderLoading(container);

    try {
      const payload = await fetchFinalSchedule({ fetchImpl, url: apiUrl });
      const schedule = normalizeFinalSchedule(payload, { viewerTimeZone });

      if (schedule.viewerContext.isAuthenticated) {
        if (!wasAuthenticatedOnPreviousLoad) {
          resetPostLoginActionCount();
        }

        incrementPostLoginActionCount();
        wasAuthenticatedOnPreviousLoad = true;
      } else {
        wasAuthenticatedOnPreviousLoad = false;
        resetPostLoginActionCount();
      }

      renderFinalSchedule(container, schedule, {
        withinPostLoginActionWindow: postLoginActionCount <= 2
      });

      return schedule;
    } catch (error) {
      wasAuthenticatedOnPreviousLoad = false;
      resetPostLoginActionCount();
      renderError(container, error instanceof Error ? error.message : 'Unable to load final schedule.');
      return null;
    }
  }

  return {
    load,
    getPostLoginActionCount: () => postLoginActionCount,
    resetPostLoginActionCount
  };
}
