import { SESSION_INVALID_ERROR } from '../config/submission-config.js';

function readHeader(headers, key) {
  const value = headers?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function createSessionAuthMiddleware({ authController } = {}) {
  return function sessionAuth(req, res, next) {
    const headerSessionId = readHeader(req.headers, 'x-session-id');
    const headerAuthorId = readHeader(req.headers, 'x-author-id');

    if (headerSessionId && headerAuthorId) {
      req.submissionSession = {
        sessionId: headerSessionId,
        authorId: headerAuthorId
      };
      next();
      return;
    }

    const authenticatedSession = authController?.getAuthenticatedSession?.(req);
    if (authenticatedSession?.sessionId && authenticatedSession?.user?.id) {
      req.submissionSession = {
        sessionId: authenticatedSession.sessionId,
        authorId: authenticatedSession.user.id
      };
      next();
      return;
    }

    res.status(401).json(SESSION_INVALID_ERROR);
  };
}
