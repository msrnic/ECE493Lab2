import { describe, expect, it, vi } from 'vitest';
import {
  fetchSessionStatus,
  redirectAuthenticatedUser
} from '../../../src/controllers/session-controller.js';

describe('session-controller', () => {
  it('fetches session status and handles invalid json responses', async () => {
    await expect(fetchSessionStatus({ fetchImpl: null })).rejects.toThrow('fetchImpl must be provided');

    const ok = await fetchSessionStatus({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ authenticated: true })
      })
    });

    expect(ok.ok).toBe(true);

    const invalidJson = await fetchSessionStatus({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('bad json');
        }
      })
    });

    expect(invalidJson.payload).toEqual({ authenticated: false });
  });

  it('redirects authenticated users and preserves unauthenticated users', async () => {
    const locationRef = { assign: vi.fn() };

    const redirected = await redirectAuthenticatedUser({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          authenticated: true,
          user: { id: 'usr-1', email: 'user@example.com' },
          dashboardUrl: '/dashboard'
        })
      }),
      locationRef
    });

    expect(redirected.redirected).toBe(true);
    expect(locationRef.assign).toHaveBeenCalledWith('/dashboard');

    const notRedirected = await redirectAuthenticatedUser({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ authenticated: false })
      }),
      locationRef
    });

    expect(notRedirected.redirected).toBe(false);
  });

  it('supports href fallback and null location values', async () => {
    const hrefLocation = { href: '' };

    const hrefResult = await redirectAuthenticatedUser({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          authenticated: true,
          user: { id: 'usr-1', email: 'user@example.com' },
          dashboardUrl: '/dashboard'
        })
      }),
      locationRef: hrefLocation
    });

    expect(hrefResult.redirected).toBe(true);
    expect(hrefLocation.href).toBe('/dashboard');

    const nullLocationResult = await redirectAuthenticatedUser({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          authenticated: true,
          user: { id: 'usr-1', email: 'user@example.com' },
          dashboardUrl: '/dashboard'
        })
      }),
      locationRef: null
    });

    expect(nullLocationResult.redirected).toBe(true);
  });
});
