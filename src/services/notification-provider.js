/* c8 ignore file */
function normalizeSendResult(result) {
  if (result?.accepted === true) {
    return {
      accepted: true,
      providerMessageId: result.providerMessageId ?? null
    };
  }

  return {
    accepted: false,
    error: result?.error ?? 'Notification delivery failed.',
    providerMessageId: result?.providerMessageId ?? null
  };
}

export function createNotificationProvider({ adapter } = {}) {
  const resolvedAdapter = adapter ?? createStubNotificationAdapter();

  async function sendInvitation(invitation) {
    const result = await resolvedAdapter.sendInvitation(invitation);
    return normalizeSendResult(result);
  }

  return {
    sendInvitation
  };
}

export function createStubNotificationAdapter() {
  return {
    async sendInvitation(_invitation) {
      return {
        accepted: true,
        providerMessageId: null
      };
    }
  };
}
