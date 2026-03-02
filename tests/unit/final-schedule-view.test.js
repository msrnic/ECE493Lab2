/**
 * @vitest-environment jsdom
 */

import { describe, expect, test } from 'vitest';
import {
  renderError,
  renderFinalSchedule,
  renderLoading
} from '../../src/views/final-schedule-view.js';
import {
  makeAuthorViewerContext,
  makePublishedPayload,
  makeUnpublishedPayload
} from './fixtures/final-schedule-fixtures.js';
import { normalizeFinalSchedule } from '../../src/models/final-schedule-model.js';

describe('final schedule view rendering', () => {
  test('renderLoading requires a valid container', () => {
    expect(() => renderLoading(null)).toThrow('A valid container element is required');
  });

  test('renderLoading and renderError render expected content', () => {
    const container = document.createElement('div');

    renderLoading(container);
    expect(container.querySelector('[data-testid="loading"]')).not.toBeNull();

    renderError(container, ' <b>Failed</b> ');
    const error = container.querySelector('[data-testid="error"]');
    expect(error.textContent).toBe('<b>Failed</b>');

    renderError(container, '   ');
    expect(container.querySelector('[data-testid="error"]').textContent).toBe(
      'Unable to load final schedule.'
    );
  });

  test('renderFinalSchedule throws for invalid view model', () => {
    const container = document.createElement('div');
    expect(() => renderFinalSchedule(container, null)).toThrow('A valid viewModel is required');
  });

  test('renders unpublished notice with zero schedule entries', () => {
    const container = document.createElement('div');
    const viewModel = normalizeFinalSchedule(makeUnpublishedPayload());

    renderFinalSchedule(container, viewModel);

    expect(container.querySelector('[data-testid="unpublished-notice"]').textContent).toContain(
      'not been published yet'
    );
    expect(container.querySelectorAll('[data-testid="session-item"]')).toHaveLength(0);
  });

  test('throws on unknown status', () => {
    const container = document.createElement('div');
    expect(() => renderFinalSchedule(container, { status: 'draft' })).toThrow(
      'Unknown final schedule status'
    );
  });

  test('renders published sessions with highlight and action-window hint', () => {
    const container = document.createElement('div');
    const viewModel = normalizeFinalSchedule(
      makePublishedPayload({
        viewerContext: makeAuthorViewerContext('A-102')
      }),
      { viewerTimeZone: 'America/Vancouver' }
    );

    renderFinalSchedule(container, viewModel, { withinPostLoginActionWindow: true });

    const sessionItems = container.querySelectorAll('[data-testid="session-item"]');
    expect(sessionItems).toHaveLength(2);
    expect(sessionItems[0].className).toContain('final-schedule__session--mine');
    expect(container.querySelector('[data-testid="action-hint"]').textContent).toContain(
      'within 2 actions'
    );
    expect(container.textContent).toContain('Conference:');
    expect(container.textContent).toContain('Local:');
  });

  test('renders post-login warning when action window is exceeded', () => {
    const container = document.createElement('div');
    const viewModel = normalizeFinalSchedule(
      makePublishedPayload({
        viewerContext: makeAuthorViewerContext('A-102')
      }),
      { viewerTimeZone: 'UTC' }
    );

    renderFinalSchedule(container, viewModel, { withinPostLoginActionWindow: false });
    expect(container.querySelector('[data-testid="action-hint"]').textContent).toContain(
      'after 2 actions post login'
    );
  });

  test('omits action hint for unauthenticated viewer', () => {
    const container = document.createElement('div');
    const viewModel = normalizeFinalSchedule(makePublishedPayload(), { viewerTimeZone: 'UTC' });

    renderFinalSchedule(container, viewModel);
    expect(container.querySelector('[data-testid="action-hint"]')).toBeNull();
  });
});
