function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function selectedAttribute(currentValue, selectedValue) {
  return currentValue === selectedValue ? ' selected' : '';
}

function buildPaperOptions({ papers, selectedPaperId }) {
  if (papers.length === 0) {
    return '<option value="" selected>No assigned papers</option>';
  }

  return papers
    .map((paper) => {
      const optionLabel = `${paper.paperId} - ${paper.title}`;
      return `<option value="${escapeHtml(paper.paperId)}"${selectedAttribute(paper.paperId, selectedPaperId)}>${escapeHtml(optionLabel)}</option>`;
    })
    .join('');
}

export function createReviewPageController({
  paperModel,
  editorAssignmentModel,
  templateHtml
} = {}) {
  if (!paperModel || !editorAssignmentModel) {
    throw new Error('paperModel and editorAssignmentModel are required');
  }

  if (typeof templateHtml !== 'string' || templateHtml.length === 0) {
    throw new Error('templateHtml must be a non-empty string');
  }

  async function getReviewPage(req, res) {
    const authenticatedSession = req.authenticatedSession;
    const editorId = authenticatedSession?.user?.id;

    if (!editorId) {
      return res.status(302).redirect('/login');
    }

    if (req.authenticatedUserRole !== 'editor') {
      return res.status(302).redirect('/dashboard?roleUpdated=editor_required');
    }

    const assignedPapers = paperModel
      .listPapers()
      .filter((paper) => editorAssignmentModel.resolveAccess({ editorId, paper }).allowed);

    const requestedPaperId = typeof req.query?.paperId === 'string'
      ? req.query.paperId.trim()
      : '';
    const selectedPaperId = assignedPapers.some((paper) => paper.paperId === requestedPaperId)
      ? requestedPaperId
      : (assignedPapers[0]?.paperId ?? '');

    const initialMessage = selectedPaperId
      ? 'Select "View Reviews" to load the latest outcome.'
      : 'No assigned papers are currently available.';

    const pageHtml = templateHtml
      .replaceAll('__EDITOR_REVIEWS_USER_EMAIL__', escapeHtml(authenticatedSession.user.email))
      .replaceAll('__EDITOR_REVIEWS_OPTIONS__', buildPaperOptions({ papers: assignedPapers, selectedPaperId }))
      .replaceAll('__EDITOR_REVIEWS_INITIAL_MESSAGE__', escapeHtml(initialMessage));

    return res.status(200).type('html').send(pageHtml);
  }

  return {
    getReviewPage
  };
}
