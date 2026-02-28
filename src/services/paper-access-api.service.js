import { randomUUID } from 'node:crypto';
import {
  createPaperFileBundle,
  markTemporarilyUnavailable,
  markAvailable
} from '../models/paper-file-bundle.model.js';
import {
  createPaperAccessAttemptStore
} from '../models/paper-access-attempt.model.js';
import {
  createOutageRetryWindowModel
} from '../models/outage-retry-window.model.js';
import {
  createReviewerAccessEntitlement,
  resolveEntitlementDecision,
  revokeReviewerAccessEntitlement
} from '../models/reviewer-access-entitlement.model.js';

function buildKey(reviewerId, paperId) {
  return `${reviewerId}::${paperId}`;
}

function normalizeRequestId(requestId) {
  if (typeof requestId === 'string' && requestId.trim().length > 0) {
    return requestId;
  }

  return randomUUID();
}

function toViewerRoles(viewerRoleSnapshot) {
  if (!Array.isArray(viewerRoleSnapshot)) {
    return [];
  }

  return viewerRoleSnapshot
    .map((role) => String(role).trim().toLowerCase())
    .filter(Boolean);
}

function authenticationRequired() {
  return {
    status: 401,
    body: {
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication is required.'
    }
  };
}

function clonePaperRecord(record) {
  return {
    paperId: record.paperId,
    title: record.title,
    editorIds: [...record.editorIds],
    files: structuredClone(record.files),
    bundle: structuredClone(record.bundle)
  };
}

