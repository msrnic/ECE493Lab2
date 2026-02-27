/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapLoginPage } from '../../../src/assets/js/app.js';

function setLoginPageHtml() {
  document.body.innerHTML = `
    <form data-login-form>
      <input name="email" />
      <input name="password" />
      <button type="submit">Log In</button>
    </form>
    <p data-login-status></p>
  `;
}

describe('login app bootstrap', () => {
  beforeEach(() => {
    setLoginPageHtml();
  });

  it('returns not enhanced when login form is not present', async () => {
    document.body.innerHTML = '<div>missing login form</div>';

    const result = await bootstrapLoginPage({
      documentRef: document,
      fetchImpl: vi.fn(),
      locationRef: { assign() {} }
    });

    expect(result).toEqual({
      enhanced: false,
      redirected: false
    });
  });

  it('enhances page and checks authenticated session state', async () => {
    const unauthenticatedResult = await bootstrapLoginPage({
      documentRef: document,
      fetchImpl: vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ authenticated: false })
      }),
      locationRef: { assign: vi.fn() }
    });

    expect(unauthenticatedResult).toEqual({
      enhanced: true,
      redirected: false
    });

    const locationRef = { assign: vi.fn() };
    const authenticatedResult = await bootstrapLoginPage({
      documentRef: document,
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

    expect(authenticatedResult).toEqual({
      enhanced: true,
      redirected: true
    });
    expect(locationRef.assign).toHaveBeenCalledWith('/dashboard');
  });
});
