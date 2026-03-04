/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from 'vitest';
import { bootstrapFinalSchedulePage } from '../../src/assets/js/final-schedule-page.js';
import {
  createAuthorPublishedPayload,
  createPublishedSchedulePayload,
  createUnpublishedSchedulePayload
} from '../unit/fixtures/final-schedule-fixtures.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  document.body.innerHTML = '';
});

describe('UC-15-AS View Final Schedule acceptance', () => {
  it('Given published schedule, when any viewer opens final schedule, then full schedule is displayed', async () => {
    document.body.innerHTML = '<section data-final-schedule-root></section>';

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => createPublishedSchedulePayload()
    });

    const result = await bootstrapFinalSchedulePage({ documentRef: document });

    expect(result.enhanced).toBe(true);
    expect(result.rendered).toBe(true);
    expect(result.status).toBe('published');
    expect(document.querySelectorAll('[data-final-schedule-session]')).toHaveLength(2);
  });

  it('Given published and authenticated author, then author sessions are highlighted with conference/local labels', async () => {
    document.body.innerHTML = '<section data-final-schedule-root></section>';

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => createAuthorPublishedPayload()
    });

    const result = await bootstrapFinalSchedulePage({ documentRef: document });

    expect(result.status).toBe('published');
    expect(document.querySelectorAll('[data-current-author-session="true"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-final-schedule-conference-time]').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[data-final-schedule-local-time]').length).toBeGreaterThan(0);
    expect(Number.parseInt(document.querySelector('[data-final-schedule-action-count]').textContent, 10)).toBeLessThanOrEqual(2);
  });

  it('Given unpublished schedule, when any viewer accesses view, then unpublished notice is shown with zero entries', async () => {
    document.body.innerHTML = '<section data-final-schedule-root></section>';

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => createUnpublishedSchedulePayload()
    });

    const result = await bootstrapFinalSchedulePage({ documentRef: document });

    expect(result.status).toBe('unpublished');
    expect(document.querySelector('[data-final-schedule-notice]')).not.toBeNull();
    expect(document.querySelectorAll('[data-final-schedule-session]')).toHaveLength(0);
  });
});
