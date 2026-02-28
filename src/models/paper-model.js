function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return value.trim();
}

function clonePaper(paper) {
  return paper ? structuredClone(paper) : null;
}

function normalizePaper(paper) {
  return {
    paperId: assertNonEmptyString(paper.paperId, 'paperId'),
    trackId: assertNonEmptyString(paper.trackId, 'trackId'),
    title: assertNonEmptyString(paper.title, 'title'),
    currentState: assertNonEmptyString(paper.currentState ?? 'under_review', 'currentState')
  };
}

function defaultPapers() {
  return [
    {
      paperId: 'PAPER-123',
      trackId: 'TRACK-A',
      title: 'Evidence-Based Program Committees',
      currentState: 'under_review'
    },
    {
      paperId: 'PAPER-456',
      trackId: 'TRACK-B',
      title: 'Latency Modeling for Conference Workflows',
      currentState: 'under_review'
    }
  ];
}

export function createPaperModel({
  seedPapers = defaultPapers()
} = {}) {
  const paperStore = new Map();

  function upsertPaper(paper) {
    const normalizedPaper = normalizePaper(paper);
    paperStore.set(normalizedPaper.paperId, normalizedPaper);
    return clonePaper(normalizedPaper);
  }

  function listPapers() {
    return [...paperStore.values()].map(clonePaper);
  }

  function getPaperById(paperId) {
    const normalizedPaperId = assertNonEmptyString(paperId, 'paperId');
    return clonePaper(paperStore.get(normalizedPaperId) ?? null);
  }

  function removePaper(paperId) {
    const normalizedPaperId = assertNonEmptyString(paperId, 'paperId');
    return paperStore.delete(normalizedPaperId);
  }

  for (const paper of seedPapers) {
    upsertPaper(paper);
  }

  return {
    upsertPaper,
    listPapers,
    getPaperById,
    removePaper
  };
}
