import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  bootstrapReviewFormPage,
  createReviewSubmissionApi
} from '../../../src/assets/js/review-form-page.js';

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function createJsonResponse({ ok, status, payload, throwOnJson = false }) {
  return {
    ok,
    status,
    async json() {
      if (throwOnJson) {
        throw new Error('invalid json');
      }

      return payload;
    }
  };
}

function createReviewFormDom(assignmentId = 'asg-page-1') {
  return new JSDOM(`<!doctype html><html><body>
    <main data-review-form-page data-assignment-id="${assignmentId}">
      <form data-review-form data-assignment-id="${assignmentId}">
        <select name="recommendation" data-review-field="recommendation">
          <option value="">Select</option>
          <option value="ACCEPT">Accept</option>
        </select>
        <input name="overallScore" data-review-field="overallScore" value="4" />
        <input name="confidenceScore" data-review-field="confidenceScore" value="3" />
        <textarea name="summary" data-review-field="summary">Good paper</textarea>
        <textarea name="strengths" data-review-field="strengths"></textarea>
        <textarea name="weaknesses" data-review-field="weaknesses"></textarea>
        <textarea name="commentsForChair" data-review-field="commentsForChair"></textarea>
        <button type="submit">Submit</button>
      </form>
      <p data-review-form-status></p>
      <div data-review-form-errors></div>
    </main>
  </body></html>`);
}

