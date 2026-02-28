import {
  collectBlockingSelectionIds,
  hasAvailabilityConflict,
  hasCoiConflict,
  validateUniqueReviewers
} from './AssignmentValidation.js';

function assignmentError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function cloneSelection(selection) {
  return {
    selectionId: selection.selectionId,
    slotNumber: selection.slotNumber,
    reviewerId: selection.reviewerId,
    availabilitySnapshot: selection.availabilitySnapshot,
    coiSnapshot: selection.coiSnapshot,
    status: selection.status,
    replacedReviewerId: selection.replacedReviewerId ?? null
  };
}

function cloneAttempt(attempt) {
  return {
    attemptId: attempt.attemptId,
    paperId: attempt.paperId,
    editorId: attempt.editorId,
    status: attempt.status,
    basePaperVersion: attempt.basePaperVersion,
    selections: attempt.selections.map(cloneSelection),
    confirmedAt: attempt.confirmedAt ?? null
  };
}

function createAssignedReviewerPayload(assignment, invitation) {
  return {
    assignmentId: assignment.assignmentId,
    reviewerId: assignment.reviewerId,
    displayName: assignment.displayName,
    replacedReviewerId: assignment.replacedReviewerId ?? null,
    invitation
  };
}

function computeAttemptStatus(selections) {
  const hasBlocking = selections.some((selection) => selection.status === 'needs_replacement');
  if (!hasBlocking) {
    return 'ready_to_confirm';
  }

  if (selections.some((selection) => selection.coiSnapshot === true)) {
    return 'blocked_coi';
  }

  return 'blocked_unavailable';
}

