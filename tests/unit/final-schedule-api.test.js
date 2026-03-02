import { describe, expect, test } from 'vitest';
import { fetchFinalSchedule } from '../../src/services/final-schedule-api.js';

describe('fetchFinalSchedule', () => {
  test('throws when fetchImpl is not a function', async () => {
    await expect(fetchFinalSchedule({ fetchImpl: null })).rejects.toThrow('fetchImpl must be a function');
  });

  test('throws when no response is received', async () => {
    const fetchImpl = async () => null;
    await expect(fetchFinalSchedule({ fetchImpl })).rejects.toThrow('No response received');
  });

  test('returns parsed payload for ok response', async () => {
    const payload = { status: 'published' };
    const fetchImpl = async () => ({
      ok: true,
      json: async () => payload
    });

    await expect(fetchFinalSchedule({ fetchImpl })).resolves.toEqual(payload);
  });

  test('throws API message from error JSON response', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Server exploded' })
    });

    await expect(fetchFinalSchedule({ fetchImpl })).rejects.toThrow('Server exploded');
  });

  test('falls back to status-based message when error JSON parsing fails', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 404,
      json: async () => {
        throw new Error('bad json');
      }
    });

    await expect(fetchFinalSchedule({ fetchImpl })).rejects.toThrow('Request failed with status 404');
  });

  test('falls back to generic message when status is unavailable', async () => {
    const fetchImpl = async () => ({
      ok: false,
      json: async () => {
        throw new Error('bad json');
      }
    });

    await expect(fetchFinalSchedule({ fetchImpl })).rejects.toThrow('Request failed for final schedule API');
  });

  test('throws when success response has invalid JSON', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => {
        throw new Error('bad json');
      }
    });

    await expect(fetchFinalSchedule({ fetchImpl })).rejects.toThrow(
      'Invalid JSON response from final schedule API'
    );
  });
});
