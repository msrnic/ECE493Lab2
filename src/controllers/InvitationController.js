import { assertCanViewInvitationFailureLogs } from './authorization.policy.js';

function mapInvitationError(error) {
  return {
    status: error.status ?? 500,
    body: {
      code: error.code ?? 'INTERNAL_ERROR',
      message: error.message ?? 'Unexpected error.'
    }
  };
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeRole(value) {
  return String(value ?? '').trim().toLowerCase();
}

function parseEditorPaperIds(value) {
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

function parseIncludeInactive(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'true';
}

export function createInvitationController({
  invitationModel,
  sendInvitation = async () => ({ accepted: true }),
  onInvitationAccepted = async () => {},
  onInvitationDeclined = async () => {}
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
      const actorRole = normalizeRole(req.headers?.['x-user-role']);
      const result = invitationModel.getFailureLog(req.params.invitationId, actorRole);
      return res.status(200).json(result);
    } catch (error) {
      const mapped = mapInvitationError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function triggerByAssignment(req, res) {
    try {
      const payload = {
        reviewerAssignmentId: req.params.assignmentId,
        paperId: req.body?.paperId,
        reviewerId: req.body?.reviewerId
      };

      if (!payload.paperId || !payload.reviewerId) {
        return res.status(400).json({
          code: 'INVITATION_BAD_REQUEST',
          message: 'paperId and reviewerId are required'
        });
      }

      const { invitation, reused } = await invitationModel.triggerInvitationDelivery(payload, sendInvitation);
      return res.status(reused ? 200 : 202).json(invitation);
    } catch (error) {
      const mapped = mapInvitationError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function getContractStatus(req, res) {
    try {
      const invitation = invitationModel.getInvitationStatus(req.params.invitationId);
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

  async function recordDeliveryEvent(req, res) {
    try {
      const payload = req.body ?? {};
      if (!payload.attemptId || !payload.eventType || !payload.occurredAt) {
        return res.status(400).json({
          code: 'INVITATION_BAD_REQUEST',
          message: 'attemptId, eventType, and occurredAt are required'
        });
      }

      const invitation = invitationModel.recordDeliveryEvent(req.params.invitationId, payload);
      return res.status(200).json(invitation);
    } catch (error) {
      const mapped = mapInvitationError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function cancelByAssignment(req, res) {
    try {
      const payload = req.body ?? {};
      if (payload.reason !== 'assignment_removed') {
        return res.status(400).json({
          code: 'INVITATION_BAD_REQUEST',
          message: 'reason must be assignment_removed'
        });
      }

      if (!payload.occurredAt) {
        return res.status(400).json({
          code: 'INVITATION_BAD_REQUEST',
          message: 'occurredAt is required'
        });
      }

      const invitation = invitationModel.cancelInvitationByAssignment(
        req.params.assignmentId,
        payload.reason,
        payload.occurredAt
      );
      return res.status(200).json(invitation);
    } catch (error) {
      const mapped = mapInvitationError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function retryDue(req, res) {
    try {
      const payload = req.body ?? {};
      if (!payload.runAt) {
        return res.status(400).json({
          code: 'INVITATION_BAD_REQUEST',
          message: 'runAt is required'
        });
      }

      const summary = await invitationModel.processDueRetries({ runAt: payload.runAt }, sendInvitation);
      return res.status(200).json(summary);
    } catch (error) {
      const mapped = mapInvitationError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function listFailureLogsByPaper(req, res) {
    try {
      const actorRole = normalizeRole(req.headers?.['x-user-role']);
      const editorPaperIds = parseEditorPaperIds(req.headers?.['x-editor-paper-ids']);
      const page = parsePositiveInteger(req.query?.page, 1);
      const pageSize = parsePositiveInteger(req.query?.pageSize, 20);

      assertCanViewInvitationFailureLogs({
        actorRole,
        paperId: req.params.paperId,
        editorPaperIds
      });

      const response = invitationModel.listFailureLogsByPaper(req.params.paperId, {
        page,
        pageSize,
        actorRole,
        editorPaperIds
      });
      return res.status(200).json(response);
    } catch (error) {
      const mapped = mapInvitationError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function listReviewerInbox(req, res) {
    try {
      if (!req.authenticatedReviewerId) {
        return res.status(401).json({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.'
        });
      }

      const includeInactive = parseIncludeInactive(req.query?.includeInactive);
      const invitations = invitationModel.listInvitationsForReviewer(req.authenticatedReviewerId, {
        includeInactive
      });
      return res.status(200).json({
        reviewerId: req.authenticatedReviewerId,
        invitations
      });
    } catch (error) {
      const mapped = mapInvitationError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function acceptReviewerInvitation(req, res) {
    try {
      if (!req.authenticatedReviewerId) {
        return res.status(401).json({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.'
        });
      }

      const invitation = invitationModel.acceptInvitation(req.params.invitationId, {
        reviewerId: req.authenticatedReviewerId,
        occurredAt: req.body?.occurredAt
      });
      await onInvitationAccepted(invitation);

      return res.status(200).json(invitation);
    } catch (error) {
      const mapped = mapInvitationError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function declineReviewerInvitation(req, res) {
    try {
      if (!req.authenticatedReviewerId) {
        return res.status(401).json({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.'
        });
      }

      const invitation = invitationModel.declineInvitation(req.params.invitationId, {
        reviewerId: req.authenticatedReviewerId,
        occurredAt: req.body?.occurredAt
      });
      await onInvitationDeclined(invitation);

      return res.status(200).json(invitation);
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
    getFailureLog,
    triggerByAssignment,
    getContractStatus,
    recordDeliveryEvent,
    cancelByAssignment,
    retryDue,
    listFailureLogsByPaper,
    listReviewerInbox,
    acceptReviewerInvitation,
    declineReviewerInvitation
  };
}
