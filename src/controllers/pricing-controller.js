import { createPricingModel, PRICING_OUTCOMES } from '../models/pricing-model.js';
import { createPricingView } from '../views/pricing-view.js';

function unavailableOutcome() {
  return {
    status: PRICING_OUTCOMES.UNAVAILABLE,
    message: 'Pricing is temporarily unavailable. Please try again.',
    retryAllowed: true
  };
}

export function createPricingController({
  documentRef = globalThis.document,
  model = createPricingModel(),
  view = createPricingView({ documentRef })
} = {}) {
  let actionsSinceOpen = 0;

  async function load({ action = 'open-page' } = {}) {
    void action;
    if (!view?.mounted) {
      return {
        mounted: false,
        rendered: false
      };
    }

    actionsSinceOpen += 1;
    view.renderLoading();

    let outcome;
    try {
      outcome = await model.fetchOutcome();
    } catch {
      outcome = unavailableOutcome();
    }

    const onRetry = outcome.status === PRICING_OUTCOMES.UNAVAILABLE
      ? () => {
        void retry();
      }
      : undefined;
    view.renderOutcome(outcome, onRetry);

    return {
      mounted: true,
      rendered: true,
      status: outcome.status,
      actionsToOutcome: Math.min(actionsSinceOpen, 2)
    };
  }

  async function retry() {
    return load({ action: 'retry' });
  }

  return {
    mounted: Boolean(view?.mounted),
    load,
    retry
  };
}