export function createPaperAccessApiService({
  idFactory = () => randomUUID(),
  nowFn = () => new Date(),
  outageRetryWindowModel = createOutageRetryWindowModel({ nowFn }),
  accessAttemptStore = createPaperAccessAttemptStore({ idFactory, nowFn })
} = {}) {
  const paperStore = new Map();
  const entitlementStore = new Map();

  function upsertPaper({ paperId, title, files, availabilityStatus = 'available', editorIds = [] }) {
    const bundle = createPaperFileBundle({
      paperId,
      files,
      availabilityStatus,
      generatedAt: nowFn().toISOString()
    });

    paperStore.set(paperId, {
      paperId,
      title,
      editorIds: Array.isArray(editorIds) ? [...editorIds] : [],
      files: structuredClone(bundle.files),
      bundle
    });

    return clonePaperRecord(paperStore.get(paperId));
  }

  function setPaperAvailability(paperId, availabilityStatus) {
    const paper = paperStore.get(paperId);
    if (!paper) {
      throw new Error('paper not found');
    }

    paper.bundle = availabilityStatus === 'temporarily-unavailable'
      ? markTemporarilyUnavailable(paper.bundle, { nowFn })
      : markAvailable(paper.bundle, paper.files, { nowFn });

    return clonePaperRecord(paper);
  }

  function setPaperEditors(paperId, editorIds) {
    const paper = paperStore.get(paperId);
    if (!paper) {
      throw new Error('paper not found');
    }

    paper.editorIds = Array.isArray(editorIds) ? [...editorIds] : [];
    return clonePaperRecord(paper);
  }

  function assignReviewer({
    entitlementId = idFactory(),
    reviewerId,
    paperId,
    assignmentStatus = 'accepted',
    accessStatus = 'active',
    revokedAt,
    revokedBy
  }) {
    const entitlement = createReviewerAccessEntitlement({
      entitlementId,
      reviewerId,
      paperId,
      assignmentStatus,
      accessStatus,
      revokedAt,
      revokedBy,
      updatedAt: nowFn().toISOString()
    });

    entitlementStore.set(buildKey(reviewerId, paperId), entitlement);
    return structuredClone(entitlement);
  }

  function revokeReviewerAccess({ reviewerId, paperId, revokedBy }) {
    const key = buildKey(reviewerId, paperId);
    const existing = entitlementStore.get(key);

    if (!existing) {
      throw new Error('entitlement not found');
    }

    const revoked = revokeReviewerAccessEntitlement(existing, {
      revokedBy,
      nowFn
    });

    entitlementStore.set(key, revoked);
    return structuredClone(revoked);
  }

  function buildDeniedResponse({ reasonCode, requestId, reviewerId, paperId, fileId, viewerRoleSnapshot }) {
    accessAttemptStore.recordAttempt({
      reviewerId,
      paperId,
      fileId,
      outcome: 'denied-revoked',
      reasonCode,
      requestId,
      viewerRoleSnapshot
    });

    return {
      status: 403,
      body: {
        outcome: 'denied-revoked',
        reasonCode,
        message: reasonCode === 'ACCESS_REVOKED'
          ? 'Access to this paper has been revoked.'
          : 'You are not assigned to this paper.'
      }
    };
  }

  function buildTemporaryUnavailableResponse({ requestId, reviewerId, paperId, fileId, viewerRoleSnapshot, outageResult }) {
    if (outageResult.outcome === 'throttled') {
      accessAttemptStore.recordAttempt({
        reviewerId,
        paperId,
        fileId,
        outcome: 'throttled',
        reasonCode: outageResult.reasonCode,
        requestId,
        viewerRoleSnapshot,
        retryAfterSeconds: outageResult.retryAfterSeconds
      });

      return {
        status: 429,
        body: {
          outcome: 'throttled',
          reasonCode: outageResult.reasonCode,
          message: 'Retry temporarily limited during an outage.',
          retryAfterSeconds: outageResult.retryAfterSeconds
        }
      };
    }

    accessAttemptStore.recordAttempt({
      reviewerId,
      paperId,
      fileId,
      outcome: 'temporarily-unavailable',
      reasonCode: outageResult.reasonCode,
      requestId,
      viewerRoleSnapshot
    });

    return {
      status: 503,
      body: {
        outcome: 'temporarily-unavailable',
        reasonCode: outageResult.reasonCode,
        message: 'Paper files are temporarily unavailable. Please retry.',
        immediateRetryAllowed: true
      }
    };
  }

  function resolveEntitlement({ reviewerId, paperId, requestId, fileId, viewerRoleSnapshot }) {
    const entitlement = entitlementStore.get(buildKey(reviewerId, paperId));
    const decision = resolveEntitlementDecision(entitlement);

    if (!decision.allowed) {
      return {
        blocked: true,
        response: buildDeniedResponse({
          reasonCode: decision.reasonCode,
          requestId,
          reviewerId,
          paperId,
          fileId,
          viewerRoleSnapshot
        })
      };
    }

    return {
      blocked: false
    };
  }

  function listAssignedPapers({ reviewerId }) {
    if (!reviewerId) {
      return authenticationRequired();
    }

    const papers = [...entitlementStore.values()]
      .filter((entitlement) => entitlement.reviewerId === reviewerId)
      .filter((entitlement) => resolveEntitlementDecision(entitlement).allowed)
      .map((entitlement) => paperStore.get(entitlement.paperId))
      .filter(Boolean)
      .map((paper) => ({ paperId: paper.paperId, title: paper.title }));

    return {
      status: 200,
      body: {
        papers
      }
    };
  }

  function getPaperFiles({
    reviewerId,
    paperId,
    requestId,
    viewerRoleSnapshot = [],
    evaluateOutage,
    clearOutage
  }) {
    if (!reviewerId) {
      return authenticationRequired();
    }

    const normalizedRequestId = normalizeRequestId(requestId);
    const normalizedViewerRoles = toViewerRoles(viewerRoleSnapshot);

    const entitlement = resolveEntitlement({
      reviewerId,
      paperId,
      requestId: normalizedRequestId,
      viewerRoleSnapshot: normalizedViewerRoles
    });
    if (entitlement.blocked) {
      return entitlement.response;
    }

    const paper = paperStore.get(paperId);
    if (!paper) {
      return buildDeniedResponse({
        reasonCode: 'ACCESS_NOT_ASSIGNED',
        requestId: normalizedRequestId,
        reviewerId,
        paperId,
        viewerRoleSnapshot: normalizedViewerRoles
      });
    }

    if (paper.bundle.availabilityStatus === 'temporarily-unavailable') {
      const outageResult = typeof evaluateOutage === 'function'
        ? evaluateOutage({ reviewerId, paperId })
        : outageRetryWindowModel.registerTemporaryOutage({ reviewerId, paperId });

      return buildTemporaryUnavailableResponse({
        requestId: normalizedRequestId,
        reviewerId,
        paperId,
        viewerRoleSnapshot: normalizedViewerRoles,
        outageResult
      });
    }

    if (typeof clearOutage === 'function') {
      clearOutage({ reviewerId, paperId });
    } else {
      outageRetryWindowModel.clearWindow(reviewerId, paperId);
    }

    accessAttemptStore.recordAttempt({
      reviewerId,
      paperId,
      outcome: 'granted',
      reasonCode: 'ACCESS_GRANTED',
      requestId: normalizedRequestId,
      viewerRoleSnapshot: normalizedViewerRoles
    });

    return {
      status: 200,
      body: {
        paperId,
        outcome: 'granted',
        files: paper.bundle.files
      }
    };
  }

  function downloadPaperFile({
    reviewerId,
    paperId,
    fileId,
    requestId,
    viewerRoleSnapshot = [],
    evaluateOutage,
    clearOutage
  }) {
    if (!reviewerId) {
      return authenticationRequired();
    }

    const normalizedRequestId = normalizeRequestId(requestId);
    const normalizedViewerRoles = toViewerRoles(viewerRoleSnapshot);

    const entitlement = resolveEntitlement({
      reviewerId,
      paperId,
      fileId,
      requestId: normalizedRequestId,
      viewerRoleSnapshot: normalizedViewerRoles
    });
    if (entitlement.blocked) {
      return entitlement.response;
    }

    const paper = paperStore.get(paperId);
    if (!paper) {
      return buildDeniedResponse({
        reasonCode: 'ACCESS_NOT_ASSIGNED',
        requestId: normalizedRequestId,
        reviewerId,
        paperId,
        fileId,
        viewerRoleSnapshot: normalizedViewerRoles
      });
    }

    if (paper.bundle.availabilityStatus === 'temporarily-unavailable') {
      const outageResult = typeof evaluateOutage === 'function'
        ? evaluateOutage({ reviewerId, paperId })
        : outageRetryWindowModel.registerTemporaryOutage({ reviewerId, paperId });

      return buildTemporaryUnavailableResponse({
        requestId: normalizedRequestId,
        reviewerId,
        paperId,
        fileId,
        viewerRoleSnapshot: normalizedViewerRoles,
        outageResult
      });
    }

    const file = paper.bundle.files.find((candidate) => candidate.fileId === fileId);
    if (!file) {
      return {
        status: 404,
        body: {
          code: 'FILE_NOT_FOUND',
          message: 'Requested file was not found.'
        }
      };
    }

    if (typeof clearOutage === 'function') {
      clearOutage({ reviewerId, paperId });
    } else {
      outageRetryWindowModel.clearWindow(reviewerId, paperId);
    }

    accessAttemptStore.recordAttempt({
      reviewerId,
      paperId,
      fileId,
      outcome: 'granted',
      reasonCode: 'ACCESS_GRANTED',
      requestId: normalizedRequestId,
      viewerRoleSnapshot: normalizedViewerRoles
    });

    return {
      status: 200,
      body: {
        paperId,
        fileId: file.fileId,
        fileName: file.fileName,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
        outcome: 'granted'
      }
    };
  }

  function getAccessAttempts({
    isAuthenticated,
    requesterId,
    requesterRole,
    elevatedRoles = [],
    paperId,
    outcome,
    limit
  }) {
    if (!isAuthenticated) {
      return authenticationRequired();
    }

    const paper = paperStore.get(paperId);
    if (!paper) {
      return {
        status: 404,
        body: {
          code: 'PAPER_NOT_FOUND',
          message: 'paper was not found'
        }
      };
    }

    const normalizedElevatedRoles = toViewerRoles(elevatedRoles);
    const hasElevatedAccess = normalizedElevatedRoles.includes('support')
      || normalizedElevatedRoles.includes('admin');
    const hasEditorAccess = requesterRole === 'editor' && paper.editorIds.includes(requesterId);

    if (!hasElevatedAccess && !hasEditorAccess) {
      return {
        status: 403,
        body: {
          code: 'ACCESS_RECORDS_FORBIDDEN',
          message: 'Only paper editors or support/admin may view access records.'
        }
      };
    }

    return {
      status: 200,
      body: {
        records: accessAttemptStore.listAttemptsForPaper(paperId, {
          outcome,
          limit
        })
      }
    };
  }

  return {
    upsertPaper,
    setPaperAvailability,
    setPaperEditors,
    assignReviewer,
    revokeReviewerAccess,
    listAssignedPapers,
    getPaperFiles,
    downloadPaperFile,
    getAccessAttempts,
    listAllAccessAttempts: accessAttemptStore.listAllAttempts,
    getOutageWindow: outageRetryWindowModel.getWindow
  };
}