export function createReviewerAssignmentModel({
  paperSubmissionModel,
  reviewerModel,
  invitationModel,
  idFactory = () => crypto.randomUUID(),
  nowFn = () => new Date().toISOString()
} = {}) {
  const attemptStore = new Map();
  const outcomeStore = new Map();
  const assignmentsByAttemptId = new Map();

  function getAttemptOrThrow(paperId, attemptId) {
    const attempt = attemptStore.get(attemptId);
    if (!attempt || attempt.paperId !== paperId) {
      throw assignmentError('ASSIGNMENT_ATTEMPT_NOT_FOUND', 'assignment attempt was not found', {
        status: 404,
        paperId,
        attemptId
      });
    }

    return attempt;
  }

  function createSelectionSnapshot(paperId, inputSelection, slotNumber) {
    const candidate = reviewerModel.getCandidateOrThrow(paperId, inputSelection.reviewerId);
    return {
      selectionId: idFactory(),
      slotNumber,
      reviewerId: candidate.reviewerId,
      displayName: candidate.displayName,
      availabilitySnapshot: candidate.availabilityStatus,
      coiSnapshot: candidate.coiFlag,
      status: hasAvailabilityConflict(candidate) || hasCoiConflict(candidate) ? 'needs_replacement' : 'eligible',
      replacedReviewerId: null
    };
  }

  function createAttempt(paperId, payload) {
    const paper = paperSubmissionModel.assertPaperIsAssignable(paperId);
    validateUniqueReviewers(payload?.selections);

    if (!Number.isInteger(payload?.basePaperVersion) || payload.basePaperVersion < 0) {
      throw assignmentError('ASSIGNMENT_BAD_REQUEST', 'basePaperVersion must be a non-negative integer', {
        status: 400
      });
    }

    if (payload.basePaperVersion !== paper.assignmentVersion) {
      throw assignmentError('STALE_CONFIRMATION', 'paper assignment version changed; reload current state', {
        status: 409,
        currentAssignmentVersion: paper.assignmentVersion
      });
    }

    const selections = payload.selections.map((selection, index) => {
      const slotNumber = selection.slotNumber ?? index + 1;
      return createSelectionSnapshot(paperId, selection, slotNumber);
    });

    const attempt = {
      attemptId: idFactory(),
      paperId,
      editorId: payload.editorId,
      status: computeAttemptStatus(selections),
      basePaperVersion: payload.basePaperVersion,
      selections,
      confirmedAt: null
    };
    attemptStore.set(attempt.attemptId, attempt);
    return cloneAttempt(attempt);
  }

  function replaceSelection(paperId, attemptId, selectionId, replacementReviewerId) {
    const attempt = getAttemptOrThrow(paperId, attemptId);
    const selection = attempt.selections.find((entry) => entry.selectionId === selectionId);
    if (!selection) {
      throw assignmentError('ASSIGNMENT_SELECTION_NOT_FOUND', 'assignment selection was not found', {
        status: 404,
        selectionId
      });
    }

    const duplicateInAttempt = attempt.selections.some((entry) => {
      if (entry.selectionId === selectionId) {
        return false;
      }

      return entry.reviewerId === replacementReviewerId;
    });
    if (duplicateInAttempt) {
      throw assignmentError('DUPLICATE_REVIEWER', 'replacement reviewer must be unique in this attempt', {
        status: 400,
        reviewerId: replacementReviewerId
      });
    }

    const replacementCandidate = reviewerModel.getCandidateOrThrow(paperId, replacementReviewerId);
    selection.replacedReviewerId = selection.replacedReviewerId ?? selection.reviewerId;
    selection.reviewerId = replacementCandidate.reviewerId;
    selection.displayName = replacementCandidate.displayName;
    selection.availabilitySnapshot = replacementCandidate.availabilityStatus;
    selection.coiSnapshot = replacementCandidate.coiFlag;
    selection.status = hasAvailabilityConflict(replacementCandidate) || hasCoiConflict(replacementCandidate)
      ? 'needs_replacement'
      : 'eligible';
    attempt.status = computeAttemptStatus(attempt.selections);
    return cloneSelection(selection);
  }

  function confirmAttempt(paperId, attemptId, payload) {
    const attempt = getAttemptOrThrow(paperId, attemptId);
    const paper = paperSubmissionModel.assertPaperIsAssignable(paperId);
    if (payload?.basePaperVersion !== paper.assignmentVersion) {
      attempt.status = 'rejected_stale';
      throw assignmentError('STALE_CONFIRMATION', 'another editor has already confirmed this paper assignment', {
        status: 409,
        currentAssignmentVersion: paper.assignmentVersion
      });
    }

    const blockingSelectionIds = collectBlockingSelectionIds(attempt.selections);
    if (blockingSelectionIds.length > 0) {
      throw assignmentError('ASSIGNMENT_BLOCKED', 'all unavailable/conflicted selections must be replaced', {
        status: 400,
        blockingSelectionIds
      });
    }

    attempt.status = 'confirmed';
    attempt.confirmedAt = nowFn();
    paperSubmissionModel.incrementAssignmentVersion(paperId);

    const assignments = attempt.selections.map((selection) => ({
      assignmentId: idFactory(),
      paperId,
      reviewerId: selection.reviewerId,
      displayName: selection.displayName,
      slotNumber: selection.slotNumber,
      replacedReviewerId: selection.replacedReviewerId ?? null
    }));
    assignmentsByAttemptId.set(attemptId, assignments);

    const assignedReviewers = assignments.map((assignment) => {
      const invitation = invitationModel.createInvitation({
        assignmentId: assignment.assignmentId,
        reviewerId: assignment.reviewerId,
        displayName: assignment.displayName
      });
      return createAssignedReviewerPayload(assignment, invitation);
    });
    const replacedReviewers = assignments
      .filter((assignment) => assignment.replacedReviewerId)
      .map((assignment) => ({
        slotNumber: assignment.slotNumber,
        originalReviewerId: assignment.replacedReviewerId,
        replacementReviewerId: assignment.reviewerId
      }));
    const outcome = {
      paperId,
      attemptId,
      outcome: 'confirmed',
      assignedReviewers,
      replacedReviewers,
      followUpRequired: false,
      message: 'Reviewer assignment confirmed.'
    };
    outcomeStore.set(attemptId, outcome);
    return structuredClone(outcome);
  }

  function getOutcome(paperId, attemptId) {
    const attempt = getAttemptOrThrow(paperId, attemptId);
    const storedOutcome = outcomeStore.get(attemptId);

    if (!storedOutcome) {
      if (attempt.status === 'rejected_stale') {
        return {
          paperId,
          attemptId,
          outcome: 'rejected_stale',
          assignedReviewers: [],
          replacedReviewers: [],
          followUpRequired: false,
          message: 'This confirmation is stale. Reload the latest assignment state.'
        };
      }

      throw assignmentError('ASSIGNMENT_OUTCOME_NOT_FOUND', 'assignment outcome is not available yet', {
        status: 404
      });
    }

    const refreshedReviewers = storedOutcome.assignedReviewers.map((assignedReviewer) => {
      const invitation = invitationModel.getInvitation(assignedReviewer.invitation.invitationId);
      return {
        ...assignedReviewer,
        invitation: invitation ?? assignedReviewer.invitation
      };
    });
    const followUpRequired = refreshedReviewers.some((assignedReviewer) => assignedReviewer.invitation.followUpRequired);
    return {
      ...storedOutcome,
      assignedReviewers: refreshedReviewers,
      followUpRequired
    };
  }

  function getAttempt(paperId, attemptId) {
    return cloneAttempt(getAttemptOrThrow(paperId, attemptId));
  }

  function listAssignments(attemptId) {
    return [...(assignmentsByAttemptId.get(attemptId) ?? [])];
  }

  return {
    createAttempt,
    replaceSelection,
    confirmAttempt,
    getOutcome,
    getAttempt,
    listAssignments
  };
}
