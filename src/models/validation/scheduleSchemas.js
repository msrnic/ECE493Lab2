export function validateCreateScheduleRunRequest(payload) {
  if (typeof payload === 'undefined' || payload === null) {
    return { valid: true, data: {} };
  }

  if (typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, message: 'Request body must be an object.' };
  }

  const data = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'requestedByUserId')) {
    if (typeof payload.requestedByUserId !== 'string' || payload.requestedByUserId.trim() === '') {
      return { valid: false, message: 'requestedByUserId must be a non-empty string.' };
    }
    data.requestedByUserId = payload.requestedByUserId;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'notes')) {
    if (typeof payload.notes !== 'string' || payload.notes.length > 500) {
      return { valid: false, message: 'notes must be a string of 500 characters or less.' };
    }
    data.notes = payload.notes;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'simulateLongRunMs')) {
    const value = payload.simulateLongRunMs;
    if (!Number.isInteger(value) || value < 0 || value > 10000) {
      return { valid: false, message: 'simulateLongRunMs must be an integer between 0 and 10000.' };
    }
    data.simulateLongRunMs = value;
  }

  return { valid: true, data };
}

export function parseActiveOnly(value) {
  if (typeof value === 'undefined') {
    return false;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true' || value === '1') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  const error = new Error('activeOnly must be a boolean value.');
  error.code = 'VALIDATION_ERROR';
  throw error;
}
