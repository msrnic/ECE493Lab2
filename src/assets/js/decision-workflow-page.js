import { createEditorDecisionApiClient } from '../../controllers/editor-decision-controller.js';
import { DECISION_VIEW_STATUSES, renderDecisionView } from '../../views/editor-decision-view.js';

function mapErrorMessage(status, payload = {}) {
  const errorMessage = typeof payload.message === 'string' && payload.message.trim().length > 0
    ? payload.message.trim()
    : '';
  if (errorMessage) {
    return `Decision was not recorded. ${errorMessage}`;
  }

  if (status === 401) {
    return 'Decision was not recorded. Authentication is required.';
  }

  if (status === 409) {
    return 'Decision was not recorded. Reload and retry.';
  }

  return 'Decision was not recorded. Please retry.';
}

function buildDecisionCommand({ action, finalOutcome, expectedVersion }) {
  const normalizedAction = String(action).trim().toUpperCase();
  const normalizedVersion = Number(expectedVersion);

  if (!Number.isInteger(normalizedVersion) || normalizedVersion < 1) {
    return {
      error: 'Decision version is invalid. Reload the workflow.'
    };
  }

  if (normalizedAction === 'DEFER') {
    return {
      command: {
        action: 'DEFER',
        expectedVersion: normalizedVersion
      }
    };
  }

  if (normalizedAction !== 'FINAL') {
    return {
      error: 'Select a valid decision action.'
    };
  }

  const normalizedOutcome = String(finalOutcome).trim().toUpperCase();
  if (!normalizedOutcome) {
    return {
      error: 'Select a final outcome before saving.'
    };
  }

  return {
    command: {
      action: 'FINAL',
      finalOutcome: normalizedOutcome,
      expectedVersion: normalizedVersion
    }
  };
}

export async function bootstrapDecisionWorkflowPage({
  documentRef = globalThis.document,
  apiClient,
  fetchImpl = globalThis.fetch,
  idempotencyKeyFactory = () => `idempotency-${Date.now()}-${Math.random()}`
} = {}) {
  const root = documentRef?.querySelector?.('[data-decision-workflow-app]');
  const form = documentRef?.querySelector?.('[data-decision-form]');
  const paperIdInput = documentRef?.querySelector?.('[data-decision-paper-id]');
  const versionInput = documentRef?.querySelector?.('[data-decision-version]');
  const actionSelect = documentRef?.querySelector?.('[data-decision-action]');
  const outcomeSelect = documentRef?.querySelector?.('[data-decision-final-outcome]');

  if (!root || !form || !paperIdInput || !versionInput || !actionSelect || !outcomeSelect) {
    return { enhanced: false };
  }

  const client = apiClient || createEditorDecisionApiClient({ fetchImpl });
  let workflow = null;
  let currentState = {
    status: DECISION_VIEW_STATUSES.IDLE,
    message: ''
  };

  function render() {
    renderDecisionView({
      documentRef,
      workflow,
      state: currentState
    });
  }

  async function loadWorkflow() {
    const paperId = String(paperIdInput.value).trim();
    if (!paperId) {
      currentState = {
        status: DECISION_VIEW_STATUSES.ERROR,
        message: 'Select or enter a paper ID before loading the workflow.'
      };
      render();
      return { ok: false };
    }

    currentState = {
      status: DECISION_VIEW_STATUSES.LOADING,
      message: ''
    };
    render();

    let result;
    try {
      result = await client.loadWorkflow(paperId);
    } catch {
      currentState = {
        status: DECISION_VIEW_STATUSES.ERROR,
        message: 'Decision was not recorded. Unable to load workflow.'
      };
      render();
      return { ok: false };
    }

    if (!result.ok) {
      workflow = null;
      currentState = {
        status: DECISION_VIEW_STATUSES.ERROR,
        message: mapErrorMessage(result.status, result.payload)
      };
      render();
      return { ok: false };
    }

    workflow = result.payload;
    currentState = {
      status: workflow.decisionStatus === 'FINAL' ? DECISION_VIEW_STATUSES.READ_ONLY : DECISION_VIEW_STATUSES.IDLE,
      message: workflow.decisionStatus === 'FINAL'
        ? 'Final decision already exists. Use override workflow for changes.'
        : ''
    };
    render();
    return { ok: true };
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const paperId = String(paperIdInput.value).trim();

    if (!paperId) {
      currentState = {
        status: DECISION_VIEW_STATUSES.ERROR,
        message: 'Select or enter a paper ID before saving.'
      };
      render();
      return;
    }

    if (!workflow) {
      const loaded = await loadWorkflow();
      if (!loaded.ok) {
        return;
      }
    }

    const { command, error } = buildDecisionCommand({
      action: actionSelect.value,
      finalOutcome: outcomeSelect.value,
      expectedVersion: versionInput.value
    });

    if (error) {
      currentState = {
        status: DECISION_VIEW_STATUSES.ERROR,
        message: error
      };
      render();
      return;
    }

    currentState = {
      status: DECISION_VIEW_STATUSES.LOADING,
      message: ''
    };
    render();

    let result;
    try {
      result = await client.saveDecision(paperId, command, {
        idempotencyKey: idempotencyKeyFactory()
      });
    } catch {
      currentState = {
        status: DECISION_VIEW_STATUSES.ERROR,
        message: 'Decision was not recorded. Please retry.'
      };
      render();
      return;
    }

    if (!result.ok) {
      currentState = {
        status: DECISION_VIEW_STATUSES.ERROR,
        message: mapErrorMessage(result.status, result.payload)
      };
      render();
      return;
    }

    workflow = {
      ...workflow,
      ...result.payload,
      overrideWorkflowUrl: result.payload.decisionStatus === 'FINAL'
        ? `/override/papers/${encodeURIComponent(paperId)}`
        : null
    };
    currentState = {
      status: DECISION_VIEW_STATUSES.SUCCESS,
      message: 'Decision stored successfully.'
    };
    render();
    await loadWorkflow();
  });

  actionSelect.addEventListener('change', () => {
    render();
  });

  await loadWorkflow();

  return {
    enhanced: true,
    reloadWorkflow: loadWorkflow
  };
}
