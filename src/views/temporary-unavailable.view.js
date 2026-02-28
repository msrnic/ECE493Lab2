export function renderTemporaryUnavailableView({ retryAfterSeconds } = {}) {
  if (typeof retryAfterSeconds === 'number') {
    return {
      outcome: 'throttled',
      reasonCode: 'TEMP_OUTAGE_THROTTLED',
      message: 'Retry temporarily limited during an outage.',
      retryAfterSeconds
    };
  }

  return {
    outcome: 'temporarily-unavailable',
    reasonCode: 'TEMPORARY_OUTAGE',
    message: 'Paper files are temporarily unavailable. Please retry.',
    immediateRetryAllowed: true
  };
}
