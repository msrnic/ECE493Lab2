import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { bootstrapDecisionWorkflowPage } from '../../../src/assets/js/decision-workflow-page.js';

function buildDom() {
  return new JSDOM(`
    <main data-decision-workflow-app>
      <p data-decision-status></p>
      <p data-decision-current-state></p>
      <form data-decision-form>
        <input data-decision-paper-id value="PAPER-1" />
        <input data-decision-version value="1" />
        <select data-decision-action>
          <option value="DEFER">DEFER</option>
          <option value="FINAL">FINAL</option>
          <option value="INVALID">INVALID</option>
        </select>
        <select data-decision-final-outcome>
          <option value="">Select</option>
          <option value="ACCEPT">ACCEPT</option>
          <option value="REJECT">REJECT</option>
        </select>
        <button data-decision-save type="submit">Save</button>
      </form>
      <a data-decision-override-link hidden href="#"></a>
      <section data-decision-evaluations></section>
    </main>
  `);
}

describe('decision-workflow-page bootstrap', () => {
  it('returns enhanced false when required elements are missing', async () => {
    const dom = new JSDOM('<main></main>');
    const result = await bootstrapDecisionWorkflowPage({
      documentRef: dom.window.document,
      apiClient: {
        loadWorkflow: vi.fn(),
        saveDecision: vi.fn()
      }
    });
    expect(result).toEqual({ enhanced: false });
  });

  it('loads workflow and submits successful save requests', async () => {
    const dom = buildDom();
    const apiClient = {
      loadWorkflow: vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          payload: {
            paperId: 'PAPER-1',
            decisionStatus: 'UNDECIDED',
            finalOutcome: null,
            decisionVersion: 1,
            evaluations: [{
              evaluationId: 'E-1',
              reviewerId: 'reviewer-1',
              recommendation: 'Strong'
            }]
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          payload: {
            paperId: 'PAPER-1',
            decisionStatus: 'FINAL',
            finalOutcome: 'ACCEPT',
            decisionVersion: 2,
            evaluations: []
          }
        }),
      saveDecision: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        payload: {
          paperId: 'PAPER-1',
          decisionStatus: 'FINAL',
          finalOutcome: 'ACCEPT',
          decisionVersion: 2,
          saved: true
        }
      })
    };

    const result = await bootstrapDecisionWorkflowPage({
      documentRef: dom.window.document,
      apiClient,
      idempotencyKeyFactory: () => 'idem-1'
    });
    expect(result.enhanced).toBe(true);
    expect(apiClient.loadWorkflow).toHaveBeenCalledTimes(1);

    const actionSelect = dom.window.document.querySelector('[data-decision-action]');
    const outcomeSelect = dom.window.document.querySelector('[data-decision-final-outcome]');
    const form = dom.window.document.querySelector('[data-decision-form]');
    actionSelect.value = 'FINAL';
    actionSelect.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    outcomeSelect.value = 'ACCEPT';

    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(apiClient.saveDecision).toHaveBeenCalledWith('PAPER-1', {
      action: 'FINAL',
      finalOutcome: 'ACCEPT',
      expectedVersion: 1
    }, {
      idempotencyKey: 'idem-1'
    });
    expect(apiClient.loadWorkflow).toHaveBeenCalledTimes(2);
  });

  it('handles load failures on initial workflow fetch', async () => {
    const dom = buildDom();
    const apiClient = {
      loadWorkflow: vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          payload: { message: 'Authentication is required.' }
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          payload: { message: 'Authentication is required.' }
        }),
      saveDecision: vi.fn()
    };

    await bootstrapDecisionWorkflowPage({
      documentRef: dom.window.document,
      apiClient
    });

    expect(dom.window.document.querySelector('[data-decision-status]').textContent).toContain('Authentication is required');

    const form = dom.window.document.querySelector('[data-decision-form]');
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(apiClient.loadWorkflow).toHaveBeenCalledTimes(2);
  });

  it('handles request errors and invalid form selections on submit', async () => {
    const dom = buildDom();
    const apiClient = {
      loadWorkflow: vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          payload: {
            paperId: 'PAPER-1',
            decisionStatus: 'UNDECIDED',
            finalOutcome: null,
            decisionVersion: 1,
            evaluations: []
          }
        }),
      saveDecision: vi.fn()
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValueOnce({
          ok: false,
          status: 412,
          payload: { message: 'Required reviews are not available.' }
        })
    };

    await bootstrapDecisionWorkflowPage({
      documentRef: dom.window.document,
      apiClient
    });

    const form = dom.window.document.querySelector('[data-decision-form]');
    const actionSelect = dom.window.document.querySelector('[data-decision-action]');
    const outcomeSelect = dom.window.document.querySelector('[data-decision-final-outcome]');
    const versionInput = dom.window.document.querySelector('[data-decision-version]');

    actionSelect.value = 'INVALID';
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.querySelector('[data-decision-status]').textContent).toContain('valid decision action');

    actionSelect.value = 'FINAL';
    outcomeSelect.value = '';
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.querySelector('[data-decision-status]').textContent).toContain('Select a final outcome');

    versionInput.value = '0';
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.querySelector('[data-decision-status]').textContent).toContain('Decision version is invalid');

    versionInput.value = '1';
    outcomeSelect.value = 'ACCEPT';
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.querySelector('[data-decision-status]').textContent).toContain('Please retry');

    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.querySelector('[data-decision-status]').textContent).toContain('Required reviews are not available');
  });

  it('submits defer commands and handles load exceptions', async () => {
    const dom = buildDom();
    const apiClient = {
      loadWorkflow: vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          payload: {
            paperId: 'PAPER-1',
            decisionStatus: 'UNDECIDED',
            finalOutcome: null,
            decisionVersion: 1,
            evaluations: []
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          payload: {
            paperId: 'PAPER-1',
            decisionStatus: 'UNDECIDED',
            finalOutcome: null,
            decisionVersion: 2,
            evaluations: []
          }
        }),
      saveDecision: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        payload: {
          paperId: 'PAPER-1',
          decisionStatus: 'UNDECIDED',
          finalOutcome: null,
          decisionVersion: 2,
          saved: true
        }
      })
    };

    await bootstrapDecisionWorkflowPage({
      documentRef: dom.window.document,
      apiClient
    });
    const form = dom.window.document.querySelector('[data-decision-form]');
    const actionSelect = dom.window.document.querySelector('[data-decision-action]');
    actionSelect.value = 'DEFER';
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(apiClient.saveDecision).toHaveBeenCalledWith('PAPER-1', {
      action: 'DEFER',
      expectedVersion: 1
    }, expect.any(Object));

    const failingLoadDom = buildDom();
    await bootstrapDecisionWorkflowPage({
      documentRef: failingLoadDom.window.document,
      apiClient: {
        loadWorkflow: vi.fn().mockRejectedValue(new Error('down')),
        saveDecision: vi.fn()
      }
    });
    expect(failingLoadDom.window.document.querySelector('[data-decision-status]').textContent).toContain('Unable to load workflow');
  });

  it('maps status-only errors when payload messages are missing', async () => {
    const load401Dom = buildDom();
    await bootstrapDecisionWorkflowPage({
      documentRef: load401Dom.window.document,
      apiClient: {
        loadWorkflow: vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          payload: {}
        }),
        saveDecision: vi.fn()
      }
    });
    expect(load401Dom.window.document.querySelector('[data-decision-status]').textContent).toContain('Authentication is required');

    const submitDom = buildDom();
    const apiClient = {
      loadWorkflow: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        payload: {
          paperId: 'PAPER-1',
          decisionStatus: 'UNDECIDED',
          finalOutcome: null,
          decisionVersion: 1,
          evaluations: []
        }
      }),
      saveDecision: vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          payload: {}
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          payload: {}
        })
    };
    await bootstrapDecisionWorkflowPage({
      documentRef: submitDom.window.document,
      apiClient
    });

    const form = submitDom.window.document.querySelector('[data-decision-form]');
    const actionSelect = submitDom.window.document.querySelector('[data-decision-action]');
    actionSelect.value = 'DEFER';

    form.dispatchEvent(new submitDom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(submitDom.window.document.querySelector('[data-decision-status]').textContent).toContain('Reload and retry');

    form.dispatchEvent(new submitDom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(submitDom.window.document.querySelector('[data-decision-status]').textContent).toContain('Please retry');
  });

  it('creates a default API client when one is not provided', async () => {
    const dom = buildDom();
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          paperId: 'PAPER-1',
          decisionStatus: 'UNDECIDED',
          finalOutcome: null,
          decisionVersion: 1,
          evaluations: []
        })
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          paperId: 'PAPER-1',
          decisionStatus: 'UNDECIDED',
          finalOutcome: null,
          decisionVersion: 2,
          saved: true
        })
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          paperId: 'PAPER-1',
          decisionStatus: 'UNDECIDED',
          finalOutcome: null,
          decisionVersion: 2,
          evaluations: []
        })
      });

    await bootstrapDecisionWorkflowPage({
      documentRef: dom.window.document,
      fetchImpl
    });

    const form = dom.window.document.querySelector('[data-decision-form]');
    const actionSelect = dom.window.document.querySelector('[data-decision-action]');
    actionSelect.value = 'DEFER';
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('handles empty paper ids before loading or saving', async () => {
    const dom = buildDom();
    const paperIdInput = dom.window.document.querySelector('[data-decision-paper-id]');
    paperIdInput.value = '';
    const result = await bootstrapDecisionWorkflowPage({
      documentRef: dom.window.document,
      apiClient: {
        loadWorkflow: vi.fn(),
        saveDecision: vi.fn()
      }
    });
    expect(result.enhanced).toBe(true);
    expect(dom.window.document.querySelector('[data-decision-status]').textContent).toContain('before loading');

    const domSave = buildDom();
    const saveClient = {
      loadWorkflow: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        payload: {
          paperId: 'PAPER-1',
          decisionStatus: 'UNDECIDED',
          finalOutcome: null,
          decisionVersion: 1,
          evaluations: []
        }
      }),
      saveDecision: vi.fn()
    };

    await bootstrapDecisionWorkflowPage({
      documentRef: domSave.window.document,
      apiClient: saveClient
    });

    domSave.window.document.querySelector('[data-decision-paper-id]').value = '';
    const form = domSave.window.document.querySelector('[data-decision-form]');
    form.dispatchEvent(new domSave.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(domSave.window.document.querySelector('[data-decision-status]').textContent).toContain('before saving');
    expect(saveClient.saveDecision).not.toHaveBeenCalled();
  });
});
