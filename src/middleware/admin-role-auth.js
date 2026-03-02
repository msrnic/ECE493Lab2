function resolveRole(req) {
  const directRole = typeof req.authenticatedUserRole === 'string'
    ? req.authenticatedUserRole
    : req.headers?.['x-user-role'];

  if (Array.isArray(directRole)) {
    return String(directRole[0] ?? '').trim().toLowerCase();
  }

  return String(directRole ?? '').trim().toLowerCase();
}

export function createAdminRoleAuth() {
  return function adminRoleAuth(req, res, next) {
    const role = resolveRole(req);
    if (!role) {
      res.status(401).json({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required.'
      });
      return;
    }

    if (!['admin', 'editor'].includes(role)) {
      res.status(403).json({
        code: 'ADMIN_FORBIDDEN',
        message: 'Administrator access is required.'
      });
      return;
    }

    req.authenticatedUserRole = role === 'editor' ? 'admin' : role;
    next();
  };
}
