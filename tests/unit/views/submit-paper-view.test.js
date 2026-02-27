/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
  applyValidationErrors,
  hydrateSubmissionForm,
  readSubmissionFormValues,
  renderValidationSummary,
  setSubmissionStatus
} from '../../../src/views/submit-paper-view.js';

describe('submit-paper-view', () => {
  it('reads submission form values and falls back when form is missing', () => {
    expect(readSubmissionFormValues(null)).toEqual({
      actionSequenceId: '',
      sessionId: '',
      metadata: {
        title: '',
        abstract: '',
        authorList: [],
        keywords: []
      }
    });

    document.body.innerHTML = `
      <form>
        <input name="actionSequenceId" value=" action-1 " />
        <input name="sessionId" value=" session-1 " />
        <input name="title" value=" Title " />
        <textarea name="abstract"> Abstract </textarea>
        <input name="authorList" value=" Alice, Bob , " />
        <input name="keywords" value=" ai, systems " />
      </form>
    `;

    const form = document.querySelector('form');
    expect(readSubmissionFormValues(form)).toEqual({
      actionSequenceId: 'action-1',
      sessionId: 'session-1',
      metadata: {
        title: 'Title',
        abstract: 'Abstract',
        authorList: ['Alice', 'Bob'],
        keywords: ['ai', 'systems']
      }
    });
  });

  it('renders validation summary and status text', () => {
    expect(renderValidationSummary()).toBe('');
    expect(renderValidationSummary([])).toBe('');
    expect(
      renderValidationSummary([
        {
          message: 'Title is required.'
        },
        {
          message: 'Abstract is required.'
        }
      ])
    ).toBe('Title is required. Abstract is required.');

    setSubmissionStatus(null, {
      type: 'error',
      message: 'Ignored'
    });

    const statusNode = document.createElement('p');
    setSubmissionStatus(statusNode, {
      type: 'success',
      message: 'Submitted.'
    });

    expect(statusNode.dataset.status).toBe('success');
    expect(statusNode.textContent).toBe('Submitted.');
  });

  it('applies field validation and hydrates preserved metadata', () => {
    applyValidationErrors(null, [
      {
        field: 'title'
      }
    ]);

    document.body.innerHTML = `
      <form>
        <input data-field name="title" />
        <textarea data-field name="abstract"></textarea>
        <input data-field name="authorList" />
        <input data-field name="keywords" />
      </form>
    `;

    const form = document.querySelector('form');
    form.querySelector('[name="title"]').setAttribute('aria-invalid', 'true');

    applyValidationErrors(form, [
      {
        field: 'title'
      },
      {
        field: 'files.manuscript'
      },
      {
        message: 'Unknown field'
      }
    ]);

    expect(form.querySelector('[name="title"]').getAttribute('aria-invalid')).toBe('true');
    expect(form.querySelector('[name="abstract"]').hasAttribute('aria-invalid')).toBe(false);

    hydrateSubmissionForm(form, {
      title: 'Hydrated title',
      abstract: 'Hydrated abstract',
      authorList: ['Alice', 'Bob'],
      keywords: ['ai']
    });

    expect(form.querySelector('[name="title"]').value).toBe('Hydrated title');
    expect(form.querySelector('[name="abstract"]').value).toBe('Hydrated abstract');
    expect(form.querySelector('[name="authorList"]').value).toBe('Alice, Bob');
    expect(form.querySelector('[name="keywords"]').value).toBe('ai');

    hydrateSubmissionForm(form, {
      authorList: 'not-an-array',
      keywords: null
    });
    expect(form.querySelector('[name="title"]').value).toBe('');
    expect(form.querySelector('[name="abstract"]').value).toBe('');
    expect(form.querySelector('[name="authorList"]').value).toBe('');
    expect(form.querySelector('[name="keywords"]').value).toBe('');

    hydrateSubmissionForm(null, {
      title: 'Ignored'
    });
  });
});
