import { createPricingController } from '../../controllers/pricing-controller.js';
import { fetchPricingOutcome } from '../../models/pricing-model.js';
import { createPricingView } from '../../views/pricing-view.js';

export async function bootstrapPricingPage({
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch
} = {}) {
  const view = createPricingView({ documentRef });

  if (!view.enhanced) {
    return { enhanced: false };
  }

  const controller = createPricingController({
    view,
    fetchOutcome: () => fetchPricingOutcome({ fetchImpl })
  });

  await controller.initialize();

  return {
    enhanced: true,
    controller
  };
}

export function registerPricingPageOnLoad({
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  fetchImpl = globalThis.fetch,
  bootstrapFn = bootstrapPricingPage
} = {}) {
  if (!documentRef || typeof bootstrapFn !== 'function') {
    return;
  }

  const runBootstrap = () => {
    void bootstrapFn({
      documentRef,
      fetchImpl
    });
  };

  if (documentRef.readyState === 'loading' && windowRef && typeof windowRef.addEventListener === 'function') {
    windowRef.addEventListener('DOMContentLoaded', runBootstrap, { once: true });
    return;
  }

  runBootstrap();
}
