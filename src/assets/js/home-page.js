import { createLaunchMockSchedulePayload } from '../../models/final-schedule-mock-data.js';
import { bootstrapFinalSchedulePage } from './final-schedule-page.js';
import { bootstrapPricingPage } from './pricing-page.js';

export async function bootstrapHomePage({
  documentRef = globalThis.document,
  payloadFactory = createLaunchMockSchedulePayload
} = {}) {
  const [schedulePreview, pricingPreview] = await Promise.all([
    bootstrapFinalSchedulePage({
      documentRef,
      apiClient: async () => payloadFactory()
    }),
    bootstrapPricingPage({
      documentRef
    })
  ]);

  const enhanced = Boolean(schedulePreview?.enhanced || pricingPreview?.enhanced);
  if (!enhanced) {
    return {
      enhanced: false,
      rendered: false,
      schedulePreview,
      pricingPreview
    };
  }

  return {
    enhanced: true,
    rendered: Boolean(schedulePreview?.rendered || pricingPreview?.rendered),
    schedulePreview,
    pricingPreview
  };
}
