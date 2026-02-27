import { describe, expect, it, vi } from 'vitest';
import { submitPasswordChangeRequest } from '../../../src/models/password-change-api-client.js';

describe('password-change-api-client', () => {
  it('requires fetch implementation', async () => {
    await expect(
      submitPasswordChangeRequest(
        {
          currentPassword: 'StrongPass!2026',
          newPassword: 'NewStrongPass!2027'
        },
        {
          fetchImpl: null
        }
      )
    ).rejects.toThrow('fetchImpl must be provided');
  });

  it('submits password-change requests and parses successful responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn().mockReturnValue(null)
      },
      json: async () => ({
        status: 'updated',
        message: 'Password updated successfully.'
      })
    });

    const result = await submitPasswordChangeRequest(
      {
        currentPassword: 'StrongPass!2026',
        newPassword: 'NewStrongPass!2027'
      },
      { fetchImpl }
    );

    expect(result).toEqual({
      ok: true,
      status: 200,
      payload: {
        status: 'updated',
        message: 'Password updated successfully.'
      },
      retryAfter: null
    });
    expect(fetchImpl).toHaveBeenCalledWith('/api/v1/account/password-change', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        currentPassword: 'StrongPass!2026',
        newPassword: 'NewStrongPass!2027'
      })
    });
  });

  it('handles invalid json responses and forwards Retry-After header', async () => {
    const result = await submitPasswordChangeRequest(
      {
        currentPassword: 'StrongPass!2026',
        newPassword: 'NewStrongPass!2027'
      },
      {
        fetchImpl: vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          headers: {
            get: vi.fn().mockReturnValue('30')
          },
          json: async () => {
            throw new Error('bad json');
          }
        })
      }
    );

    expect(result).toEqual({
      ok: false,
      status: 429,
      payload: {
        code: 'INVALID_RESPONSE',
        message: 'Unexpected response from server.'
      },
      retryAfter: '30'
    });
  });
});
