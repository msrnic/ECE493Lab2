export const EDITOR_ASSIGNMENT_SCOPES = Object.freeze({
  PAPER: 'paper',
  TRACK: 'track'
});

const ALLOWED_SCOPES = new Set(Object.values(EDITOR_ASSIGNMENT_SCOPES));

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return value.trim();
}

function normalizeScope(scope) {
  const normalizedScope = assertNonEmptyString(scope, 'assignmentScope').toLowerCase();

  if (!ALLOWED_SCOPES.has(normalizedScope)) {
    throw new Error(`assignmentScope must be one of ${Object.values(EDITOR_ASSIGNMENT_SCOPES).join(', ')}`);
  }

  return normalizedScope;
}

function normalizeAssignment(assignment) {
  const assignmentScope = normalizeScope(assignment.assignmentScope);
  const normalizedAssignment = {
    assignmentId: assertNonEmptyString(assignment.assignmentId, 'assignmentId'),
    editorId: assertNonEmptyString(assignment.editorId, 'editorId'),
    assignmentScope,
    paperId: null,
    trackId: null
  };

  if (assignmentScope === EDITOR_ASSIGNMENT_SCOPES.PAPER) {
    normalizedAssignment.paperId = assertNonEmptyString(assignment.paperId, 'paperId');
    if (assignment.trackId !== null && assignment.trackId !== undefined && String(assignment.trackId).trim().length > 0) {
      throw new Error('trackId must not be provided when assignmentScope is paper');
    }
  }

  if (assignmentScope === EDITOR_ASSIGNMENT_SCOPES.TRACK) {
    normalizedAssignment.trackId = assertNonEmptyString(assignment.trackId, 'trackId');
    if (assignment.paperId !== null && assignment.paperId !== undefined && String(assignment.paperId).trim().length > 0) {
      throw new Error('paperId must not be provided when assignmentScope is track');
    }
  }

  return normalizedAssignment;
}

function cloneAssignment(assignment) {
  return structuredClone(assignment);
}

function defaultAssignments() {
  return [
    {
      assignmentId: 'ASG-EDITOR-PAPER-1',
      editorId: 'editor-seeded',
      assignmentScope: EDITOR_ASSIGNMENT_SCOPES.PAPER,
      paperId: 'PAPER-123'
    },
    {
      assignmentId: 'ASG-EDITOR-TRACK-1',
      editorId: 'editor-track-seeded',
      assignmentScope: EDITOR_ASSIGNMENT_SCOPES.TRACK,
      trackId: 'TRACK-B'
    }
  ];
}

export function createEditorAssignmentModel({
  seedAssignments = defaultAssignments()
} = {}) {
  const assignmentStore = new Map();

  function upsertAssignment(assignment) {
    const normalizedAssignment = normalizeAssignment(assignment);
    assignmentStore.set(normalizedAssignment.assignmentId, normalizedAssignment);
    return cloneAssignment(normalizedAssignment);
  }

  function listAssignmentsForEditor(editorId) {
    const normalizedEditorId = assertNonEmptyString(editorId, 'editorId');
    return [...assignmentStore.values()]
      .filter((assignment) => assignment.editorId === normalizedEditorId)
      .map(cloneAssignment);
  }

  function resolveAccess({ editorId, paper }) {
    if (!paper || typeof paper !== 'object') {
      return {
        allowed: false,
        reasonCode: 'PAPER_UNAVAILABLE',
        assignment: null
      };
    }

    const matchingAssignment = listAssignmentsForEditor(editorId).find((assignment) => {
      if (assignment.assignmentScope === EDITOR_ASSIGNMENT_SCOPES.PAPER) {
        return assignment.paperId === paper.paperId;
      }

      return assignment.trackId === paper.trackId;
    });

    if (!matchingAssignment) {
      return {
        allowed: false,
        reasonCode: 'ASSIGNMENT_FORBIDDEN',
        assignment: null
      };
    }

    return {
      allowed: true,
      reasonCode: 'ASSIGNMENT_GRANTED',
      assignment: matchingAssignment
    };
  }

  for (const assignment of seedAssignments) {
    upsertAssignment(assignment);
  }

  return {
    upsertAssignment,
    listAssignmentsForEditor,
    resolveAccess
  };
}
