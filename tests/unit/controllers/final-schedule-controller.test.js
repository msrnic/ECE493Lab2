/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import { createFinalScheduleController } from '../../../src/controllers/final-schedule-controller.js';
import {
  createPublishedSchedulePayload,
  createUnpublishedSchedulePayload
} from '../fixtures/final-schedule-fixtures.js';

describe('final-schedule-controller', () => {
  it('reports not mounted when root element is absent', async () => {
    document.body.innerHTML = '<main></main>';

    const controller = createFinalScheduleController({
      documentRef: document,
      apiClient: vi.fn()
    });

    const result = await controller.load();
    expect(controller.mounted).toBe(false);
    expect(result).toEqual({ mounted: false, rendered: false });
  });

  it('renders published and unpublished outcomes and caps actions to two', async () => {
    document.body.innerHTML = '<section data-final-schedule-root></section>';

    const apiClient = vi
      .fn()
      .mockResolvedValueOnce(createPublishedSchedulePayload())
      .mockResolvedValueOnce(createPublishedSchedulePayload())
      .mockResolvedValueOnce(createUnpublishedSchedulePayload());

    const controller = createFinalScheduleController({
      documentRef: document,
      apiClient
    });

    const first = await controller.load({ action: 'open-page' });
    expect(first.rendered).toBe(true);
    expect(first.status).toBe('published');
    expect(first.actionsToOutcome).toBe(1);

    const second = await controller.refresh();
    expect(second.actionsToOutcome).toBe(2);

    const third = await controller.refresh();
    expect(third.status).toBe('unpublished');
    expect(third.actionsToOutcome).toBe(2);
    expect(document.querySelector('[data-final-schedule-notice]')).not.toBeNull();
  });

  it('renders error states on api failures and invalid model payloads', async () => {
    document.body.innerHTML = '<section data-final-schedule-root></section>';

    const apiFailure = createFinalScheduleController({
      documentRef: document,
      apiClient: vi.fn().mockRejectedValue(new Error('Network unreachable'))
    });

    const failedResult = await apiFailure.load();
    expect(failedResult.rendered).toBe(false);
    expect(document.querySelector('[data-final-schedule-status="error"]').textContent).toContain('Network unreachable');

    const invalidModel = createFinalScheduleController({
      documentRef: document,
      apiClient: vi.fn().mockResolvedValue({ status: 'published', conferenceTimeZone: 'America/Toronto' })
    });

    const invalidResult = await invalidModel.load();
    expect(invalidResult.rendered).toBe(false);
    expect(document.querySelector('[data-final-schedule-status="error"]').textContent).toContain(
      'Published payload requires a sessions array.'
    );
  });

  it('passes UTC fallback timezone to model normalizer when browser timezone is unavailable', async () => {
    document.body.innerHTML = '<section data-final-schedule-root></section>';

    const originalDateTimeFormat = Intl.DateTimeFormat;
    function DateTimeFormatMock() {
      if (!(this instanceof DateTimeFormatMock)) {
        return {
          resolvedOptions: () => ({})
        };
      }
    }
    DateTimeFormatMock.prototype.resolvedOptions = () => ({});
    DateTimeFormatMock.prototype.format = () => 'mock-time';
    Intl.DateTimeFormat = DateTimeFormatMock;

    const modelNormalizer = vi.fn().mockReturnValue({
      status: 'unpublished',
      generatedAt: '2026-06-01T10:00:00.000Z',
      viewerContext: {
        isAuthenticated: false,
        viewerRole: 'anonymous',
        authorId: null
      },
      notice: {
        code: 'SCHEDULE_UNPUBLISHED',
        message: 'The final conference schedule has not been published yet.'
      },
      sessions: [],
      conferenceTimeZone: null
    });

    try {
      const controller = createFinalScheduleController({
        documentRef: document,
        apiClient: vi.fn().mockResolvedValue({ status: 'unpublished' }),
        modelNormalizer
      });

      const result = await controller.load();
      expect(result.rendered).toBe(true);
      expect(modelNormalizer).toHaveBeenCalledWith({ status: 'unpublished' }, { browserTimeZone: 'UTC' });
    } finally {
      Intl.DateTimeFormat = originalDateTimeFormat;
    }
  });
});
