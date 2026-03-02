function resolveHeaderValue(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0].trim() : '';
  }

  return typeof value === 'string' ? value.trim() : '';
}

export function createInternalServiceAuth({ serviceKey = process.env.INTERNAL_SERVICE_KEY } = {}) {
  return function internalServiceAuth(req, res, next) {
    if (typeof serviceKey !== 'string' || serviceKey.trim().length === 0) {
      next();
      return;
    }

    const providedKey = resolveHeaderValue(req.headers?.['x-internal-service-key']);
    if (providedKey !== serviceKey) {
      res.status(401).json({
        code: 'INTERNAL_AUTH_FAILED',
        message: 'Missing or invalid internal service credential.'
      });
      return;
    }

    next();
  };
}
