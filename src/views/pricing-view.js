import { PRICING_OUTCOMES } from '../models/pricing-model.js';

const FALLBACK_CURRENCY = 'USD';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createCurrencyFormatter(currencyCode, locale = undefined) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatMinorAmount(amountMinor, currencyCode, {
  numberFormatFactory = createCurrencyFormatter,
  locale
} = {}) {
  const majorAmount = Number(amountMinor) / 100;
  const normalizedCurrencyCode = typeof currencyCode === 'string' && /^[A-Z]{3}$/.test(currencyCode)
    ? currencyCode
    : FALLBACK_CURRENCY;

  try {
    return numberFormatFactory(normalizedCurrencyCode, locale).format(majorAmount);
  } catch {
    return `${normalizedCurrencyCode} ${majorAmount.toFixed(2)}`;
  }
}

export function renderPricingItemsMarkup(items, currencyCode, options = {}) {
  return items.map((item) => {
    const itemAmount = formatMinorAmount(item.amountMinor, currencyCode, options);
    const discountMarkup = item.discount
      ? `<p data-pricing-discount>${escapeHtml(item.discount.label)}: ${escapeHtml(formatMinorAmount(item.discount.amountMinor, currencyCode, options))}</p>`
      : '';

    return `<li data-pricing-item="${escapeHtml(item.itemId)}">
      <p data-pricing-label>${escapeHtml(item.label)}</p>
      <p data-pricing-amount>${escapeHtml(itemAmount)}</p>
      ${discountMarkup}
    </li>`;
  }).join('');
}

export function createPricingView({
  documentRef = globalThis.document,
  numberFormatFactory = createCurrencyFormatter
} = {}) {
  const root = documentRef?.querySelector?.('[data-pricing-root]');
  const list = documentRef?.querySelector?.('[data-pricing-list]');
  const statusMessage = documentRef?.querySelector?.('[data-pricing-message]');
  const currencyLabel = documentRef?.querySelector?.('[data-pricing-currency]');
  const retryButton = documentRef?.querySelector?.('[data-pricing-retry]');
  const liveRegion = documentRef?.querySelector?.('[data-pricing-live]');

  if (!root || !list || !statusMessage || !currencyLabel || !retryButton || !liveRegion) {
    return {
      enhanced: false,
      renderLoading() {},
      renderOutcome() {},
      bindRetry() {
        return () => {};
      }
    };
  }

  const formatOptions = { numberFormatFactory };

  function announce(text) {
    liveRegion.textContent = text;
  }

  function hidePricingList() {
    list.innerHTML = '';
    currencyLabel.hidden = true;
  }

  function renderLoading() {
    root.dataset.state = 'loading';
    statusMessage.textContent = 'Loading pricing information.';
    retryButton.hidden = true;
    hidePricingList();
    announce('Loading pricing information.');
  }

  function renderOutcome(outcome) {
    const status = outcome?.status;

    if (status === PRICING_OUTCOMES.DISPLAYED) {
      root.dataset.state = PRICING_OUTCOMES.DISPLAYED;
      statusMessage.textContent = 'Pricing information is available.';
      currencyLabel.hidden = false;
      currencyLabel.textContent = `All prices shown in ${outcome.currencyCode}.`;
      list.innerHTML = renderPricingItemsMarkup(outcome.items, outcome.currencyCode, formatOptions);
      retryButton.hidden = true;
      announce('Pricing information is available.');
      return;
    }

    if (status === PRICING_OUTCOMES.TEMPORARILY_UNAVAILABLE) {
      root.dataset.state = PRICING_OUTCOMES.TEMPORARILY_UNAVAILABLE;
      statusMessage.textContent = outcome.message;
      retryButton.hidden = false;
      hidePricingList();
      announce(outcome.message);
      return;
    }

    root.dataset.state = PRICING_OUTCOMES.MISSING;
    statusMessage.textContent = outcome?.message ?? 'Pricing is currently unavailable.';
    retryButton.hidden = true;
    hidePricingList();
    announce(statusMessage.textContent);
  }

  function bindRetry(handler) {
    if (typeof handler !== 'function') {
      return () => {};
    }

    const clickHandler = (event) => {
      event.preventDefault();
      handler();
    };

    retryButton.addEventListener('click', clickHandler);

    return () => {
      retryButton.removeEventListener('click', clickHandler);
    };
  }

  return {
    enhanced: true,
    renderLoading,
    renderOutcome,
    bindRetry
  };
}
