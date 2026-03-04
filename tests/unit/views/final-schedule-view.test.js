/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
  renderErrorState,
  renderFinalSchedule,
  renderLoadingState
} from '../../../src/views/final-schedule-view.js';
import {
  createAuthorPublishedPayload,
  createUnpublishedSchedulePayload
} from '../fixtures/final-schedule-fixtures.js';
import { normalizeFinalSchedulePayload } from '../../../src/models/final-schedule-model.js';

describe('final-schedule-view', () => {
  it('renders loading and error states', () => {
    const root = document.createElement('section');

    renderLoadingState(root);
    expect(root.querySelector('[data-final-schedule-status]').textContent).toContain('Loading final schedule');

    renderErrorState(root, 'Custom failure');
    expect(root.querySelector('[data-final-schedule-status="error"]').textContent).toContain('Custom failure');
  });

  it('renders unpublished notice with no session entries', () => {
    const root = document.createElement('section');
    const viewModel = normalizeFinalSchedulePayload(createUnpublishedSchedulePayload());

    renderFinalSchedule(root, {
      ...viewModel,
      actionsToOutcome: 1
    });

    expect(root.querySelector('[data-final-schedule-notice]')).not.toBeNull();
    expect(root.querySelectorAll('[data-final-schedule-session]')).toHaveLength(0);
    expect(root.querySelector('[data-final-schedule-action-count]').textContent).toContain('1 action');
  });

  it('renders published schedule, time labels, and author highlight markers', () => {
    const root = document.createElement('section');
    const viewModel = normalizeFinalSchedulePayload(createAuthorPublishedPayload(), {
      browserTimeZone: 'America/Edmonton'
    });

    renderFinalSchedule(root, {
      ...viewModel,
      actionsToOutcome: 2
    });

    expect(root.querySelector('[data-final-schedule-published]')).not.toBeNull();
    expect(root.querySelectorAll('[data-final-schedule-session]')).toHaveLength(2);
    expect(root.querySelectorAll('[data-current-author-session="true"]')).toHaveLength(1);
    expect(root.querySelector('[data-final-schedule-conference-time]').textContent).toContain('Conference time:');
    expect(root.querySelector('[data-final-schedule-local-time]').textContent).toContain('Local time:');
    expect(root.querySelector('[data-final-schedule-highlight-summary]').textContent).toContain('1');
    expect(root.querySelector('[data-final-schedule-action-count]').textContent).toContain('2 action');
  });

  it('uses default track and action count fallbacks in published rendering', () => {
    const root = document.createElement('section');
    const viewModel = normalizeFinalSchedulePayload(createAuthorPublishedPayload({
      sessions: [{
        sessionId: 'S-200',
        title: 'Fallback Session',
        startTimeUtc: '2026-06-01T14:00:00.000Z',
        endTimeUtc: '2026-06-01T14:30:00.000Z',
        room: 'Room Z',
        authorIds: []
      }]
    }), {
      browserTimeZone: 'America/Edmonton'
    });

    renderFinalSchedule(root, viewModel);

    expect(root.querySelector('[data-final-schedule-track]').textContent).toContain('General');
    expect(root.querySelector('[data-final-schedule-action-count]').textContent).toContain('1 action');
  });
});
