import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { bootstrapAssignReviewersPage } from '../../../src/assets/js/assign-reviewers-page.js';

function createDocument() {
  const dom = new JSDOM(`
    <main data-assignment-root>
      <p data-assignment-banner></p>
      <select data-assignment-paper></select>
      <select data-assignment-reviewers multiple></select>
      <button type="button" data-assignment-confirm>Confirm</button>
      <p data-outcome-banner></p>
      <ul data-outcome-list></ul>
    </main>
  `);
  return dom.window.document;
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('assign-reviewers bootstrap', () => {
  it('returns enhanced=false when mount point is missing', async () => {
    const dom = new JSDOM('<main></main>');
    const result = await bootstrapAssignReviewersPage({ documentRef: dom.window.document, fetchImpl: async () => response({}) });
    expect(result).toEqual({ enhanced: false });
  });

  it('loads papers, loads candidates for selected paper, and confirms assignment', async () => {
    const documentRef = createDocument();
    let createRequestCount = 0;
    let confirmRequestCount = 0;
    const createPayloads = [];
    const candidateCalls = [];
    const fetchImpl = async (url, options = {}) => {
      if (url === '/api/papers?state=submitted') {
        return response({
          papers: [
            { paperId: 'paper-001', title: 'Paper One', assignmentVersion: 0 },
            { paperId: 'paper-002', title: 'Paper Two', assignmentVersion: 0 }
          ]
        });
      }

      if (url === '/api/papers/paper-001/reviewer-candidates') {
        candidateCalls.push(url);
        return response({
          candidates: [
            { reviewerId: 'reviewer-001', displayName: 'Alex Reviewer', availabilityStatus: 'available', coiFlag: false },
            { reviewerId: 'reviewer-002', displayName: 'Blair Reviewer', availabilityStatus: 'available', coiFlag: false }
          ]
        });
      }

      if (url === '/api/papers/paper-002/reviewer-candidates') {
        candidateCalls.push(url);
        return response({
          candidates: [
            { reviewerId: 'reviewer-010', displayName: 'Casey Reviewer', availabilityStatus: 'available', coiFlag: false }
          ]
        });
      }

      if (url === '/api/papers/paper-001/assignment-attempts' && options.method === 'POST') {
        createRequestCount += 1;
        const payload = JSON.parse(options.body);
        createPayloads.push(payload);
        return response({
          attemptId: `attempt-${createRequestCount}`,
          basePaperVersion: payload.basePaperVersion
        });
      }

      if (
        (url === '/api/papers/paper-001/assignment-attempts/attempt-1/confirm'
          || url === '/api/papers/paper-001/assignment-attempts/attempt-2/confirm')
        && options.method === 'POST'
      ) {
        confirmRequestCount += 1;
        return response({
          message: 'Reviewer assignment confirmed.',
          followUpRequired: false,
          assignedReviewers: [
            {
              displayName: 'Alex Reviewer',
              invitation: { status: 'sent' }
            }
          ]
        });
      }

      return response({}, 404);
    };

    const result = await bootstrapAssignReviewersPage({
      documentRef,
      fetchImpl,
      editorId: 'editor-1'
    });
    expect(result.enhanced).toBe(true);
    expect(candidateCalls).toEqual(['/api/papers/paper-001/reviewer-candidates']);

    const events = [];
    result.appController.on('assignment:confirmed', (event) => events.push(event.detail));

    const reviewerSelect = documentRef.querySelector('[data-assignment-reviewers]');
    const confirmButton = documentRef.querySelector('[data-assignment-confirm]');
    expect(reviewerSelect.options.length).toBe(2);
    expect(confirmButton.disabled).toBe(true);

    reviewerSelect.options[0].selected = true;
    reviewerSelect.dispatchEvent(new documentRef.defaultView.Event('change'));
    expect(confirmButton.disabled).toBe(false);

    confirmButton.click();
    await flush();

    reviewerSelect.options[0].selected = false;
    reviewerSelect.options[1].selected = true;
    reviewerSelect.dispatchEvent(new documentRef.defaultView.Event('change'));
    confirmButton.click();
    await flush();

    expect(createRequestCount).toBe(2);
    expect(confirmRequestCount).toBe(2);
    expect(createPayloads[0]).toEqual({
      editorId: 'editor-1',
      basePaperVersion: 0,
      selections: [{ slotNumber: 1, reviewerId: 'reviewer-001' }]
    });
    expect(createPayloads[1]).toEqual({
      editorId: 'editor-1',
      basePaperVersion: 1,
      selections: [{ slotNumber: 1, reviewerId: 'reviewer-002' }]
    });
    expect(events).toHaveLength(2);
    expect(documentRef.querySelector('[data-assignment-banner]').dataset.state).toBe('success');
    expect(documentRef.querySelector('[data-outcome-list]').textContent).toContain('Alex Reviewer');

    const paperSelect = documentRef.querySelector('[data-assignment-paper]');
    paperSelect.value = 'paper-002';
    paperSelect.dispatchEvent(new documentRef.defaultView.Event('change'));
    await flush();

    expect(candidateCalls).toEqual([
      '/api/papers/paper-001/reviewer-candidates',
      '/api/papers/paper-002/reviewer-candidates'
    ]);
    expect(reviewerSelect.options.length).toBe(1);
    expect(reviewerSelect.options[0].value).toBe('reviewer-010');
    expect(confirmButton.disabled).toBe(true);

    result.unbind();
  });

  it('shows fallback error when reviewer candidates cannot be loaded', async () => {
    const documentRef = createDocument();
    const fetchImpl = async (url) => {
      if (url === '/api/papers?state=submitted') {
        return response({
          papers: [{ paperId: 'paper-001', title: 'Paper One', assignmentVersion: 0 }]
        });
      }

      if (url === '/api/papers/paper-001/reviewer-candidates') {
        throw {};
      }

      return response({}, 404);
    };

    await bootstrapAssignReviewersPage({ documentRef, fetchImpl });

    const banner = documentRef.querySelector('[data-assignment-banner]');
    expect(banner.dataset.state).toBe('error');
    expect(banner.textContent).toBe('Failed to load reviewer candidates.');
    expect(documentRef.querySelector('[data-assignment-reviewers]').options.length).toBe(0);
    expect(documentRef.querySelector('[data-assignment-confirm]').disabled).toBe(true);
  });

  it('shows selection validation errors before assignment API calls', async () => {
    const documentRefNoPapers = createDocument();
    const noPaperFetch = async (url) => {
      if (url === '/api/papers?state=submitted') {
        return response({ papers: [] });
      }
      return response({}, 404);
    };
    await bootstrapAssignReviewersPage({ documentRef: documentRefNoPapers, fetchImpl: noPaperFetch });
    const noPaperButton = documentRefNoPapers.querySelector('[data-assignment-confirm]');
    noPaperButton.disabled = false;
    noPaperButton.click();
    expect(documentRefNoPapers.querySelector('[data-assignment-banner]').textContent).toBe('Select a submitted paper.');

    const documentRefNoSelection = createDocument();
    let createCalled = false;
    const noSelectionFetch = async (url, options = {}) => {
      if (url === '/api/papers?state=submitted') {
        return response({ papers: [{ paperId: 'paper-001', title: 'Paper One', assignmentVersion: 0 }] });
      }
      if (url === '/api/papers/paper-001/reviewer-candidates') {
        return response({
          candidates: [{ reviewerId: 'reviewer-001', displayName: 'Alex', availabilityStatus: 'available', coiFlag: false }]
        });
      }
      if (url === '/api/papers/paper-001/assignment-attempts' && options.method === 'POST') {
        createCalled = true;
      }
      return response({}, 404);
    };
    await bootstrapAssignReviewersPage({ documentRef: documentRefNoSelection, fetchImpl: noSelectionFetch });
    const noSelectionButton = documentRefNoSelection.querySelector('[data-assignment-confirm]');
    noSelectionButton.disabled = false;
    noSelectionButton.click();
    expect(documentRefNoSelection.querySelector('[data-assignment-banner]').textContent).toBe('Select at least one reviewer.');
    expect(createCalled).toBe(false);
  });

  it('shows API error on confirm failure', async () => {
    const documentRef = createDocument();
    const fetchImpl = async (url, options = {}) => {
      if (url === '/api/papers?state=submitted') {
        return response({
          papers: [{ paperId: 'paper-001', title: 'Paper One', assignmentVersion: 0 }]
        });
      }

      if (url === '/api/papers/paper-001/reviewer-candidates') {
        return response({
          candidates: [{ reviewerId: 'reviewer-001', displayName: 'Alex', availabilityStatus: 'available', coiFlag: false }]
        });
      }

      if (url === '/api/papers/paper-001/assignment-attempts' && options.method === 'POST') {
        return response({
          attemptId: 'attempt-2',
          basePaperVersion: 0
        });
      }

      if (url === '/api/papers/paper-001/assignment-attempts/attempt-2/confirm' && options.method === 'POST') {
        return response({
          code: 'ASSIGNMENT_BLOCKED',
          message: 'all unavailable/conflicted selections must be replaced'
        }, 400);
      }

      return response({}, 404);
    };

    await bootstrapAssignReviewersPage({ documentRef, fetchImpl });

    const reviewerSelect = documentRef.querySelector('[data-assignment-reviewers]');
    reviewerSelect.options[0].selected = true;
    reviewerSelect.dispatchEvent(new documentRef.defaultView.Event('change'));

    documentRef.querySelector('[data-assignment-confirm]').click();
    await flush();

    const banner = documentRef.querySelector('[data-assignment-banner]');
    expect(banner.dataset.state).toBe('error');
    expect(banner.textContent).toContain('must be replaced');
  });

  it('uses generic assignment failure message when thrown error has no message', async () => {
    const documentRef = createDocument();
    const fetchImpl = async (url, options = {}) => {
      if (url === '/api/papers?state=submitted') {
        return response({
          papers: [{ paperId: 'paper-001', title: 'Paper One', assignmentVersion: 0 }]
        });
      }

      if (url === '/api/papers/paper-001/reviewer-candidates') {
        return response({
          candidates: [{ reviewerId: 'reviewer-001', displayName: 'Alex', availabilityStatus: 'available', coiFlag: false }]
        });
      }

      if (url === '/api/papers/paper-001/assignment-attempts' && options.method === 'POST') {
        throw {};
      }

      return response({}, 404);
    };

    await bootstrapAssignReviewersPage({ documentRef, fetchImpl });

    const reviewerSelect = documentRef.querySelector('[data-assignment-reviewers]');
    reviewerSelect.options[0].selected = true;
    reviewerSelect.dispatchEvent(new documentRef.defaultView.Event('change'));

    documentRef.querySelector('[data-assignment-confirm]').click();
    await flush();

    const banner = documentRef.querySelector('[data-assignment-banner]');
    expect(banner.dataset.state).toBe('error');
    expect(banner.textContent).toBe('Assignment failed.');
  });
});
