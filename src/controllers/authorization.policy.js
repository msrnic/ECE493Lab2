function normalizeRole(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizePaperIds(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => String(entry).split(','))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

export function canViewInvitationFailureLogs({ actorRole, paperId, editorPaperIds } = {}) {
  const normalizedRole = normalizeRole(actorRole);
  const normalizedEditorPaperIds = normalizePaperIds(editorPaperIds);

  if (normalizedRole === 'admin' || normalizedRole === 'support') {
    return true;
  }

  if (normalizedRole === 'editor') {
    return normalizedEditorPaperIds.length === 0 || normalizedEditorPaperIds.includes(String(paperId));
  }

  return false;
}

export function assertCanViewInvitationFailureLogs(context = {}) {
  if (!canViewInvitationFailureLogs(context)) {
    const error = new Error('you do not have access to invitation failure logs');
    error.code = 'INVITATION_FORBIDDEN';
    error.status = 403;
    throw error;
  }
}
