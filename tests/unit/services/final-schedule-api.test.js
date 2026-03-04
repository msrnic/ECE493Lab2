import { describe, expect, it, vi } from 'vitest';
import { fetchFinalSchedulePayload } from '../../../src/services/final-schedule-api.js';

describe('final-schedule-api service', () => {
  it('requires fetch implementation', async () => {
    await expect(fetchFinalSchedulePayload({ fetchImpl: null })).rejects.toThrow('fetchImpl must be provided');
  });

  it('returns payload for successful responses', async () => {
    const payload = { status: 'published', sessions: [] };

    const response = await fetchFinalSchedulePayload({
      endpoint: '/api/final-schedule',
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => payload
      })
    });

    expect(response).toEqual(payload);
  });

  it('throws for invalid json and non-ok responses', async () => {
    await expect(fetchFinalSchedulePayload({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('bad json');
        }
      })
    })).rejects.toThrow('Final schedule endpoint returned an invalid JSON response.');

    await expect(fetchFinalSchedulePayload({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server failed' })
      })
    })).rejects.toThrow('Server failed');

    await expect(fetchFinalSchedulePayload({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ code: 'DOWN' })
      })
    })).rejects.toThrow('Unable to load final schedule.');
  });
});
