import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  clearReviewFormFeedback,
  hydrateReviewForm,
  readReviewFormValues,
  renderValidationFeedback,
  resolveReviewAssignmentId,
  setReviewFormStatus
} from '../../../src/views/review-form-view.js';

function createDom() {
  return new JSDOM(`<!doctype html><html><body>
    <main data-review-form-page data-assignment-id="asg-view-1">
      <form data-review-form data-assignment-id="asg-view-1">
        <select name="recommendation" data-review-field="recommendation">
          <option value="">Select</option>
          <option value="ACCEPT">Accept</option>
        </select>
        <input name="overallScore" data-review-field="overallScore" />
        <input name="confidenceScore" data-review-field="confidenceScore" />
        <textarea name="summary" data-review-field="summary"></textarea>
        <textarea name="strengths" data-review-field="strengths"></textarea>
        <textarea name="weaknesses" data-review-field="weaknesses"></textarea>
        <textarea name="commentsForChair" data-review-field="commentsForChair"></textarea>
      </form>
      <p data-review-form-status></p>
      <div data-review-form-errors></div>
    </main>
  </body></html>`);
}

describe('review-form-view', () => {
  it('reads and normalizes review form values', () => {
    const dom = createDom();
    const { document } = dom.window;
    const form = document.querySelector('[data-review-form]');

    form.querySelector('[name="recommendation"]').value = 'ACCEPT';
    form.querySelector('[name="overallScore"]').value = '4';
    form.querySelector('[name="confidenceScore"]').value = '3';
    form.querySelector('[name="summary"]').value = '  Detailed summary.  ';
    form.querySelector('[name="strengths"]').value = 'Strong methods';

    expect(readReviewFormValues(form)).toEqual({
      recommendation: 'ACCEPT',
      overallScore: 4,
      confidenceScore: 3,
      summary: 'Detailed summary.',
      strengths: 'Strong methods',
      weaknesses: '',
      commentsForChair: ''
    });

    form.querySelector('[name="overallScore"]').value = 'N/A';
    expect(readReviewFormValues(form).overallScore).toBe('N/A');

    expect(readReviewFormValues(null)).toEqual({
      recommendation: '',
      overallScore: '',
      confidenceScore: '',
      summary: '',
      strengths: '',
      weaknesses: '',
      commentsForChair: ''
    });
  });

  it('uses global FormData fallback when window FormData is unavailable', () => {
    const originalFormData = globalThis.FormData;
    class FakeFormData {
      constructor(form) {
        this.form = form;
      }

      entries() {
        return Object.entries(this.form.__entries);
      }
    }

    globalThis.FormData = FakeFormData;
    const fakeForm = {
      __entries: {
        recommendation: 'ACCEPT',
        overallScore: '5',
        confidenceScore: '4',
        summary: 'Fallback path',
        strengths: '',
        weaknesses: '',
        commentsForChair: ''
      }
    };

    try {
      expect(readReviewFormValues(fakeForm)).toEqual({
        recommendation: 'ACCEPT',
        overallScore: 5,
        confidenceScore: 4,
        summary: 'Fallback path',
        strengths: '',
        weaknesses: '',
        commentsForChair: ''
      });
    } finally {
      globalThis.FormData = originalFormData;
    }
  });

  it('sets status and hydrates values', () => {
    const dom = createDom();
    const { document } = dom.window;
    const form = document.querySelector('[data-review-form]');
    const status = document.querySelector('[data-review-form-status]');

    hydrateReviewForm(form, {
      recommendation: 'ACCEPT',
      overallScore: 5,
      confidenceScore: 4,
      summary: 'Hydrated summary',
      strengths: 'Hydrated strengths',
      weaknesses: 'Hydrated weaknesses',
      commentsForChair: 'Hydrated comments'
    });
    setReviewFormStatus(status, {
      type: 'warning',
      message: 'Status message'
    });
    setReviewFormStatus(null, {
      type: 'info',
      message: 'Ignored'
    });
    hydrateReviewForm(null, {});

    expect(form.querySelector('[name="summary"]').value).toBe('Hydrated summary');
    expect(status.dataset.status).toBe('warning');
    expect(status.textContent).toBe('Status message');
  });

  it('renders and clears validation feedback', () => {
    const dom = createDom();
    const { document } = dom.window;
    const form = document.querySelector('[data-review-form]');
    const errors = document.querySelector('[data-review-form-errors]');

    const summary = renderValidationFeedback(form, errors, {
      missingFields: ['summary', 'overallScore'],
      fieldMessages: {
        summary: 'Summary required.',
        overallScore: 'Overall score required.'
      }
    });

    expect(summary).toContain('Summary required.');
    expect(form.querySelector('[name="summary"]').getAttribute('aria-invalid')).toBe('true');
    expect(form.querySelector('[name="overallScore"]').getAttribute('aria-invalid')).toBe('true');

    clearReviewFormFeedback(form, errors);
    expect(errors.textContent).toBe('');
    expect(form.querySelector('[name="summary"]').hasAttribute('aria-invalid')).toBe(false);

    const fallback = renderValidationFeedback(form, errors, {
      missingFields: ['confidenceScore'],
      fieldMessages: {}
    });
    expect(fallback).toBe('Complete all required review fields.');

    const noneMissing = renderValidationFeedback(form, errors, {
      missingFields: [],
      fieldMessages: {}
    });
    expect(noneMissing).toBe('');

    const nonArrayMissing = renderValidationFeedback(form, errors, {
      missingFields: 'summary',
      fieldMessages: { summary: 'Ignored non-array.' }
    });
    expect(nonArrayMissing).toBe('');

    expect(renderValidationFeedback(null, null, {})).toBe('');
    clearReviewFormFeedback(null, null);
  });

  it('resolves assignment id from page/form datasets', () => {
    const dom = createDom();
    const { document } = dom.window;
    expect(resolveReviewAssignmentId({ documentRef: document })).toBe('asg-view-1');

    document.querySelector('[data-review-form]').dataset.assignmentId = '';
    document.querySelector('[data-review-form-page]').dataset.assignmentId = 'asg-view-2';
    expect(resolveReviewAssignmentId({ documentRef: document })).toBe('asg-view-2');

    expect(resolveReviewAssignmentId({ documentRef: null })).toBe('');
  });
});
