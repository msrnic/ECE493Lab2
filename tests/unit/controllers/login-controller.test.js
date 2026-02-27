/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enhanceLoginForm,
  submitLoginRequest
} from '../../../src/controllers/login-controller.js';

function setLoginFormHtml() {
  document.body.innerHTML = `
    <form data-login-form>
      <input name="email" />
      <input name="password" />
      <button type="submit">Log In</button>
    </form>
    <p data-login-status></p>
  `;
}

describe('login-controller', () => {
  beforeEach(() => {
    setLoginFormHtml();
  });

  it('submits login requests and handles invalid json payloads', async () => {
    await expect(submitLoginRequest({}, { fetchImpl: null })).rejects.toThrow('fetchImpl must be provided');

    const okResult = await submitLoginRequest(
      { email: 'user@example.com', password: 'StrongPass!2026' },
      {
        fetchImpl: vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ authenticated: true, user: { id: 'usr-1', email: 'user@example.com' } })
        })
      }
    );

    expect(okResult.ok).toBe(true);

    const invalidJsonResult = await submitLoginRequest(
      { email: 'user@example.com', password: 'StrongPass!2026' },
      {
        fetchImpl: vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: async () => {
            throw new Error('bad json');
          }
        })
      }
    );

    expect(invalidJsonResult.payload.error).toBe('INVALID_RESPONSE');
  });

  it('returns null when required elements are missing', () => {
    expect(enhanceLoginForm({ documentRef: null })).toBeNull();

    document.body.innerHTML = '<div>missing</div>';
    expect(enhanceLoginForm({ documentRef: document })).toBeNull();
  });

  it('handles validation, success, and error submission branches', async () => {
    const locationRef = { assign: vi.fn() };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          authenticated: true,
          user: { id: 'usr-1', email: 'user@example.com' },
          dashboardUrl: '/dashboard'
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'LOGIN_TEMPORARILY_BLOCKED',
          message: 'Too many failed login attempts. Try again later.',
          retryAfterSeconds: 30
        })
      });

    const enhanced = enhanceLoginForm({
      documentRef: document,
      fetchImpl,
      locationRef,
      nowFn: () => new Date('2026-02-01T00:00:00.000Z')
    });

    const form = enhanced.form;
    const statusNode = enhanced.statusNode;

    form.querySelector('[name="email"]').value = '';
    form.querySelector('[name="password"]').value = '';
    await enhanced.onSubmit({ preventDefault() {} });

    expect(statusNode.textContent).toBe('Email and password are required.');
    expect(fetchImpl).toHaveBeenCalledTimes(0);

    form.querySelector('[name="email"]').value = 'USER@example.com';
    form.querySelector('[name="password"]').value = 'StrongPass!2026';
    await enhanced.onSubmit({ preventDefault() {} });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(statusNode.textContent).toBe('Login successful.');
    expect(locationRef.assign).toHaveBeenCalledWith('/dashboard');

    form.querySelector('[name="email"]').value = 'user@example.com';
    form.querySelector('[name="password"]').value = 'wrong';
    await enhanced.onSubmit({ preventDefault() {} });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(statusNode.textContent).toContain('(30s)');
  });

  it('falls back to href assignment and supports missing location object', async () => {
    const hrefOnlyLocation = { href: '' };
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        authenticated: true,
        user: { id: 'usr-1', email: 'user@example.com' },
        dashboardUrl: '/dashboard'
      })
    });

    const enhanced = enhanceLoginForm({
      documentRef: document,
      fetchImpl,
      locationRef: hrefOnlyLocation
    });

    enhanced.form.querySelector('[name="email"]').value = 'user@example.com';
    enhanced.form.querySelector('[name="password"]').value = 'StrongPass!2026';
    await enhanced.onSubmit({ preventDefault() {} });
    expect(hrefOnlyLocation.href).toBe('/dashboard');

    const noLocationEnhanced = enhanceLoginForm({
      documentRef: document,
      fetchImpl,
      locationRef: null
    });

    noLocationEnhanced.form.querySelector('[name="email"]').value = 'user@example.com';
    noLocationEnhanced.form.querySelector('[name="password"]').value = 'StrongPass!2026';
    await noLocationEnhanced.onSubmit({ preventDefault() {} });
  });
});
