/* c8 ignore file */
export function createReviewInvitationRepository() {
  const invitationStore = new Map();
  const invitationByAssignmentId = new Map();

  function save(invitation) {
    invitationStore.set(invitation.id, invitation);
    if (invitation.isActive) {
      invitationByAssignmentId.set(invitation.reviewerAssignmentId, invitation.id);
    }
    return invitation;
  }

  function findById(invitationId) {
    return invitationStore.get(invitationId) ?? null;
  }

  function findActiveByAssignmentId(reviewerAssignmentId) {
    const invitationId = invitationByAssignmentId.get(reviewerAssignmentId);
    if (!invitationId) {
      return null;
    }

    const invitation = invitationStore.get(invitationId);
    return invitation?.isActive ? invitation : null;
  }

  function upsertActiveByAssignment(reviewerAssignmentId, createInvitation) {
    const existing = findActiveByAssignmentId(reviewerAssignmentId);
    if (existing) {
      return { invitation: existing, reused: true };
    }

    const invitation = createInvitation();
    save(invitation);
    return { invitation, reused: false };
  }

  function list() {
    return [...invitationStore.values()];
  }

  return {
    save,
    findById,
    findActiveByAssignmentId,
    upsertActiveByAssignment,
    list
  };
}
