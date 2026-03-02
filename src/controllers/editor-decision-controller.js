import { randomUUID } from 'node:crypto';
import { DECISION_ACTIONS, createDecisionModel } from '../models/decision-model.js';
import { createDecisionAuditModel } from '../models/decision-audit-model.js';

const AUTH_REQUIRED_PAYLOAD = Object.freeze({
  code: 'AUTHENTICATION_REQUIRED',
  message: 'Authentication is required.'
});

const PAPER_NOT_FOUND_PAYLOAD = Object.freeze({
  code: 'PAPER_NOT_FOUND',
  message: 'Paper not found.'
});

const AUDIT_WRITE_FAILED_PAYLOAD = Object.freeze({
  code: 'AUDIT_WRITE_FAILED',
  message: 'Decision was not recorded. Please retry.'
});

function assertDependencies({
  paperModel,
  reviewModel,
  editorAssignmentModel
}) {
  if (!paperModel || !reviewModel || !editorAssignmentModel) {
    throw new Error('paperModel, reviewModel, and editorAssignmentModel are required');
  }
}

function normalizePaperId(req) {
  const value = req?.params?.paperId;
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function getEditorId(req) {
  return req?.authenticatedSession?.user?.id;
}

function isEditorRole(req) {
  return req?.authenticatedUserRole === 'editor';
}

function mapToWorkflowEvaluations(reviewModel, paperId) {
  return reviewModel.listSubmittedReviewSummaries(paperId).map((review) => {
    const recommendationSource = typeof review.comments === 'string' && review.comments.trim().length > 0
      ? review.comments
      : `Score: ${review.overallScore ?? 'N/A'}`;

    return {
      evaluationId: review.reviewId,
      reviewerId: review.reviewerId,
      recommendation: recommendationSource,
      submittedAt: review.submittedAt
    };
  });
}

function createIdempotencyStore() {
  const store = new Map();

  function keyFor({ paperId, editorId, idempotencyKey }) {
    if (typeof idempotencyKey !== 'string' || idempotencyKey.trim().length === 0) {
      return null;
    }

    return `${paperId}::${editorId}::${idempotencyKey.trim()}`;
  }

  return {
    get({ paperId, editorId, idempotencyKey }) {
      const key = keyFor({ paperId, editorId, idempotencyKey });
      if (!key) {
        return null;
      }

      return store.get(key) ?? null;
    },
    set({ paperId, editorId, idempotencyKey, response }) {
      const key = keyFor({ paperId, editorId, idempotencyKey });
      if (!key) {
        return;
      }

      store.set(key, structuredClone(response));
    }
  };
}

function readIdempotencyKey(headers = {}) {
  const direct = headers['Idempotency-Key'];
  if (typeof direct === 'string' && direct.trim().length > 0) {
    return direct.trim();
  }

  const lower = headers['idempotency-key'];
  if (typeof lower === 'string' && lower.trim().length > 0) {
    return lower.trim();
  }

  return null;
}

export function createEditorDecisionController({
  paperModel,
  reviewModel,
  editorAssignmentModel,
  decisionModel = createDecisionModel(),
  decisionAuditModel = createDecisionAuditModel(),
  nowFn = () => new Date()
} = {}) {
  assertDependencies({
    paperModel,
    reviewModel,
    editorAssignmentModel
  });

  const idempotencyStore = createIdempotencyStore();

  function resolvePaper(req) {
    const paperId = normalizePaperId(req);
    if (paperId.length === 0) {
      return { paperId: '', paper: null };
    }

    return {
      paperId,
      paper: paperModel.getPaperById(paperId)
    };
  }

  function resolveAuthorization(req, paper) {
    const editorId = getEditorId(req);
    if (!editorId || !isEditorRole(req)) {
      return {
        allowed: false,
        editorId
      };
    }

    const access = editorAssignmentModel.resolveAccess({
      editorId,
      paper
    });

    return {
      allowed: access.allowed === true,
      editorId
    };
  }

  async function getDecisionWorkflow(req, res) {
    const editorId = getEditorId(req);
    if (!editorId) {
      return res.status(401).json(AUTH_REQUIRED_PAYLOAD);
    }

    const { paperId, paper } = resolvePaper(req);
    if (!paperId || !paper) {
      return res.status(404).json(PAPER_NOT_FOUND_PAYLOAD);
    }

    const authorization = resolveAuthorization(req, paper);
    if (!authorization.allowed) {
      return res.status(403).json({
        code: 'DENIED_UNASSIGNED',
        message: 'Editor is not authorized to record a decision for this paper.'
      });
    }

    const decisionState = decisionModel.getDecisionState(paperId);
    const evaluations = mapToWorkflowEvaluations(reviewModel, paperId);

    return res.status(200).json({
      paperId,
      decisionStatus: decisionState.decisionStatus,
      finalOutcome: decisionState.finalOutcome,
      decisionVersion: decisionState.decisionVersion,
      reviewsAvailable: evaluations.length > 0,
      authorized: true,
      overrideWorkflowUrl: decisionState.decisionStatus === 'FINAL'
        ? `/override/papers/${encodeURIComponent(paperId)}`
        : null,
      evaluations
    });
  }

  async function savePaperDecision(req, res) {
    const editorId = getEditorId(req);
    if (!editorId) {
      return res.status(401).json(AUTH_REQUIRED_PAYLOAD);
    }

    const { paperId, paper } = resolvePaper(req);
    if (!paperId || !paper) {
      return res.status(404).json(PAPER_NOT_FOUND_PAYLOAD);
    }

    const idempotencyKey = readIdempotencyKey(req.headers);
    const cachedResponse = idempotencyStore.get({
      paperId,
      editorId,
      idempotencyKey
    });
    if (cachedResponse) {
      return res.status(cachedResponse.statusCode).json(cachedResponse.payload);
    }

    const authorization = resolveAuthorization(req, paper);
    const reviewsAvailable = mapToWorkflowEvaluations(reviewModel, paperId).length > 0;
    const evaluation = decisionModel.evaluateDecision({
      paperId,
      command: req.body,
      context: {
        editorId,
        authorized: authorization.allowed,
        reviewsAvailable,
        now: nowFn()
      }
    });

    const auditPayload = {
      paperId,
      editorId,
      actionAttempted: evaluation.actionAttempted ?? DECISION_ACTIONS.FINAL,
      outcome: evaluation.auditOutcome,
      reason: evaluation.ok ? null : evaluation.error.message,
      occurredAt: evaluation.timestamp
    };

    let auditEntry;
    try {
      auditEntry = decisionAuditModel.recordEntry(auditPayload);
    } catch {
      return res.status(500).json(AUDIT_WRITE_FAILED_PAYLOAD);
    }

    if (!evaluation.ok) {
      const response = {
        statusCode: evaluation.statusCode,
        payload: evaluation.error
      };
      idempotencyStore.set({
        paperId,
        editorId,
        idempotencyKey,
        response
      });
      return res.status(response.statusCode).json(response.payload);
    }

    const committedState = decisionModel.commitDecision({
      paperId,
      nextState: evaluation.nextState
    });
    const successPayload = {
      ...evaluation.response,
      decisionStatus: committedState.decisionStatus,
      finalOutcome: committedState.finalOutcome,
      decisionVersion: committedState.decisionVersion,
      auditId: auditEntry.auditId
    };
    const response = {
      statusCode: 200,
      payload: successPayload
    };

    idempotencyStore.set({
      paperId,
      editorId,
      idempotencyKey,
      response
    });

    return res.status(response.statusCode).json(response.payload);
  }

  return {
    getDecisionWorkflow,
    savePaperDecision
  };
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export function createEditorDecisionApiClient({
  fetchImpl = globalThis.fetch,
  idempotencyKeyFactory = () => randomUUID()
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetchImpl must be a function');
  }

  return {
    async loadWorkflow(paperId) {
      const response = await fetchImpl(`/api/papers/${encodeURIComponent(String(paperId).trim())}/decision-workflow`, {
        method: 'GET'
      });
      const payload = await readJsonSafely(response);
      return {
        ok: response.status === 200,
        status: response.status,
        payload
      };
    },
    async saveDecision(paperId, command, { idempotencyKey } = {}) {
      const headerValue = typeof idempotencyKey === 'string' && idempotencyKey.trim().length > 0
        ? idempotencyKey.trim()
        : idempotencyKeyFactory();
      const response = await fetchImpl(`/api/papers/${encodeURIComponent(String(paperId).trim())}/decisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': headerValue
        },
        body: JSON.stringify(command)
      });
      const payload = await readJsonSafely(response);

      return {
        ok: response.status === 200,
        status: response.status,
        payload
      };
    }
  };
}
