import { describe, expect, it } from 'vitest';
import { renderDashboardPage } from '../../../src/views/dashboard-view.js';
import {
  renderLoginPage,
  resolveLoginErrorMessage
} from '../../../src/views/login-view.js';

describe('login and dashboard views', () => {
  it('renders login errors for blocked, explicit, and fallback payloads', () => {
    expect(
      resolveLoginErrorMessage({
        error: 'LOGIN_TEMPORARILY_BLOCKED',
        message: 'Too many failed login attempts. Try again later.',
        retryAfterSeconds: 120
      })
    ).toBe('Too many failed login attempts. Try again later. (120s)');

    expect(
      resolveLoginErrorMessage({
        error: 'LOGIN_TEMPORARILY_BLOCKED',
        retryAfterSeconds: 10
      })
    ).toBe('Too many failed login attempts. Try again later. (10s)');

    expect(
      resolveLoginErrorMessage({
        error: 'LOGIN_TEMPORARILY_BLOCKED',
        retryAfterSeconds: 0
      })
    ).toBe('Too many failed login attempts. Try again later.');

    expect(resolveLoginErrorMessage({ message: 'Invalid email or password.' })).toBe(
      'Invalid email or password.'
    );
    expect(resolveLoginErrorMessage({ message: '   ' })).toBe('Invalid email or password.');
  });

  it('renders login page html shell', () => {
    const html = renderLoginPage();

    expect(html).toContain('data-login-form');
    expect(html).toContain('/assets/css/login.css');
    expect(html).toContain("bootstrapLoginPage");
  });

  it('renders dashboard page and escapes user email', () => {
    const html = renderDashboardPage({ email: '<script>alert(1)</script>' });
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');

    const fallback = renderDashboardPage();
    expect(fallback).toContain('unknown user');
  });
});
