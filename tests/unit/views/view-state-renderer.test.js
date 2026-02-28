import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderViewState } from '../../../src/views/ViewStateRenderer.js';

describe('ViewStateRenderer', () => {
  it('renders state and message and no-ops for missing element', () => {
    const dom = new JSDOM('<p data-banner></p>');
    const banner = dom.window.document.querySelector('[data-banner]');
    renderViewState(banner, { status: 'success', message: 'Done' });
    expect(banner.dataset.state).toBe('success');
    expect(banner.textContent).toBe('Done');

    renderViewState();
    expect(banner.dataset.state).toBe('success');

    renderViewState(banner);
    expect(banner.dataset.state).toBe('idle');
    expect(banner.textContent).toBe('');
  });
});
