import { fetchPricingOutcome, PRICING_OUTCOMES } from '../models/pricing-model.js';

const FALLBACK_TEMPORARY_OUTCOME = {
  status: PRICING_OUTCOMES.TEMPORARILY_UNAVAILABLE,
  message: 'Pricing is temporarily unavailable. Please try again.',
  retryAllowed: true
};

export function createPricingController({
  view,
  fetchOutcome = fetchPricingOutcome
} = {}) {
  if (!view || typeof view.renderLoading !== 'function' || typeof view.renderOutcome !== 'function') {
    throw new Error('view with renderLoading and renderOutcome is required');
  }

  if (typeof fetchOutcome !== 'function') {
    throw new Error('fetchOutcome must be provided');
  }

  let inFlightRequest = null;

  function loadPricing() {
    if (inFlightRequest) {
      return inFlightRequest;
    }

    view.renderLoading();

    let pendingOutcome;
    try {
      pendingOutcome = Promise.resolve(fetchOutcome());
    } catch {
      pendingOutcome = Promise.reject(new Error('fetchOutcome failed'));
    }

    inFlightRequest = pendingOutcome
      .then((outcome) => {
        view.renderOutcome(outcome);
        return outcome;
      })
      .catch(() => {
        view.renderOutcome(FALLBACK_TEMPORARY_OUTCOME);
        return FALLBACK_TEMPORARY_OUTCOME;
      });

    inFlightRequest.finally(() => {
      if (inFlightRequest) {
        inFlightRequest = null;
      }
    });

    return inFlightRequest;
  }

  const unbindRetry = typeof view.bindRetry === 'function'
    ? view.bindRetry(() => {
      void loadPricing();
    })
    : () => {};

  return {
    initialize: loadPricing,
    retry: loadPricing,
    destroy() {
      unbindRetry();
    }
  };
}
