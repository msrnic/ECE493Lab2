/**
 * @vitest-environment jsdom
 */

import { describe, expect, test, vi } from 'vitest';
import {
  bootstrapFinalScheduleApp,
  registerFinalScheduleOnLoad
} from '../../../src/assets/js/app.js';
import { makePublishedPayload } from '../fixtures/final-schedule-fixtures.js';

function okResponse(payload) {
  return {
    ok: true,
    json: async () => payload
  };
}

describe('final schedule app bootstrap', () => {
  test('returns null when document reference is missing', async () => {
    await expect(bootstrapFinalScheduleApp({ documentRef: null })).resolves.toBeNull();
  });

  test('returns null when schedule root is not present', async () => {
    document.body.innerHTML = '<main>No schedule mount</main>';

    await expect(
      bootstrapFinalScheduleApp({
        documentRef: document,
        fetchImpl: vi.fn()
      })
    ).resolves.toBeNull();
  });

  test('loads schedule when root exists', async () => {
    document.body.innerHTML = '<div data-final-schedule-root></div>';

    const fetchImpl = vi.fn(async () => okResponse(makePublishedPayload()));
    const result = await bootstrapFinalScheduleApp({
      documentRef: document,
      fetchImpl,
      apiUrl: '/api/custom-final-schedule',
      viewerTimeZone: 'UTC'
    });

    expect(result.status).toBe('published');
    expect(fetchImpl).toHaveBeenCalledWith('/api/custom-final-schedule', {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });
    expect(document.querySelector('[data-testid="published-view"]')).not.toBeNull();
  });
});

describe('registerFinalScheduleOnLoad', () => {
  test('does nothing when bootstrap function is invalid', () => {
    expect(() => registerFinalScheduleOnLoad({ documentRef: document, bootstrapFn: null })).not.toThrow();
  });

  test('registers a one-time DOMContentLoaded handler when document is loading', () => {
    const bootstrapFn = vi.fn().mockResolvedValue(null);
    const handlerRegistry = { callback: null, options: null };

    const documentRef = {
      readyState: 'loading',
      querySelector: vi.fn(() => ({ id: 'root' }))
    };

    const windowRef = {
      addEventListener: vi.fn((eventName, callback, options) => {
        expect(eventName).toBe('DOMContentLoaded');
        handlerRegistry.callback = callback;
        handlerRegistry.options = options;
      })
    };

    registerFinalScheduleOnLoad({ documentRef, windowRef, bootstrapFn });

    expect(windowRef.addEventListener).toHaveBeenCalledTimes(1);
    expect(handlerRegistry.options).toEqual({ once: true });

    handlerRegistry.callback();
    expect(bootstrapFn).toHaveBeenCalledWith({ documentRef });
  });

  test('runs immediately when document is ready and root exists', () => {
    const bootstrapFn = vi.fn().mockResolvedValue(null);
    const documentRef = {
      readyState: 'complete',
      querySelector: vi.fn(() => ({ id: 'root' }))
    };

    registerFinalScheduleOnLoad({ documentRef, bootstrapFn });

    expect(documentRef.querySelector).toHaveBeenCalledWith('[data-final-schedule-root]');
    expect(bootstrapFn).toHaveBeenCalledWith({ documentRef });
  });

  test('skips bootstrap when root is missing', () => {
    const bootstrapFn = vi.fn().mockResolvedValue(null);
    const documentRef = {
      readyState: 'interactive',
      querySelector: vi.fn(() => null)
    };

    registerFinalScheduleOnLoad({ documentRef, bootstrapFn });

    expect(bootstrapFn).not.toHaveBeenCalled();
  });
});