describe('review-form-page', () => {
  it('requests status/submission endpoints through the API helper', async () => {
    const fetchImpl = vi.fn(async (url, options) => {
      if (options.method === 'GET') {
        return createJsonResponse({
          ok: true,
          status: 200,
          payload: { status: 'NOT_SUBMITTED' }
        });
      }

      return createJsonResponse({
        ok: true,
        status: 201,
        payload: { status: 'COMPLETED' }
      });
    });

    const api = createReviewSubmissionApi({
      fetchImpl,
      assignmentId: 'asg api'
    });

    const status = await api.getStatus();
    expect(status.ok).toBe(true);

    const submit = await api.submitReview({ recommendation: 'ACCEPT' });
    expect(submit.status).toBe(201);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][0]).toContain('asg%20api');
  });

  it('handles non-json responses and request failures safely', async () => {
    const fetchInvalidJson = vi.fn(async () => createJsonResponse({
      ok: false,
      status: 500,
      payload: null,
      throwOnJson: true
    }));
    const apiInvalidJson = createReviewSubmissionApi({
      fetchImpl: fetchInvalidJson,
      assignmentId: 'asg-page-2'
    });
    const invalidJsonResult = await apiInvalidJson.getStatus();
    expect(invalidJsonResult.payload).toEqual({});

    const failingFetch = vi.fn(async () => {
      throw new Error('network down');
    });
    const apiFailure = createReviewSubmissionApi({
      fetchImpl: failingFetch,
      assignmentId: 'asg-page-3'
    });
    const failed = await apiFailure.submitReview({});
    expect(failed.ok).toBe(false);
    expect(failed.status).toBe(0);
    expect(failed.payload.message).toBe('Request failed.');
  });

  it('returns enhanced false when required nodes are missing', () => {
    const dom = new JSDOM('<!doctype html><html><body><main></main></body></html>');
    expect(bootstrapReviewFormPage({ documentRef: dom.window.document, fetchImpl: vi.fn() })).toEqual({
      enhanced: false
    });
  });

  it('surfaces assignment-id errors and sets completed status from bootstrap status check', async () => {
    const noAssignmentDom = createReviewFormDom('');
    const noAssignmentResult = bootstrapReviewFormPage({
      documentRef: noAssignmentDom.window.document,
      fetchImpl: vi.fn()
    });
    expect(noAssignmentResult).toEqual({ enhanced: false });
    expect(
      noAssignmentDom.window.document.querySelector('[data-review-form-status]').textContent
    ).toBe('Assignment ID is missing.');

    const completedDom = createReviewFormDom('asg-page-4');
    const fetchImpl = vi.fn(async (url, options) => {
      if (options.method === 'GET') {
        return createJsonResponse({
          ok: true,
          status: 200,
          payload: { status: 'COMPLETED' }
        });
      }

      return createJsonResponse({
        ok: true,
        status: 201,
        payload: { status: 'COMPLETED' }
      });
    });
    const result = bootstrapReviewFormPage({
      documentRef: completedDom.window.document,
      fetchImpl
    });
    expect(result).toEqual({ enhanced: true });

    await flushAsyncWork();
    const statusNode = completedDom.window.document.querySelector('[data-review-form-status]');
    expect(statusNode.textContent).toBe('A completed review already exists for this assignment.');
  });

  it('handles submit success, validation errors, and conflict errors', async () => {
    const successDom = createReviewFormDom('asg-page-5');
    const successFetch = vi.fn(async (url, options) => {
      if (options.method === 'GET') {
        return createJsonResponse({
          ok: true,
          status: 200,
          payload: { status: 'NOT_SUBMITTED' }
        });
      }

      return createJsonResponse({
        ok: true,
        status: 201,
        payload: {
          status: 'COMPLETED'
        }
      });
    });
    bootstrapReviewFormPage({
      documentRef: successDom.window.document,
      fetchImpl: successFetch
    });
    successDom.window.document.querySelector('[data-review-form]').dispatchEvent(
      new successDom.window.Event('submit', { bubbles: true, cancelable: true })
    );
    await flushAsyncWork();
    expect(
      successDom.window.document.querySelector('[data-review-form-status]').textContent
    ).toBe('Review submitted successfully.');

    const validationDom = createReviewFormDom('asg-page-6');
    const validationFetch = vi.fn(async (url, options) => {
      if (options.method === 'GET') {
        return createJsonResponse({
          ok: true,
          status: 200,
          payload: { status: 'NOT_SUBMITTED' }
        });
      }

      return createJsonResponse({
        ok: false,
        status: 400,
        payload: {
          message: 'Missing required fields.',
          missingFields: ['summary'],
          fieldMessages: {
            summary: 'Provide summary text.'
          }
        }
      });
    });
    bootstrapReviewFormPage({
      documentRef: validationDom.window.document,
      fetchImpl: validationFetch
    });
    validationDom.window.document.querySelector('[data-review-form]').dispatchEvent(
      new validationDom.window.Event('submit', { bubbles: true, cancelable: true })
    );
    await flushAsyncWork();
    expect(
      validationDom.window.document.querySelector('[data-review-form-errors]').textContent
    ).toContain('Provide summary text.');
    expect(
      validationDom.window.document.querySelector('[name="summary"]').getAttribute('aria-invalid')
    ).toBe('true');

    const conflictDom = createReviewFormDom('asg-page-7');
    const conflictFetch = vi.fn(async (url, options) => {
      if (options.method === 'GET') {
        return createJsonResponse({
          ok: true,
          status: 200,
          payload: { status: 'NOT_SUBMITTED' }
        });
      }

      return createJsonResponse({
        ok: false,
        status: 409,
        payload: {
          message: 'Already completed.'
        }
      });
    });
    bootstrapReviewFormPage({
      documentRef: conflictDom.window.document,
      fetchImpl: conflictFetch
    });
    conflictDom.window.document.querySelector('[data-review-form]').dispatchEvent(
      new conflictDom.window.Event('submit', { bubbles: true, cancelable: true })
    );
    await flushAsyncWork();
    const statusNode = conflictDom.window.document.querySelector('[data-review-form-status]');
    expect(statusNode.dataset.status).toBe('warning');
    expect(statusNode.textContent).toBe('Already completed.');

    const serverErrorDom = createReviewFormDom('asg-page-8');
    const serverErrorFetch = vi.fn(async (url, options) => {
      if (options.method === 'GET') {
        return createJsonResponse({
          ok: true,
          status: 200,
          payload: { status: 'NOT_SUBMITTED' }
        });
      }

      return createJsonResponse({
        ok: false,
        status: 500,
        payload: {}
      });
    });
    bootstrapReviewFormPage({
      documentRef: serverErrorDom.window.document,
      fetchImpl: serverErrorFetch
    });
    serverErrorDom.window.document.querySelector('[data-review-form]').dispatchEvent(
      new serverErrorDom.window.Event('submit', { bubbles: true, cancelable: true })
    );
    await flushAsyncWork();
    const serverStatusNode = serverErrorDom.window.document.querySelector('[data-review-form-status]');
    expect(serverStatusNode.dataset.status).toBe('error');
    expect(serverStatusNode.textContent).toBe('Review submission failed.');
  });
});
