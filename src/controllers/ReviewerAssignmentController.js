function mapAssignmentError(error) {
  return {
    status: error.status ?? 500,
    body: {
      code: error.code ?? 'INTERNAL_ERROR',
      message: error.message ?? 'Unexpected error.',
      ...(error.currentAssignmentVersion !== undefined
        ? { currentAssignmentVersion: error.currentAssignmentVersion }
        : {}),
      ...(error.blockingSelectionIds ? { blockingSelectionIds: error.blockingSelectionIds } : {})
    }
  };
}

export function createReviewerAssignmentController({
  paperSubmissionModel,
  reviewerModel,
  reviewerAssignmentModel,
  invitationController
} = {}) {
  function resolveRequestPayload(req) {
    const payload = req.body ?? {};
    if (!req.assignmentEditorId) {
      return payload;
    }

    return {
      ...payload,
      editorId: req.assignmentEditorId
    };
  }

  async function listSubmittedPapers(req, res) {
    try {
      if (req.query?.state !== 'submitted') {
        return res.status(400).json({
          code: 'ASSIGNMENT_BAD_REQUEST',
          message: 'state query must be submitted'
        });
      }

      return res.status(200).json({
        papers: paperSubmissionModel.listSubmittedPapers()
      });
    } catch (error) {
      const mapped = mapAssignmentError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function listReviewerCandidates(req, res) {
    try {
      paperSubmissionModel.assertPaperIsAssignable(req.params.paperId);
      return res.status(200).json({
        paperId: req.params.paperId,
        candidates: reviewerModel.listCandidates(req.params.paperId)
      });
    } catch (error) {
      const mapped = mapAssignmentError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function createAttempt(req, res) {
    try {
      const attempt = reviewerAssignmentModel.createAttempt(req.params.paperId, resolveRequestPayload(req));
      return res.status(201).json(attempt);
    } catch (error) {
      const mapped = mapAssignmentError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function replaceSelection(req, res) {
    try {
      const selection = reviewerAssignmentModel.replaceSelection(
        req.params.paperId,
        req.params.attemptId,
        req.params.selectionId,
        req.body?.replacementReviewerId
      );
      return res.status(200).json(selection);
    } catch (error) {
      const mapped = mapAssignmentError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function confirmAttempt(req, res) {
    try {
      const outcome = reviewerAssignmentModel.confirmAttempt(
        req.params.paperId,
        req.params.attemptId,
        resolveRequestPayload(req)
      );
      const dispatchedOutcome = invitationController
        ? await invitationController.dispatchForOutcome(outcome)
        : outcome;
      return res.status(200).json(dispatchedOutcome);
    } catch (error) {
      const mapped = mapAssignmentError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async function getOutcome(req, res) {
    try {
      const outcome = reviewerAssignmentModel.getOutcome(req.params.paperId, req.params.attemptId);
      return res.status(200).json(outcome);
    } catch (error) {
      const mapped = mapAssignmentError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  return {
    listSubmittedPapers,
    listReviewerCandidates,
    createAttempt,
    replaceSelection,
    confirmAttempt,
    getOutcome
  };
}
