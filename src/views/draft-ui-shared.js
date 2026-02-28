export function formatSaveTimestamp(isoValue) {
  if (!isoValue) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(new Date(isoValue));
}

export function mapOutcomeToClass(outcomeCode) {
  switch (outcomeCode) {
    case 'SUCCESS':
      return 'notice--success';
    case 'FAILED_STALE':
      return 'notice--warning';
    case 'FAILED_AUTH':
      return 'notice--error';
    default:
      return 'notice--error';
  }
}

export function buildStatusMessage(input) {
  const type = input?.type ?? 'error';

  if (type === 'success') {
    return `Draft saved (revision ${input.revision}) at ${formatSaveTimestamp(input.savedAt)}.`;
  }

  if (type === 'stale') {
    return 'Your draft is stale. Reload latest draft before saving again.';
  }

  if (type === 'auth') {
    return 'You are not authorized for this draft action.';
  }

  return input?.message ?? 'Draft was not saved due to a system error. Please retry.';
}
