import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { createAssignmentOutcomeView } from '../../../src/views/AssignmentOutcomeView.js';

describe('AssignmentOutcomeView', () => {
  it('renders invitation statuses and warning state for follow-up', () => {
    const dom = new JSDOM(`
      <p data-outcome-banner></p>
      <ul data-outcome-list></ul>
    `);
    const view = createAssignmentOutcomeView({ documentRef: dom.window.document });

    view.renderOutcome({
      assignedReviewers: [
        {
          displayName: 'Reviewer A',
          invitation: {
            status: 'retry_scheduled',
            nextRetryAt: '2026-02-08T10:05:00.000Z'
          }
        },
        {
          displayName: 'Reviewer B',
          invitation: {
            status: 'failed_terminal'
          }
        }
      ],
      followUpRequired: true,
      message: 'Follow-up required.'
    });

    const listItems = [...dom.window.document.querySelectorAll('[data-outcome-list] li')];
    expect(listItems).toHaveLength(2);
    expect(listItems[0].textContent).toContain('next: 2026-02-08T10:05:00.000Z');
    expect(listItems[1].textContent).toContain('follow-up required');

    const banner = dom.window.document.querySelector('[data-outcome-banner]');
    expect(banner.dataset.state).toBe('warning');
  });

  it('handles success state and missing list element', () => {
    const dom = new JSDOM('<p data-outcome-banner></p><ul data-outcome-list></ul>');
    const view = createAssignmentOutcomeView({ documentRef: dom.window.document });
    view.renderOutcome({
      assignedReviewers: [
        {
          displayName: 'Reviewer C',
          invitation: {
            status: 'sent'
          }
        }
      ],
      followUpRequired: false,
      message: 'Assigned'
    });
    expect(dom.window.document.querySelector('[data-outcome-banner]').dataset.state).toBe('success');

    const emptyDom = new JSDOM('<p data-outcome-banner></p>');
    const noListView = createAssignmentOutcomeView({ documentRef: emptyDom.window.document });
    expect(() => noListView.renderOutcome({ assignedReviewers: [], followUpRequired: false })).not.toThrow();

    const noDocumentView = createAssignmentOutcomeView();
    expect(() => noDocumentView.renderOutcome({})).not.toThrow();

    view.renderOutcome({
      followUpRequired: false
    });
    expect(dom.window.document.querySelector('[data-outcome-banner]').textContent).toBe('');
  });
});
