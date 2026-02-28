import { describe, expect, it } from 'vitest';
import { createApiClient } from '../../../src/models/ApiClient.js';

describe('ApiClient', () => {
  it('requires a fetch implementation', () => {
    expect(() => createApiClient({ fetchImpl: null })).toThrow(/fetch implementation is required/);
  });

  it('handles successful JSON responses', async () => {
    const client = createApiClient({
      baseUrl: '/api',
      fetchImpl: async (url, options) => {
        expect(url).toBe('/api/example');
        expect(options.method).toBe('POST');
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }
    });

    const payload = await client.request('/example', { method: 'POST', body: { a: 1 } });
    expect(payload).toEqual({ ok: true });
  });

  it('handles text responses and normalized API errors', async () => {
    const client = createApiClient({
      baseUrl: '/api',
      fetchImpl: async () =>
        new Response('not-json', {
          status: 400,
          headers: { 'content-type': 'text/plain' }
        })
    });

    await expect(client.request('/bad')).rejects.toMatchObject({
      code: 'API_ERROR',
      status: 400
    });
  });

  it('handles empty responses for success and error fallback messages', async () => {
    const calls = [];
    const client = createApiClient({
      baseUrl: '/api',
      fetchImpl: async (_url, options) => {
        calls.push(options.method);
        if (calls.length === 1) {
          return new Response('', { status: 200 });
        }

        return new Response('', { status: 500 });
      }
    });

    const successPayload = await client.request('/empty-success');
    expect(successPayload).toEqual({});

    await expect(client.request('/empty-error')).rejects.toMatchObject({
      code: 'API_ERROR',
      message: 'Request failed',
      status: 500
    });
  });
});
