export const DECISION_VIEW_STATUSES = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  READ_ONLY: 'read-only'
});

const ALLOWED_VIEW_STATUSES = new Set(Object.values(DECISION_VIEW_STATUSES));

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function defaultMessageForStatus(status) {
  if (status === DECISION_VIEW_STATUSES.LOADING) {
    return 'Loading decision workflow...';
  }

  if (status === DECISION_VIEW_STATUSES.SUCCESS) {
    return 'Decision stored successfully.';
  }

  if (status === DECISION_VIEW_STATUSES.ERROR) {
    return 'Decision was not recorded. Please retry.';
  }

  if (status === DECISION_VIEW_STATUSES.READ_ONLY) {
    return 'Final decision already exists. Use override workflow for changes.';
  }

  return '';
}

export function normalizeDecisionViewState(state = {}) {
  const requestedStatus = typeof state.status === 'string' ? state.status.trim().toLowerCase() : DECISION_VIEW_STATUSES.IDLE;
  const status = ALLOWED_VIEW_STATUSES.has(requestedStatus)
    ? requestedStatus
    : DECISION_VIEW_STATUSES.ERROR;
  const message = typeof state.message === 'string' && state.message.trim().length > 0
    ? state.message.trim()
    : defaultMessageForStatus(status);
  const readOnly = status === DECISION_VIEW_STATUSES.READ_ONLY || state.readOnly === true;

  return {
    status,
    message,
    readOnly
  };
}

export function renderEvaluationsList(container, evaluations) {
  if (!container) {
    return;
  }

  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    container.innerHTML = '<p data-decision-evaluations-empty>No completed evaluations available.</p>';
    return;
  }

  container.innerHTML = `<ul data-decision-evaluations-list>${evaluations
    .map((evaluation) => {
      return `<li data-decision-evaluation>
  <span data-decision-evaluation-id>${escapeHtml(evaluation.evaluationId)}</span>
  <span data-decision-evaluation-reviewer>${escapeHtml(evaluation.reviewerId)}</span>
  <span data-decision-evaluation-recommendation>${escapeHtml(evaluation.recommendation)}</span>
</li>`;
    })
    .join('')}</ul>`;
}

export function renderDecisionView({
  documentRef = globalThis.document,
  workflow = null,
  state = {}
} = {}) {
  const root = documentRef?.querySelector?.('[data-decision-workflow-app]');
  const statusElement = documentRef?.querySelector?.('[data-decision-status]');
  const evaluationsElement = documentRef?.querySelector?.('[data-decision-evaluations]');
  const currentStateElement = documentRef?.querySelector?.('[data-decision-current-state]');
  const actionSelect = documentRef?.querySelector?.('[data-decision-action]');
  const outcomeSelect = documentRef?.querySelector?.('[data-decision-final-outcome]');
  const saveButton = documentRef?.querySelector?.('[data-decision-save]');
  const paperIdInput = documentRef?.querySelector?.('[data-decision-paper-id]');
  const versionInput = documentRef?.querySelector?.('[data-decision-version]');
  const overrideLink = documentRef?.querySelector?.('[data-decision-override-link]');

  if (
    !root
    || !statusElement
    || !evaluationsElement
    || !currentStateElement
    || !actionSelect
    || !outcomeSelect
    || !saveButton
    || !paperIdInput
    || !versionInput
    || !overrideLink
  ) {
    return { rendered: false };
  }

  const normalizedState = normalizeDecisionViewState(state);
  root.dataset.viewState = normalizedState.status;
  statusElement.dataset.state = normalizedState.status;
  statusElement.textContent = normalizedState.message;

  if (workflow && typeof workflow === 'object') {
    paperIdInput.value = String(workflow.paperId ?? '');
    versionInput.value = String(workflow.decisionVersion ?? '');
    currentStateElement.textContent = workflow.decisionStatus === 'FINAL'
      ? `Current decision: ${workflow.finalOutcome}`
      : 'Current decision: UNDECIDED';
    renderEvaluationsList(evaluationsElement, workflow.evaluations);

    if (workflow.decisionStatus === 'FINAL') {
      actionSelect.value = 'FINAL';
      outcomeSelect.value = String(workflow.finalOutcome ?? '');
      if (workflow.overrideWorkflowUrl) {
        overrideLink.hidden = false;
        overrideLink.href = workflow.overrideWorkflowUrl;
      } else {
        overrideLink.hidden = true;
      }
    } else {
      overrideLink.hidden = true;
      if (actionSelect.value !== 'FINAL' && actionSelect.value !== 'DEFER') {
        actionSelect.value = 'DEFER';
      }
    }
  }

  const disableInputs = normalizedState.status === DECISION_VIEW_STATUSES.LOADING || normalizedState.readOnly;
  actionSelect.disabled = disableInputs;
  saveButton.disabled = disableInputs;
  outcomeSelect.disabled = disableInputs || actionSelect.value !== 'FINAL';

  return {
    rendered: true,
    readOnly: disableInputs
  };
}
