function resolveMessage(reasonCode) {
  if (reasonCode === 'ACCESS_REVOKED') {
    return 'Access to this paper has been revoked. Already displayed content remains visible.';
  }

  if (reasonCode === 'ACCESS_NOT_ASSIGNED') {
    return 'You are not assigned to this paper.';
  }

  return 'Access to this paper is denied.';
}

export function renderAccessDeniedView({ reasonCode, message } = {}) {
  const resolvedMessage = message ?? resolveMessage(reasonCode);

  return {
    outcome: 'denied-revoked',
    reasonCode: reasonCode ?? 'ACCESS_REVOKED',
    message: resolvedMessage
  };
}
