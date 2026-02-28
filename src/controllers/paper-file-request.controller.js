import { randomUUID } from 'node:crypto';

function resolveRequestId(req) {
  const requestIdHeader = req.headers?.['x-request-id'];
  if (typeof requestIdHeader === 'string' && requestIdHeader.trim().length > 0) {
    return requestIdHeader;
  }

  return randomUUID();
}

function resolveViewerRoleSnapshot(req) {
  const authenticatedRole = req.authenticatedUserRole ? [req.authenticatedUserRole] : [];
  const elevatedRoles = String(req.headers?.['x-user-role'] ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...authenticatedRole, ...elevatedRoles])];
}

function authenticationRequired(res) {
  return res.status(401).json({
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Authentication is required.'
  });
}

export function createPaperFileRequestController({
  paperAccessApiService,
  outageRetryController
} = {}) {
  async function getPaperFiles(req, res) {
    if (!req.authenticatedReviewerId) {
      return authenticationRequired(res);
    }

    const response = paperAccessApiService.getPaperFiles({
      reviewerId: req.authenticatedReviewerId,
      paperId: req.params.paperId,
      requestId: resolveRequestId(req),
      viewerRoleSnapshot: resolveViewerRoleSnapshot(req),
      evaluateOutage: outageRetryController?.evaluateOutage,
      clearOutage: outageRetryController?.clearOutageWindow
    });

    return res.status(response.status).json(response.body);
  }

  async function downloadPaperFile(req, res) {
    if (!req.authenticatedReviewerId) {
      return authenticationRequired(res);
    }

    const response = paperAccessApiService.downloadPaperFile({
      reviewerId: req.authenticatedReviewerId,
      paperId: req.params.paperId,
      fileId: req.params.fileId,
      requestId: resolveRequestId(req),
      viewerRoleSnapshot: resolveViewerRoleSnapshot(req),
      evaluateOutage: outageRetryController?.evaluateOutage,
      clearOutage: outageRetryController?.clearOutageWindow
    });

    return res.status(response.status).json(response.body);
  }

  return {
    getPaperFiles,
    downloadPaperFile
  };
}
