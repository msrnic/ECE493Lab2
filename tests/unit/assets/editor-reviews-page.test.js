import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { bootstrapEditorReviewsPage } from '../../../src/assets/js/editor-reviews.js';

function buildDom() {
  return new JSDOM(`
    <main data-editor-reviews-app>
      <form data-editor-reviews-form>
        <select data-editor-reviews-paper-select>
          <option value="" selected>Select</option>
          <option value="PAPER-1">Paper 1</option>
        </select>
        <button type="submit">View Reviews</button>
      </form>
      <section data-editor-reviews-status></section>
      <section data-editor-reviews-list></section>
    </main>
  `);
}

describe('editor-reviews-page bootstrap', () => {
  it('returns enhanced false when required dependencies are missing', async () => {
    const dom = new JSDOM('<main></main>');
    const missingNodes = await bootstrapEditorReviewsPage({
      documentRef: dom.window.document,
      fetchImpl: vi.fn()
    });
    expect(missingNodes).toEqual({ enhanced: false });

    const missingFetch = await bootstrapEditorReviewsPage({
      documentRef: buildDom().window.document,
      fetchImpl: null
    });
    expect(missingFetch).toEqual({ enhanced: false });
  });

  it('handles selection validation, available, pending, and unavailable outcomes', async () => {
    const dom = buildDom();
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          status: 'available',
          reviews: [{
            reviewerName: 'Reviewer A',
            reviewerId: 'rev-a',
            overallScore: 4,
            comments: 'Great work.',
            submittedAt: '2026-02-08T10:00:00.000Z'
          }]
        })
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          status: 'pending',
          reviews: []
        })
      })
      .mockResolvedValueOnce({
        status: 404,
        json: async () => ({
          message: 'Paper reviews unavailable'
        })
      });

    const result = await bootstrapEditorReviewsPage({
      documentRef: dom.window.document,
      fetchImpl
    });
    expect(result).toEqual({ enhanced: true });

    const form = dom.window.document.querySelector('[data-editor-reviews-form]');
    const select = dom.window.document.querySelector('[data-editor-reviews-paper-select]');

    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.querySelector('[data-editor-reviews-outcome]').textContent).toContain(
      'Select a paper before requesting reviews.'
    );

    select.value = 'PAPER-1';

    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.querySelector('[data-editor-review-list]').textContent).toContain('Reviewer A');

    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.querySelector('[data-editor-review-pending]').textContent).toContain('No completed reviews');

    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.querySelector('[data-editor-review-unavailable]').textContent).toContain('Paper reviews unavailable');
  });

  it('handles fetch failures and invalid json payloads as unavailable', async () => {
    const dom = buildDom();
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        status: 404,
        json: async () => {
          throw new Error('bad json');
        }
      });

    const result = await bootstrapEditorReviewsPage({
      documentRef: dom.window.document,
      fetchImpl
    });
    expect(result).toEqual({ enhanced: true });

    const form = dom.window.document.querySelector('[data-editor-reviews-form]');
    const select = dom.window.document.querySelector('[data-editor-reviews-paper-select]');
    select.value = 'PAPER-1';

    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.querySelector('[data-editor-review-unavailable]').textContent).toContain('Paper reviews unavailable');

    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.querySelector('[data-editor-reviews-outcome]').textContent).toContain('Paper reviews unavailable');
  });
});
