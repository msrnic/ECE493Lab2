function normalizeDigits(value) {
  return String(value ?? '').replaceAll(/\s+/g, '');
}

function parseExpiry(value) {
  const normalized = String(value ?? '').trim();
  const match = normalized.match(/^(\d{2})\s*\/\s*(\d{2}|\d{4})$/);
  if (!match) {
    return null;
  }
  const month = Number(match[1]);
  if (month < 1 || month > 12) {
    return null;
  }
  const year = match[2].length === 2 ? Number(`20${match[2]}`) : Number(match[2]);
  return { month, year };
}

function setFieldError(errorNode, message) {
  if (!errorNode) {
    return;
  }
  errorNode.hidden = !message;
  errorNode.textContent = message;
}

export function validatePaymentFields(payload) {
  const errors = {};
  const cardNumberDigits = normalizeDigits(payload.cardNumber);
  if (!/^\d{16}$/.test(cardNumberDigits)) {
    errors.cardNumber = 'Card number must be exactly 16 digits.';
  }

  const expiry = parseExpiry(payload.expiry);
  if (!expiry) {
    errors.expiry = 'Expiry must be in MM/YYYY format with a valid month.';
  }

  const securityNumberDigits = normalizeDigits(payload.securityNumber);
  if (!/^\d{3}$/.test(securityNumberDigits)) {
    errors.securityNumber = 'Security number must be exactly 3 digits.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function bindPaymentView({
  form = null,
  statusNode = null,
  cardNumberErrorNode = null,
  expiryErrorNode = null,
  securityNumberErrorNode = null
} = {}) {
  const resolvedForm = form ?? (typeof document !== 'undefined'
    ? document.querySelector('[data-payment-form]')
    : null);
  const resolvedStatusNode = statusNode ?? (typeof document !== 'undefined'
    ? document.querySelector('[data-payment-status]')
    : null);
  const resolvedCardNumberErrorNode = cardNumberErrorNode ?? (typeof document !== 'undefined'
    ? document.querySelector('[data-payment-error="cardNumber"]')
    : null);
  const resolvedExpiryErrorNode = expiryErrorNode ?? (typeof document !== 'undefined'
    ? document.querySelector('[data-payment-error="expiry"]')
    : null);
  const resolvedSecurityNumberErrorNode = securityNumberErrorNode ?? (typeof document !== 'undefined'
    ? document.querySelector('[data-payment-error="securityNumber"]')
    : null);

  if (!resolvedForm) {
    return { detach: () => {} };
  }

  const FormDataCtor = resolvedForm.ownerDocument?.defaultView?.FormData ?? FormData;
  const onSubmit = (event) => {
    event.preventDefault();
    const formData = new FormDataCtor(resolvedForm);
    const payload = {
      cardNumber: formData.get('cardNumber'),
      expiry: formData.get('expiry'),
      securityNumber: formData.get('securityNumber')
    };

    const validation = validatePaymentFields(payload);
    setFieldError(resolvedCardNumberErrorNode, validation.errors.cardNumber ?? '');
    setFieldError(resolvedExpiryErrorNode, validation.errors.expiry ?? '');
    setFieldError(resolvedSecurityNumberErrorNode, validation.errors.securityNumber ?? '');

    if (!resolvedStatusNode) {
      return;
    }

    if (!validation.valid) {
      resolvedStatusNode.textContent = 'Payment failed. Please correct the highlighted field(s).';
      return;
    }

    resolvedStatusNode.textContent = 'Payment success. Your registration is complete.';
  };

  resolvedForm.addEventListener('submit', onSubmit);

  return {
    detach() {
      resolvedForm.removeEventListener('submit', onSubmit);
    }
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  bindPaymentView();
}

