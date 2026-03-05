import { createLaunchMockSchedulePayload } from '../../models/final-schedule-mock-data.js';
import { bootstrapFinalSchedulePage } from './final-schedule-page.js';

export async function bootstrapHomePage({
  documentRef = globalThis.document,
  payloadFactory = createLaunchMockSchedulePayload
} = {}) {
  return bootstrapFinalSchedulePage({
    documentRef,
    apiClient: async () => payloadFactory()
  });
}
