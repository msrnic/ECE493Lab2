/**
 * @vitest-environment jsdom
 */

import { describe, expect, test } from 'vitest';
import { bootstrapFinalScheduleApp } from '../../src/assets/js/app.js';
import {
  makeAuthorViewerContext,
  makePublishedPayload,
  makeUnpublishedPayload
} from '../unit/fixtures/final-schedule-fixtures.js';

function okResponse(payload) {
  return {
    ok: true,
    json: async () => payload
  };
}

describe('UC-15 acceptance suite', () => {
  test('given published schedule when any viewer opens view then full schedule is displayed', async () => {
    document.body.innerHTML = '<div data-final-schedule-root></div>';

    await bootstrapFinalScheduleApp({
      documentRef: document,
      fetchImpl: async () => okResponse(makePublishedPayload()),
      viewerTimeZone: 'UTC'
    });

    expect(document.querySelectorAll('[data-testid="session-item"]')).toHaveLength(2);
    expect(document.querySelector('[data-testid="published-view"]')).not.toBeNull();
  });

  test('given published schedule and authenticated author then sessions are highlighted with conference and local labels', async () => {
    document.body.innerHTML = '<div data-final-schedule-root></div>';

    await bootstrapFinalScheduleApp({
      documentRef: document,
      fetchImpl: async () =>
        okResponse(
          makePublishedPayload({
            viewerContext: makeAuthorViewerContext('A-102')
          })
        ),
      viewerTimeZone: 'America/Vancouver'
    });

    const highlighted = document.querySelectorAll('.final-schedule__session--mine');
    expect(highlighted).toHaveLength(1);
    expect(document.body.textContent).toContain('Conference:');
    expect(document.body.textContent).toContain('Local:');
    expect(document.querySelector('[data-testid="action-hint"]').textContent).toContain(
      'within 2 actions'
    );
  });

  test('given unpublished schedule when any viewer accesses view then unpublished notice appears with zero entries', async () => {
    document.body.innerHTML = '<div data-final-schedule-root></div>';

    await bootstrapFinalScheduleApp({
      documentRef: document,
      fetchImpl: async () => okResponse(makeUnpublishedPayload())
    });

    expect(document.querySelector('[data-testid="unpublished-notice"]').textContent).toContain(
      'not been published yet'
    );
    expect(document.querySelectorAll('[data-testid="session-item"]')).toHaveLength(0);
  });

  test('given authenticated author then schedule outcome remains within 2 actions after login', async () => {
    document.body.innerHTML = '<div data-final-schedule-root></div>';

    const payload = makePublishedPayload({
      viewerContext: makeAuthorViewerContext('A-102')
    });

    await bootstrapFinalScheduleApp({
      documentRef: document,
      fetchImpl: async () => okResponse(payload),
      viewerTimeZone: 'UTC'
    });

    expect(document.querySelector('[data-testid="action-hint"]').textContent).toContain(
      'within 2 actions'
    );
  });
});
