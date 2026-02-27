import { renderPasswordChangePage } from '../views/password-change-view.js';

export function createPasswordChangeApiController({ authController, passwordChangeModel }) {
  return async function handlePasswordChange(req, res) {
    const session = authController?.getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication is required.'
      });
      return;
    }

    try {
      const result = await passwordChangeModel.changePassword({
        userId: session.user.id,
        sessionId: session.sessionId,
        payload: req.body,
        clientMetadata: {
          ip: req.ip,
          userAgent: req.headers?.['user-agent'] ?? null
        }
      });

      if (result.headers) {
        for (const [name, value] of Object.entries(result.headers)) {
          res.set(name, value);
        }
      }

      res.status(result.httpStatus).json(result.body);
    } catch {
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Unexpected error.'
      });
    }
  };
}

export function createPasswordChangePageController({
  authController,
  renderPage = renderPasswordChangePage
} = {}) {
  return function getPasswordChangePage(req, res) {
    const session = authController?.getAuthenticatedSession(req);
    if (!session) {
      res.status(302).redirect('/login');
      return;
    }

    res.status(200).type('html').send(renderPage({ email: session.user?.email }));
  };
}
