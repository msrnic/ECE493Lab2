/**
 * @vitest-environment jsdom
 */

import { describe, expect, test } from 'vitest';
import { createFinalScheduleController } from '../../src/controllers/final-schedule-controller.js';
import {
  makeAuthorViewerContext,
  makePublishedPayload,
  makeUnpublishedPayload
} from './fixtures/final-schedule-fixtures.js';

function okResponse(payload) {
  return {
    ok: true,
    json: async () => payload
  };
}

describe('final schedule controller', () => {
  test('throws when container is missing', () => {
    expect(() => createFinalScheduleController()).toThrow(
      'container is required to create final schedule controller'
    );
  });

  test('loads published unauthenticated schedule and resets post-login count', async () => {
    const container = document.createElement('div');
    const fetchImpl = async () => okResponse(makePublishedPayload());
    const controller = createFinalScheduleController({ container, fetchImpl, viewerTimeZone: 'UTC' });

    const result = await controller.load();

    expect(result.status).toBe('published');
    expect(controller.getPostLoginActionCount()).toBe(0);
    expect(container.querySelector('[data-testid="published-view"]')).not.toBeNull();
  });

  test('tracks authenticated load action count and toggles action window hint', async () => {
    const container = document.createElement('div');
    const payload = makePublishedPayload({
      viewerContext: makeAuthorViewerContext('A-102')
    });

    const fetchImpl = async () => okResponse(payload);
    const controller = createFinalScheduleController({ container, fetchImpl, viewerTimeZone: 'UTC' });

    await controller.load();
    expect(controller.getPostLoginActionCount()).toBe(1);
    expect(container.querySelector('[data-testid="action-hint"]').textContent).toContain(
      'within 2 actions'
    );

    await controller.load();
    expect(controller.getPostLoginActionCount()).toBe(2);
    expect(container.querySelector('[data-testid="action-hint"]').textContent).toContain(
      'within 2 actions'
    );

    await controller.load();
    expect(controller.getPostLoginActionCount()).toBe(3);
    expect(container.querySelector('[data-testid="action-hint"]').textContent).toContain(
      'after 2 actions post login'
    );
  });

  test('resets post-login count after authenticated-to-anonymous transition', async () => {
    const container = document.createElement('div');
    const responses = [
      makePublishedPayload({ viewerContext: makeAuthorViewerContext('A-102') }),
      makePublishedPayload()
    ];
    let index = 0;

    const fetchImpl = async () => okResponse(responses[index++]);
    const controller = createFinalScheduleController({ container, fetchImpl, viewerTimeZone: 'UTC' });

    await controller.load();
    expect(controller.getPostLoginActionCount()).toBe(1);

    await controller.load();
    expect(controller.getPostLoginActionCount()).toBe(0);
  });

  test('renders unpublished notice when API status is unpublished', async () => {
    const container = document.createElement('div');
    const fetchImpl = async () => okResponse(makeUnpublishedPayload());
    const controller = createFinalScheduleController({ container, fetchImpl });

    const result = await controller.load();
    expect(result.status).toBe('unpublished');
    expect(container.querySelector('[data-testid="unpublished-view"]')).not.toBeNull();
  });

  test('renders errors and returns null when load fails', async () => {
    const container = document.createElement('div');
    const fetchImpl = async () => {
      throw new Error('Network broke');
    };

    const controller = createFinalScheduleController({ container, fetchImpl });
    const result = await controller.load();

    expect(result).toBeNull();
    expect(controller.getPostLoginActionCount()).toBe(0);
    expect(container.querySelector('[data-testid="error"]').textContent).toContain('Network broke');
  });

  test('handles non-Error thrown values in load failure path', async () => {
    const container = document.createElement('div');
    const fetchImpl = async () => {
      throw 'bad';
    };

    const controller = createFinalScheduleController({ container, fetchImpl });
    await controller.load();

    expect(container.querySelector('[data-testid="error"]').textContent).toContain(
      'Unable to load final schedule.'
    );
  });

  test('allows manual count reset', async () => {
    const container = document.createElement('div');
    const fetchImpl = async () =>
      okResponse(makePublishedPayload({ viewerContext: makeAuthorViewerContext('A-102') }));
    const controller = createFinalScheduleController({ container, fetchImpl, viewerTimeZone: 'UTC' });

    await controller.load();
    expect(controller.getPostLoginActionCount()).toBe(1);
    controller.resetPostLoginActionCount();
    expect(controller.getPostLoginActionCount()).toBe(0);
  });
});
