export const PRICING_OUTCOMES = Object.freeze({
  DISPLAYED: 'pricing-displayed',
  MISSING: 'pricing-missing',
  UNAVAILABLE: 'pricing-temporarily-unavailable'
});

const ATTENDEE_TYPES = new Set(['standard', 'student', 'other']);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidCurrencyCode(value) {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}

function normalizeDiscount(discount, amountMinor) {
  if (!discount || typeof discount !== 'object') {
    return null;
  }

  if (!isNonEmptyString(discount.label)) {
    return null;
  }

  if (!Number.isInteger(discount.amountMinor) || discount.amountMinor < 0 || discount.amountMinor > amountMinor) {
    return null;
  }

  return {
    label: discount.label.trim(),
    amountMinor: discount.amountMinor
  };
}

function normalizePricingItem(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  if (!isNonEmptyString(item.itemId) || !isNonEmptyString(item.label)) {
    return null;
  }

  if (!ATTENDEE_TYPES.has(item.attendeeType)) {
    return null;
  }

  if (!Number.isInteger(item.amountMinor) || item.amountMinor < 0) {
    return null;
  }

  if (!Number.isInteger(item.displayOrder) || item.displayOrder < 0) {
    return null;
  }

  return {
    itemId: item.itemId.trim(),
    label: item.label.trim(),
    attendeeType: item.attendeeType,
    amountMinor: item.amountMinor,
    displayOrder: item.displayOrder,
    discount: normalizeDiscount(item.discount, item.amountMinor)
  };
}

function toUnavailableOutcome(message) {
  return {
    status: PRICING_OUTCOMES.UNAVAILABLE,
    message: isNonEmptyString(message)
      ? message.trim()
      : 'Pricing is temporarily unavailable. Please try again.',
    retryAllowed: true
  };
}

function toMissingOutcome(message) {
  return {
    status: PRICING_OUTCOMES.MISSING,
    message: isNonEmptyString(message)
      ? message.trim()
      : 'Pricing information is not available yet.',
    retryAllowed: false
  };
}

export function normalizePricingPayload(payload, { httpStatus = 200 } = {}) {
  if (httpStatus === 503) {
    return toUnavailableOutcome(payload?.message);
  }

  if (!payload || typeof payload !== 'object') {
    return toMissingOutcome();
  }

  if (payload.status === PRICING_OUTCOMES.UNAVAILABLE) {
    return toUnavailableOutcome(payload.message);
  }

  if (payload.status === PRICING_OUTCOMES.MISSING) {
    return toMissingOutcome(payload.message);
  }

  if (payload.status !== PRICING_OUTCOMES.DISPLAYED) {
    return toMissingOutcome();
  }

  if (!isValidCurrencyCode(payload.currencyCode)) {
    return toMissingOutcome();
  }

  if (!Array.isArray(payload.items)) {
    return toMissingOutcome();
  }

  const items = payload.items
    .map((item) => normalizePricingItem(item))
    .filter((item) => item !== null)
    .sort((left, right) => left.displayOrder - right.displayOrder);

  if (items.length === 0) {
    return toMissingOutcome();
  }

  return {
    status: PRICING_OUTCOMES.DISPLAYED,
    currencyCode: payload.currencyCode,
    items,
    retryAllowed: false
  };
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export function createPricingModel({ fetchImpl = globalThis.fetch, endpoint = '/api/public/pricing' } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetchImpl must be a function.');
  }

  async function fetchOutcome() {
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'GET',
        headers: {
          accept: 'application/json'
        }
      });
    } catch {
      return toUnavailableOutcome();
    }

    const payload = await readJson(response);

    if (response.status === 503) {
      return normalizePricingPayload(payload, { httpStatus: 503 });
    }

    if (!response.ok) {
      return toUnavailableOutcome(payload?.message);
    }

    return normalizePricingPayload(payload, { httpStatus: response.status });
  }

  return {
    endpoint,
    fetchOutcome
  };
}
