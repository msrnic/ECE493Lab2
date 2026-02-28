import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { bootstrapReviewerPaperAccessPage } from '../../../src/assets/js/reviewer-paper-access-page.js';

describe('reviewer-paper-access-page bootstrap', () => {
  it('returns enhanced false when required DOM nodes are missing', async () => {
    const dom = new JSDOM('<main></main>');
    const result = await bootstrapReviewerPaperAccessPage({
      documentRef: dom.window.document,
      fetchImpl: vi.fn()
    });

    expect(result).toEqual({ enhanced: false });
  });

  it('updates the UI for successful and unsuccessful fetch responses', async () => {
    const dom = new JSDOM(`
      <main data-reviewer-paper-access>
        <form data-reviewer-paper-form>
          <select data-reviewer-paper-select>
            <option value="paper-1" selected>Paper 1</option>
          </select>
          <button type="submit">Load</button>
        </form>
        <section data-reviewer-paper-status></section>
        <section data-reviewer-paper-files></section>
      </main>
    `);

    const firstFetch = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ files: [{ fileName: 'paper.pdf' }] })
      })
      .mockResolvedValueOnce({
        status: 503,
        json: async () => ({ outcome: 'temporarily-unavailable', message: 'Unavailable' })
      });

    const result = await bootstrapReviewerPaperAccessPage({
      documentRef: dom.window.document,
      fetchImpl: firstFetch
    });
    expect(result).toEqual({ enhanced: true });

    const form = dom.window.document.querySelector('[data-reviewer-paper-form]');
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.querySelector('[data-reviewer-file-list]').textContent).toContain('paper.pdf');

    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.querySelector('[data-reviewer-file-empty]').textContent).toContain('No files available');
    expect(dom.window.document.querySelector('[data-reviewer-paper-outcome]').textContent).toContain('Unavailable');
  });
});
