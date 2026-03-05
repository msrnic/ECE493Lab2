import { createFinalScheduleController } from '../../controllers/final-schedule-controller.js';

export async function bootstrapFinalSchedulePage({
  documentRef = globalThis.document,
  apiClient
} = {}) {
  const controller = createFinalScheduleController(
    typeof apiClient === 'function'
      ? { documentRef, apiClient }
      : { documentRef }
  );

  if (!controller.mounted) {
    return {
      enhanced: false,
      rendered: false
    };
  }

  const result = await controller.load({ action: 'open-page' });

  return {
    enhanced: true,
    rendered: result.rendered,
    status: result.status,
    actionsToOutcome: result.actionsToOutcome
  };
}
