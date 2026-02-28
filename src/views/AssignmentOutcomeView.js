import { renderViewState } from './ViewStateRenderer.js';

function formatInvitationStatus(invitation) {
  if (invitation.status === 'failed_terminal') {
    return `${invitation.status} (follow-up required)`;
  }

  if (invitation.status === 'retry_scheduled' && invitation.nextRetryAt) {
    return `${invitation.status} (next: ${invitation.nextRetryAt})`;
  }

  return invitation.status;
}

export function createAssignmentOutcomeView({ documentRef } = {}) {
  const banner = documentRef?.querySelector('[data-outcome-banner]') ?? null;
  const list = documentRef?.querySelector('[data-outcome-list]') ?? null;

  function renderOutcome(outcome) {
    if (!list) {
      return;
    }

    list.innerHTML = '';
    for (const reviewer of outcome.assignedReviewers ?? []) {
      const item = list.ownerDocument.createElement('li');
      item.textContent = `${reviewer.displayName}: ${formatInvitationStatus(reviewer.invitation)}`;
      list.appendChild(item);
    }

    renderViewState(banner, {
      status: outcome.followUpRequired ? 'warning' : 'success',
      message: outcome.message ?? ''
    });
  }

  return {
    renderOutcome
  };
}
