function modelError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function toPublicPaper(paper) {
  return {
    paperId: paper.paperId,
    title: paper.title,
    state: paper.state,
    assignmentVersion: paper.assignmentVersion,
    requiredReviewerSlots: paper.requiredReviewerSlots
  };
}

function defaultPapers() {
  return [
    {
      paperId: 'paper-001',
      title: 'Deterministic Reviewer Assignment in Practice',
      state: 'submitted',
      assignmentVersion: 0,
      requiredReviewerSlots: 2
    },
    {
      paperId: 'paper-002',
      title: 'Conference Workflow Observability',
      state: 'submitted',
      assignmentVersion: 0,
      requiredReviewerSlots: 2
    },
    {
      paperId: 'paper-003',
      title: 'Withdrawn Paper Placeholder',
      state: 'withdrawn',
      assignmentVersion: 0,
      requiredReviewerSlots: 2
    }
  ];
}

export function createPaperSubmissionModel({ papers = defaultPapers() } = {}) {
  const paperStore = new Map();
  for (const paper of papers) {
    paperStore.set(paper.paperId, { ...paper });
  }

  function getPaperOrThrow(paperId) {
    const paper = paperStore.get(paperId);
    if (!paper) {
      throw modelError('PAPER_NOT_FOUND', 'paper was not found', { status: 404, paperId });
    }

    return paper;
  }

  function listSubmittedPapers() {
    return [...paperStore.values()]
      .filter((paper) => paper.state === 'submitted')
      .map(toPublicPaper);
  }

  function getPaperById(paperId) {
    const paper = paperStore.get(paperId);
    return paper ? toPublicPaper(paper) : null;
  }

  function assertPaperIsAssignable(paperId) {
    const paper = getPaperOrThrow(paperId);
    if (paper.state !== 'submitted') {
      throw modelError('PAPER_NOT_ASSIGNABLE', 'paper is no longer assignable', {
        status: 409,
        paperId,
        state: paper.state
      });
    }

    return paper;
  }

  function updatePaperState(paperId, state) {
    const paper = getPaperOrThrow(paperId);
    paper.state = state;
    return toPublicPaper(paper);
  }

  function incrementAssignmentVersion(paperId) {
    const paper = getPaperOrThrow(paperId);
    paper.assignmentVersion += 1;
    return paper.assignmentVersion;
  }

  return {
    listSubmittedPapers,
    getPaperById,
    assertPaperIsAssignable,
    updatePaperState,
    incrementAssignmentVersion
  };
}
