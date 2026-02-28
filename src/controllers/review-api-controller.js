import { randomUUID } from 'node:crypto';

const UNAVAILABLE_PAYLOAD = Object.freeze({
  message: 'Paper reviews unavailable'
});

const AUTH_REQUIRED_PAYLOAD = Object.freeze({
  message: 'Authentication required'
});

function toIsoTimestamp(value) {
  return new Date(value).toISOString();
}

function resolveRequestId(req, requestIdFactory) {
  const requestIdHeader = req.headers?.['x-request-id'];
  if (typeof requestIdHeader === 'string' && requestIdHeader.trim().length > 0) {
    return requestIdHeader.trim();
  }

  return requestIdFactory();
}

export function createReviewApiController({
  paperModel,
  reviewModel,
  editorAssignmentModel,
  reviewAccessAuditModel,
  nowFn = () => new Date(),
  requestIdFactory = () => randomUUID(),
  traceSink
} = {}) {
  if (!paperModel || !reviewModel || !editorAssignmentModel || !reviewAccessAuditModel) {
    throw new Error('paperModel, reviewModel, editorAssignmentModel, and reviewAccessAuditModel are required');
  }

  const traceEntries = [];

  function emitTrace({ req, editorId, paperId, outcome, timestamp }) {
    const traceEntry = {
      requestId: resolveRequestId(req, requestIdFactory),
      editorId,
      paperId,
      outcome,
      timestamp,
      useCase: 'UC-10',
      acceptanceSuite: 'UC-10-AS'
    };

    traceEntries.push(traceEntry);

    if (typeof traceSink === 'function') {
      traceSink(traceEntry);
    }
  }

  function respondUnavailable({ req, res, editorId, paperId, timestamp }) {
    emitTrace({
      req,
      editorId,
      paperId,
      outcome: 'unavailable',
      timestamp
    });

    return res.status(404).json(UNAVAILABLE_PAYLOAD);
  }

  async function getPaperReviews(req, res) {
    const authenticatedSession = req.authenticatedSession;
    const editorId = authenticatedSession?.user?.id;

    if (!editorId) {
      return res.status(401).json(AUTH_REQUIRED_PAYLOAD);
    }

    const paperId = typeof req.params?.paperId === 'string'
      ? req.params.paperId.trim()
      : '';
    const timestamp = toIsoTimestamp(nowFn());

    if (paperId.length === 0 || req.authenticatedUserRole !== 'editor') {
      return respondUnavailable({
        req,
        res,
        editorId,
        paperId,
        timestamp
      });
    }

    const paper = paperModel.getPaperById(paperId);
    if (!paper) {
      return respondUnavailable({
        req,
        res,
        editorId,
        paperId,
        timestamp
      });
    }

    const access = editorAssignmentModel.resolveAccess({
      editorId,
      paper
    });

    if (!access.allowed) {
      return respondUnavailable({
        req,
        res,
        editorId,
        paperId,
        timestamp
      });
    }

    const reviewVisibilityResult = reviewModel.buildVisibilityResult({ paperId });

    reviewAccessAuditModel.recordAccess({
      editorId,
      paperId,
      accessedAt: timestamp
    });

    emitTrace({
      req,
      editorId,
      paperId,
      outcome: reviewVisibilityResult.status,
      timestamp
    });

    return res.status(200).json(reviewVisibilityResult);
  }

  function getTraceEntries() {
    return traceEntries.map((entry) => structuredClone(entry));
  }

  function resetTraceEntries() {
    traceEntries.splice(0, traceEntries.length);
  }

  return {
    getPaperReviews,
    getTraceEntries,
    resetTraceEntries
  };
}
