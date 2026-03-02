/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';

import { initAdminScheduleGeneration, pollRun } from '../../../src/assets/js/admin-schedule-generation.js';

function createDom() {
  document.body.innerHTML = `
    <form id="generation-form">
      <textarea id="notes"></textarea>
      <button type="submit">Generate</button>
    </form>
    <p id="status-message"></p>
    <pre id="schedule-output"></pre>
  `;
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

describe('admin schedule generation UI', () => {
  it('returns false when required elements are missing', () => {
    document.body.innerHTML = '<div></div>';
    expect(initAdminScheduleGeneration()).toBe(false);
  });

  it('submits generation, polls, and renders completed run', async () => {
    createDom();

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(202, {
        runId: 'run-1',
        inProgressMessage: 'Generation is currently in progress.'
      }))
      .mockResolvedValueOnce(jsonResponse(200, {
        runId: 'run-1',
        status: 'completed',
        schedule: { scheduleId: 'schedule-1' }
      }));

    expect(initAdminScheduleGeneration({ documentRef: document, fetchImpl })).toBe(true);

    document.querySelector('#notes').value = 'Start now';
    document.querySelector('#generation-form').dispatchEvent(new Event('submit'));

    await vi.waitFor(() => {
      expect(document.querySelector('#status-message').textContent).toBe('Generation completed.');
    });

    expect(document.querySelector('#schedule-output').textContent).toContain('schedule-1');
  });

  it('handles immediate error statuses and unexpected responses', async () => {
    createDom();

    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse(409, { message: 'busy' }))
      .mockResolvedValueOnce(jsonResponse(500, { message: 'broken' }));

    initAdminScheduleGeneration({ documentRef: document, fetchImpl });

    document.querySelector('#generation-form').dispatchEvent(new Event('submit'));
    await vi.waitFor(() => {
      expect(document.querySelector('#status-message').textContent).toBe('busy');
    });

    document.querySelector('#generation-form').dispatchEvent(new Event('submit'));
    await vi.waitFor(() => {
      expect(document.querySelector('#status-message').textContent).toBe('Unexpected response while starting generation.');
    });
  });

  it('handles network errors on submit', async () => {
    createDom();

    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    initAdminScheduleGeneration({ documentRef: document, fetchImpl });

    document.querySelector('#generation-form').dispatchEvent(new Event('submit'));

    await vi.waitFor(() => {
      expect(document.querySelector('#status-message').textContent).toBe('Network error while starting generation.');
    });
  });

  it('pollRun handles non-ok, failed, and timeout branches', async () => {
    const statusElement = document.createElement('p');
    const outputElement = document.createElement('pre');

    await pollRun('run-1', vi.fn().mockResolvedValue(jsonResponse(404, { message: 'not found' })), statusElement, outputElement);
    expect(statusElement.textContent).toBe('not found');

    await pollRun('run-1', vi.fn().mockResolvedValue(jsonResponse(200, { status: 'failed', failureReason: 'bad input' })), statusElement, outputElement);
    expect(statusElement.textContent).toBe('bad input');

    await pollRun('run-1', vi.fn().mockResolvedValue(jsonResponse(200, { status: 'failed' })), statusElement, outputElement);
    expect(statusElement.textContent).toBe('Generation failed.');

    const inProgressResponse = jsonResponse(200, { status: 'in_progress' });
    await pollRun('run-1', vi.fn().mockResolvedValue(inProgressResponse), statusElement, outputElement);
    expect(statusElement.textContent).toBe('Generation status polling timed out.');
  });

  it('uses fallback notes and in-progress message defaults', async () => {
    createDom();
    document.querySelector('#notes').remove();

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(202, { runId: 'run-1' }))
      .mockResolvedValueOnce(jsonResponse(404, { message: 'stopped' }));

    initAdminScheduleGeneration({ documentRef: document, fetchImpl });
    document.querySelector('#generation-form').dispatchEvent(new Event('submit'));

    await vi.waitFor(() => {
      expect(document.querySelector('#status-message').textContent).toBe('stopped');
    });

    const firstBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(firstBody.notes).toBe('');
  });
});
