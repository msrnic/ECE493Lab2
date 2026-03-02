/**
 * @vitest-environment jsdom
 */

import { describe, expect, test } from 'vitest';
import { createFinalScheduleController } from '../../src/controllers/final-schedule-controller.js';
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

describe('final schedule integration', () => {
  test('supports published-to-unpublished refresh transition', async () => {
    const container = document.createElement('div');
    const responses = [
      makePublishedPayload({ viewerContext: makeAuthorViewerContext('A-102') }),
      makeUnpublishedPayload()
    ];
    let index = 0;

    const fetchImpl = async () => okResponse(responses[index++]);
    const controller = createFinalScheduleController({
      container,
      fetchImpl,
      viewerTimeZone: 'UTC'
    });

    const published = await controller.load();
    expect(published.status).toBe('published');
    expect(container.querySelectorAll('[data-testid="session-item"]')).toHaveLength(2);

    const unpublished = await controller.load();
    expect(unpublished.status).toBe('unpublished');
    expect(container.querySelectorAll('[data-testid="session-item"]')).toHaveLength(0);
    expect(container.querySelector('[data-testid="unpublished-notice"]').textContent).toContain(
      'not been published yet'
    );
  });

  test('renders API error from non-OK response end-to-end', async () => {
    const container = document.createElement('div');
    const fetchImpl = async () => ({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error('bad json');
      }
    });

    const controller = createFinalScheduleController({ container, fetchImpl });
    const result = await controller.load();

    expect(result).toBeNull();
    expect(container.querySelector('[data-testid="error"]').textContent).toContain(
      'Request failed with status 503'
    );
  });
});
