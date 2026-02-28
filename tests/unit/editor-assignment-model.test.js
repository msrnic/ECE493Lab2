import { describe, expect, it } from 'vitest';
import {
  EDITOR_ASSIGNMENT_SCOPES,
  createEditorAssignmentModel
} from '../../src/models/editor-assignment-model.js';
import {
  createPaperScopeAssignment,
  createReviewVisibilityPaper,
  createTrackScopeAssignment
} from '../fixtures/review-visibility-fixtures.js';

describe('editor-assignment-model', () => {
  it('authorizes using paper-scope and track-scope assignments', () => {
    const paper = createReviewVisibilityPaper();
    const model = createEditorAssignmentModel({
      seedAssignments: [
        createPaperScopeAssignment(),
        createTrackScopeAssignment({ editorId: 'editor-track' })
      ]
    });

    expect(model.listAssignmentsForEditor('editor-1')).toHaveLength(1);

    const paperAccess = model.resolveAccess({ editorId: 'editor-1', paper });
    expect(paperAccess).toMatchObject({ allowed: true, reasonCode: 'ASSIGNMENT_GRANTED' });

    const trackAccess = model.resolveAccess({
      editorId: 'editor-track',
      paper: createReviewVisibilityPaper({ paperId: 'PAPER-2', trackId: 'TRACK-TEST' })
    });
    expect(trackAccess).toMatchObject({ allowed: true, reasonCode: 'ASSIGNMENT_GRANTED' });
  });

  it('returns unavailable or forbidden when access cannot be resolved', () => {
    const model = createEditorAssignmentModel({ seedAssignments: [] });

    expect(model.resolveAccess({ editorId: 'editor-1', paper: null })).toEqual({
      allowed: false,
      reasonCode: 'PAPER_UNAVAILABLE',
      assignment: null
    });

    expect(model.resolveAccess({
      editorId: 'editor-1',
      paper: createReviewVisibilityPaper()
    })).toEqual({
      allowed: false,
      reasonCode: 'ASSIGNMENT_FORBIDDEN',
      assignment: null
    });
  });

  it('validates assignment normalization rules', () => {
    const model = createEditorAssignmentModel({ seedAssignments: [] });

    expect(() => model.upsertAssignment({})).toThrow(/assignmentScope must be a non-empty string/);
    expect(() => model.upsertAssignment({
      assignmentId: 'ASG-1',
      editorId: 'editor-1',
      assignmentScope: 'invalid'
    })).toThrow(/assignmentScope must be one of/);

    expect(() => model.upsertAssignment({
      assignmentId: 'ASG-2',
      editorId: 'editor-1',
      assignmentScope: EDITOR_ASSIGNMENT_SCOPES.PAPER,
      paperId: 'PAPER-1',
      trackId: 'TRACK-1'
    })).toThrow(/trackId must not be provided/);

    expect(() => model.upsertAssignment({
      assignmentId: 'ASG-3',
      editorId: 'editor-1',
      assignmentScope: EDITOR_ASSIGNMENT_SCOPES.TRACK,
      trackId: 'TRACK-1',
      paperId: 'PAPER-1'
    })).toThrow(/paperId must not be provided/);

    expect(() => model.listAssignmentsForEditor('')).toThrow(/editorId must be a non-empty string/);
  });
});
