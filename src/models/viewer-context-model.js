function normalizeRole(role) {
  const candidate = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (candidate === 'author' || candidate === 'other' || candidate === 'anonymous') {
    return candidate;
  }

  return 'anonymous';
}

function normalizeAuthorId(authorId) {
  return typeof authorId === 'string' && authorId.trim().length > 0 ? authorId.trim() : null;
}

export function normalizeViewerContext(raw = {}) {
  const isAuthenticated = raw?.isAuthenticated === true;
  const viewerRole = normalizeRole(raw?.viewerRole);
  const authorId = normalizeAuthorId(raw?.authorId);

  if (!isAuthenticated) {
    return {
      isAuthenticated: false,
      viewerRole: 'anonymous',
      authorId: null
    };
  }

  if (viewerRole === 'author') {
    if (!authorId) {
      throw new Error('Author viewers require a non-empty authorId.');
    }

    return {
      isAuthenticated: true,
      viewerRole: 'author',
      authorId
    };
  }

  return {
    isAuthenticated: true,
    viewerRole: 'other',
    authorId: null
  };
}

export function isAuthorViewer(viewerContext = {}) {
  return viewerContext.isAuthenticated === true
    && viewerContext.viewerRole === 'author'
    && typeof viewerContext.authorId === 'string'
    && viewerContext.authorId.length > 0;
}
