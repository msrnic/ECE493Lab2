const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^tok_[A-Za-z0-9_-]{4,251}$/;

function createValidationError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = 422;
  error.details = details;
  return error;
}

export function validateUuid(value, fieldName) {
  if (!UUID_PATTERN.test(String(value ?? ''))) {
    throw createValidationError('VALIDATION_FAILED', `${fieldName} must be a valid UUID.`, { fieldName });
  }
}

export function validateIdempotencyKey(value) {
  const normalized = String(value ?? '').trim();
  if (normalized.length < 8 || normalized.length > 128) {
    throw createValidationError('VALIDATION_FAILED', 'Idempotency-Key must be between 8 and 128 characters.', {
      fieldName: 'Idempotency-Key'
    });
  }
  return normalized;
}

export function validatePaymentToken(value) {
  const normalized = String(value ?? '').trim();
  if (!TOKEN_PATTERN.test(normalized)) {
    throw createValidationError('VALIDATION_FAILED', 'paymentToken must be a gateway token reference.', {
      fieldName: 'paymentToken'
    });
  }
  return normalized;
}

export function assertTokenOnlyPayload(payload) {
  const forbiddenFields = ['cardNumber', 'pan', 'cvv', 'expiryMonth', 'expiryYear'];
  const foundField = forbiddenFields.find((field) => Object.hasOwn(payload ?? {}, field));
  if (foundField) {
    throw createValidationError(
      'PCI_SCOPE_VIOLATION',
      'Raw cardholder fields are not allowed in this system.',
      { fieldName: foundField }
    );
  }
}

export function readIdempotencyKey(headers = {}) {
  const lower = headers['idempotency-key'];
  const canonical = headers['Idempotency-Key'];
  return lower ?? canonical ?? null;
}

