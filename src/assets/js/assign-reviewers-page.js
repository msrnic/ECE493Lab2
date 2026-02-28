import { createApiClient } from '../../models/ApiClient.js';
import { createAppController } from '../../controllers/AppController.js';
import { createAssignReviewersView } from '../../views/AssignReviewersView.js';
import { createAssignmentOutcomeView } from '../../views/AssignmentOutcomeView.js';

function toSelectionPayload(selection) {
  return selection.reviewerIds.map((reviewerId, index) => ({
    slotNumber: index + 1,
    reviewerId
  }));
}

function hasValidSelection(selection) {
  return Boolean(selection.paperId) && selection.reviewerIds.length > 0;
}

export async function bootstrapAssignReviewersPage({
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch,
  editorId = 'editor-ui'
} = {}) {
  if (!documentRef?.querySelector('[data-assignment-root]')) {
    return { enhanced: false };
  }

  const api = createApiClient({
    fetchImpl,
    baseUrl: '/api'
  });
  const assignmentVersionsByPaperId = new Map();
  const appController = createAppController();
  const assignmentView = createAssignReviewersView({ documentRef });
  const outcomeView = createAssignmentOutcomeView({ documentRef });

  assignmentView.setConfirmEnabled(false);
  assignmentView.setState('loading', 'Loading submitted papers...');

  const paperResult = await api.request('/papers?state=submitted');
  for (const paper of paperResult.papers) {
    assignmentVersionsByPaperId.set(paper.paperId, paper.assignmentVersion);
  }
  assignmentView.renderPapers(paperResult.papers);

  async function loadCandidatesForPaper(paperId) {
    if (!paperId) {
      assignmentView.renderReviewerCandidates([]);
      assignmentView.setState('idle', 'No submitted papers available.');
      assignmentView.setConfirmEnabled(false);
      return;
    }

    assignmentView.setState('loading', 'Loading reviewer candidates...');
    try {
      const candidateResult = await api.request(`/papers/${paperId}/reviewer-candidates`);
      assignmentView.renderReviewerCandidates(candidateResult.candidates);
      assignmentView.setState('idle', '');
    } catch (error) {
      assignmentView.renderReviewerCandidates([]);
      assignmentView.setState('error', error.message ?? 'Failed to load reviewer candidates.');
    } finally {
      assignmentView.setConfirmEnabled(hasValidSelection(assignmentView.getSelection()));
    }
  }

  const unbindPaperChange = assignmentView.bindPaperChange((paperId) => loadCandidatesForPaper(paperId));
  const unbindReviewerChange = assignmentView.bindReviewerChange((selection) => {
    assignmentView.setConfirmEnabled(hasValidSelection(selection));
  });

  await loadCandidatesForPaper(assignmentView.getSelection().paperId);

  const unbind = assignmentView.bindConfirm(async (selection) => {
    if (!selection.paperId) {
      assignmentView.setState('error', 'Select a submitted paper.');
      return;
    }
    if (selection.reviewerIds.length === 0) {
      assignmentView.setState('error', 'Select at least one reviewer.');
      return;
    }

    assignmentView.setState('loading', 'Creating assignment attempt...');
    try {
      const attempt = await api.request(`/papers/${selection.paperId}/assignment-attempts`, {
        method: 'POST',
        body: {
          editorId,
          basePaperVersion: assignmentVersionsByPaperId.get(selection.paperId),
          selections: toSelectionPayload(selection)
        }
      });

      const outcome = await api.request(`/papers/${selection.paperId}/assignment-attempts/${attempt.attemptId}/confirm`, {
        method: 'POST',
        body: {
          editorId,
          basePaperVersion: attempt.basePaperVersion
        }
      });
      outcomeView.renderOutcome(outcome);
      appController.emit('assignment:confirmed', outcome);
      assignmentVersionsByPaperId.set(selection.paperId, attempt.basePaperVersion + 1);
      assignmentView.setState('success', 'Assignment completed.');
    } catch (error) {
      assignmentView.setState('error', error.message ?? 'Assignment failed.');
    }
  });

  return {
    enhanced: true,
    unbind: () => {
      unbind();
      unbindPaperChange();
      unbindReviewerChange();
    },
    appController
  };
}
