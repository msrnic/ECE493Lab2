import { EDITOR_ASSIGNMENT_SCOPES } from '../../src/models/editor-assignment-model.js';
import { REVIEW_STATUSES } from '../../src/models/review-model.js';

export function createReviewVisibilityPaper(overrides = {}) {
  return {
    paperId: 'PAPER-TEST-1',
    trackId: 'TRACK-TEST',
    title: 'Test-Driven Review Visibility',
    currentState: 'under_review',
    ...overrides
  };
}

export function createSubmittedReview(overrides = {}) {
  return {
    reviewId: 'REV-SUBMITTED-1',
    paperId: 'PAPER-TEST-1',
    reviewerId: 'reviewer-1',
    reviewerName: 'Reviewer One',
    status: REVIEW_STATUSES.SUBMITTED,
    overallScore: 4,
    comments: 'Comprehensive and technically sound.',
    submittedAt: '2026-02-08T09:00:00.000Z',
    ...overrides
  };
}

export function createInProgressReview(overrides = {}) {
  return {
    reviewId: 'REV-IN-PROGRESS-1',
    paperId: 'PAPER-TEST-1',
    reviewerId: 'reviewer-2',
    reviewerName: 'Reviewer Two',
    status: REVIEW_STATUSES.IN_PROGRESS,
    overallScore: null,
    comments: '',
    submittedAt: null,
    ...overrides
  };
}

export function createPaperScopeAssignment(overrides = {}) {
  return {
    assignmentId: 'ASG-PAPER-1',
    editorId: 'editor-1',
    assignmentScope: EDITOR_ASSIGNMENT_SCOPES.PAPER,
    paperId: 'PAPER-TEST-1',
    ...overrides
  };
}

export function createTrackScopeAssignment(overrides = {}) {
  return {
    assignmentId: 'ASG-TRACK-1',
    editorId: 'editor-1',
    assignmentScope: EDITOR_ASSIGNMENT_SCOPES.TRACK,
    trackId: 'TRACK-TEST',
    ...overrides
  };
}
