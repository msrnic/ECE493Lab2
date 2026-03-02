import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import {
  DECISION_VIEW_STATUSES,
  normalizeDecisionViewState,
  renderDecisionView,
  renderEvaluationsList
} from '../../../src/views/editor-decision-view.js';

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
        </select>
        <select data-decision-final-outcome>
          <option value="">Select</option>
          <option value="ACCEPT">ACCEPT</option>
        </select>
        <button data-decision-save type="submit">Save</button>
      </form>
      <a data-decision-override-link hidden href="#"></a>
      <section data-decision-evaluations></section>
    </main>
  `);
}

describe('editor-decision-view', () => {
  it('normalizes view states and defaults unknown statuses to error', () => {
    expect(normalizeDecisionViewState()).toEqual({
      status: DECISION_VIEW_STATUSES.IDLE,
      message: '',
      readOnly: false
    });

    expect(normalizeDecisionViewState({
      status: 'success',
      message: 'done'
    })).toEqual({
      status: DECISION_VIEW_STATUSES.SUCCESS,
      message: 'done',
      readOnly: false
    });

    expect(normalizeDecisionViewState({
      status: 'success'
    })).toEqual({
      status: DECISION_VIEW_STATUSES.SUCCESS,
      message: 'Decision stored successfully.',
      readOnly: false
    });

    expect(normalizeDecisionViewState({
      status: 'unknown'
    })).toEqual({
      status: DECISION_VIEW_STATUSES.ERROR,
      message: 'Decision was not recorded. Please retry.',
      readOnly: false
    });

    expect(normalizeDecisionViewState({
      status: 'read-only'
    }).readOnly).toBe(true);
  });

  it('renders evaluations for empty and non-empty states', () => {
    const dom = buildDom();
    const evaluationsElement = dom.window.document.querySelector('[data-decision-evaluations]');

    renderEvaluationsList(evaluationsElement, []);
    expect(evaluationsElement.textContent).toContain('No completed evaluations available.');

    renderEvaluationsList(evaluationsElement, [{
      evaluationId: 'E-1',
      reviewerId: 'r-1',
      recommendation: 'Strong'
    }]);
    expect(evaluationsElement.textContent).toContain('E-1');

    renderEvaluationsList(null, [{
      evaluationId: 'E-2'
    }]);
  });

  it('returns rendered false when required elements are missing', () => {
    const dom = new JSDOM('<main></main>');
    expect(renderDecisionView({
      documentRef: dom.window.document
    })).toEqual({ rendered: false });
  });

  it('renders workflow content and read-only/final state behavior', () => {
    const dom = buildDom();

    const firstRender = renderDecisionView({
      documentRef: dom.window.document,
      workflow: {
        paperId: 'PAPER-1',
        decisionStatus: 'UNDECIDED',
        finalOutcome: null,
        decisionVersion: 3,
        evaluations: [],
        overrideWorkflowUrl: null
      },
      state: {
        status: 'loading'
      }
    });
    expect(firstRender).toEqual({
      rendered: true,
      readOnly: true
    });
    expect(dom.window.document.querySelector('[data-decision-status]').dataset.state).toBe('loading');

    const actionSelect = dom.window.document.querySelector('[data-decision-action]');
    const finalOutcomeSelect = dom.window.document.querySelector('[data-decision-final-outcome]');
    actionSelect.disabled = false;
    actionSelect.value = 'FINAL';

    const secondRender = renderDecisionView({
      documentRef: dom.window.document,
      workflow: {
        paperId: 'PAPER-1',
        decisionStatus: 'FINAL',
        finalOutcome: 'ACCEPT',
        decisionVersion: 4,
        evaluations: [{
          evaluationId: 'E-1',
          reviewerId: 'r-1',
          recommendation: 'Strong'
        }],
        overrideWorkflowUrl: '/override/papers/PAPER-1'
      },
      state: {
        status: 'read-only'
      }
    });

    expect(secondRender).toEqual({
      rendered: true,
      readOnly: true
    });
    expect(dom.window.document.querySelector('[data-decision-current-state]').textContent).toContain('ACCEPT');
    expect(finalOutcomeSelect.value).toBe('ACCEPT');
    expect(finalOutcomeSelect.disabled).toBe(true);
    expect(dom.window.document.querySelector('[data-decision-override-link]').hidden).toBe(false);

    renderDecisionView({
      documentRef: dom.window.document,
      workflow: {
        decisionStatus: 'FINAL',
        finalOutcome: undefined,
        evaluations: []
      },
      state: {
        status: 'read-only'
      }
    });
    expect(dom.window.document.querySelector('[data-decision-paper-id]').value).toBe('');
    expect(dom.window.document.querySelector('[data-decision-version]').value).toBe('');
    expect(finalOutcomeSelect.value).toBe('');
  });
});
