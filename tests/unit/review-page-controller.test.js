import { describe, expect, it } from 'vitest';
import { createReviewPageController } from '../../src/controllers/review-page-controller.js';
import { createEditorAssignmentModel } from '../../src/models/editor-assignment-model.js';
import { createPaperModel } from '../../src/models/paper-model.js';
import {
  createPaperScopeAssignment,
  createReviewVisibilityPaper,
  createTrackScopeAssignment
} from '../fixtures/review-visibility-fixtures.js';
import { createMockResponse } from '../helpers/http-harness.js';

const templateHtml = `<!doctype html>
<body>
  <p>__EDITOR_REVIEWS_USER_EMAIL__</p>
  <select>__EDITOR_REVIEWS_OPTIONS__</select>
  <p>__EDITOR_REVIEWS_INITIAL_MESSAGE__</p>
</body>`;

describe('review-page-controller', () => {
  it('redirects unauthenticated and non-editor users', async () => {
    const controller = createReviewPageController({
      paperModel: createPaperModel({ seedPapers: [] }),
      editorAssignmentModel: createEditorAssignmentModel({ seedAssignments: [] }),
      templateHtml
    });

    const loginRedirectRes = createMockResponse();
    await controller.getReviewPage({ authenticatedSession: null }, loginRedirectRes);
    expect(loginRedirectRes.statusCode).toBe(302);
    expect(loginRedirectRes.redirectLocation).toBe('/login');

    const roleRedirectRes = createMockResponse();
    await controller.getReviewPage({
      authenticatedSession: { user: { id: 'reviewer-1', email: 'reviewer@example.com' } },
      authenticatedUserRole: 'reviewer'
    }, roleRedirectRes);
    expect(roleRedirectRes.statusCode).toBe(302);
    expect(roleRedirectRes.redirectLocation).toBe('/dashboard?roleUpdated=editor_required');
  });

  it('renders assigned papers and preserves valid selection', async () => {
    const paperModel = createPaperModel({
      seedPapers: [
        createReviewVisibilityPaper({ paperId: 'PAPER-1', trackId: 'TRACK-1', title: 'Paper One' }),
        createReviewVisibilityPaper({ paperId: 'PAPER-2', trackId: 'TRACK-2', title: 'Paper Two' })
      ]
    });
    const editorAssignmentModel = createEditorAssignmentModel({
      seedAssignments: [
        createPaperScopeAssignment({ paperId: 'PAPER-1', editorId: 'editor-1' }),
        createTrackScopeAssignment({ trackId: 'TRACK-2', editorId: 'editor-1' })
      ]
    });

    const controller = createReviewPageController({
      paperModel,
      editorAssignmentModel,
      templateHtml
    });

    const res = createMockResponse();
    await controller.getReviewPage({
      authenticatedSession: { user: { id: 'editor-1', email: 'editor@example.com' } },
      authenticatedUserRole: 'editor',
      query: { paperId: 'PAPER-2' }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('editor@example.com');
    expect(res.text).toContain('PAPER-1 - Paper One');
    expect(res.text).toContain('PAPER-2 - Paper Two');
    expect(res.text).toContain('Select &quot;View Reviews&quot; to load the latest outcome.');
    expect(res.text).toContain('value="PAPER-2" selected');
  });

  it('falls back to the first assigned paper when query paperId is absent', async () => {
    const paperModel = createPaperModel({
      seedPapers: [
        createReviewVisibilityPaper({ paperId: 'PAPER-A', title: 'Paper A', trackId: 'TRACK-A' }),
        createReviewVisibilityPaper({ paperId: 'PAPER-B', title: 'Paper B', trackId: 'TRACK-B' })
      ]
    });
    const editorAssignmentModel = createEditorAssignmentModel({
      seedAssignments: [
        createPaperScopeAssignment({ assignmentId: 'ASG-PAGE-A', editorId: 'editor-1', paperId: 'PAPER-A' }),
        createPaperScopeAssignment({ assignmentId: 'ASG-PAGE-B', editorId: 'editor-1', paperId: 'PAPER-B' })
      ]
    });
    const controller = createReviewPageController({
      paperModel,
      editorAssignmentModel,
      templateHtml
    });

    const res = createMockResponse();
    await controller.getReviewPage({
      authenticatedSession: { user: { id: 'editor-1', email: 'editor@example.com' } },
      authenticatedUserRole: 'editor'
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('value="PAPER-A" selected');
  });

  it('renders empty-assignment messaging when no papers are available', async () => {
    const controller = createReviewPageController({
      paperModel: createPaperModel({
        seedPapers: [createReviewVisibilityPaper()]
      }),
      editorAssignmentModel: createEditorAssignmentModel({ seedAssignments: [] }),
      templateHtml
    });

    const res = createMockResponse();
    await controller.getReviewPage({
      authenticatedSession: { user: { id: 'editor-1', email: 'editor@example.com' } },
      authenticatedUserRole: 'editor',
      query: { paperId: 'PAPER-DOES-NOT-EXIST' }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('No assigned papers</option>');
    expect(res.text).toContain('No assigned papers are currently available.');
  });

  it('validates controller dependencies', () => {
    expect(() => createReviewPageController()).toThrow(/paperModel and editorAssignmentModel are required/);
    expect(() => createReviewPageController({
      paperModel: createPaperModel({ seedPapers: [] }),
      editorAssignmentModel: createEditorAssignmentModel({ seedAssignments: [] }),
      templateHtml: ''
    })).toThrow(/templateHtml must be a non-empty string/);
  });
});
