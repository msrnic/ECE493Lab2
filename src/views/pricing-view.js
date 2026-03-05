import { PRICING_OUTCOMES } from '../models/pricing-model.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatCurrency(amountMinor, currencyCode, { locale = 'en-CA' } = {}) {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode
  });

  return formatter.format(amountMinor / 100);
}

export function renderLoadingState(root, liveRegion) {
  if (!root) {
    return;
  }

  root.innerHTML = '<p data-pricing-status>Loading conference pricing...</p>';
  if (liveRegion) {
    liveRegion.textContent = 'Loading conference pricing.';
  }
}

function renderDisplayedState(root, outcome, { locale }) {
  const rows = outcome.items
    .map((item) => {
      const priceLabel = formatCurrency(item.amountMinor, outcome.currencyCode, { locale });
      const discountMarkup = item.discount
        ? `<p data-pricing-discount>
            ${escapeHtml(item.discount.label)}: ${escapeHtml(formatCurrency(item.discount.amountMinor, outcome.currencyCode, { locale }))}
          </p>`
        : '';

      return `<li class="pricing-view__item" data-pricing-item>
        <span data-pricing-item-label>${escapeHtml(item.label)}</span>
        <span data-pricing-item-amount>${escapeHtml(priceLabel)}</span>
        ${discountMarkup}
      </li>`;
    })
    .join('');

  root.innerHTML = `
    <section data-pricing-displayed>
      <p data-pricing-currency>Currency: ${escapeHtml(outcome.currencyCode)}</p>
      <ul data-pricing-item-list>
        ${rows}
      </ul>
    </section>
  `;
}

function renderMissingState(root, outcome) {
  root.innerHTML = `
    <section data-pricing-missing>
      <p data-pricing-info>${escapeHtml(outcome.message)}</p>
    </section>
  `;
}

function renderUnavailableState(root, outcome, onRetry) {
  root.innerHTML = `
    <section data-pricing-unavailable>
      <p data-pricing-info>${escapeHtml(outcome.message)}</p>
      <button type="button" data-pricing-retry>Try Again</button>
    </section>
  `;

  const retryButton = root.querySelector('[data-pricing-retry]');
  if (retryButton && typeof onRetry === 'function') {
    retryButton.onclick = () => {
      onRetry();
    };
  }
}

export function renderPricingOutcome(root, outcome, {
  liveRegion = null,
  onRetry,
  locale = 'en-CA'
} = {}) {
  if (!root) {
    return;
  }

  if (outcome.status === PRICING_OUTCOMES.DISPLAYED) {
    renderDisplayedState(root, outcome, { locale });
    if (liveRegion) {
      liveRegion.textContent = 'Pricing details are available.';
    }
    return;
  }

  if (outcome.status === PRICING_OUTCOMES.MISSING) {
    renderMissingState(root, outcome);
    if (liveRegion) {
      liveRegion.textContent = outcome.message;
    }
    return;
  }

  renderUnavailableState(root, outcome, onRetry);
  if (liveRegion) {
    liveRegion.textContent = outcome.message;
  }
}

export function createPricingView({
  documentRef = globalThis.document,
  rootSelector = '[data-pricing-root]',
  liveRegionSelector = '[data-pricing-live-region]',
  locale = 'en-CA'
} = {}) {
  const root = documentRef?.querySelector?.(rootSelector) ?? null;
  const liveRegion = documentRef?.querySelector?.(liveRegionSelector) ?? null;

  return {
    mounted: Boolean(root),
    renderLoading: () => renderLoadingState(root, liveRegion),
    renderOutcome: (outcome, onRetry) => renderPricingOutcome(root, outcome, {
      liveRegion,
      onRetry,
      locale
    })
  };
}
