import { randomUUID } from 'node:crypto';

export const REVIEW_COMPLETION_STATUS = Object.freeze({
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  COMPLETED: 'COMPLETED'
});

function assertAssignmentId(assignmentId) {
  if (typeof assignmentId !== 'string' || assignmentId.trim().length === 0) {
    throw new Error('assignmentId is required');
  }

  return assignmentId.trim();
}

function cloneRecord(record) {
  if (!record) {
    return null;
  }

  return structuredClone(record);
}

function normalizeOptional(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function conflict(code, message, existingReviewId = null) {
  return {
    ok: false,
    code,
    message,
    existingReviewId
  };
}

export function createReviewRecordModel({
  idFactory = () => randomUUID(),
  nowFn = () => new Date(),
  yieldBeforePersist = true
} = {}) {
  const reviewRecords = new Map();
  const pendingCompletions = new Set();

  function getReviewRecord(assignmentId) {
    return cloneRecord(reviewRecords.get(assertAssignmentId(assignmentId)));
  }

  function getStatus(assignmentId) {
    const record = reviewRecords.get(assertAssignmentId(assignmentId));
    if (!record) {
      return {
        status: REVIEW_COMPLETION_STATUS.NOT_SUBMITTED,
        completedAt: null
      };
    }

    return {
      status: REVIEW_COMPLETION_STATUS.COMPLETED,
      completedAt: record.completedAt
    };
  }

  async function completeReview({
    assignmentId,
    reviewerId,
    paperId,
    submission
  }) {
    const normalizedAssignmentId = assertAssignmentId(assignmentId);
    const existing = reviewRecords.get(normalizedAssignmentId);
    if (existing) {
      return conflict(
        'REVIEW_ALREADY_COMPLETED',
        'A completed review already exists for this assignment.',
        existing.reviewId
      );
    }

    if (pendingCompletions.has(normalizedAssignmentId)) {
      return conflict(
        'CONCURRENT_SUBMISSION_REJECTED',
        'Concurrent submission rejected for this assignment.'
      );
    }

    pendingCompletions.add(normalizedAssignmentId);

    try {
      if (yieldBeforePersist) {
        await Promise.resolve();
      }

      const completedAt = nowFn().toISOString();
      const reviewRecord = {
        reviewId: idFactory(),
        assignmentId: normalizedAssignmentId,
        reviewerId: String(reviewerId ?? '').trim(),
        paperId: String(paperId ?? '').trim(),
        recommendation: String(submission?.recommendation ?? '').trim(),
        overallScore: Number(submission?.overallScore),
        confidenceScore: Number(submission?.confidenceScore),
        summary: String(submission?.summary ?? '').trim(),
        strengths: normalizeOptional(submission?.strengths),
        weaknesses: normalizeOptional(submission?.weaknesses),
        commentsForChair: normalizeOptional(submission?.commentsForChair),
        status: REVIEW_COMPLETION_STATUS.COMPLETED,
        completedAt
      };

      reviewRecords.set(normalizedAssignmentId, reviewRecord);
      return {
        ok: true,
        reviewRecord: cloneRecord(reviewRecord)
      };
    } finally {
      pendingCompletions.delete(normalizedAssignmentId);
    }
  }

  return {
    getReviewRecord,
    getStatus,
    completeReview
  };
}
