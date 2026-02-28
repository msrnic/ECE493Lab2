import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { createAssignReviewersView } from '../../../src/views/AssignReviewersView.js';

function createDocument() {
  const dom = new JSDOM(`
    <main>
      <p data-assignment-banner></p>
      <select data-assignment-paper></select>
      <select data-assignment-reviewers multiple></select>
      <button data-assignment-confirm type="button">Confirm</button>
    </main>
  `);
  return dom.window.document;
}

describe('AssignReviewersView', () => {
  it('renders papers, reviewers, selection and bind/unbind flow', () => {
    const documentRef = createDocument();
    const view = createAssignReviewersView({ documentRef });

    view.renderPapers([
      { paperId: 'paper-1', title: 'Paper One' },
      { paperId: 'paper-2', title: 'Paper Two' }
    ]);
    view.renderReviewerCandidates([
      { reviewerId: 'reviewer-1', displayName: 'A', availabilityStatus: 'available', coiFlag: false },
      { reviewerId: 'reviewer-2', displayName: 'B', availabilityStatus: 'unavailable', coiFlag: false },
      { reviewerId: 'reviewer-3', displayName: 'C', availabilityStatus: 'available', coiFlag: true }
    ]);
    view.setState('loading', 'Working...');

    const banner = documentRef.querySelector('[data-assignment-banner]');
    expect(banner.dataset.state).toBe('loading');
    expect(banner.textContent).toBe('Working...');

    const reviewerSelect = documentRef.querySelector('[data-assignment-reviewers]');
    expect(reviewerSelect.options[0].textContent).toBe('A (available)');
    expect(reviewerSelect.options[1].textContent).toBe('B (unavailable)');
    expect(reviewerSelect.options[2].textContent).toBe('C (conflict)');
    reviewerSelect.options[0].selected = true;
    reviewerSelect.options[1].selected = true;

    const paperEvents = [];
    const unbindPaper = view.bindPaperChange((paperId) => paperEvents.push(paperId));
    const paperSelect = documentRef.querySelector('[data-assignment-paper]');
    paperSelect.dispatchEvent(new documentRef.defaultView.Event('change'));
    const blankPaperOption = documentRef.createElement('option');
    blankPaperOption.value = '';
    blankPaperOption.textContent = 'Choose paper';
    paperSelect.appendChild(blankPaperOption);
    paperSelect.value = '';
    paperSelect.dispatchEvent(new documentRef.defaultView.Event('change'));
    unbindPaper();
    paperSelect.dispatchEvent(new documentRef.defaultView.Event('change'));
    expect(paperEvents).toEqual(['paper-1', null]);

    paperSelect.value = 'paper-1';
    const reviewerEvents = [];
    const unbindReviewer = view.bindReviewerChange((selection) => reviewerEvents.push(selection));
    reviewerSelect.dispatchEvent(new documentRef.defaultView.Event('change'));
    unbindReviewer();
    reviewerSelect.dispatchEvent(new documentRef.defaultView.Event('change'));
    expect(reviewerEvents).toEqual([
      { paperId: 'paper-1', reviewerIds: ['reviewer-1', 'reviewer-2'] }
    ]);

    view.setConfirmEnabled(false);
    expect(documentRef.querySelector('[data-assignment-confirm]').disabled).toBe(true);
    view.setConfirmEnabled(true);
    expect(documentRef.querySelector('[data-assignment-confirm]').disabled).toBe(false);

    const events = [];
    const unbind = view.bindConfirm((selection) => {
      events.push(selection);
    });
    documentRef.querySelector('[data-assignment-confirm]').click();
    unbind();
    documentRef.querySelector('[data-assignment-confirm]').click();

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      paperId: 'paper-1',
      reviewerIds: ['reviewer-1', 'reviewer-2']
    });
  });

  it('supports missing document mount points', () => {
    const view = createAssignReviewersView({});
    expect(view.getSelection()).toEqual({
      paperId: null,
      reviewerIds: []
    });
    const unbind = view.bindConfirm(() => {});
    expect(typeof unbind).toBe('function');
    expect(() => unbind()).not.toThrow();
    const unbindPaper = view.bindPaperChange(() => {});
    const unbindReviewer = view.bindReviewerChange(() => {});
    expect(typeof unbindPaper).toBe('function');
    expect(typeof unbindReviewer).toBe('function');
    expect(() => unbindPaper()).not.toThrow();
    expect(() => unbindReviewer()).not.toThrow();
    expect(() => view.renderPapers([{ paperId: 'p1', title: 't1' }])).not.toThrow();
    expect(() => view.renderReviewerCandidates([{ reviewerId: 'r1', displayName: 'n', availabilityStatus: 'available' }])).not.toThrow();
    expect(() => view.setState('idle', '')).not.toThrow();
    expect(() => view.setConfirmEnabled(true)).not.toThrow();
  });

  it('handles undefined paper/candidate arrays', () => {
    const documentRef = createDocument();
    const view = createAssignReviewersView({ documentRef });
    expect(() => view.renderPapers()).not.toThrow();
    expect(() => view.renderReviewerCandidates()).not.toThrow();
    expect(documentRef.querySelector('[data-assignment-paper]').options.length).toBe(0);
    expect(documentRef.querySelector('[data-assignment-reviewers]').options.length).toBe(0);
  });
});
