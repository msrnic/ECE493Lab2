import { normalizeUserRole } from './user-account-model.js';

function reviewerError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function defaultCandidatesByPaper() {
  return {
    'paper-001': [
      {
        reviewerId: 'reviewer-001',
        displayName: 'Alex Reviewer',
        email: 'alex.reviewer@example.com',
        availabilityStatus: 'available',
        coiFlag: false
      },
      {
        reviewerId: 'reviewer-002',
        displayName: 'Blair Reviewer',
        email: 'blair.reviewer@example.com',
        availabilityStatus: 'unavailable',
        coiFlag: false
      },
      {
        reviewerId: 'reviewer-003',
        displayName: 'Casey Reviewer',
        email: 'casey.reviewer@example.com',
        availabilityStatus: 'available',
        coiFlag: true
      },
      {
        reviewerId: 'reviewer-004',
        displayName: 'Devon Reviewer',
        email: 'devon.reviewer@example.com',
        availabilityStatus: 'available',
        coiFlag: false
      }
    ],
    'paper-002': [
      {
        reviewerId: 'reviewer-005',
        displayName: 'Evan Reviewer',
        email: 'evan.reviewer@example.com',
        availabilityStatus: 'available',
        coiFlag: false
      },
      {
        reviewerId: 'reviewer-006',
        displayName: 'Finley Reviewer',
        email: 'finley.reviewer@example.com',
        availabilityStatus: 'available',
        coiFlag: false
      }
    ]
  };
}

function toPublicCandidate(candidate) {
  return {
    reviewerId: candidate.reviewerId,
    displayName: candidate.displayName,
    email: candidate.email,
    availabilityStatus: candidate.availabilityStatus,
    coiFlag: candidate.coiFlag
  };
}

export function createReviewerModel({ candidatesByPaper = defaultCandidatesByPaper(), repository } = {}) {
  const store = new Map();
  for (const [paperId, candidates] of Object.entries(candidatesByPaper)) {
    store.set(
      paperId,
      candidates.map((candidate) => ({ ...candidate }))
    );
  }
  function getCandidatesOrThrow(paperId) {
    const candidates = store.get(paperId);
    if (!candidates) {
      throw reviewerError('PAPER_NOT_FOUND', 'paper was not found', {
        status: 404,
        paperId
      });
    }

    return candidates;
  }

  function listCandidates(paperId) {
    const staticCandidates = getCandidatesOrThrow(paperId).map(toPublicCandidate);
    const dynamicCandidates = listDynamicReviewerCandidates();
    return [...staticCandidates, ...dynamicCandidates];
  }

  function getCandidateById(paperId, reviewerId) {
    const staticCandidate = getCandidatesOrThrow(paperId).find((candidate) => candidate.reviewerId === reviewerId) ?? null;
    if (staticCandidate) {
      return staticCandidate;
    }

    return listDynamicReviewerCandidates().find((candidate) => candidate.reviewerId === reviewerId) ?? null;
  }

  function getCandidateOrThrow(paperId, reviewerId) {
    const candidate = getCandidateById(paperId, reviewerId);
    if (!candidate) {
      throw reviewerError('REVIEWER_NOT_FOUND', 'reviewer candidate was not found for paper', {
        status: 404,
        paperId,
        reviewerId
      });
    }

    return candidate;
  }

  function updateCandidate(paperId, reviewerId, updates) {
    const candidate = getCandidateOrThrow(paperId, reviewerId);
    if (!getCandidatesOrThrow(paperId).some((entry) => entry.reviewerId === reviewerId)) {
      return toPublicCandidate({ ...candidate, ...updates });
    }

    Object.assign(candidate, updates);
    return toPublicCandidate(candidate);
  }

  function listDynamicReviewerCandidates() {
    if (!repository?.listUserAccounts) {
      return [];
    }

    return repository
      .listUserAccounts()
      .filter((account) => account.status === 'active')
      .filter((account) => normalizeUserRole(account.lastAssignedRole ?? account.role) === 'reviewer')
      .map((account) => ({
        reviewerId: `account-${account.id}`,
        displayName: account.fullName ?? account.emailNormalized,
        email: account.emailNormalized,
        availabilityStatus: 'available',
        coiFlag: false
      }));
  }

  return {
    listCandidates,
    getCandidateById,
    getCandidateOrThrow,
    updateCandidate
  };
}
