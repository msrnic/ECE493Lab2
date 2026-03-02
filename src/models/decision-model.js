export const DECISION_STATUSES = Object.freeze({
  UNDECIDED: 'UNDECIDED',
  FINAL: 'FINAL'
});

export const DECISION_ACTIONS = Object.freeze({
  DEFER: 'DEFER',
  FINAL: 'FINAL'
});

export const FINAL_OUTCOMES = Object.freeze({
  ACCEPT: 'ACCEPT',
  REJECT: 'REJECT',
  REVISE: 'REVISE'
});

export const DECISION_ERROR_CODES = Object.freeze({
  DENIED_UNASSIGNED: 'DENIED_UNASSIGNED',
  DENIED_IMMUTABLE: 'DENIED_IMMUTABLE',
  DENIED_CONFLICT: 'DENIED_CONFLICT',
  DENIED_PRECONDITION: 'DENIED_PRECONDITION',
  DENIED_INVALID: 'DENIED_INVALID'
});

const ALLOWED_ACTIONS = new Set(Object.values(DECISION_ACTIONS));
const ALLOWED_OUTCOMES = new Set(Object.values(FINAL_OUTCOMES));
const ALLOWED_STATUSES = new Set(Object.values(DECISION_STATUSES));

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return value.trim();
}

function normalizeDateInput(value, fieldName) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return parsed.toISOString();
}

