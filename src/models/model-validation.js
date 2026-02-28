function describeAllowedValues(values) {
  return values.map((value) => `'${value}'`).join(', ');
}

export function assertObject(value, fieldName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }

  return value;
}

export function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return value;
}

export function assertEnum(value, fieldName, allowedValues) {
  assertNonEmptyString(value, fieldName);
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of ${describeAllowedValues(allowedValues)}`);
  }

  return value;
}

export function assertArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }

  return value;
}

export function assertInteger(value, fieldName, { min } = {}) {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`);
  }

  if (min !== undefined && value < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }

  return value;
}

export function assertIsoDateString(value, fieldName, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new Error(`${fieldName} must be an ISO-8601 datetime string`);
    }

    return null;
  }

  assertNonEmptyString(value, fieldName);
  const epoch = Date.parse(value);
  if (Number.isNaN(epoch)) {
    throw new Error(`${fieldName} must be an ISO-8601 datetime string`);
  }

  return new Date(epoch).toISOString();
}

export function normalizeStringArray(value, fieldName) {
  assertArray(value, fieldName);
  return value.map((entry, index) => assertNonEmptyString(entry, `${fieldName}[${index}]`));
}

export function cloneRecord(value) {
  return structuredClone(value);
}
