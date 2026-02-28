function resolveSessionKey(req, assignmentId) {
  const authenticatedSessionId = req.authenticatedSession?.sessionId;
  const sessionHeader = req.headers?.['x-session-id'];
  const rawSessionId = authenticatedSessionId ?? sessionHeader ?? 'anonymous';
  return `${String(rawSessionId)}::${assignmentId}`;
}

function mapForbiddenMessage(reasonCode) {
  if (reasonCode === 'ASSIGNMENT_ACCESS_REVOKED') {
    return 'Reviewer access to this assignment has been revoked.';
  }

  return 'Reviewer does not have access to this assignment.';
}

function mapConflictMessage(code) {
  if (code === 'CONCURRENT_SUBMISSION_REJECTED') {
    return 'Concurrent submission rejected for this assignment.';
  }

  return 'A completed review already exists for this assignment.';
}

export function createReviewSubmissionController({
  reviewSubmissionModel,
  reviewRecordModel,
  validationFeedbackModel,
  reviewerPaperAssignmentModel
}) {
  const preservedSessionValues = new Map();

  function preserveValuesForSession({ req, assignmentId, values }) {
    preservedSessionValues.set(resolveSessionKey(req, assignmentId), structuredClone(values ?? {}));
  }

  function getPreservedValuesForSession({ req, assignmentId }) {
    const preserved = preservedSessionValues.get(resolveSessionKey(req, assignmentId));
    return preserved ? structuredClone(preserved) : null;
  }

  function clearPreservedValuesForSession({ req, assignmentId }) {
    preservedSessionValues.delete(resolveSessionKey(req, assignmentId));
  }

  async function getReviewStatus(req, res) {
    const assignmentId = req.params.assignmentId;
    const access = reviewerPaperAssignmentModel.resolveAccess({
      assignmentId,
      reviewerId: req.authenticatedReviewerId
    });

    if (!access.allowed) {
      return res.status(403).json({
        code: access.reasonCode,
        message: mapForbiddenMessage(access.reasonCode)
      });
    }

    const status = reviewRecordModel.getStatus(assignmentId);
    return res.status(200).json({
      assignmentId,
      status: status.status,
      completedAt: status.completedAt
    });
  }

  async function submitReview(req, res) {
    const assignmentId = req.params.assignmentId;
    const access = reviewerPaperAssignmentModel.resolveAccess({
      assignmentId,
      reviewerId: req.authenticatedReviewerId
    });

    if (!access.allowed) {
      return res.status(403).json({
        code: access.reasonCode,
        message: mapForbiddenMessage(access.reasonCode)
      });
    }

    const validation = reviewSubmissionModel.validate(req.body);
    if (!validation.valid) {
      preserveValuesForSession({
        req,
        assignmentId,
        values: req.body
      });

      return res.status(400).json(
        validationFeedbackModel.toValidationErrorResponse({
          assignmentId,
          missingFields: validation.missingFields
        })
      );
    }

    const completion = await reviewRecordModel.completeReview({
      assignmentId,
      reviewerId: access.assignment.reviewerId,
      paperId: access.assignment.paperId,
      submission: validation.value
    });

    if (!completion.ok) {
      return res.status(409).json({
        code: completion.code,
        message: mapConflictMessage(completion.code),
        existingReviewId: completion.existingReviewId ?? null
      });
    }

    clearPreservedValuesForSession({
      req,
      assignmentId
    });

    return res.status(201).json({
      reviewId: completion.reviewRecord.reviewId,
      assignmentId: completion.reviewRecord.assignmentId,
      status: completion.reviewRecord.status,
      completedAt: completion.reviewRecord.completedAt
    });
  }

  return {
    getReviewStatus,
    submitReview,
    preserveValuesForSession,
    getPreservedValuesForSession,
    clearPreservedValuesForSession
  };
}
