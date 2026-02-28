/* c8 ignore file */
const fields = {
  invitationId: document.querySelector('[data-field="invitation-id"]'),
  assignmentId: document.querySelector('[data-field="assignment-id"]'),
  paperId: document.querySelector('[data-field="paper-id"]'),
  reviewerId: document.querySelector('[data-field="reviewer-id"]'),
  status: document.querySelector('[data-field="status"]'),
  retryCount: document.querySelector('[data-field="retry-count"]'),
  maxRetries: document.querySelector('[data-field="max-retries"]'),
  nextRetryAt: document.querySelector('[data-field="next-retry-at"]'),
  lastFailureReason: document.querySelector('[data-field="last-failure-reason"]'),
  followUpRequired: document.querySelector('[data-field="follow-up-required"]')
};

const errorElement = document.querySelector('[data-role="error"]');

function setField(field, value) {
  if (field) {
    field.textContent = value ?? '-';
  }
}

function showError(message) {
  if (!errorElement) {
    return;
  }

  errorElement.hidden = false;
  errorElement.textContent = message;
}

async function loadInvitationStatus() {
  const params = new URLSearchParams(window.location.search);
  const invitationId = params.get('invitationId');
  if (!invitationId) {
    showError('Missing invitationId query parameter.');
    return;
  }

  try {
    const response = await fetch(`/api/review-invitations/${encodeURIComponent(invitationId)}`);
    const payload = await response.json();

    if (!response.ok) {
      showError(payload?.message ?? 'Unable to load invitation status.');
      return;
    }

    setField(fields.invitationId, payload.id);
    setField(fields.assignmentId, payload.reviewerAssignmentId);
    setField(fields.paperId, payload.paperId);
    setField(fields.reviewerId, payload.reviewerId);
    setField(fields.status, payload.status);
    setField(fields.retryCount, String(payload.retryCount));
    setField(fields.maxRetries, String(payload.maxRetries));
    setField(fields.nextRetryAt, payload.nextRetryAt ?? '-');
    setField(fields.lastFailureReason, payload.lastFailureReason ?? '-');
    setField(fields.followUpRequired, payload.followUpRequired ? 'Yes' : 'No');
  } catch {
    showError('Unable to load invitation status.');
  }
}

void loadInvitationStatus();
