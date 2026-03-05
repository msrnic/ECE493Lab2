import { createPricingController } from '../../controllers/pricing-controller.js';

export async function bootstrapPricingPage({ documentRef = globalThis.document } = {}) {
  const controller = createPricingController({ documentRef });

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
