import { describe, expect, it, vi } from 'vitest';
import { DraftApiClient } from '../../../src/controllers/draft-api-client.js';

describe('draft-api-client', () => {
  it('throws when fetch implementation is missing', () => {
    expect(() => new DraftApiClient({ fetchImpl: null })).toThrow(/required/);
  });

  it('falls back to global fetch when no fetch implementation is provided', () => {
    const client = new DraftApiClient();
    expect(typeof client.fetchImpl).toBe('function');
  });

  it('binds default global fetch to global context', async () => {
    const originalFetch = globalThis.fetch;
    const guardedFetch = vi.fn(function guardedFetch(url) {
      if (this !== globalThis) {
        throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
      }

      if (String(url).endsWith('/api/submissions/s1/draft')) {
        return Promise.resolve(
          new Response(JSON.stringify({ revision: 1, metadata: {}, files: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        );
      }

      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    Object.defineProperty(globalThis, 'fetch', {
      value: guardedFetch,
      configurable: true
    });

    try {
      const client = new DraftApiClient();
      const latest = await client.getLatestDraft('s1');
      expect(latest.revision).toBe(1);
      expect(guardedFetch).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(globalThis, 'fetch', {
        value: originalFetch,
        configurable: true
      });
    }
  });

  it('issues successful requests and supports endpoint helpers', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );

    const client = new DraftApiClient({ fetchImpl, baseUrl: 'http://localhost' });

    await client.saveDraft('s1', { baseRevision: 0, metadata: '{}' });
    await client.getLatestDraft('s1');
    await client.listDraftVersions('s1');
    await client.getDraftVersion('s1', 'v1');
    await client.restoreDraftVersion('s1', 'v1', { baseRevision: 1 });
    await client.pruneDraftRetention('s1', { finalSubmissionId: 's1' });

    expect(fetchImpl).toHaveBeenCalledTimes(6);
  });

  it('throws on non-ok responses and invalid json response', async () => {
    const nonOkFetch = vi.fn(async () =>
      new Response(JSON.stringify({ code: 'DRAFT_STALE', message: 'stale', reloadRequired: true }), {
        status: 409,
        headers: { 'content-type': 'application/json' }
      })
    );

    const client = new DraftApiClient({ fetchImpl: nonOkFetch });
    await expect(client.getLatestDraft('s1')).rejects.toMatchObject({ status: 409, code: 'DRAFT_STALE' });

    const invalidJsonFetch = vi.fn(async () =>
      new Response('not-json', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );

    const clientWithInvalidJson = new DraftApiClient({ fetchImpl: invalidJsonFetch });
    await expect(clientWithInvalidJson.getLatestDraft('s1')).rejects.toMatchObject({ code: 'DRAFT_BAD_RESPONSE' });
  });

  it('handles empty successful response bodies', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 200 }));
    const client = new DraftApiClient({ fetchImpl });

    const payload = await client.getLatestDraft('s1');
    expect(payload).toEqual({});
  });

  it('uses default error code/message for non-ok responses without payload details', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 500 }));
    const client = new DraftApiClient({ fetchImpl });

    await expect(client.getLatestDraft('s1')).rejects.toMatchObject({
      status: 500,
      code: 'DRAFT_API_ERROR',
      message: 'Draft API request failed.'
    });
  });
});
