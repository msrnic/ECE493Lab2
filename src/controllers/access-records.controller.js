function parseElevatedRoles(headerValue) {
  return String(headerValue ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function authenticationRequired(res) {
  return res.status(401).json({
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Authentication is required.'
  });
}

export function createAccessRecordsController({ paperAccessApiService } = {}) {
  async function listAccessAttempts(req, res) {
    if (!req.authenticatedSession) {
      return authenticationRequired(res);
    }

    const response = paperAccessApiService.getAccessAttempts({
      isAuthenticated: true,
      requesterId: req.authenticatedSession.user.id,
      requesterRole: req.authenticatedUserRole,
      elevatedRoles: parseElevatedRoles(req.headers?.['x-user-role']),
      paperId: req.params.paperId,
      outcome: req.query?.outcome,
      limit: req.query?.limit
    });

    return res.status(response.status).json(response.body);
  }

  return {
    listAccessAttempts
  };
}
