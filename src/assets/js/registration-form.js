const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const NUMBER_PATTERN = /\d/;
const SYMBOL_PATTERN = /[^A-Za-z0-9]/;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderSuccessStatus(statusNode, payload) {
  const message = String(payload?.message ?? 'Registration successful.');
  const confirmationUrl = payload?.confirmationUrl;

  if (typeof confirmationUrl === 'string' && confirmationUrl.length > 0) {
    statusNode.innerHTML = `${escapeHtml(message)} <a href="${escapeHtml(confirmationUrl)}">Confirm account</a>`;
    return;
  }

  statusNode.textContent = message;
}

function nowMs(nowFn) {
  return typeof nowFn === 'function' ? nowFn() : Date.now();
}

export function validateClientRegistration(values) {
  const errors = [];
  const fullName = String(values.fullName ?? '').trim();
  const email = String(values.email ?? '').trim();
  const password = String(values.password ?? '');
  const confirmPassword = String(values.confirmPassword ?? '');

  if (!fullName) {
    errors.push({ field: 'fullName', message: 'Full name is required.' });
  }

  if (!email || !email.includes('@')) {
    errors.push({ field: 'email', message: 'Email format is invalid.' });
  }

  if (
    password.length < 12 ||
    !UPPERCASE_PATTERN.test(password) ||
    !LOWERCASE_PATTERN.test(password) ||
    !NUMBER_PATTERN.test(password) ||
    !SYMBOL_PATTERN.test(password)
  ) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.'
    });
  }

  if (confirmPassword !== password) {
    errors.push({ field: 'confirmPassword', message: 'Confirm password must match password.' });
  }

  return errors;
}

export function measureValidation(values, nowFn = () => performance.now()) {
  const startedAt = nowMs(nowFn);
  const errors = validateClientRegistration(values);
  const finishedAt = nowMs(nowFn);

  return {
    errors,
    durationMs: Math.max(0, finishedAt - startedAt)
  };
}

export function renderClientErrors(form, errors) {
  const slots = form.querySelectorAll('[data-error-for]');
  for (const slot of slots) {
    slot.textContent = '';
  }

  for (const error of errors) {
    const slot = form.querySelector(`[data-error-for="${error.field}"]`);
    if (slot) {
      slot.textContent = error.message;
    }
  }
}

export async function submitRegistrationRequest(values, { fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetchImpl must be provided');
  }

  const response = await fetchImpl('/api/registrations', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(values)
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {
      code: 'INVALID_RESPONSE',
      message: 'Unexpected response from server.'
    };
  }

  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

export function enhanceRegistrationForm({
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch,
  nowFn = () => performance.now()
} = {}) {
  if (!documentRef) {
    return null;
  }

  const form = documentRef.querySelector('[data-registration-form]');
  const statusNode = documentRef.querySelector('[data-registration-status]');
  if (!form || !statusNode) {
    return null;
  }

  const onSubmit = async (event) => {
    event.preventDefault();

    const values = Object.fromEntries(new FormData(form).entries());
    const validationResult = measureValidation(values, nowFn);
    form.dataset.validationDurationMs = String(validationResult.durationMs);
    renderClientErrors(form, validationResult.errors);

    if (validationResult.errors.length > 0) {
      statusNode.textContent = 'Please fix the highlighted fields.';
      return;
    }

    const result = await submitRegistrationRequest(values, { fetchImpl });
    if (result.ok) {
      renderSuccessStatus(statusNode, result.payload);
      form.reset();
      return;
    }

    if (Array.isArray(result.payload.errors)) {
      renderClientErrors(form, result.payload.errors);
    }

    statusNode.textContent = result.payload.message || 'Registration failed.';
  };

  form.addEventListener('submit', onSubmit);
  return { form, statusNode, onSubmit };
}
