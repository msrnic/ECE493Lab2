function invitationError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function toIsoString(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function cloneInvitation(invitation) {
  return {
    invitationId: invitation.invitationId,
    assignmentId: invitation.assignmentId,
    reviewerId: invitation.reviewerId,
    displayName: invitation.displayName,
    status: invitation.status,
    retryCount: invitation.retryCount,
    nextRetryAt: invitation.nextRetryAt,
    followUpRequired: invitation.followUpRequired,
    lastError: invitation.lastError
  };
}

function createDefaultSender() {
  return async () => ({ accepted: true });
}

export function createReviewInvitationModel({
  idFactory = () => crypto.randomUUID(),
  nowFn = () => new Date().toISOString(),
  retryIntervalMs = 5 * 60 * 1000,
  maxRetries = 3
} = {}) {
  const invitationStore = new Map();
  const invitationByAssignmentId = new Map();

  function getInvitationOrThrow(invitationId) {
    const invitation = invitationStore.get(invitationId);
    if (!invitation) {
      throw invitationError('INVITATION_NOT_FOUND', 'invitation was not found', {
        status: 404,
        invitationId
      });
    }

    return invitation;
  }

  function createInvitation({ assignmentId, reviewerId, displayName }) {
    const knownInvitationId = invitationByAssignmentId.get(assignmentId);
    if (knownInvitationId) {
      const existing = invitationStore.get(knownInvitationId);
      if (existing && existing.status !== 'failed_terminal' && existing.status !== 'canceled') {
        return cloneInvitation(existing);
      }
    }

    const invitation = {
      invitationId: idFactory(),
      assignmentId,
      reviewerId,
      displayName,
      status: 'pending',
      retryCount: 0,
      nextRetryAt: null,
      followUpRequired: false,
      lastError: null
    };
    invitationStore.set(invitation.invitationId, invitation);
    invitationByAssignmentId.set(assignmentId, invitation.invitationId);
    return cloneInvitation(invitation);
  }

  function getInvitation(invitationId) {
    const invitation = invitationStore.get(invitationId);
    return invitation ? cloneInvitation(invitation) : null;
  }

  async function dispatchInvitation(invitationId, sendFn = createDefaultSender()) {
    const invitation = getInvitationOrThrow(invitationId);
    if (invitation.status === 'canceled') {
      return cloneInvitation(invitation);
    }

    const result = await sendFn(cloneInvitation(invitation));
    if (result?.accepted === true) {
      invitation.status = 'sent';
      invitation.nextRetryAt = null;
      invitation.lastError = null;
      invitation.followUpRequired = false;
      return cloneInvitation(invitation);
    }

    invitation.status = 'retry_scheduled';
    invitation.nextRetryAt = new Date(Date.parse(toIsoString(nowFn())) + retryIntervalMs).toISOString();
    invitation.lastError = result?.error ?? 'Invitation dispatch failed.';
    return cloneInvitation(invitation);
  }

  async function retryInvitation(invitationId, sendFn = createDefaultSender()) {
    const invitation = getInvitationOrThrow(invitationId);
    if (invitation.status === 'canceled' || invitation.status === 'failed_terminal') {
      return cloneInvitation(invitation);
    }

    const result = await sendFn(cloneInvitation(invitation));
    if (result?.accepted === true) {
      invitation.status = 'sent';
      invitation.nextRetryAt = null;
      invitation.lastError = null;
      return cloneInvitation(invitation);
    }

    invitation.retryCount += 1;
    invitation.lastError = result?.error ?? 'Invitation retry failed.';
    if (invitation.retryCount >= maxRetries) {
      invitation.status = 'failed_terminal';
      invitation.nextRetryAt = null;
      invitation.followUpRequired = true;
      return cloneInvitation(invitation);
    }

    invitation.status = 'retry_scheduled';
    invitation.nextRetryAt = new Date(Date.parse(toIsoString(nowFn())) + retryIntervalMs).toISOString();
    return cloneInvitation(invitation);
  }

  function cancelInvitation(invitationId, reason = 'assignment_removed') {
    const invitation = getInvitationOrThrow(invitationId);
    invitation.status = 'canceled';
    invitation.followUpRequired = false;
    invitation.nextRetryAt = null;
    invitation.lastError = reason;
    return cloneInvitation(invitation);
  }

  function getFailureLog(invitationId, actorRole) {
    if (!['editor', 'admin', 'support'].includes(actorRole)) {
      throw invitationError('INVITATION_FORBIDDEN', 'you do not have access to invitation failure logs', {
        status: 403
      });
    }

    const invitation = getInvitationOrThrow(invitationId);
    return {
      invitationId: invitation.invitationId,
      status: invitation.status,
      retryCount: invitation.retryCount,
      lastError: invitation.lastError,
      followUpRequired: invitation.followUpRequired
    };
  }

  return {
    createInvitation,
    getInvitation,
    dispatchInvitation,
    retryInvitation,
    cancelInvitation,
    getFailureLog
  };
}
