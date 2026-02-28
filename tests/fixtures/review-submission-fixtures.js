export function createActiveAssignment(overrides = {}) {
  return {
    assignmentId: 'asg-review-1',
    reviewerId: 'account-reviewer-1',
    paperId: 'paper-1',
    accessState: 'ACTIVE',
    ...overrides
  };
}

export function createValidReviewPayload(overrides = {}) {
  return {
    recommendation: 'ACCEPT',
    overallScore: 4,
    confidenceScore: 3,
    summary: 'Well-structured paper with clear contributions.',
    strengths: 'Strong evaluation.',
    weaknesses: 'Minor writing issues.',
    commentsForChair: 'Fits scope.',
    ...overrides
  };
}

export function createInvalidReviewPayload(overrides = {}) {
  return {
    recommendation: '',
    overallScore: '',
    confidenceScore: '',
    summary: '   ',
    ...overrides
  };
}
