/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';

import { initEditorScheduleConflicts } from '../../../src/assets/js/editor-schedule-conflicts.js';

function createDom() {
  document.body.innerHTML = `
    <input id="schedule-id" />
    <button id="load-conflicts" type="button">Load</button>
    <p id="conflict-status"></p>
    <pre id="conflict-output"></pre>
  `;
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

describe('editor schedule conflicts UI', () => {
  it('returns false when elements are missing', () => {
    document.body.innerHTML = '<div></div>';
    expect(initEditorScheduleConflicts()).toBe(false);
  });

  it('handles empty schedule id', async () => {
    createDom();
    const fetchImpl = vi.fn();

    initEditorScheduleConflicts({ documentRef: document, fetchImpl });
    document.querySelector('#load-conflicts').click();

    expect(document.querySelector('#conflict-status').textContent).toBe('Enter a schedule ID.');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('renders error and success responses', async () => {
    createDom();

    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse(404, { message: 'not found' }))
      .mockResolvedValueOnce(jsonResponse(200, { items: [{ conflictFlagId: 'c1' }] }));

    initEditorScheduleConflicts({ documentRef: document, fetchImpl });

    document.querySelector('#schedule-id').value = 'schedule-1';
    document.querySelector('#load-conflicts').click();

    await vi.waitFor(() => {
      expect(document.querySelector('#conflict-status').textContent).toBe('not found');
    });

    document.querySelector('#load-conflicts').click();

    await vi.waitFor(() => {
      expect(document.querySelector('#conflict-status').textContent).toBe('Loaded 1 conflict(s).');
    });

    expect(document.querySelector('#conflict-output').textContent).toContain('c1');
  });

  it('handles network errors', async () => {
    createDom();
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    initEditorScheduleConflicts({ documentRef: document, fetchImpl });

    document.querySelector('#schedule-id').value = 'schedule-1';
    document.querySelector('#load-conflicts').click();

    await vi.waitFor(() => {
      expect(document.querySelector('#conflict-status').textContent).toBe('Network error while loading conflicts.');
    });
  });
});
