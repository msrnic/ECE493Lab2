const ALLOWED_ROLES = new Set(['anonymous', 'author', 'other']);

export function normalizeViewerContext(rawViewerContext) {
  if (!rawViewerContext || typeof rawViewerContext !== 'object') {
    throw new Error('viewerContext must be an object');
  }

  const { isAuthenticated, viewerRole, authorId } = rawViewerContext;

  if (typeof isAuthenticated !== 'boolean') {
    throw new Error('viewerContext.isAuthenticated must be a boolean');
  }

  if (!ALLOWED_ROLES.has(viewerRole)) {
    throw new Error('viewerContext.viewerRole is invalid');
  }

  if (viewerRole === 'anonymous') {
    if (isAuthenticated || authorId !== null) {
      throw new Error('anonymous viewers must be unauthenticated with null authorId');
    }

    return {
      isAuthenticated: false,
      viewerRole,
      authorId: null
    };
  }

  if (viewerRole === 'author') {
    if (!isAuthenticated) {
      throw new Error('author viewerRole requires authenticated context');
    }

    if (typeof authorId !== 'string' || authorId.trim() === '') {
      throw new Error('author viewerRole requires non-empty authorId');
    }

    return {
      isAuthenticated: true,
      viewerRole,
      authorId: authorId.trim()
    };
  }

  if (!isAuthenticated && authorId !== null) {
    throw new Error('unauthenticated non-author viewer must have null authorId');
  }

  return {
    isAuthenticated,
    viewerRole,
    authorId: authorId ?? null
  };
}
