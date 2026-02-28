export const REVIEW_STATUSES = Object.freeze({
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted'
});

const ALLOWED_STATUSES = new Set(Object.values(REVIEW_STATUSES));

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return value.trim();
}

function normalizeDateInput(value, fieldName) {
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return parsed.toISOString();
}

function normalizeReviewStatus(status) {
  const normalizedStatus = assertNonEmptyString(status, 'status').toLowerCase();
  if (!ALLOWED_STATUSES.has(normalizedStatus)) {
    throw new Error(`status must be one of ${Object.values(REVIEW_STATUSES).join(', ')}`);
  }

  return normalizedStatus;
}

function normalizeReview(review) {
  const normalizedStatus = normalizeReviewStatus(review.status);
  const normalizedReview = {
    reviewId: assertNonEmptyString(review.reviewId, 'reviewId'),
    paperId: assertNonEmptyString(review.paperId, 'paperId'),
    reviewerId: assertNonEmptyString(review.reviewerId, 'reviewerId'),
    reviewerName: assertNonEmptyString(review.reviewerName, 'reviewerName'),
    status: normalizedStatus,
    overallScore: review.overallScore,
    comments: typeof review.comments === 'string' ? review.comments.trim() : '',
    submittedAt: review.submittedAt ? normalizeDateInput(review.submittedAt, 'submittedAt') : null
  };

  if (normalizedStatus === REVIEW_STATUSES.SUBMITTED) {
    if (!Number.isFinite(normalizedReview.overallScore)) {
      throw new Error('overallScore must be a finite number when status is submitted');
    }

    if (normalizedReview.comments.length === 0) {
      throw new Error('comments must be provided when status is submitted');
    }

    if (!normalizedReview.submittedAt) {
      throw new Error('submittedAt must be provided when status is submitted');
    }
  }

  return normalizedReview;
}

function cloneReview(review) {
  return structuredClone(review);
}

function toReviewSummary(review) {
  return {
    reviewId: review.reviewId,
    reviewerId: review.reviewerId,
    reviewerName: review.reviewerName,
    overallScore: review.overallScore,
    comments: review.comments,
    submittedAt: review.submittedAt
  };
}

function defaultReviews() {
  return [
    {
      reviewId: 'REV-1',
      paperId: 'PAPER-123',
      reviewerId: 'USER-1',
      reviewerName: 'Jordan Lee',
      status: REVIEW_STATUSES.SUBMITTED,
      overallScore: 4.5,
      comments: 'Strong methodology and clear presentation.',
      submittedAt: '2026-02-08T14:12:00.000Z'
    },
    {
      reviewId: 'REV-2',
      paperId: 'PAPER-123',
      reviewerId: 'USER-2',
      reviewerName: 'Casey Morgan',
      status: REVIEW_STATUSES.IN_PROGRESS,
      overallScore: null,
      comments: '',
      submittedAt: null
    }
  ];
}

export function createReviewModel({
  seedReviews = defaultReviews()
} = {}) {
  const reviewStore = new Map();

  function upsertReview(review) {
    const normalizedReview = normalizeReview(review);
    reviewStore.set(normalizedReview.reviewId, normalizedReview);
    return cloneReview(normalizedReview);
  }

  function removeReview(reviewId) {
    const normalizedReviewId = assertNonEmptyString(reviewId, 'reviewId');
    return reviewStore.delete(normalizedReviewId);
  }

  function listReviewsForPaper(paperId) {
    const normalizedPaperId = assertNonEmptyString(paperId, 'paperId');
    return [...reviewStore.values()]
      .filter((review) => review.paperId === normalizedPaperId)
      .map(cloneReview);
  }

  function listSubmittedReviewSummaries(paperId) {
    return listReviewsForPaper(paperId)
      .filter((review) => review.status === REVIEW_STATUSES.SUBMITTED)
      .map(toReviewSummary);
  }

  function buildVisibilityResult({ paperId }) {
    const normalizedPaperId = assertNonEmptyString(paperId, 'paperId');
    const submittedReviews = listSubmittedReviewSummaries(normalizedPaperId);

    if (submittedReviews.length === 0) {
      return {
        paperId: normalizedPaperId,
        status: 'pending',
        reviews: []
      };
    }

    return {
      paperId: normalizedPaperId,
      status: 'available',
      reviews: submittedReviews
    };
  }

  for (const review of seedReviews) {
    upsertReview(review);
  }

  return {
    upsertReview,
    removeReview,
    listReviewsForPaper,
    listSubmittedReviewSummaries,
    buildVisibilityResult
  };
}
