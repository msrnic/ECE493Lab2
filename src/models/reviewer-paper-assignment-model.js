export const REVIEWER_ASSIGNMENT_ACCESS_STATES = Object.freeze([
  'ACTIVE',
  'REVOKED'
]);

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return value.trim();
}

function normalizeAccessState(accessState = 'ACTIVE') {
  const normalized = assertNonEmptyString(accessState, 'accessState').toUpperCase();
  if (!REVIEWER_ASSIGNMENT_ACCESS_STATES.includes(normalized)) {
    throw new Error(`accessState must be one of ${REVIEWER_ASSIGNMENT_ACCESS_STATES.join(', ')}`);
  }

  return normalized;
}

function cloneAssignment(assignment) {
  if (!assignment) {
    return null;
  }

  return structuredClone(assignment);
}

export function createReviewerPaperAssignmentModel({
  seedAssignments = []
} = {}) {
  const assignments = new Map();

  function upsertAssignment({
    assignmentId,
    reviewerId,
    paperId,
    accessState = 'ACTIVE'
  }) {
    const normalizedAssignment = {
      assignmentId: assertNonEmptyString(assignmentId, 'assignmentId'),
      reviewerId: assertNonEmptyString(reviewerId, 'reviewerId'),
      paperId: assertNonEmptyString(paperId, 'paperId'),
      accessState: normalizeAccessState(accessState)
    };

    assignments.set(normalizedAssignment.assignmentId, normalizedAssignment);
    return cloneAssignment(normalizedAssignment);
  }

  function getAssignment(assignmentId) {
    return cloneAssignment(assignments.get(assertNonEmptyString(assignmentId, 'assignmentId')));
  }

  function setAccessState(assignmentId, accessState) {
    const normalizedAssignmentId = assertNonEmptyString(assignmentId, 'assignmentId');
    const existing = assignments.get(normalizedAssignmentId);
    if (!existing) {
      return null;
    }

    existing.accessState = normalizeAccessState(accessState);
    assignments.set(normalizedAssignmentId, existing);
    return cloneAssignment(existing);
  }

  function resolveAccess({
    assignmentId,
    reviewerId
  }) {
    const normalizedAssignmentId = assertNonEmptyString(assignmentId, 'assignmentId');
    const assignment = assignments.get(normalizedAssignmentId);
    if (!assignment) {
      return {
        allowed: false,
        reasonCode: 'ASSIGNMENT_FORBIDDEN',
        assignment: null
      };
    }

    if (assignment.reviewerId !== reviewerId) {
      return {
        allowed: false,
        reasonCode: 'ASSIGNMENT_FORBIDDEN',
        assignment: cloneAssignment(assignment)
      };
    }

    if (assignment.accessState !== 'ACTIVE') {
      return {
        allowed: false,
        reasonCode: 'ASSIGNMENT_ACCESS_REVOKED',
        assignment: cloneAssignment(assignment)
      };
    }

    return {
      allowed: true,
      reasonCode: 'ACCESS_GRANTED',
      assignment: cloneAssignment(assignment)
    };
  }

  for (const assignment of seedAssignments) {
    upsertAssignment(assignment);
  }

  return {
    upsertAssignment,
    getAssignment,
    setAccessState,
    resolveAccess
  };
}