function normalizeInteger(value, fieldName, minimum) {
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${fieldName} must be an integer >= ${minimum}`);
  }

  return value;
}

function normalizeAction(value) {
  const normalized = assertNonEmptyString(value, 'action').toUpperCase();
  if (!ALLOWED_ACTIONS.has(normalized)) {
    throw new Error('action must be DEFER or FINAL');
  }

  return normalized;
}

function normalizeFinalOutcome(value) {
  const normalized = assertNonEmptyString(value, 'finalOutcome').toUpperCase();
  if (!ALLOWED_OUTCOMES.has(normalized)) {
    throw new Error('finalOutcome must be ACCEPT, REJECT, or REVISE');
  }

  return normalized;
}

function normalizeDecisionStatus(value) {
  const normalized = assertNonEmptyString(value, 'decisionStatus').toUpperCase();
  if (!ALLOWED_STATUSES.has(normalized)) {
    throw new Error('decisionStatus must be UNDECIDED or FINAL');
  }

  return normalized;
}

function normalizeExpectedVersion(value) {
  return normalizeInteger(value, 'expectedVersion', 1);
}

function cloneDecisionState(state) {
  return structuredClone(state);
}

function createInitialDecisionState(paperId) {
  return {
    paperId,
    decisionStatus: DECISION_STATUSES.UNDECIDED,
    finalOutcome: null,
    finalizedByEditorId: null,
    finalizedAt: null,
    decisionVersion: 1
  };
}

function normalizeDecisionState(state) {
  const normalizedStatus = normalizeDecisionStatus(state.decisionStatus);
  const normalizedState = {
    paperId: assertNonEmptyString(state.paperId, 'paperId'),
    decisionStatus: normalizedStatus,
    finalOutcome: null,
    finalizedByEditorId: null,
    finalizedAt: null,
    decisionVersion: normalizeInteger(state.decisionVersion, 'decisionVersion', 1)
  };

  if (normalizedStatus === DECISION_STATUSES.FINAL) {
    normalizedState.finalOutcome = normalizeFinalOutcome(state.finalOutcome);
    normalizedState.finalizedByEditorId = assertNonEmptyString(state.finalizedByEditorId, 'finalizedByEditorId');
    normalizedState.finalizedAt = normalizeDateInput(state.finalizedAt, 'finalizedAt');
  }

  return normalizedState;
}

function normalizeActionAttempted(actionValue) {
  if (typeof actionValue !== 'string') {
    return DECISION_ACTIONS.FINAL;
  }

  const normalized = actionValue.trim().toUpperCase();
  return normalized === DECISION_ACTIONS.DEFER ? DECISION_ACTIONS.DEFER : DECISION_ACTIONS.FINAL;
}

function buildDeniedResult({
  actionAttempted,
  statusCode,
  code,
  message,
  timestamp,
  overrideWorkflowUrl
}) {
  return {
    ok: false,
    statusCode,
    actionAttempted,
    auditOutcome: code,
    timestamp,
    error: {
      code,
      message,
      ...(overrideWorkflowUrl ? { overrideWorkflowUrl } : {})
    }
  };
}

export function validateDecisionCommand(command) {
  if (!command || typeof command !== 'object') {
    throw new Error('decision command must be an object');
  }

  const action = normalizeAction(command.action);
  const expectedVersion = normalizeExpectedVersion(command.expectedVersion);

  if (action === DECISION_ACTIONS.DEFER) {
    if (command.finalOutcome !== undefined && command.finalOutcome !== null && String(command.finalOutcome).trim().length > 0) {
      throw new Error('finalOutcome must not be provided when action is DEFER');
    }

    return {
      action,
      expectedVersion,
      finalOutcome: null
    };
  }

  return {
    action,
    expectedVersion,
    finalOutcome: normalizeFinalOutcome(command.finalOutcome)
  };
}

export function createDecisionModel({
  seedDecisions = []
} = {}) {
  const decisionStore = new Map();

  function getDecisionState(paperId) {
    const normalizedPaperId = assertNonEmptyString(paperId, 'paperId');
    const existingState = decisionStore.get(normalizedPaperId);
    if (existingState) {
      return cloneDecisionState(existingState);
    }

    const initialState = createInitialDecisionState(normalizedPaperId);
    decisionStore.set(normalizedPaperId, initialState);
    return cloneDecisionState(initialState);
  }

  function upsertDecisionState(state) {
    const normalizedState = normalizeDecisionState(state);
    decisionStore.set(normalizedState.paperId, normalizedState);
    return cloneDecisionState(normalizedState);
  }

  function commitDecision({ paperId, nextState }) {
    const normalizedPaperId = assertNonEmptyString(paperId, 'paperId');
    const normalizedState = normalizeDecisionState({
      ...nextState,
      paperId: normalizedPaperId
    });
    decisionStore.set(normalizedPaperId, normalizedState);
    return cloneDecisionState(normalizedState);
  }

  function evaluateDecision({
    paperId,
    command,
    context = {}
  }) {
    const normalizedPaperId = assertNonEmptyString(paperId, 'paperId');
    const decisionState = getDecisionState(normalizedPaperId);
    const nowIso = normalizeDateInput(context.now ?? new Date(), 'now');
    const actionAttempted = normalizeActionAttempted(command?.action);

    if (context.authorized !== true) {
      return buildDeniedResult({
        actionAttempted,
        statusCode: 403,
        code: DECISION_ERROR_CODES.DENIED_UNASSIGNED,
        message: 'Editor is not authorized to record a decision for this paper.',
        timestamp: nowIso
      });
    }

    if (context.reviewsAvailable !== true) {
      return buildDeniedResult({
        actionAttempted,
        statusCode: 412,
        code: DECISION_ERROR_CODES.DENIED_PRECONDITION,
        message: 'Required reviews are not available.',
        timestamp: nowIso
      });
    }

    let normalizedCommand;
    try {
      normalizedCommand = validateDecisionCommand(command);
    } catch (error) {
      return buildDeniedResult({
        actionAttempted,
        statusCode: 422,
        code: DECISION_ERROR_CODES.DENIED_INVALID,
        message: error.message,
        timestamp: nowIso
      });
    }

    if (normalizedCommand.expectedVersion !== decisionState.decisionVersion) {
      return buildDeniedResult({
        actionAttempted: normalizedCommand.action,
        statusCode: 409,
        code: DECISION_ERROR_CODES.DENIED_CONFLICT,
        message: 'Decision version mismatch. Reload paper and retry.',
        timestamp: nowIso
      });
    }

    if (decisionState.decisionStatus === DECISION_STATUSES.FINAL) {
      return buildDeniedResult({
        actionAttempted: normalizedCommand.action,
        statusCode: 409,
        code: DECISION_ERROR_CODES.DENIED_IMMUTABLE,
        message: 'Final decision already saved. Use override workflow for changes.',
        timestamp: nowIso,
        overrideWorkflowUrl: `/override/papers/${encodeURIComponent(normalizedPaperId)}`
      });
    }

    if (normalizedCommand.action === DECISION_ACTIONS.DEFER) {
      const nextState = {
        paperId: normalizedPaperId,
        decisionStatus: DECISION_STATUSES.UNDECIDED,
        finalOutcome: null,
        finalizedByEditorId: null,
        finalizedAt: null,
        decisionVersion: decisionState.decisionVersion + 1
      };

      return {
        ok: true,
        statusCode: 200,
        actionAttempted: DECISION_ACTIONS.DEFER,
        auditOutcome: 'SUCCESS_DEFER',
        timestamp: nowIso,
        nextState,
        response: {
          paperId: normalizedPaperId,
          decisionStatus: nextState.decisionStatus,
          finalOutcome: null,
          decisionVersion: nextState.decisionVersion,
          saved: true,
          message: 'Decision deferred.',
          timestamp: nowIso
        }
      };
    }

    const editorId = assertNonEmptyString(context.editorId, 'editorId');
    const nextState = {
      paperId: normalizedPaperId,
      decisionStatus: DECISION_STATUSES.FINAL,
      finalOutcome: normalizedCommand.finalOutcome,
      finalizedByEditorId: editorId,
      finalizedAt: nowIso,
      decisionVersion: decisionState.decisionVersion + 1
    };

    return {
      ok: true,
      statusCode: 200,
      actionAttempted: DECISION_ACTIONS.FINAL,
      auditOutcome: 'SUCCESS_FINAL',
      timestamp: nowIso,
      nextState,
      response: {
        paperId: normalizedPaperId,
        decisionStatus: nextState.decisionStatus,
        finalOutcome: nextState.finalOutcome,
        decisionVersion: nextState.decisionVersion,
        saved: true,
        message: 'Final decision saved.',
        timestamp: nowIso
      }
    };
  }

  for (const seedState of seedDecisions) {
    upsertDecisionState(seedState);
  }

  return {
    getDecisionState,
    upsertDecisionState,
    commitDecision,
    evaluateDecision
  };
}
