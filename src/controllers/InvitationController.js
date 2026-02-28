function mapInvitationError(error) {
  return {
    status: error.status ?? 500,
    body: {
      code: error.code ?? 'INTERNAL_ERROR',
      message: error.message ?? 'Unexpected error.'
    }
  };
}

export function createInvitationController({
  invitationModel,
  sendInvitation = async () => ({ accepted: true })
} = {}) {
  async function dispatch(req, res) {
    try {
      const invitation = await invitationModel.dispatchInvitation(req.params.invitationId, sendInvitation);
      return res.status(202).json(invitation);
    } catch (error) {
      const mapped = mapInvitationError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function retry(req, res) {
    try {
      const invitation = await invitationModel.retryInvitation(req.params.invitationId, sendInvitation);
      return res.status(200).json(invitation);
    } catch (error) {
      const mapped = mapInvitationError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function getStatus(req, res) {
    try {
      const invitation = invitationModel.getInvitation(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({
          code: 'INVITATION_NOT_FOUND',
          message: 'invitation was not found'
        });
      }

      return res.status(200).json(invitation);
    } catch (error) {
      const mapped = mapInvitationError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function dispatchForOutcome(outcome) {
    const assignedReviewers = [];
    for (const assignedReviewer of outcome.assignedReviewers) {
      const invitation = await invitationModel.dispatchInvitation(
        assignedReviewer.invitation.invitationId,
        sendInvitation
      );
      assignedReviewers.push({
        ...assignedReviewer,
        invitation
      });
    }

    const followUpRequired = assignedReviewers.some((reviewer) => reviewer.invitation.followUpRequired);
    return {
      ...outcome,
      assignedReviewers,
      followUpRequired
    };
  }

  async function cancel(req, res) {
    try {
      const invitation = invitationModel.cancelInvitation(req.params.invitationId);
      return res.status(200).json(invitation);
    } catch (error) {
      const mapped = mapInvitationError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function getFailureLog(req, res) {
    try {
      const actorRole = String(req.headers?.['x-user-role'] ?? '').toLowerCase();
      const result = invitationModel.getFailureLog(req.params.invitationId, actorRole);
      return res.status(200).json(result);
    } catch (error) {
      const mapped = mapInvitationError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  return {
    dispatch,
    retry,
    getStatus,
    dispatchForOutcome,
    cancel,
    getFailureLog
  };
}
