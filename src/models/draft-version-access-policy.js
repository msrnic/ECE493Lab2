function draftError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function canAccessDraftVersion(submission, actorUserId, actorRole) {
  if (!submission || !actorUserId) {
    return false;
  }

  return submission.ownerUserId === actorUserId || actorRole === 'admin';
}

export function assertDraftVersionAccess(submission, actorUserId, actorRole) {
  if (!canAccessDraftVersion(submission, actorUserId, actorRole)) {
    throw draftError('DRAFT_FORBIDDEN', 'access denied for draft version operation');
  }
}
