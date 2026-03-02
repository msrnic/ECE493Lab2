export const PRICING_OUTCOMES = Object.freeze({
  DISPLAYED: 'pricing-displayed',
  MISSING: 'pricing-missing',
  TEMPORARILY_UNAVAILABLE: 'pricing-temporarily-unavailable'
});

const DEFAULT_MESSAGES = Object.freeze({
  missing: 'Pricing is currently unavailable.',
  temporary: 'Pricing is temporarily unavailable. Please try again.'
});

const VALID_ATTENDEE_TYPES = new Set(['standard', 'student', 'other']);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function normalizeDiscount(discount, amountMinor) {
  if (!isObject(discount)) {
    return null;
  }

  const label = nonEmptyString(discount.label);
  const discountAmount = nonNegativeInteger(discount.amountMinor);
  if (!label || discountAmount === null || discountAmount > amountMinor) {
    return null;
  }

  return {
    label,
    amountMinor: discountAmount
  };
}

function normalizeItem(item) {
  if (!isObject(item)) {
    return null;
  }

  const itemId = nonEmptyString(item.itemId);
  const label = nonEmptyString(item.label);
  const attendeeType = nonEmptyString(item.attendeeType);
  const amountMinor = nonNegativeInteger(item.amountMinor);
  const displayOrder = nonNegativeInteger(item.displayOrder ?? 0);

  if (!itemId || !label || !attendeeType || !VALID_ATTENDEE_TYPES.has(attendeeType) || amountMinor === null || displayOrder === null) {
    return null;
  }

  return {
    itemId,
    label,
    attendeeType,
    amountMinor,
    displayOrder,
    discount: normalizeDiscount(item.discount, amountMinor)
  };
}

function normalizeDisplayedOutcome(payload) {
  const currencyCode = nonEmptyString(payload?.currencyCode)?.toUpperCase() ?? '';
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return null;
  }

  const normalizedItems = (Array.isArray(payload.items) ? payload.items : [])
    .map((item) => normalizeItem(item))
    .filter(Boolean)
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map(({ displayOrder: _displayOrder, ...item }) => item);

  if (normalizedItems.length === 0) {
    return null;
  }

  return {
    status: PRICING_OUTCOMES.DISPLAYED,
    currencyCode,
    items: normalizedItems
  };
}

function normalizeMissingOutcome(payload) {
  return {
    status: PRICING_OUTCOMES.MISSING,
    message: nonEmptyString(payload?.message) ?? DEFAULT_MESSAGES.missing
  };
}

function normalizeTemporarilyUnavailableOutcome(payload) {
  return {
    status: PRICING_OUTCOMES.TEMPORARILY_UNAVAILABLE,
    message: nonEmptyString(payload?.message) ?? DEFAULT_MESSAGES.temporary,
    retryAllowed: true
  };
}

function parseJsonSafe(response) {
  if (!response || typeof response.json !== 'function') {
    return Promise.resolve({});
  }

  return response.json().catch(() => ({}));
}

export async function fetchPricingOutcome({
  endpoint = '/api/public/pricing',
  fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetchImpl must be provided');
  }

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: {
        accept: 'application/json'
      }
    });
  } catch {
    return normalizeTemporarilyUnavailableOutcome();
  }

  const payload = await parseJsonSafe(response);

  if (response.status === 503 || payload?.status === PRICING_OUTCOMES.TEMPORARILY_UNAVAILABLE) {
    return normalizeTemporarilyUnavailableOutcome(payload);
  }

  if (payload?.status === PRICING_OUTCOMES.DISPLAYED) {
    return normalizeDisplayedOutcome(payload) ?? normalizeMissingOutcome();
  }

  if (payload?.status === PRICING_OUTCOMES.MISSING || response.ok) {
    return normalizeMissingOutcome(payload);
  }

  return normalizeTemporarilyUnavailableOutcome(payload);
}
